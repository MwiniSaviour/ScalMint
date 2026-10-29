# ScalMint Affiliate Productionization — Design Spec

**Date:** 2026-10-29
**Status:** Approved. Section 1 locked in design review; Sections 2–5 pre-approved by user directive ("industry standard, most correct and safe; nail the spec and proceed").
**Scope:** Prisma+Postgres migration, one-time-commission webhook processor, OPERASCH attribution wiring, VPS deployment, cron relocation.
**Out of scope:** `admin.scalmint.com` operator console (dashboard team; merged as PR #6). Do not edit their admin routes/files.

## 0. Principles

- The webhook is the single authoritative trust boundary for attribution and money. Cookies and metadata are carriers, never authorities.
- Every terminal outcome returns 200; only retryable infrastructure failures return 5xx. Paystack retries 5xx — the processor must be idempotent across retries.
- Money units are **pesewas**; commission rates are **basis points** (`3000` = 30%). Never mix units.
- Additive migrations only. No destructive operations. Existing data is never lost.
- Cross-surface parity (what OPERASCH sends vs what ScalMint reads) is proven by a test, not a comment.
- Prisma contract fields in tests are asserted with exact literals (`toEqual`), never `objectContaining`.

## 1. Data layer (LOCKED)

Replace `src/lib/db.ts`'s file-backed `fileDb` with a real `PrismaClient` behind the same `DbClient` interface (**Approach A**): call sites untouched, dashboard-team admin routes untouched, shim bugs fixed implicitly.

`prisma/schema.prisma` switches provider sqlite → postgres. Migration `0001_init` creates:

```prisma
model Affiliate {
  id                String          @id @default(cuid())
  code              String          @unique // SCAL-XXXXXXXX
  email             String          @unique
  name              String
  phone             String?
  passwordHash      String
  status            AffiliateStatus @default(PENDING)
  payoutMethod      PayoutMethod?
  payoutAccount     String?
  payoutAccountName String?
  bankCode          String?
  ghanaCardId       String?
  totalClicks       Int             @default(0)
  totalConversions  Int             @default(0)
  totalEarned       Int             @default(0) // pesewas
  totalPaid         Int             @default(0) // pesewas
  lastActiveAt      DateTime?
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  clicks            Click[]
  conversions       Conversion[]
  payouts           Payout[]
}

model Product {
  id             String          @id @default(cuid())
  slug           String          @unique
  name           String
  domain         String?
  href           String
  status         ProductStatus   @default(LIVE)
  commissionType CommissionType
  commissionRate Int                      // basis points
  commissionCap  Int?                     // pesewas
  cookieDays     Int             @default(30)
  minPayout      Int             @default(5000) // pesewas
  conversions    Conversion[]
}

model Click {
  id          String    @id @default(cuid())
  affiliateId String
  affiliate   Affiliate @relation(fields: [affiliateId], references: [id])
  productSlug String
  referer     String?
  ipHash      String?
  userAgent   String?
  country     String?
  createdAt   DateTime  @default(now())
  @@index([affiliateId, createdAt])
}

model Conversion {
  id               String           @id @default(cuid())
  affiliateId      String
  affiliate        Affiliate        @relation(fields: [affiliateId], references: [id])
  productId        String
  product          Product          @relation(fields: [productId], references: [id])
  customerEmail    String?
  customerRef      String? // Paystack charge reference
  amount           Int                     // pesewas
  commissionAmount Int                     // pesewas
  currency         String           @default("GHS")
  isOneTime        Boolean          @default(false) // denormalized from product.commissionType at creation
  status           ConversionStatus @default(PENDING)
  fraudFlags       String[]
  verifiedAt       DateTime?
  paidAt           DateTime?
  payoutId         String?
  createdAt        DateTime         @default(now())
  @@index([affiliateId, createdAt])
  @@index([status])
}

model Payout {
  id           String       @id @default(cuid())
  affiliateId  String
  affiliate    Affiliate    @relation(fields: [affiliateId], references: [id])
  amount       Int                  // pesewas
  method       PayoutMethod
  reference    String?
  transferCode String?
  status       PayoutStatus @default(QUEUED)
  createdAt    DateTime     @default(now())
}

model WebhookEvent {
  id        String   @id @default(cuid())
  provider  String   @default("paystack")
  event     String
  reference String   @unique
  payload   Json
  processed Boolean  @default(false)
  createdAt DateTime @default(now())
}

enum AffiliateStatus  { PENDING APPROVED SUSPENDED REJECTED }
enum PayoutMethod     { MOBILE_MONEY BANK }
enum ProductStatus    { LIVE COMING_SOON }
enum CommissionType   { PERCENT_RECURRING PERCENT_ONE_TIME FLAT_CPA }
enum ConversionStatus { PENDING APPROVED REJECTED PAID }
enum PayoutStatus     { QUEUED PROCESSING SUCCESS FAILED REVERSED }
```

**One-time dedupe constraint (corrects the earlier "plain unique" sketch — a plain
`@@unique([customerEmail, productId])` would wrongly block nova-pos recurring
commissions).** Dedupe is scoped by commission type via a denormalized flag and a
partial unique index (raw SQL inside `0001_init`, since Prisma schema cannot express
partial indexes):

```sql
CREATE UNIQUE INDEX "conversion_one_time_per_customer"
  ON "Conversion"("customerEmail", "productId")
  WHERE "isOneTime" = true AND "customerEmail" IS NOT NULL;
```

- `PERCENT_ONE_TIME` / `FLAT_CPA` products → `isOneTime = true` → one conversion row per (customer, product), ever. REJECTED rows also occupy the slot (voided, not re-creditable — defensible).
- `PERCENT_RECURRING` products (nova-pos) → `isOneTime = false` → every distinct charge creates a conversion. Only `WebhookEvent.reference` dedupes exact-duplicate events.
- `customerRef` is not unique (recurring charges legitimately differ only by reference).

Seed data (`prisma/seed.ts` = DB source of truth; keep `store.ts` DEFAULT_PRODUCTS in sync): operasch becomes `PERCENT_ONE_TIME`, rate `3000` bps, cap `40000`; nova-pos unchanged (`PERCENT_RECURRING`, `3000` bps, cap `50000`).

## 2. Webhook processor (one-time 30% logic)

File: `src/app/api/webhooks/paystack/route.ts`. Keep the existing dual-sig scheme (hub `x-hub-signature` → Paystack HMAC-SHA512) and the `NOVA-` prefix ignore.

**Retry-idempotence (fixes the existing wedge wart).** Today the event row is created
before processing, so any post-create failure + Paystack retry hits
`isUniqueViolation → { duplicate: true }` and the event is never processed. New flow:

1. Verify signature → 401 on failure.
2. Parse JSON → 400 on failure.
3. `webhookEvent.create(...)`. On P2002: **fetch the existing row by `reference`**.
   - `processed: true` → `{ ok: true, duplicate: true }` (already handled).
   - `processed: false` → **continue processing using the stored row's event/payload** (idempotent reprocessing). Never swallow an unprocessed event.
4. Event ≠ `charge.success` → mark processed → `{ ok: true, ignored: true }`.
5. `affCode = meta.affiliate_code ?? meta.ref`; none → processed → `{ ok: true, no_affiliate: true }`.
6. Affiliate lookup by code; missing or `status !== "APPROVED"` → processed → `{ ok: true, affiliate_not_found: true }` (+ loud log distinguishing missing vs suspended).
7. `slug = meta.product_slug ?? "nova-pos"` (fallback is load-bearing — no ScalMint sender exists); product missing → processed + `{ ok: true, product_not_found: true }` + loud log (200, **not** 400). `status !== "LIVE"` → processed + `product_not_live`.
8. `customerEmail = data.customer?.email`, trimmed + lowercased. Absent → processed + `{ ok: true, skipped_no_email: true }` + loud log. **No conversion row** — a commission without an attributable identity is unpayable. (The partial index's `IS NOT NULL` predicate is defense-in-depth, not a license to store nulls.)
9. Self-referral (`email === affiliate.email`) → create conversion with `status: REJECTED`, `commissionAmount: 0`, **no** totals increment, processed → `self_referral: true`. (Audit trail preserved; the row also occupies the one-time slot for that email, which is correct — that email *is* the affiliate.)
10. Commission via `calcCommission(amountPesewas, product)` (bps + cap clamp). Computed once at creation; one-time semantics match naturally.
11. **One `$transaction`** wrapping: one-time pre-check (`findFirst` on `customerEmail+productId` where `isOneTime`) → `conversion.create` (with `isOneTime` copied from product type) → `affiliate.update` (`totalConversions` +1, `totalEarned` += commission) → `webhookEvent.update { processed: true }`. A P2002 from the partial index → `duplicate_conversion: true`, processed, no create. Transaction failure → 500 (Paystack retries; step 3 makes that safe).
    - Recurring products skip the pre-check and create with `isOneTime: false`.
    - Totals semantics (unchanged from current behavior, documented): totals count **created** conversions including PENDING; approval flips status only. Known limitation: an admin REJECTED conversion leaves `totalEarned` overstated until the payout feature reconciles — noted, not silently fixed.

Response shape stays `{ ok: true, ...flags }`, adding `credited: n`.

## 3. OPERASCH attribution (cookie → metadata)

**Mechanism decision: link-tracker redirect route, not middleware, not client JS.**
Rejected alternatives: hooking OPERASCH's 430-line Clerk/canonical-host middleware
(shared hot file in a concurrently-edited worktree — clobber risk, many early returns
to reason about) and a client-side beacon (JS-dependent, layout edit). The redirect
route is additive-only, zero-JS, and mirrors the industry link-tracker pattern.

- New `src/app/api/affiliate/go/route.ts` (OPERASCH):
  - `GET /api/affiliate/go?ref=SCAL-XXXXXXXX&to=/optional-path`
  - Ref must match `^SCAL-[A-Z0-9]{8}$` → invalid → 302 `/` (no cookie).
  - Valid → set cookie `_aff_ref` (same name as ScalMint's `COOKIE_NAME`): httpOnly, `SameSite=Lax`, `Secure` in production, `path=/`, `maxAge` 30 days.
  - Best-effort click forwarding: `POST {SCALMINT_TRACK_URL}` (env; skip if unset) with `ref` + `product_slug=operasch`, 3s `AbortController` timeout, failure never blocks the redirect. ScalMint's track route validates the affiliate and logs the Click; its response is **not** trusted for cookie-setting — the webhook remains the authority.
  - `to` sanitized: must start with a single `/` (no `//`) → else `/`. 302 redirect.
- Shared constant `src/lib/affiliate-ref.ts`: `AFFILIATE_COOKIE_NAME = "_aff_ref"`.
- Subscribe route edit (`src/app/api/school/billing/subscribe/route.ts`, metadata build ~L103): read `_aff_ref` via `cookies()`; if present, inject `metadata.affiliate_code` and `metadata.product_slug: "operasch"` — never overwriting existing metadata keys. `createPaystackSubscription` (renewals) intentionally gets no metadata: attribution rides the first charge only, matching one-time semantics.
- Trust boundary: an unknown/expired code yields `affiliate_not_found` at the webhook — no credit, no harm. The cookie is format-validated only.
- New env: `SCALMINT_TRACK_URL` (optional).

**Cross-surface parity test:** a test feeds the exact metadata object OPERASCH's
subscribe route produces into ScalMint's webhook extraction logic and asserts with
`toEqual` that `affiliate_code`/`product_slug` resolve as expected.

## 4. VPS deployment (root@72.62.158.102)

- DB: create role `scalmint_app` + database `scalmint` inside `smartsos-db-1` (127.0.0.1:5433). `DATABASE_URL` points there.
- Deploy: clone repo to `/opt/scalmint`, `npm ci`, copy lightningcss binary if needed, `npx prisma migrate deploy`, `npm run db:seed` (tsx note: use `npx tsx` explicitly), `npm run build`, run on port **3002** via pm2 or systemd.
- Nginx vhost `scalmint.conf` (clone `smartsos.conf` pattern) + Certbot cert for `affiliate.scalmint.com`. `admin.scalmint.com` stays on Vercel.
- Env on VPS: `DATABASE_URL`, `AUTH_SECRET`, `PAYSTACK_SECRET_KEY`, `AFFILIATE_HUB_SECRET`, `HUB_SUBSCRIBER_OPERASCH_URL/_SECRET` (fan-out must still reach OPERASCH), `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_AFFILIATE_URL`, `NEXT_PUBLIC_ADMIN_URL`, `ADMIN_EMAIL/_PASSWORD/_NAME`, `MIN_PAYOUT_*`, `CRON_SECRET`.
- **Webhook cutover:** Paystack dashboard webhook URL → `https://affiliate.scalmint.com/api/paystack-webhook` (hub ingress; fans out to OPERASCH and to ScalMint's own attribution route, which accepts the hub signature). Vercel deployment stays up until the switch is verified, then DNS A record → 72.62.158.102.
- Verification before cutover: seed data present, a test charge produces exactly one PENDING conversion, duplicate delivery produces `duplicate: true`, renewal on operasch produces `duplicate_conversion`, renewal on nova-pos produces a new conversion.

## 5. Cron relocation

- VPS crontab (root): `0 2 * * * . /opt/scalmint/.env && curl -fsS -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3002/api/affiliate/cron/approve >> /var/log/scalmint-cron.log 2>&1`
- Remove the `vercel.json` cron entry only after the VPS cron is observed firing successfully (never both active, never neither).

## 6. Testing & verification

- Unit: `calcCommission` (bps, cap clamp); ref normalization.
- Webhook integration (mocked Prisma with **exact literal** call assertions): credited conversion; duplicate event (`processed: true` → `duplicate: true`; `processed: false` → reprocessed); renewal on one-time product → `duplicate_conversion`; renewal on recurring product → new conversion; self-referral; missing product (200 + `product_not_found`, event processed); null email (`skipped_no_email`, no row); bad signature (401); transaction failure (500).
- OPERASCH: `/api/affiliate/go` sets cookie + 302 (valid ref), 302 without cookie (invalid ref), `to` sanitization; subscribe route injects the exact metadata shape (`toEqual`).
- Cross-surface parity test (Section 3).
- Gates: focused vitest suites per touched module + `npx tsc --noEmit` in both repos; CI full suite is the completeness gate (ScalMint has no local full-run timeout issue, but follow its AGENTS.md: no dev server, no build).

## 7. Rollout order

1. ScalMint: schema + migration + `db.ts` PrismaClient + webhook processor + tests → green locally.
2. OPERASCH: `/api/affiliate/go` + cookie constant + subscribe injection + tests → green locally (pathspec-scoped commits; never stage foreign unstaged work).
3. VPS: DB + deploy + nginx + cert; verify with test charges.
4. DNS cutover; keep Vercel alive until confirmed.
5. Cron relocation; remove `vercel.json` cron.
6. OPERASCH staging browser QA of the full affiliate journey (link → cookie → subscribe → conversion visible in ScalMint).
