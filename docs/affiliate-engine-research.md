# Affiliate Engine Recommendation — ScalMint (Ghana / Paystack)

> **No code changed** — research & architecture recommendation only.
> Date: 2026-10-24 | Stack: Next.js + nextAdmin + Paystack Ghana

---

## 1) TL;DR — What we recommend

**Monorepo with Turborepo (shared packages) — not a separate repo.**

```
scalmint/
  apps/
    web/        # current landing (scalmint.com) — public, SEO, cached
    affiliate/  # affiliate marketing site + affiliate dashboard (affiliates.scalmint.com)
    admin/      # nextAdmin dashboard (admin.scalmint.com) — internal ops
  packages/
    ui/         # shared Tailwind + primitives (nav-pill, card, etc.)
    db/         # single Prisma schema & client
    auth/       # shared NextAuth / RBAC helpers
    paystack/   # Transfer, webhook, split helpers
```

**Why:** Your three surfaces share ~40%+ of code (design tokens, auth/RBAC, DB, Paystack client, affiliate link logic) but have **opposite deploy characteristics**. The landing is public + aggressively cached; the dashboards are authenticated on every request and never indexed [2](https://dev.to/mohamed_djoudir/i-built-a-full-stack-nextjs-16-e-commerce-monorepo-storefront-admin-nestjs-api-and-ai-try-on-2kbb). A shared build would make the landing pay for Recharts/data-grids it never uses. Turborepo gives you shared code without 3× the maintenance of separate repos [1](https://www.reddit.com/r/nextjs/comments/1oca889/best_way_to_structure_a_nextjs_app_with_landing/)[4](https://starterpick.com/guides/monorepo-vs-single-repo-boilerplates-2026).

**When to choose separate repos:** only if <20% code sharing or completely different teams/deploy cadences (store review vs. web) [7](https://getnextkit.com/blog/next-js-monorepo-vs-multi-repo-for-saas-the-50k-mistake-nobody-talks-about). You are not there — you're a small team with one domain and one DB.

---

## 2) Monorepo vs Separate Project — Decision matrix for ScalMint

| Criteria | **Monorepo (Recommended)** | Separate Project | Impact on ScalMint |
|---|---|---|---|
| **Code sharing** | `packages/ui`, `packages/db`, `packages/paystack` imported directly | Copy/paste or versioned npm packages | With 4 products (Nova POS, Operasch, Jarvis, JobFinder) you *will* update commission rates, tracking params, and email templates in lockstep — multi-repo = 3 PRs per feature [7](https://getnextkit.com/blog/next-js-monorepo-vs-multi-repo-for-saas-the-50k-mistake-nobody-talks-about) |
| **Auth & RBAC** | One `auth` package: `Customer` vs `Affiliate` vs `Staff` are different tables (no `isAdmin` boolean) → avoids privilege escalation [2](https://dev.to/mohamed_djoudir/i-built-a-full-stack-nextjs-16-e-commerce-monorepo-storefront-admin-nestjs-api-and-ai-try-on-2kbb) | Drift: auth logic duplicated, easier to ship a bypass | Critical — payouts = money movement |
| **Deploy** | Vercel: configure root directory per app + Turborepo remote cache. Slightly more setup, but zero-config per-app still works [4](https://starterpick.com/guides/monorepo-vs-single-repo-boilerplates-2026) | One-click per repo — simpler day-1 | You are solo/small team → worth the one-time config [1](https://www.reddit.com/r/nextjs/comments/1oca889/best_way_to_structure_a_nextjs_app_with_landing/) |
| **Landing isolation** | `apps/web` stays lean: no admin bundles shipped to public users | Perfectly lean too | Both win — but monorepo also keeps shared *tokens* in sync |
| **Multi-zone alternative** | Next.js Multi-Zones can combine separate apps on one domain (e.g., scalmint.com + scalmint.com/affiliate via rewrites) and *recommends* monorepo for sharing code [15](https://nextjs.org/docs/pages/guides/multi-zones)[10](https://medium.com/@livenapps/building-micro-frontends-with-next-js-and-module-federation-0e322230d751) | Manual npm linking | Monorepo aligns with Next.js docs |
| **Solo → scale path** | Start single-repo now, evolve to monorepo when sharing >20% — you are already at that threshold [4](https://starterpick.com/guides/monorepo-vs-single-repo-boilerplates-2026) | Stay single until painful | You have 3 logical apps today — start monorepo now; the overhead is 3 ports + CORS config [2](https://dev.to/mohamed_djoudir/i-built-a-full-stack-nextjs-16-e-commerce-monorepo-storefront-admin-nestjs-api-and-ai-try-on-2kbb) |

**Rule of thumb from the ecosystem:** *If route-based separation (`/admin` vs `/app`) is enough, stay single-repo; when you need separate apps with different caching/auth/builds, go monorepo* [9](https://medium.com/@sreehari9188/building-scalable-web-apps-with-next-js-why-i-chose-a-turborepo-monorepo-architecture-23a7446b0741)[6](https://www.freecodecamp.org/news/reusable-architecture-for-large-nextjs-applications/). ScalMint crossed that line: marketing + affiliate + admin are three apps.

### Recommended phased approach
1. **Now (weeks 1-2):** Keep `apps/web` as is. Scaffold `apps/affiliate` (public affiliate-program page → auth → affiliate dashboard) and `apps/admin` (fork `nextAdmin` template [5](https://github.com/NextAdminHQ/nextjs-admin-dashboard)). Share `packages/db` (Prisma) and `packages/ui`.
2. **Later (month 2+):** Extract `packages/paystack` (Transfers + webhook idempotency) and `packages/affiliate-core` (ref-code, attribution, commission engine) once duplicated.
3. **Do NOT split mobile vs. web:** Mobile-money users are >15M MTN MoMo in Ghana [1](https://www.usearticle.com/affiliate-marketing-in/ghana) — build mobile-first responsive, not a separate PWA yet.

---

## 3) How Affiliate Programs *Actually* Work in Africa & Ghana — Research Synthesis

### Market reality
- Ghana: ~33M people, >23M internet users, $1-2B e-commerce, **MTN Mobile Money dominant (15M+ users)** [1](https://www.usearticle.com/affiliate-marketing-in/ghana). Mobile-first is non-negotiable — affiliates share via WhatsApp/Instagram/TikTok on phone [17](https://selar.com/blog/is-affiliate-marketing-worth-it-in-ghana/).
- Commission models seen locally [8](https://paripesa-ghana.org/affiliate/)[3](https://clingi.com/affiliate):
  - **Revenue Share:** 25–40% in betting; 5–10% in B2B/marketplaces (Clingi: 5% up to GHS 50/100; HSE Market: 5% up to GHS 10k/mo) [12](https://hsemarketgh.com/affiliate-program/)
  - **CPA:** GHS 5–10 for verified signup/first purchase (Clingi), GHS 60–600 per FTD in betting [8](https://paripesa-ghana.org/affiliate/)
  - **Hybrid:** rev-share + CPA on request — common for high-ticket B2B
- Cookie durations: 30 days is Ghana standard (Jumia Ghana 30d, HostAfrica 30d) [4](https://trakaff.com/affiliate-program/affiliate-programs-in-ghana)[8](https://www.hostafrica.com.gh/blog/affiliates/hostafrica-ghana-affiliate-commissions-payout-guide/); some digital goods do 60d [2](https://uppromote.com/affiliate-programs/ghana/). Long tracking is less useful — Ghanaian buyers often deliberate with family, but 30d captures 95% of conversions.

### Payout expectations in Ghana
- **Method = MTN MoMo first**, then Vodafone Cash / AirtelTigo Money, then bank. Jumia Ghana pays bank monthly [2](https://uppromote.com/affiliate-programs/ghana/); Melbet Ghana minimums: MoMo GHS 100, bank GHS 500 [13](https://melbet-ghana.com/affiliate/); HSE Market: GHS 100 via MoMo end-of-month [12](https://hsemarketgh.com/affiliate-program/); Paripesa: Paystack GHS 200, MoMo GHS 100 [8](https://paripesa-ghana.org/affiliate/).
- **Thresholds:** Most Ghana programs set GHS 50–200 for MoMo, GHS 100–500 for bank — low enough to keep micro-influencers motivated, high enough to avoid GHS 1 dust payouts.
- **Schedule:** Monthly (15th) is standard [3](https://clingi.com/affiliate)[5](https://uppromote.com/best-affiliate-programs/ghana/); top programs offer bi-weekly/weekly for trusted affiliates [21](https://grodital.com/affiliate-agreement).
- **KYC:** Ghana Card or national ID required for affiliates everywhere (Clingi, HostAfrica) [3](https://clingi.com/affiliate)[8](https://www.hostafrica.com.gh/blog/affiliates/hostafrica-ghana-affiliate-commissions-payout-guide/).

### What makes Ghana different from US/EU
- **MoMo penetration > bank accounts.** Designing only for bank transfer excludes 60%+ of affiliates. Even UpPromote notes: mobile-first tracking + MoMo payouts are table stakes [5](https://uppromote.com/best-affiliate-programs/ghana/).
- **Offline tolerance:** Power/network interruptions common — Clingi-style terms explicitly allow manual review windows for returns [17](https://selar.com/blog/is-affiliate-marketing-worth-it-in-ghana/). Your dashboard needs “Pending → Approved → Paid” states, not instant payout.
- **Cash pickup exists** for unbanked affiliates [5](https://uppromote.com/best-affiliate-programs/ghana/) — you can ignore v1, but keep `payment_method` enum extensible.

---

## 4) Paystack in Ghana — What You Must Engineer For

### Paystack is a *gateway*, not an affiliate network
Paystack offers **no native affiliate marketing feature** [1](https://selar.com/blog/paystack-vs-selar/) — you build tracking yourself and use Paystack only to **collect** (Checkout/Transaction API) and **disburse** (Transfer API). Both directions use same keys/webhooks [5](https://www.mctaba.com/learn/paystack/paystack-the-complete-engineering-guide-for-african-developers).

### Pricing & settlement (Ghana)
- Collect: **1.95% flat** for local & international cards, MoMo, bank transfer [4](https://paystack.com/gh/pricing)[15](https://support.paystack.com/en/articles/2130306). No upfront/monthly fee.
- Settle: **T+1 (next working day)** to bank or MoMo [13](https://support.paystack.com/en/articles/2123586). Friday/Saturday → Monday (skips weekends/holidays) [11](https://www.maxmegroup.com/learn/paystack-vs-hubtel-vs-expresspay).
- Payout thresholds: **Bank: GHS 50 minimum**; **MoMo: no minimum** [4](https://paystack.com/gh/pricing)[9](https://www.lilachbullock.com/paystack-in-ghana/). Below GHS 50 to bank → GHS 5 fee [26](https://support.paystack.com/en/articles/2123586).
- **Starter vs Registered:** Starter = Ghana Card + TIN + personal bank/MoMo, **GHS 30,000 lifetime cap**, **cannot send Transfers** [11](https://www.maxmegroup.com/learn/paystack-vs-hubtel-vs-expresspay). To pay affiliates you **must be Registered** (corporate bank/MoMo matching registration docs + GPS address proof) [17](https://support.paystack.com/en/articles/2125314).

### Disbursement costs (crucial for unit economics)
- Transfer to **MoMo: GHS 1** per transfer; to **bank: GHS 8** per transfer [12](https://paystack.com/gh/pricing)[21](https://www.lilachbullock.com/paystack-in-ghana/).
- Bulk transfers via API/CSV supported [1](https://support.paystack.com/en/articles/2132866) — **always prefer MoMo** for affiliate payouts (8× cheaper). Enforce MoMo as default; bank only for affiliates >GHS 5k/month who request it.
- Limits: single transfer min **GHS 1**, max **GHS 100k** [2](https://paystack.com/blog/product/transfers-in-gh); bulk max per account **GHS 50k** before split [1](https://support.paystack.com/en/articles/2132866).

### Manual Payouts & Balance
Ghanaian Registered businesses can enable **Manual Payouts**: funds sit in Paystack Balance (credited next day, even weekends/holidays) and you **Transfer** out on your schedule; must do ≥1 transfer per 90 days or Paystack auto-settles [10](https://techpoint.africa/2024/01/18/paystack-transfer-merchants-ghana/)[28](https://support.paystack.com/en/articles/2131074). This is how you batch affiliate commissions and avoid auto-draining settlement.

### Split Payments — when (not) to use them
Paystack can auto-split a transaction to **subaccounts** at collection time:
- Create subaccount per vendor → pass `subaccount` or `split_code` at `initialize` → Paystack settles each party directly on T+1 [3](https://paystack.com/docs/payments/split-payments/)[5](https://www.mctaba.com/learn/paystack/paystack-split-payments-and-marketplaces-complete-guide).
- Multi-split (1 main + N subaccounts) supported; share by % or flat, fee bearer = `account|subaccount|all` [14](https://paystack.com/docs/api/split/)[15](https://paystack.com/docs/payments/multi-split-payments/).

**But for affiliate commissions, do NOT use split at checkout.** Why:
- Affiliate should be paid **after** customer payment is confirmed, not atomically at checkout — you need fraud/returns window (Clingi: item delivered & accepted) [3](https://clingi.com/affiliate). Split is irrevocable at settlement.
- Your commission rate may be conditional (tiered, first-purchase only, cap at GHS 50/100) [3](https://clingi.com/affiliate) — split needs fixed % at init.
- Ghana split is same-country only; cross-border affiliate (e.g., Nigerian promoter) can’t be a GHS subaccount [5](https://www.mctaba.com/learn/paystack/paystack-split-payments-and-marketplaces-complete-guide).

**Use Transfer post-settlement** for affiliates — same as every major Ghana program (Paripesa, Melbet list Paystack as payout rail, not split) [8](https://paripesa-ghana.org/affiliate/)[13](https://melbet-ghana.com/affiliate/).

---

## 5) Blueprint — Affiliate Engine for Nova POS / Operasch / Jarvis / JobFinder

### Attribution (works in Ghana’s network conditions)
- **Primary:** `?ref=SCAL-8CHAR` (e.g., `?ref=SCAL-A7F3K9PQ`) stored in:
  - `HttpOnly` cookie `_aff_ref` (30d, SameSite=Lax) — standard in Ghana [4](https://trakaff.com/affiliate-program/affiliate-programs-in-ghana)
  - `localStorage` fallback (Safari ITP)
  - Server-side: link click → `aff_clicks` table (IP, UA, fingerprint, timestamp) → redirect with click_id
- On **Paystack webhook `charge.success`**, lookup click → create `aff_conversions` with `status=pending`. This survives ad-blockers that kill client JS — critical for WhatsApp traffic.
- Idempotency: `reference` = `aff_<conversionId>`; deduplicate on webhook re-delivery (Paystack retries).

### Commission models per product
| Product | Model | Example rate | Cap / rule |
|---|---|---|---|
| Nova POS (live, pos.scalmint.com) | RevShare recurring | 20–30% of subscription for 6–12 months | First 12 months, churn stops commission |
| Operasch (live, smartsos.cloud) | RevShare + CPA | GHS 50 on verified workspace + 15% MO subscription | Must invite ≥3 teammates |
| Jarvis (coming soon) | Lead CPA (waitlist) | GHS 5 per verified student email | Ghana phone verified |
| JobFinder (coming soon) | CPA | GHS 10 per first posted job | Job must go live ≥7d |

These mirror Ghana benchmarks: 5–25% for SaaS/hosting [2](https://uppromote.com/affiliate-programs/ghana/)[8](https://www.hostafrica.com.gh/blog/affiliates/hostafrica-ghana-affiliate-commissions-payout-guide/), GHS 5–10 for verified actions [3](https://clingi.com/affiliate).

### State machine (Ghana-proof)
```
Click → Conversion (pending 7d) → Approved (returns window passed) → Due → Paid → Reconciled
                              ↘ Rejected (duplicate / fraud / refund)
```
- **Why delay:** Paystack settles T+1 but customer may refund/chargeback or (for marketplace) cancel within days. Ghana programs explicitly hold until item delivered [3](https://clingi.com/affiliate).
- Dashboard shows `Pending` with estimated payout date — aligns with “15th of following month” expectation [3](https://clingi.com/affiliate)[12](https://hsemarketgh.com/affiliate-program/).

### Payout flow (Paystack Ghana)
1. Enable **Manual Payouts** on your Registered Paystack GH business so settlements land in **Balance** [28](https://support.paystack.com/en/articles/2131074).
2. Nightly job: aggregate `Approved` conversions → create `payouts` batch.
3. For each affiliate: **Create Transfer Recipient** first (type `mobile_money` = preferred, `ghipss` = bank) [7](https://paystack.com/docs/transfers/bulk-transfers/) → **Initiate Transfer** `GHS 1` fee to MoMo [21](https://www.lilachbullock.com/paystack-in-ghana/).
4. On webhook `transfer.success` → mark `Paid`, store `transfer_code`; on `transfer.failed` → retry with corrected account (use Resolve Account Number API before retry [2](https://paystack.com/blog/product/transfers-in-gh)).
5. Bulk CSV fallback for finance team via Dashboard bulk upload when API batch >500 [1](https://support.paystack.com/en/articles/2132866).

**Unit math:** If avg affiliate earns GHS 80 and you have 500 payouts → MoMo cost = 500×GHS1 = GHS500; bank = GHS4000. Always default to MoMo [21](https://www.lilachbullock.com/paystack-in-ghana/).

### Fraud & compliance (Ghana)
- Require **Ghana Card KYC** + MoMo name match before first payout (every Ghana affiliate program does) [3](https://clingi.com/affiliate)[22](https://hasmia.com/gha/affiliates/).
- Block: self-referral (same IP/device/email), brand-bidding, spam/incentivized clicks — standard prohibited sources [19](https://paripesa-ghana.org/affiliate/).
- Legal: Electronic Transactions Act 2008, Data Protection Act 2012 (Data Protection Commission), Bank of Ghana MoMo regs [1](https://www.usearticle.com/affiliate-marketing-in/ghana). Store consent + log retention.

---

## 6) Where nextAdmin Fits

nextAdmin is a **Next.js + Tailwind admin template with 200+ components, prebuilt analytics/ecommerce/CRM dashboards, dark/light, Prisma/NextAuth-ready** [5](https://github.com/NextAdminHQ/nextjs-admin-dashboard)[14](https://adminlte.io/blog/crm-dashboard-templates/). Use it as **scaffold** for `apps/admin`, not business logic:

- **Keep:** layout, tables (affiliates, conversions, payouts), charts (revenue vs commission), forms (approve/reject), calendar (payout schedule).
- **Replace:** demo data with your Prisma models (`Affiliate`, `Click`, `Conversion`, `Payout`, `Product`). nextAdmin Pro ships Prisma + PostgreSQL wired [14](https://adminlte.io/blog/crm-dashboard-templates/) — align your schema to it.
- **Affiliate dashboard is separate:** nextAdmin is *admin-only* (staff views every affiliate). Affiliates get a stripped `apps/affiliate` dashboard (my links, clicks, earnings, payout method) — **do not expose admin to affiliates** (different tables/tokens) [2](https://dev.to/mohamed_djoudir/i-built-a-full-stack-nextjs-16-e-commerce-monorepo-storefront-admin-nestjs-api-and-ai-try-on-2kbb).

---

## 7) Recommendation Summary for ScalMint

| Decision | Choice | Rationale |
|---|---|---|
| **Repo** | **Monorepo (Turborepo + pnpm)** | Landing + affiliate + admin share DB/auth/UI; multi-zone on scalmint.com/* is possible via rewrites but code-sharing demands monorepo [15](https://nextjs.org/docs/pages/guides/multi-zones)[10](https://medium.com/@livenapps/building-micro-frontends-with-next-js-and-module-federation-0e322230d751) |
| **Affiliate site** | `apps/affiliate` (public page + auth’d dashboard on same app, route-group isolated) | Keeps affiliate auth separate from admin staff auth; avoids `isAffiliate` boolean escalation [2](https://dev.to/mohamed_djoudir/i-built-a-full-stack-nextjs-16-e-commerce-monorepo-storefront-admin-nestjs-api-and-ai-try-on-2kbb) |
| **Admin** | `apps/admin` from **nextAdmin** | Fastest to production-grade tables/charts; you focus on commission logic, not UI kit [5](https://github.com/NextAdminHQ/nextjs-admin-dashboard) |
| **Payments** | **Paystack Ghana Registered** + **Manual Payouts** + **Transfers to MoMo (GHS1)** | T+1 settlement, no affiliate split, batch via Bulk Transfer API [12](https://paystack.com/gh/pricing)[28](https://support.paystack.com/en/articles/2131074)[7](https://paystack.com/docs/transfers/bulk-transfers/) |
| **Thresholds** | **GHS 50 MoMo, GHS 100–200 bank**, monthly (15th) | Matches Ghana market expectation [3](https://clingi.com/affiliate)[8](https://paripesa-ghana.org/affiliate/) — low enough for micro-influencers |
| **Tracking** | server-side click_id + 30d cookie | Survives WhatsApp in-app browser; 30d is Ghana standard [4](https://trakaff.com/affiliate-program/affiliate-programs-in-ghana) |

### Immediate next steps (no code today)
1. **Register Paystack Ghana as Registered Business** (corporate bank + GPS address + GRA TIN) — otherwise you cannot Transfer to affiliates [11](https://www.maxmegroup.com/learn/paystack-vs-hubtel-vs-expresspay)[17](https://support.paystack.com/en/articles/2125314).
2. **Apply for Manual Payouts** via Paystack support — hold funds in Balance for nightly affiliate payout job [28](https://support.paystack.com/en/articles/2131074).
3. **Scaffold monorepo:** `pnpm dlx create-turbo@latest` → migrate current `ScalMint` to `apps/web` → create `apps/affiliate` + `apps/admin` (nextAdmin).
4. **Draft Terms:** 30d cookie, GHS 50 min, MoMo default, 7d pending, Ghana Card KYC — copy adapted from Clingi/HSE Market terms already validated in Ghana [3](https://clingi.com/affiliate)[12](https://hsemarketgh.com/affiliate-program/).

---

### References
- Paystack has no affiliate network; you build it [selar.com/blog](https://selar.com/blog/paystack-vs-selar/)
- Ghana: 1.95% fee, T+1, bank GHS 50 / MoMo no min [paystack.com/gh/pricing](https://paystack.com/gh/pricing)[support.paystack.com](https://support.paystack.com/en/articles/2123586)
- Starter cap GHS 30k, cannot Transfer [maxmegroup.com](https://www.maxmegroup.com/learn/paystack-vs-hubtel-vs-expresspay)
- Manual Payouts Ghana [support.paystack.com](https://support.paystack.com/en/articles/2131074) + blog [techpoint.africa](https://techpoint.africa/2024/01/18/paystack-transfer-merchants-ghana/)
- Transfer costs: MoMo GHS1, bank GHS8 [paystack.com/gh/pricing](https://paystack.com/gh/pricing)[lilachbullock.com](https://www.lilachbullock.com/paystack-in-ghana/)
- Ghana affiliate market: MoMo 15M users [usearticle.com](https://www.usearticle.com/affiliate-marketing-in/ghana), Jumia 30d, 9% [trakaff.com](https://trakaff.com/affiliate-program/affiliate-programs-in-ghana)[uppromote.com](https://uppromote.com/affiliate-programs/ghana/), Clingi GHS5/10, GHS50 threshold [clingi.com](https://clingi.com/affiliate), HSE Market 5% GHS100 [hsemarketgh.com](https://hsemarketgh.com/affiliate-program/)
- Turborepo/monorepo guidance [r/nextjs](https://www.reddit.com/r/nextjs/comments/1oca889/best_way_to_structure_a_nextjs_app_with_landing/)[dev.to](https://dev.to/mohamed_djoudir/i-built-a-full-stack-nextjs-16-e-commerce-monorepo-storefront-admin-nestjs-api-and-ai-try-on-2kbb)[starterpick.com](https://starterpick.com/guides/monorepo-vs-single-repo-boilerplates-2026)[getnextkit.com](https://getnextkit.com/blog/next-js-monorepo-vs-multi-repo-for-saas-the-50k-mistake-nobody-talks-about)
- nextAdmin [github.com/NextAdminHQ](https://github.com/NextAdminHQ/nextjs-admin-dashboard)
