# affiliate.scalmint.com — DNS & Deploy

**Goal:** Affiliate program is served at `https://affiliate.scalmint.com` (public) + `affiliate.scalmint.com/dashboard` (auth).

## 1. Vercel project

Same repo `ScalMint` — add domain `affiliate.scalmint.com`:

```
Vercel Dashboard → Project ScalMint → Settings → Domains → Add affiliate.scalmint.com
```

Vercel will create TLS (Let's Encrypt) automatically. Keep `scalmint.com` + `www` + `pos.scalmint.com` + `smartsos.cloud` as separate projects or same monorepo rewrites (future).

## 2. DNS (Cloudflare / Registrar)

Add:

| Type | Name | Target | TTL |
|---|---|---|---|
| CNAME | affiliate | cname.vercel-dns.com | Auto |

If using Cloudflare, set proxy **OFF** (grey cloud) for initial verification, then you may turn ON after TLS is issued.

## 3. Middleware + Rewrites

`src/middleware.ts` handles `?ref=SCAL-XXXX` capture → `_aff_ref` cookie (30d) + click beacon.
`vercel.json` rewrites:

- `affiliate.scalmint.com/` → `/affiliate`
- `affiliate.scalmint.com/:path*` → `/affiliate/:path*`

This means affiliates can share `https://affiliate.scalmint.com/r/SCAL-A7F3K9PQ` and it still resolves to product links via `p` param.

## 4. Environment

In Vercel env (Production):

```
DATABASE_URL=postgresql://... (Neon/Supabase — not SQLite)
AUTH_SECRET=<32+ random>
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...
PAYSTACK_WEBHOOK_SECRET=<from dashboard>
NEXT_PUBLIC_APP_URL=https://affiliate.scalmint.com
CRON_SECRET=<random for /api/affiliate/cron/approve>
```

## 5. Cron

`0 2 * * *` — approves conversions older than 7 days (PENDING → APPROVED). Logs in Vercel Cron.

## 6. Webhook

Paystack Dashboard → Settings → Webhooks:

- URL: `https://affiliate.scalmint.com/api/webhooks/paystack`
- Events: `charge.success`, `transfer.success`, `transfer.failed`

Secret is verified via HMAC SHA512. Test with Paystack CLI.

## 7. Manual payouts

Enable **Manual Payouts** on Paystack Ghana dashboard (Registered business). Funds land in Balance; Transfer API moves to affiliates (MoMo GHS 1, bank GHS 8). Bulk via CSV if API limit hit.
