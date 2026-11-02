# ScalMint Ops Console — Design Specification

- Status: Approved (self-reviewed 2026-11-02); §13 defaults apply until the operator overrides them
- Date: 2026-11-02
- Scope: Product specification and implementation contract. No implementation plan, no code.
- Predecessor: `docs/superpowers/specs/2026-10-29-scalmint-affiliate-production-design.md` (affiliate programme, already built).
- Research inputs: four read-only reports — product scope (CEO lens), architecture/data feasibility (engineering-manager lens), NextAdmin template inventory, OPERASCH superadmin inventory.

---

## 1. Thesis

ScalMint sells and operates several products at once: OPERASCH (school SaaS), Nova POS (retail POS), client websites, and custom web apps. Today the ops dashboard at `admin.scalmint.com` only administers the affiliate programme, and OPERASCH carries a separate superadmin dashboard whose telemetry is dead and whose revenue numbers are wrong. That split is the problem.

This spec defines one **Ops Console** that is:

1. **Portfolio-first** — every product is a first-class project with its own health, performance, revenue, customers, and work.
2. **Project-scoped by default** — a persistent project switcher (Vercel's project switcher is the reference pattern) changes the scope of every screen without ambiguity.
3. **Honest** — no metric renders without a unit, a window, a source, and an as-of time. "No data", "stale", and "zero" are different states and look different.
4. **Actionable** — every exception becomes a task or a named decision; no orphan dashboards.
5. **The retirement path for OPERASCH superadmin** — parity is proven here before the old dashboard is switched off, and no school history is deleted in the process.

The console is a **read model and command surface**, not a system of record. Products remain authoritative; the console stores normalized facts for trends, health, and audit.

### 1.1 Success criteria

- The operator can answer "what is broken, unpaid, or expiring today?" from `/admin` in under 10 seconds.
- Switching to a project answers "is it healthy, is it growing, what needs attention?" without leaving that project's scope.
- No console number contradicts the product it describes; disagreements are visible as reconciliation warnings, not hidden.
- Retiring the OPERASCH superadmin removes zero capabilities beyond those explicitly retired in §8.3 and loses zero history.
- A single operator can run the portfolio review in under 3 hours per week.

---

## 2. Scope and non-goals

### 2.1 In scope

- Project registry and lifecycle for every ScalMint offering.
- Per-project health checks, synthetic performance, SLO/error budget, incidents, and alerts.
- Cross-project portfolio overview and cross-project work queue.
- Subscriptions, revenue, collections, and product-level margin inputs.
- Customers/tenants with product-specific detail; OPERASCH school management parity.
- CRM/pipeline, marketing/attribution, affiliates, AI usage, tasks, calendar, assets/renewals.
- Console operators, roles, service tokens, audit, data export/privacy workflows.
- Restoration of the reusable NextAdmin pages/components that serve these jobs.

### 2.2 Out of scope for v1

- General ledger, payroll, inventory, or point-of-sale operations.
- A full helpdesk, chat, email client, or marketing automation engine.
- Replacing Sentry/APM; the console ingests summaries and runs synthetic checks only.
- A BI/report builder, custom dashboards, or arbitrary SQL.
- White-label client portal, mobile app, SMS/WhatsApp campaign blasting.
- Multi-touch attribution or ML forecasting.
- Direct read/write access to product databases except documented break-glass reads.

### 2.3 Naming

- **Project**: a product or client engagement being monitored (OPERASCH, Nova POS, a website, a web app).
- **Component**: a monitored subsystem of a project (web, API, worker, database, payments, auth, cron).
- **Tenant**: a customer account inside a product (a school, a POS merchant, a website client).
- **Operator**: a ScalMint staff member who uses the console. Operators are not tenant users.

---

## 3. Personas, roles, jobs

### 3.1 Operators and permissions

Console identity is separate from product identity. OPERASCH Clerk users never log into the console.

| Role | Read | Write | Operator management | Notes |
|---|---|---|---|---|
| OWNER | All | All | Yes | Single primary operator; cannot be removed by ADMIN |
| ADMIN | All | All except operator role changes | No | Can manage projects, checks, tenants, billing actions |
| ANALYST | All | No writes | No | Read-only, can export |
| SUPPORT | All | Tenant support actions only (acknowledge alert, create task, open product support link) | No | No plan, billing, or delete access |

Rules:
- Every write is server-authorised by role and project scope, never by a client capability flag.
- Project-scoped grants are a v1.1 extension; v1 is portfolio-wide per role.
- Permission changes increment `sessionVersion`, invalidating existing sessions.

### 3.2 Jobs-to-be-done

| Job | Cadence | Budget | The question the console must answer |
|---|---|---|---|
| Morning triage | Daily | 10 min | What is broken, unpaid, or expiring today? |
| Support queue | Daily | 15 min | Which customer is blocked, and what is oldest? |
| Sales follow-up | Daily | 20 min | Who must I contact today to save or close a deal? |
| Delivery queue | Daily | 10 min | What did I promise, what is overdue, what is blocked? |
| Cash and collections | Weekly | 30 min | What came in, what is owed, who do I chase? |
| Pipeline review | Weekly | 30 min | Will I hit next month's target, and where is the gap? |
| Product health | Weekly | 20 min | Which product is degrading or eating support time? |
| Marketing review | Weekly | 30 min | Which channel produced customers per cedi, and what should I stop? |
| Monthly close | Monthly | 90 min | Revenue, cost, margin, and churn by project — what changed? |
| Team and access | Monthly | 30 min | Who has access, who is overloaded, what is the bus factor? |
| Affiliate payout | Monthly | 30 min | What do I owe, to whom, and is it fraud-free? |
| Lifecycle review | Quarterly | 2–3 hrs | Which products do I invest in, maintain, or sunset? |
| Audit and compliance | Quarterly/as needed | 60 min | Can I prove who did what and honour a data request? |

---

## 4. Information architecture

### 4.1 Scope model

Three scopes, always explicit:

1. **Portfolio** (`/admin`) — cross-project aggregation and global operations.
2. **Project** (`/admin/p/{projectKey}`) — one product, all of its surfaces.
3. **Component** (`/admin/p/{projectKey}/health?component=api`) — a filtered view of a project.

Every API response and page declares its scope. A project-scoped page never renders a row from another project. Portfolio aggregates are recomputed from facts and labelled "across N projects".

### 4.2 URL contract

Portfolio:
- `/admin` — portfolio overview
- `/admin/projects` — project registry and lifecycle
- `/admin/work` — cross-project work queue (tasks, incidents, renewals)
- `/admin/team` — operators, roles, access review
- `/admin/programme` — affiliate programme group (existing affiliates, commissions, conversions, products)
- `/admin/audit` — audit log with project filter
- `/admin/settings` — integrations, alert channels, retention, system

Project:
- `/admin/p/{key}` — project overview
- `/admin/p/{key}/health` — health, performance, SLOs, incidents
- `/admin/p/{key}/analytics` — usage, activation, funnels, AI
- `/admin/p/{key}/revenue` — subscriptions, revenue, collections
- `/admin/p/{key}/customers` — tenants
- `/admin/p/{key}/customers/{tenantId}` — tenant detail
- `/admin/p/{key}/pipeline` — CRM/leads
- `/admin/p/{key}/marketing` — campaigns, attribution, affiliates
- `/admin/p/{key}/calendar` — renewals, launches, maintenance, term dates
- `/admin/p/{key}/tasks` — project work queue
- `/admin/p/{key}/assets` — domains, TLS, hosting, licences, API keys (metadata only)
- `/admin/p/{key}/settings` — project config, checks, integrations, archive

Compatibility:
- Existing `/admin/affiliates`, `/admin/commissions`, `/admin/conversions` keep working; they render the global programme views and are linked from `/admin/programme`.
- `/admin/login` remains the only unauthenticated admin route.
- `/admin/profile` is repaired: tabs live under `/admin/profile/{account|notifications|security}` with an `/admin/profile` index and a shared layout.
- Redirects: `/admin/products` → `/admin/programme/products`; unknown project key → 404 page with a project switcher, never a silent fallback to portfolio.

Query parameters (validated server-side, preserved across refresh):
- `range`: `24h | 7d | 30d | 90d | mtd | qtd | ytd` (default `30d` on project dashboards, `mtd` on revenue)
- `env`: `prod | staging` (default `prod`)
- `component`: component key
- `status`, `plan`, `q`, `cursor` for tables

### 4.3 Project switcher

Reference pattern: Vercel's "Find Project..." switcher. This is the primary navigation control, not a filter.

Placement:
- Sidebar header, directly below the brand, full width, 40px height.
- Shows the project mark (favicon or two-letter monogram), project name, and a chevron. In portfolio scope it shows a grid icon and "All projects".

Open state:
- Popover anchored to the trigger on desktop, bottom sheet on mobile.
- Minimum width 320px, maximum 480px, maximum height 60vh with internal scroll.
- Search input auto-focused, placeholder "Find project…".
- Groups, in order: **All projects**; **Pinned**; **Recent** (last 5, excluding pinned); **All projects** (alphabetical).
- Each row: 20px mark, name, kind badge (`SaaS`, `POS`, `Website`, `Web app`), worst-status indicator (icon + text: Up, Degraded, Down, Unknown), and a check for the active project.
- Footer: "Create project" and "Manage projects".
- Empty state (no projects): a short explanation and a "Create project" button.

Behaviour:
- Selecting a project navigates to `/admin/p/{key}`. If the current section exists for that project, navigate to the same section instead.
- Selecting "All projects" returns to `/admin`.
- The last selected scope is remembered per operator, but the URL always wins on load.
- `Ctrl/Cmd+K` opens the command palette, whose first group is "Switch project" (same list, keyboard-navigable).
- Keyboard: type to filter; Up/Down to move; Enter to select; Esc to close and restore focus to the trigger.
- Search matches name, key, domain, and kind; matches are highlighted.
- Switching cancels in-flight requests with `AbortController` and scopes React Query keys by project so no stale row from the previous project flashes.
- Status is derived from the worst active component: `DOWN` > `DEGRADED` > `UNKNOWN` > `UP`. A project with no checks is `UNKNOWN`, never `UP`.

Accessibility:
- Trigger is a button with `aria-haspopup="dialog"` and an accessible name that includes the current scope.
- The popover is a labelled dialog with a listbox; `aria-activedescendant` tracks the highlighted row; focus is trapped; Esc closes; focus returns to the trigger.
- The active row uses `aria-selected="true"` in addition to the check icon.

Deep-link behaviour:
- `/admin/p/{key}` with an invalid key returns a 404 that includes the switcher, not a redirect.
- A project that is archived is readable in "Archived" mode, with a persistent banner and a "Restore" action for OWNER/ADMIN.

### 4.4 Navigation map

Portfolio sidebar:
- Dashboard: Portfolio overview
- Products: Projects, Work queue
- Programme: Affiliates, Commissions, Conversions, Products
- Organisation: Team and access, Audit log
- Settings

Project sidebar (scope shown in the switcher):
- Overview
- Health and performance
- Analytics
- Revenue and subscriptions
- Customers
- Pipeline
- Marketing
- Calendar
- Tasks
- Assets and renewals
- Settings (+ Affiliates tab where the project has an affiliate programme)

The project sidebar never shows programme-wide pages; those live in portfolio scope.

### 4.5 Template restoration map

The local NextAdmin copy has 23 admin routes; the demo has 52. The primitive component layer is largely complete. Restore the **pages that serve a job**, reuse the rest as components inside real screens.

| Demo item | Decision | Content |
|---|---|---|
| Dashboard → E-commerce | Repurpose | Portfolio overview / project overview. Remove the storefront demo data. |
| Dashboard → Analytics | Restore | Project analytics: activation, usage, funnels, retention. |
| Dashboard → Marketing | Restore | Campaigns, attribution, affiliate performance tab. |
| Dashboard → CRM | Restore as Pipeline | Leads, stages, next action, value, stale deals. |
| Dashboard → Stocks | Repurpose as Assets and renewals | Domains, TLS, hosting, licences, API key metadata, renewal dates. |
| Dashboard → AI | Restore as an Analytics tab | Usage, failure rate, cost per tenant, top intents. |
| Dashboard → SaaS | Restore as Revenue / Subscriptions | Plans, tenants, MRR/ARR, churn, past due. |
| Calendar | Restore | Renewals, launches, maintenance windows, term dates; month/week/day views. |
| Profile | Restore and fix | Account, notifications, security; shared layout and working routes. |
| Manage Team | Restore as Team and access | Console operators, roles, last login, access review. |
| Task → List | Restore as Work queue | Global and project-scoped lists, filters, bulk actions. |
| Task → Kanban | Restore | Board with status columns; drag-and-drop only if a maintained library is adopted; keyboard move actions are mandatory either way. |
| Forms → Form Elements | Keep as a hidden reference route | Not in ops nav; used for component QA. |
| Forms → Form Layouts | Reuse compositions only | Do not ship a demo page. |
| Tables → Basic Tables | Keep, hidden | Table patterns reused in customers and work queue. |
| Tables → Data Tables | Restore as a shared DataTable | Sorting, filtering, pagination, column visibility, saved views. |
| Pages → Billing and Plan | Reuse components | Billing/plan surfaces are part of Revenue and project settings, not a demo page. |
| Pages → Connected Apps | Reuse components | Integration cards under Settings. |
| Pages → File Manager | Drop | Replaced by Assets and renewals (metadata only). |
| Pages → Pricing Tables | Drop from nav | Marketing site owns pricing. |
| Pages → Error, Mail Success, Terms | Keep, hidden | Reused for error and confirmation states. |
| Pages → Teams | Reuse components | Team directory patterns. |
| Pages → Coming Soon, Maintenance | Drop from nav | Use only if a project needs a holding page. |
| Support → Chats, Email | Drop | Not a helpdesk; support is tasks plus product deep links. |
| Invoice → Payment, Business | Reuse components | Invoice and receipt display inside Revenue. No new invoicing engine. |
| Authentication → Sign In/Sign Up/Reset/2FA | Drop | Console auth is operator-only and singular; no public signup. |
| UI Elements (Accordion, Alerts, Avatars, Badges, Buttons, Breadcrumbs, Cards, Carousels, Dialogs, Dropdowns, Pagination, Popovers, Progress, Tabs, Tooltips) | Keep as components | Showcase routes are hidden reference pages, not ops navigation. |
| Charts (Line, Bar, Pie) | Keep | Reused in analytics, revenue, and health. |

Assets already present locally: `public/images/team`, `models`, `cycles`, `blog-img`. No NextAdmin images are missing.

Known structural fixes required by restoration:
- Breadcrumbs and demo links assume root paths; all restored pages must use `/admin`-prefixed URLs.
- `/admin` is currently the e-commerce page while the nav calls it "Overview"; the overview replaces it.
- Profile sub-links omit `/admin` and the route redirects incorrectly; fix the layout and links.
- Auth demo pages must not be restored under `/admin`; the middleware exemption stays limited to `/admin/login`.
- The header user menu's dead "Billing and Plan" link is removed or points at the project Revenue page.

---

## 5. Domain model and data contracts

All new tables live in the console's Prisma schema, additive, with soft references to product data. No foreign keys cross into product databases. Times are stored in UTC; project-local time is used only for display and business-day boundaries.

### 5.1 Project registry

**Project**
- `id` (cuid), `key` (slug, unique, immutable), `name`, `kind` (`SAAS|POS|WEBSITE|WEBAPP|INTERNAL|SERVICE`), `status` (`ACTIVE|PAUSED|ARCHIVED`), `lifecycleStage` (`IDEA|BUILD|LAUNCH|GROW|MAINTAIN|SUNSET`)
- `description`, `ownerOperatorId`, `currency` (ISO 4217), `timezone` (IANA)
- `homepageUrl`, `repoUrl?`, `docsUrl?`, `supportUrl?`
- `criticality` (`P1|P2|P3`), `revenueBasis` (`SUBSCRIPTION|LICENCE|PROJECT|RETAINER|INTERNAL`)
- `createdAt`, `updatedAt`, `archivedAt?`
- Indexes: unique `key`; `(status, lifecycleStage)`.

**ProjectComponent**
- `id`, `projectId`, `key`, `name`, `type` (`WEB|API|WORKER|DATABASE|PAYMENTS|AUTH|CRON`), `criticality` (`P1|P2|P3`), `createdAt`
- Unique `(projectId, key)`; index `(projectId, type)`.

**ProjectServiceToken**
- `id`, `projectId`, `name`, `tokenHash` (unique), `scopes` (`INGEST_WRITE`, `ENTITY_READ`), `lastUsedAt?`, `createdAt`, `revokedAt?`
- Tokens are shown once at creation, stored hashed, and rotatable.

### 5.2 Health and probes

**ProjectCheck** (definition)
- `id`, `projectId`, `componentId`, `key`, `type` (`HTTP|HEARTBEAT|DNS|TLS|WEBHOOK_FRESHNESS|CRON_FRESHNESS|INGEST_FRESHNESS`)
- `targetUrl?`, `method?`, `expectedStatus?`, `expectedBodyContains?`, `timeoutMs` (default 5000), `intervalSec` (default 60), `latencyBudgetMs?`, `authMode` (`NONE|HEADER|HMAC`), `active`
- `createdAt`, `updatedAt`; unique `(projectId, key)`; index `(active, intervalSec)`.

**ProbeRun**
- `id`, `checkId`, `projectId`, `startedAt`, `finishedAt`, `ok`, `statusCode?`, `latencyMs?`, `errorClass?`, `responseHash?`, `tlsExpiresAt?`, `consecutiveFailures`
- Index `(projectId, startedAt desc)`, `(checkId, startedAt desc)`.

**IngestEvent**
- `id`, `projectId`, `sourceEventId`, `type`, `payload`, `receivedAt`, `processedAt?`, `status`
- Unique `(projectId, sourceEventId)`; index `(projectId, receivedAt desc)`.

**Alert**
- `id`, `projectId`, `componentId?`, `checkId?`, `type`, `severity` (`P1|P2|P3`), `state` (`OPEN|ACKED|RESOLVED`), `dedupeKey`, `title`, `detail`, `firstSeenAt`, `lastSeenAt`, `ackedBy?`, `resolvedAt?`, `taskId?`
- Partial unique index on `dedupeKey` where `state <> 'RESOLVED'`; index `(projectId, state, severity)`.

**AlertChannel**
- `id`, `projectId?` (null = portfolio), `kind` (`EMAIL|WEBHOOK`), `target` (encrypted at rest), `severities` (`P1|P2|P3`), `active`, `createdAt`.

### 5.3 Metrics and facts

**MetricSnapshot**
- `id`, `projectId`, `componentId?`, `metricKey`, `value` (decimal), `unit`, `periodStart`, `periodEnd`, `granularity` (`MINUTE|HOUR|DAY|MONTH`), `dimension` (JSON), `dimensionHash`, `provenance` (`PROBE|PUSH|MANUAL|DERIVED`), `sourceRef?`, `observedAt`, `ingestedAt`, `quality` (`OK|STALE|UNKNOWN`)
- Unique `(projectId, metricKey, periodStart, periodEnd, dimensionHash)`; index `(projectId, metricKey, periodStart desc)`.

**SubscriptionFact**
- `id`, `projectId`, `tenantRef`, `planKey`, `status` (`TRIALING|ACTIVE|PAST_DUE|CANCELED|EXPIRED`), `mrrMinor` (bigint), `currency`, `periodStart`, `periodEnd`, `units?`, `provenance`, `sourceEventId?`, `observedAt`
- Unique `(projectId, tenantRef, periodStart)`; index `(projectId, periodStart, status)`.

**RevenueEvent**
- `id`, `projectId`, `tenantRef?`, `kind` (`PAYMENT|REFUND|FEE|ADJUSTMENT`), `amountMinor`, `currency`, `occurredAt`, `reference` (unique per project), `provenance`, `sourceEventId?`
- Unique `(projectId, reference)`; index `(projectId, occurredAt)`.

### 5.4 Customers and tenants

**TenantRef**
- `id`, `projectId`, `externalId`, `displayName`, `status` (`ACTIVE|TRIAL|PAST_DUE|SUSPENDED|CHURNED|ARCHIVED`), `planKey?`, `region?`, `createdAt`, `lastSeenAt?`, `piiClass` (`NONE|CONTACT|SENSITIVE`), `sourceUrl?`
- Unique `(projectId, externalId)`; index `(projectId, status)`.
- The console stores no student, parent, staff, medical, or fee-line data. OPERASCH student counts are aggregates only.

### 5.5 CRM and work

**Lead**
- `id`, `projectId`, `source`, `contactHash`, `contactKind`, `company?`, `status` (`NEW|CONTACTED|QUALIFIED|PROPOSAL|WON|LOST`), `valueMinor?`, `currency`, `ownerOperatorId?`, `consentAt?`, `createdAt`, `updatedAt`, `lastActivityAt`
- Index `(projectId, status)`, `(contactHash)`.

**OpsTask**
- `id`, `projectId?`, `title`, `description`, `status` (`OPEN|IN_PROGRESS|BLOCKED|DONE|CANCELLED`), `priority` (`P1|P2|P3`), `assigneeOperatorId?`, `dueAt?`, `entityType?`, `entityId?`, `alertId?`, `createdBy`, `createdAt`, `closedAt?`
- Index `(projectId, status, dueAt)`, `(assigneeOperatorId, status)`.

### 5.6 Marketing

**CampaignAttribution**
- `id`, `projectId`, `campaign`, `channel`, `affiliateCode?`, `conversionRef`, `amountMinor`, `currency`, `occurredAt`, `provenance`, `sourceEventId?`
- Unique `(projectId, conversionRef, campaign)`; index `(projectId, occurredAt)`.

The existing `Affiliate`, `Product`, `Click`, `Conversion`, `Commission`, and `Payout` models remain the affiliate system of record. The console adds aggregate views and links; it never duplicates commission rows into attribution facts.

**Asset**
- `id`, `projectId`, `kind` (`DOMAIN|TLS|HOSTING|LICENCE|API_KEY|OTHER`), `name`, `identifier?`, `expiresAt?`, `renewalCostMinor?`, `currency?`, `ownerOperatorId?`, `notes?`
- Index `(projectId, expiresAt)`; API keys store metadata only, never the secret.

### 5.7 Audit and operators

**OpsOperator**
- `id`, `email` (unique), `name`, `role` (`OWNER|ADMIN|ANALYST|SUPPORT`), `status` (`ACTIVE|DISABLED`), `passwordHash`, `sessionVersion` (int), `lastLoginAt?`, `createdAt`, `updatedAt`
- Bootstrap: on first deploy, create the OWNER from `ADMIN_EMAIL`/`ADMIN_NAME` and a one-time password reset token. No default password exists in any environment.
  - The reset token is printed to the deploy output exactly once, is single-use, and expires after 24 hours; the account cannot sign in until it is consumed.
  - Migration from the current env-based login: if `ADMIN_PASSWORD` is present in the environment at bootstrap, it is used exactly once to seed the initial hash and must then be removed from the environment. The hardcoded fallback password in `src/lib/auth/ops.ts` is deleted; unset credentials fail loudly instead of defaulting.

**AuditActivity** (append-only)
- `id`, `actorType` (`OPERATOR|SYSTEM|PRODUCT`), `actorId`, `action`, `projectId?`, `targetType`, `targetId`, `meta` (JSON), `ipHash?`, `createdAt`
- No foreign keys; indexes `(projectId, createdAt desc)`, `(actorId, createdAt desc)`. Rows are never updated or deleted.

### 5.8 Invariants

1. A project-scoped query carries `projectId`; a response contains no other project's rows. Enforced in the data layer, not only in UI filters.
2. Aggregates are recomputed from facts. Percentages are never averaged.
3. Every fact carries provenance and `observedAt`; derived values carry the inputs' freshness.
4. `UNKNOWN` and `STALE` are distinct from `UP` and from zero.
5. No cascade delete of history. Projects, tenants, checks, and facts are archived, never hard-deleted by a feature action.
6. Every write produces an `AuditActivity` row in the same transaction.
7. Service tokens cannot read tenant PII; ingest tokens cannot write audit or operator data.
8. Product writes are explicit commands with idempotency keys; failures surface to the operator.

---

## 6. Integration architecture

### 6.1 Systems of record

| Data | System of record | Console access |
|---|---|---|
| Project/check definitions | Console | Native |
| Probe results, metrics, alerts, tasks, leads, assets, audit, operators | Console | Native |
| Schools, memberships, plans, modules, invoices, transactions, refunds | OPERASCH | Product read API; signed facts |
| POS merchants, licences, sync health | Nova POS | Product read API; signed heartbeats |
| Website/DNS/TLS | DNS and the site itself | Probe runner; registrar metadata manual |
| Affiliate, conversions, commissions, payouts | Console (existing) | Native |
| Paystack platform charges | Paystack | Signed webhook facts |

### 6.2 Hybrid integration (chosen)

- **Entity reads** on demand, through versioned product read APIs, for tenant detail and actions.
- **Fact ingestion** for time series, revenue, usage, and health, stored in console fact tables.
- **Probe runner** for external synthetic availability/performance.
- **No direct product database reads** in normal operation. A documented break-glass read-only replica is allowed for reconciliation only, never for page rendering.

Rejected:
- Direct DB reads everywhere: schema coupling, credential sprawl, cross-tenant exposure, one slow database stalls the console.
- Ingestion-only: tenant detail would be stale and support actions impossible.

### 6.3 Ingest contract

`POST /api/ops/ingest/v1/events`

Headers:
- `X-Project-Key`, `X-Timestamp` (unix ms), `X-Signature` (`t=...,v1=HMAC-SHA256(timestamp + "." + rawBody, token)`).
- `Idempotency-Key` optional; server dedupes on `(projectId, sourceEventId)`.

Body:
- `{ "schemaVersion": "1", "events": [ { "id": "...", "type": "metric|health|subscription|revenue|tenant|ai", "observedAt": "...", "payload": { ... } } ] }`
- Maximum 500 events or 256 KB per request.

Responses:
- `202` accepted (including duplicates, reported in `duplicates`).
- `400` invalid schema (no partial writes).
- `401` bad signature or revoked token.
- `413` payload too large.
- `429` rate limited with `Retry-After`.

Rules:
- Timestamp skew beyond 5 minutes is rejected.
- `X-Project-Key` must match the token's project; a mismatch is rejected with `401`.
- Unknown `type` is rejected, not ignored.
- All events in a batch are written in one transaction.
- Accepted-but-stored events that fail downstream processing remain `processedAt = null` and are retried by a console job; they are never dropped silently.

### 6.4 Entity read contract

`GET {productBaseUrl}/api/ops/v1/{resource}` with a console service token.

Required resources per product (minimum):
- `tenants` (cursor pagination, `updatedSince`), `tenants/{id}`.
- `subscriptions` (current state per tenant), `invoices` or `transactions`, `refunds`.
- `health` (component status summary).
- `actions` (suspend, activate, plan change, module toggle, revoke membership, archive) with idempotency keys.

Response envelope:
- `{ "schemaVersion": "1", "data": ..., "nextCursor": "...", "asOf": "..." }`
- Errors: `{ "error": { "code": "...", "message": "...", "retryable": boolean } }`.

Rules:
- The console never trusts a product-provided role or capability claim for authorisation; it authorises the operator and then calls the product action.
- Every action is idempotent, audited on both sides, and returns the resulting state.
- Read endpoints must support `updatedSince` so reconciliation can be incremental.

### 6.5 Probe runner

- Runs on the VPS as a scheduled worker (pm2), not in the Next.js request path.
- Tick every 30 seconds; each check runs when `now >= lastRun + intervalSec`, with ±10% jitter.
- Bounded concurrency of 10; per-check timeout; no retries within the same tick.
- Uses `Promise.allSettled`; one check failure never aborts the tick.
- Circuit breaker: after 10 consecutive failures for a check, probe every 5th interval until recovery.
- Records every run in `ProbeRun`; rolls up into `MetricSnapshot` at minute/hour granularity.
- Self-monitors: if the runner misses two ticks, it raises a SYSTEM alert; the console's own health is a project (`INTERNAL`).
- Staging checks are opt-in per project and excluded from portfolio availability.

### 6.6 Failure isolation

- Console pages read stored facts; no page performs live fan-out to products.
- Every outbound call has a 5-second timeout, a bounded retry with jitter, and a circuit breaker.
- A product outage produces `DOWN`/`STALE` for that project and an incident; other projects are unaffected.
- Ingest rejection is visible: the project shows "last accepted event" and an ingest-freshness check.

### 6.7 Contract versioning

- Ingest and entity APIs carry `schemaVersion`; additive changes only within a version.
- The console stores unknown payload fields but never renders them.
- Contract tests run in both repos: golden payloads, idempotent replay, out-of-order rejection, clock skew, and unknown-type rejection.

---

## 7. Feature specifications

Each feature lists: purpose, scope, data, UI, interaction, states, and acceptance criteria. "AC" items are testable requirements.

### 7.1 Portfolio overview (`/admin`)

Purpose: daily triage across the portfolio.

Data: open P1/P2 alerts, overdue invoices, trials ending within 3 days, tasks due/overdue, cash at risk, collected MTD, portfolio availability (MRR-weighted, labelled), per-project status rows.

UI:
- Top: **Attention strip** — 3–5 exception cards with counts and drill-down links. If none, a single "Nothing needs attention" card with the as-of time.
- Metric row: Collected MTD, Cash at risk, MRR, Net new MRR, Portfolio availability. Each card shows value, unit, delta vs previous period, target/threshold, as-of, and a sparkline.
- Project table: project, stage, status (icon + text), MRR, churn, availability, open P1s, owner, last deploy. Sortable; default sort by severity then MRR at risk.
- Trend: revenue and MRR over the selected range, with one line per project when the range is ≤90 days and a portfolio total otherwise.
- Recent activity: alerts, deploys, and audits from the last 24 hours, grouped by project.

Interaction:
- Clicking any count opens the corresponding filtered list.
- Range control persists for the session; "as of" is always visible.
- Row click selects the project in the switcher and opens its overview.

States: loading skeleton matching layout; partial failure per card with Retry; empty portfolio with "Create your first project"; permission-limited cards hidden, not zeroed.

AC:
- Every number has a unit, window, and as-of.
- Portfolio availability weights by MRR and states the weighting in the "Explain" popover.
- A failing product shows `DOWN`/`UNKNOWN` on its row and does not block the rest of the page.
- No zero is rendered when the source is missing; it renders "Not connected" or "No data".

### 7.2 Projects (`/admin/projects`)

Purpose: registry and lifecycle.

Data: Project, latest facts, component status, owner, lifecycle stage.

UI:
- Table: name, kind, stage, status, owner, MRR, availability, last check, next renewal.
- Filters: kind, stage, status, owner, text search.
- Row actions: open, pin/unpin, archive (typed confirm), restore.
- Detail drawer: identity, URLs, owner, criticality, currency/timezone, components, checks, integration tokens, spend inputs.
- Lifecycle view: Kanban-style columns by stage; cards show the gate status.

AC:
- Creating a project requires key, name, kind, currency, and timezone; key is immutable.
- Archiving requires typing the project key, is reversible, and never deletes facts.
- A project with no checks or ingest is labelled `UNKNOWN` and shows setup actions.
- Lifecycle stage changes are audited.

### 7.3 Health and performance (`/admin/p/{key}/health`)

Purpose: prove whether a project is healthy, fast, and fresh; open incidents.

Data: components, checks, probe runs, ingested error/latency summaries, SLOs, alerts, deploys (manual/CI), TLS/DNS expiry.

UI:
- Header: project status with icon + text, worst component, as-of, environment toggle (prod/staging), range.
- Component cards: availability, p95 probe latency, error rate (if instrumented, otherwise "Not instrumented"), data freshness, consecutive failures, last check time.
- Checks table: check, component, interval, last run, status, latency vs budget, last failure, next run.
- Performance chart: probe latency p50/p95 over time with the budget line; a separate ingested RUM panel (p75 LCP/INP) labelled by source when available.
- SLO panel: target, attainment, error budget remaining, burn rate over 1h/6h/24h.
- Incidents: open/acknowledged/resolved, severity, duration, linked tasks, timeline.
- Deploys: version, deployed at, source, status; annotate charts.

Interaction:
- Click a check to see recent runs and error classes.
- Hover a chart point for exact value and time.
- Acknowledge an alert (with note) or create a task from it.
- Configure checks inline for ADMIN; test a check before saving.

Rules:
- Probe success measures availability; it does not measure traffic error rate. Error rate is shown only when ingested, with its source.
- `DOWN` requires 3 consecutive failures or staleness beyond 3 intervals; `UNKNOWN` is used for never-probed or disabled checks.
- `DEGRADED` applies to a component when any check has 1–2 consecutive failures (below the DOWN threshold) or probe latency above its budget for 3 consecutive runs. A project's status follows the worst-active-component ordering in §4.3.
- Alerts dedupe per check/incident and auto-resolve after 3 consecutive successes and a 5-minute cooldown.

AC:
- A disabled check is `UNKNOWN`, not `UP`.
- A stale ingest shows `STALE` with the last-received timestamp and an ingest-freshness incident.
- The SLO calculation is reproducible from `ProbeRun` for the selected window.
- The page renders from stored data when a product is down.

### 7.4 Analytics (`/admin/p/{key}/analytics`)

Purpose: usage, activation, retention, funnels, AI.

Data: ingested usage events and metrics; tenant creation; AI logs (OPERASCH `AssistQueryLog` via API or ingest).

UI:
- KPI row: active tenants, new tenants, activation rate, 30-day retention, AI queries, AI failure rate.
- Funnel: signup → verified → first value → paid, with counts and conversion at each step.
- Trend: active tenants and usage over the range.
- Cohorts: monthly retention table (read-only).
- AI tab: top intents, failure causes, cost per query/tenant, engine split.

Rules:
- Activation requires a product-defined first-value event; the definition is stored on the project and shown in the "Explain" popover.
- Retention is computed from tenant activity facts; if activity is not instrumented, the panel says so.

AC:
- Changing the range recomputes funnel and retention from facts; no client-side averaging.
- Each KPI shows its definition and source.
- Uninstrumented panels show "Not instrumented" and the required event name.

### 7.5 Revenue and subscriptions (`/admin/p/{key}/revenue`)

Purpose: period-correct revenue, subscriptions, collections.

Data: `SubscriptionFact`, `RevenueEvent`, tenant plan state; OPERASCH transactions/refunds via ingest or API.

UI:
- KPI row: MRR, ARR, net new MRR, logo churn, NRR, past-due amount, collection rate, DSO.
- MRR movement: new, expansion, contraction, churn (waterfall).
- Subscriptions table: tenant, plan, status, MRR, period, last payment, next renewal, actions (via product API).
- Transactions: date, tenant, kind, amount, fees, net, reference, status.
- Refunds: amount, reason, status, decision.
- Collections: outstanding by age (0–30/31–60/61–90/90+), top debtors, currency.
- Plan mix: tenants and MRR by plan.

Rules:
- MRR = sum of `SubscriptionFact.mrrMinor` for facts whose `periodStart <= asOf < periodEnd` and status in `ACTIVE|PAST_DUE`, annualised plans divided by 12, one-time and project cash excluded.
- ARR = MRR × 12, labelled as such.
- NRR and churn use the same tenant set and period definition; the formula is in the "Explain" popover.
- Multi-currency facts are converted to the portfolio currency using a stored daily rate; the rate date is shown.
- School fee invoices in OPERASCH are tenant data and never enter ScalMint revenue.

AC:
- A one-time project payment cannot appear in MRR.
- MRR for a period equals the sum of active facts for that period, excluding refunds (shown separately).
- A missing revenue feed renders "Not connected", not zero.
- Every revenue write (plan change, refund decision) is audited and idempotent.

### 7.6 Customers (`/admin/p/{key}/customers`)

Purpose: tenant directory, health, and lifecycle actions.

Data: `TenantRef`; OPERASCH school detail via API (plan, members, counts, admissions, modules).

UI:
- Table: tenant, plan, status, created, last seen, MRR, health, owner.
- Filters: status, plan, region, text; saved views.
- Detail page/drawer with tabs: Overview, Members, Billing, Entitlements, Activity, Data and privacy.
- Actions (per product capability): suspend, activate, change plan, toggle module, revoke/restore membership, archive.

Rules:
- Tenant detail is fetched live from the product API with a timeout; cached summary is shown if the call fails, labelled "cached".
- Writes require explicit confirmation with the resulting state and are audited.
- No student/parent/staff PII is copied into console storage.
- Archive is reversible and retains history; delete is not offered.

AC:
- Opening a tenant while the product API is down shows the cached summary and an error banner, not an empty page.
- A plan change returns the new plan from the product and updates the summary; failures are surfaced.
- The members tab shows membership status without exposing Clerk identifiers beyond an opaque id.

### 7.7 Pipeline (`/admin/p/{key}/pipeline`)

Purpose: leads, stages, value, next action.

Data: `Lead`, activity timestamps, campaign source.

UI: board by stage and a table view; drag or keyboard move; lead detail with notes, value, owner, next action, and consent; stale-deal filter (>14 days no activity).

AC: moving a stage is audited; stale deals are computed from `lastActivityAt`; no lead is auto-deleted.

### 7.8 Marketing (`/admin/p/{key}/marketing`)

Purpose: spend efficiency, campaigns, affiliates.

Data: campaign spend (manual or ingested), `CampaignAttribution`, affiliate aggregates.

UI: spend vs attributed revenue, CAC, ROAS by channel/campaign, affiliate tab (active affiliates, referrals, conversion rate, commission accrued/paid, net revenue, refund rate).

Rules: attribution is last-touch or self-reported source, always labelled; no multi-touch claim. Affiliate refund rate and payout backlog are alerts.

AC: a campaign with no attribution shows "No attributed conversions", not zero ROAS; spend changes are audited.

### 7.9 Calendar (`/admin/p/{key}/calendar`)

Purpose: renewals, launches, maintenance, term dates.

Data: assets with expiry, project events, product term dates (ingested), scheduled maintenance.

UI: month/week/day views; event types with colours plus icons; agenda list; "next 30 days" panel.

AC: every asset expiry appears; events are scoped to the project; term dates are read-only unless the product exposes an action.

### 7.10 Tasks (`/admin/p/{key}/tasks`, `/admin/work`)

Purpose: execution spine.

Data: `OpsTask`, alerts, renewals, manual items.

UI: list with status groups and filters; kanban by status; bulk actions; task detail with linked entity, alert, and project; keyboard move actions.

AC: every P1 alert can create a linked task in one action; overdue is computed server-side; completing a task records who and when; no task is deleted, only cancelled with a reason.

### 7.11 Assets and renewals (`/admin/p/{key}/assets`)

Purpose: the studio's "stock".

Data: `Asset` (domain, TLS, hosting, licence, API-key metadata), probes for DNS/TLS.

UI: table with expiry countdown, cost, owner, status; calendar link; alerts at 30/14/7/1 days.

AC: a secret is never displayed or stored; expiry alerts are deduplicated; renewing updates `expiresAt` and is audited.

### 7.12 Team and access (`/admin/team`)

Purpose: operator access and bus factor.

Data: `OpsOperator`, sessions, last login, audit.

UI: operator table (role, status, last login, session version), invite/create operator, disable, reset password, role change; access review checklist (single-admin projects, dormant admins, stale reviews).

AC: OWNER cannot be removed by ADMIN; disabling increments `sessionVersion` immediately; every change is audited; password reset tokens are single-use and expire.

### 7.13 Audit (`/admin/audit`)

Data: `AuditActivity`, mirror-imported `AdminAuditLog`.

UI: filter by project, actor, action, target, date; detail drawer with meta; CSV export (ANALYST+).

AC: append-only; no update/delete endpoint; export respects role; project filter never leaks other projects.

### 7.14 Project settings (`/admin/p/{key}/settings`)

Purpose: project identity, checks, integrations, alert channels, danger zone.

UI: identity, owner, currency/timezone, criticality; components and checks; service tokens (create/rotate/revoke); alert channels; integration status and last ingest; archive (typed confirm).

AC: rotating a token invalidates the old one within 5 minutes; archived projects are read-only with a restore action; no hard-delete action exists.

### 7.15 Affiliate programme (`/admin/programme/*`)

Preserve the existing functionality: affiliates, commissions, conversions, products, approvals, payouts. Add project scope where a product participates; keep `.env`-driven cron approval. Replace bare client fetches with the shared client-fetch contract (timeout, `res.ok`, retry state) and never render an auth failure as an empty list.

---

## 8. OPERASCH superadmin parity and retirement

### 8.1 Feature disposition

| Superadmin capability | Disposition | Console home |
|---|---|---|
| Platform counts dashboard | Replace | Portfolio overview + project overview |
| School directory | Redesign | Customers |
| School detail | Redesign | Customer detail |
| Create school | Redesign | Tenant onboarding (product API provisioning) |
| Edit school | Keep | Customer detail |
| Plan management / custom plan | Keep | Customer Entitlements tab |
| Module toggles | Keep | Customer Entitlements tab |
| Admissions access | Keep | Customer Entitlements tab |
| Bulk import | Keep | Tenant onboarding import |
| Users / memberships | Keep | Customer Members tab; console operators are separate |
| Billing / MRR | Rewrite | Revenue and subscriptions |
| Promos | Keep, archive instead of delete | Marketing > Promotions |
| Announcements | Keep | Marketing > Communications |
| Audit log | Keep | Global audit with project filter |
| Roles editor | Drop | OPERASCH-internal; retained inside the product |
| Assist analytics | Keep read-only | Analytics > AI |
| Tenant export | Keep | Customer Data and privacy |
| GDPR erase | Redesign | Anonymise PII, retain non-PII history, legal-hold check |
| Impersonation | Redesign | Signed, short-lived support deep link; audit both sides |
| Health card | Replace | Health and performance |
| `lastActivityAt` field | Drop as truth | Derived from events/heartbeats |
| Orphan pages (Billing, Roles) not in nav | Resolve | Billing becomes Revenue; Roles dropped |

### 8.2 Parity gate (required before retirement)

The superadmin dashboard may be made read-only and retired only when all of the following are true in the console for OPERASCH:

1. Tenant directory and detail with plan, members, student count, and status.
2. Create/edit tenant, suspend/activate, archive with typed confirmation.
3. Plan tier, custom plan, limits, override expiry, fallback tier — all writes audited.
4. Module toggles with manual override and reason.
5. Admissions access approval/rejection.
6. Membership revoke/restore.
7. Period-correct MRR/ARR, past due, transactions, refunds, collection metrics.
8. Promo create/disable/archive and announcement create/list.
9. Audit read/filter/export, including imported historical audit rows.
10. Tenant export and privacy workflow.
11. Health and activity derived from real data.
12. Reconciliation: for 30 consecutive days, console tenant counts, plan states, and revenue match OPERASCH source-of-truth within an agreed tolerance; every mismatch is explained.

### 8.3 Redundancy removal (genuinely unnecessary)

- The duplicate platform-counts dashboard: replaced by portfolio and project overviews.
- `SchoolHealth` as a live health source: it is never written; keep historical rows, do not cascade, and replace with probe/ingest facts.
- `lastActivityAt` as a stored truth: derive activity; do not add a new writer just to keep a misleading field.
- The lifetime-sum "MRR": delete the computation, not just relabel it.
- The roles editor: OPERASCH-internal configuration with no portfolio decision; keep it in the product.
- Orphan billing and roles pages: no separate surfaces.
- Hard-delete flows for school, promo, and GDPR: replaced by archive/anonymise, because history is a school-side obligation.

### 8.4 History preservation

- No cascade delete for students, classes, assessments, term states, report cards, marks, or `ScoreChangeLog`.
- `ScoreChangeLog` remains append-only; its trace columns have no foreign keys, so any parent move must repoint them explicitly.
- The console's facts reference tenants by `(projectId, externalId)`, never by a cross-database foreign key.
- Imported audit rows are append-only copies; the source remains authoritative.
- Archiving a tenant keeps it readable and printable by the school; the console never becomes the reason history is lost.

### 8.5 Defects that must be fixed as part of parity

- `SchoolHealth` is never written; activity is never recorded.
- Billing computes lifetime revenue and labels it MRR; active status ignores school status.
- The billing page has no timeout, `res.ok` check, or error state.
- Destructive delete cascades and GDPR hard delete.
- Users list is hardcoded to page 1; audit and announcements have no pagination.
- The schools list has an N+1 term query.
- Members usage is compared against the campus limit; correct the label or the metric.
- Impersonation redirects into a page that rejects the superadmin role.
- Orphan pages are unreachable from navigation.
- `assertNotDemoUser` is missing from some write actions.

---

## 9. UX/UI specification

### 9.1 Principles

1. **Clean**: one accent colour, one primary action per screen, no decorative gradients, no chart without a purpose.
2. **Interactive**: every number drills down; every alert becomes a task; filters and ranges persist; the switcher is always one keystroke away.
3. **Insightful**: a number without a target, a delta, a window, a source, and an as-of time is not allowed.
4. **Honest**: unknown, stale, not instrumented, cached, and zero are visibly different.
5. **Calm**: exceptions lead; totals follow; no animation beyond 150–200 ms state transitions.

### 9.2 Layout

- Use the existing shell: 270px sidebar (collapsible to 72px), header, content column max 1536px, 16/24/32px spacing scale.
- Sidebar order: brand, project switcher, scoped navigation, footer (operator menu).
- Header: scope breadcrumb (Portfolio / Project / Section), command palette, alert bell with count, environment toggle when relevant, theme toggle, operator menu.
- Project pages start with a **scope bar**: project name, status, stage, environment, range.
- Tables: sticky header, 52–56px rows, right-aligned numerics with tabular figures, column visibility, saved views, cursor pagination beyond 100 rows.
- Cards: 12px radius, 1px border, no heavy shadow; dark mode uses the existing token system.

### 9.3 Visual system

- Tokens only: no hardcoded hex in new UI. Reuse `background-*`, `card-*`, `text-*`, `border-*`, `icon-*` from the NextAdmin theme; dark mode must work in every new surface.
- Status palette: green (healthy), amber (degraded), red (down), slate (unknown), blue (info). Always pair with an icon and a text label; never colour alone.
- Typography: existing Inter stack; headings 24–28px, body 14px, metadata 12px; no all-caps beyond eyebrow labels.
- Charts: consistent time axis; threshold/target lines; direct labels where possible; no dual axes unless unavoidable; pie charts only for ≤4 parts, otherwise bars; zero baseline for bars; tooltips with exact value, unit, and time.
- Numbers: thousands separators, fixed decimal rules per metric, currency code visible, `—` for missing (never `0`).

### 9.4 Interaction patterns

- Command palette (`Ctrl/Cmd+K`): switch project, navigate, create task, acknowledge alert, search tenants.
- Inline "Explain this number": formula, window, source, exclusions, freshness, and last successful update.
- Time range control: 24h, 7d, 30d, 90d, MTD, QTD, YTD; the selected range is reflected in the URL and persists per page.
- Drill-down: clicking a metric opens the filtered list that produced it; the filter is visible and removable.
- Bulk actions: only where safe; confirmation states the exact count and effect.
- Optimistic UI is limited to local toggles; server-confirmed data never updates before the response.
- All async operations show progress, can be retried, and never trap the UI (client fetch always resolves with `{ok, status, error}`).

### 9.5 States (mandatory for every data surface)

- **Loading**: layout-matched skeleton.
- **Empty**: explanation plus the action that creates the first record.
- **Error**: what failed, retry, and whether the session may have expired (401/403).
- **Stale**: last successful time and a warning; status downgraded.
- **Unknown**: never probed or not instrumented; setup or integration action.
- **Permission denied**: what role is required; no silent hiding of a whole page.
- **Partial**: per-widget failure; the rest of the page renders.

### 9.6 Accessibility

- WCAG 2.2 AA contrast in both themes; 24×24 minimum targets; visible focus rings.
- Keyboard access to the switcher, palette, tables, charts (data table alternative), dialogs, and kanban moves.
- `aria-live="polite"` for async status changes; `aria-busy` during loads.
- No colour-only status; icons and labels accompany colour.
- `prefers-reduced-motion` respected.

### 9.7 Responsive

- ≥1280px: full sidebar, multi-column dashboards.
- 768–1279px: collapsible sidebar, two-column cards.
- <768px: switcher becomes a header control opening a sheet; tables become stacked cards or horizontal scroll with a visible affordance; charts remain readable.

### 9.8 Content rules

- Label the unit and window in the card title or sublabel.
- "No data" is written out; never "0" or an empty chart.
- Alert copy: what changed, what it affects, what to do, and the as-of time.
- Avoid internal jargon in operator-facing copy; "tenant" is explained where it first appears per product.

---

## 10. Non-functional requirements

- Console page TTFB < 300 ms for cached facts at p75; API p95 < 500 ms.
- No page depends on a live product call to render; product calls only on detail/action.
- Every outbound call has a 5-second timeout, bounded retry with jitter, and a circuit breaker.
- Freshness targets: probes ≤2 minutes, ingested health ≤5 minutes, revenue facts ≤1 hour, tenant summaries on demand.
- Probe volume is bounded: per-check intervals ≥60s in production, ≥300s for low-criticality checks; stagger schedules.
- Raw probe runs retained 90 days; hourly/daily rollups 25 months; audit 7 years; tenant summaries refreshed on access.
- Ingest ingestion is idempotent and transactional per batch; failures are retried and surfaced.
- All list endpoints paginate; no unbounded `take`.
- Structured logs for ingest, probes, alerts, and writes; the console monitors its own health as a project.
- Alert delivery: P1 within 2 minutes of threshold, P2 in the daily digest, P3 weekly.
- Cost guardrails: per-project probe budget, ingest rate limit, and alert caps (maximum 3 P1s per day before incident mode).

---

## 11. Security and privacy

- Console auth is operator-only: DB-backed operators, hashed passwords, JWT session with `sessionVersion`, 7-day expiry, secure cookies, CSRF protection on writes (SameSite plus origin check), login rate limiting.
- No default credentials in any environment; bootstrap requires a one-time reset token.
- Role and project authorization are enforced server-side on every read and write.
- Service tokens are hashed, scoped, rotatable, and shown once; last-used is tracked.
- HMAC ingest with timestamp skew rejection and replay protection via `sourceEventId`.
- PII minimisation: no student/parent/staff/medical/fee-line data; tenant display names only; lead contact hashes; IP addresses hashed and truncated.
- Secrets never reach the client; API-key assets store metadata only.
- Data export and privacy workflows are audited and role-restricted.
- Dependency and upgrade policy: security patches applied within 7 days for critical issues.
- Break-glass database access is read-only, time-boxed, logged, and never used for page rendering.

---

## 12. Global acceptance criteria

1. The project switcher changes scope for every surface; no API response or rendered row belongs to another project.
2. Switching scope cancels in-flight requests and shows no stale previous-project data.
3. `UNKNOWN`, `STALE`, `NOT INSTRUMENTED`, `CACHED`, and `0` are visually and semantically distinct.
4. Every metric displays unit, window, source, and as-of; every ratio has an "Explain" popover with its formula.
5. Portfolio percentages are recomputed from facts, never averaged.
6. MRR excludes one-time revenue; ARR is labelled as annualised; school fee invoices never enter ScalMint revenue.
7. Alerts dedupe, auto-resolve, and link to tasks; no alert is raised without a threshold and an action.
8. A down product cannot block the portfolio overview or another product's page.
9. All writes are server-authorised, audited in the same transaction, and idempotent where they cross systems.
10. No feature hard-deletes a project, tenant, check, fact, audit row, or school history; archive and restore work.
11. OPERASCH parity is demonstrably green for 30 consecutive days before superadmin retirement; after retirement the old surface is read-only and nothing is deleted.
12. The console passes WCAG AA for contrast, focus, targets, and keyboard operation in both themes.
13. Dark mode works on every restored page and component.
14. Client fetches use the shared fetch contract; a 401 is never rendered as an empty list; every spinner clears on failure.
15. Probe and ingest freshness are visible on the project overview; a silent integration shows as stale within two intervals.
16. No cross-database foreign keys; tenant references are soft; imports never overwrite source data.

---

## 13. Open decisions (with defaults)

1. **Revenue basis**: show contracted MRR and cash collected side by side; never blend. Default: yes.
2. **Portfolio currency**: GHS with stored daily rates; project currency always visible. Default: GHS.
3. **Probe runner host**: VPS pm2 worker. Default: yes, with self-health.
4. **Tenant detail source**: on-demand product API, cached summary on failure. Default: yes.
5. **Operator model**: DB-backed operators with four roles. Default: yes.
6. **Impersonation**: signed, short-lived product support link, audited; not a console session. Default: v1.1.
7. **Alert channels**: email and generic webhook in v1; WhatsApp/SMS later. Default: email plus webhook for P1.
8. **OPERASCH roles editor**: drop from console. Default: drop.
9. **"Stocks" nav slot**: restore as Assets and renewals, not inventory. Default: assets.
10. **Retention**: raw probes 90 days, rollups 25 months, audit 7 years. Default: as stated.

---

## 14. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Cross-project data leakage | Scope enforced in the data layer; tests assert no foreign rows; switcher tests cover rapid switching |
| False health from stale data | Explicit STALE/UNKNOWN; freshness checks; alerts on ingest gaps |
| Revenue miscalculation | Period-scoped facts; formula tests; reconciliation against Paystack; no lifetime sums |
| History loss during retirement | Archive/soft-delete; no cascade; 30-day reconciliation gate |
| Credential sprawl | Service tokens per project, hashed and scoped; no direct DB credentials |
| Solo-operator alert fatigue | Dedupe, cooldowns, severity caps, P1 only for actionable incidents |
| Schema drift across products | Versioned contracts; contract tests in both repos; unknown fields stored, not rendered |
| Probe cost and rate limits | Per-check intervals, jitter, budget caps, circuit breaker |
| Console becoming system of record | Read model by default; writes are explicit product commands |
| UI inconsistency after restoring demo pages | Tokens only; hide demo-only pages; design review against this spec |
| Multi-currency confusion | Store currency per fact; show code; convert only with a dated rate |
| Auth bugs in the switcher | Server-side project/env authorization; no client capability trust |

---

## Appendix A — Metric definitions

- **Availability** = successful scheduled probe runs / total scheduled probe runs in the window, per check; project headline weights components by criticality (P1=3, P2=2, P3=1); portfolio headline weights projects by MRR and states the weighting.
- **p95 latency** = 95th percentile of probe `latencyMs` over the window. Ingested RUM percentiles are labelled separately with their source.
- **Error rate** = ingested 5xx responses / ingested total responses over the window; never derived from probes.
- **Freshness** = `now − last successful heartbeat/event`, in minutes.
- **MRR** = Σ `SubscriptionFact.mrrMinor` for `periodStart <= asOf < periodEnd` and status `ACTIVE|PAST_DUE`; annual plans ÷12; excludes one-time revenue and refunds.
- **ARR** = MRR × 12.
- **Net new MRR** = new + expansion − contraction − churn for the period.
- **Logo churn** = tenants active at period start that are no longer active at period end / tenants active at period start.
- **NRR** = (start MRR + expansion − contraction − churn) / start MRR.
- **Trial conversion** = trials that became paid within 30 days / trials that ended in the window.
- **Collection rate** = collected / invoiced in the window.
- **DSO** = (accounts receivable / revenue over the last 90 days) × 90.
- **CAC** = (sales + marketing spend) / new paying tenants in the window.
- **ROAS** = attributed revenue / spend, with the attribution model labelled.
- **Activation** = new tenants reaching the project-defined first-value event within 14 days / new tenants.
- **SLO attainment** = 1 − (downtime minutes / total minutes) over the window; downtime minutes = the interval length of each failed or stale scheduled probe, and scheduled maintenance is excluded and declared. Time-based, it may differ from run-based availability by at most one interval.

## Appendix B — Template inventory summary

- Demo pages: 52; local route counterparts: 23 (16 direct, plus custom login and affiliate pages).
- Present and reusable: table primitives, cards, charts, badges, avatars, forms, selects, date pickers, calendar core, carousel, tabs, pagination, dialogs, sheets, dropdowns, popovers, tooltips, progress, alerts, skeletons, OTP input.
- Missing page-level work: analytics, marketing, CRM, SaaS/revenue, AI, assets, calendar, manage team, task list, task kanban, data tables, form layouts, billing/plan, connected apps, file manager, pricing tables, teams, coming soon, maintenance, chats, email, invoices, auth screens, and the remaining UI showcases.
- Assets: all NextAdmin image families exist locally; no missing image assets.
- Structural conflicts to resolve during restoration: root-vs-`/admin` URLs, `/admin` overview collision, broken `/admin/profile`, auth-route exemptions, breadcrumb prefixes, dead header billing link, nav icon duplication, and the missing `DataTable` component despite `@tanstack/react-table` being installed.

## Appendix C — Reference files

Console (`scalmint`):
- `prisma/schema.prisma`, `prisma/seed.ts`
- `src/lib/auth/ops.ts`
- `src/middleware.ts`
- `src/app/admin/layout.tsx`, `src/nextadmin/frame.tsx`, `src/nextadmin/shell.tsx`
- `src/nextadmin/components/common/sidebar/data.tsx`, `.../header/index.tsx`, `.../header/theme-toggle.tsx`
- `src/app/admin/{affiliates,commissions,conversions}/page.tsx`
- `src/app/api/admin/**`
- `src/lib/hub/signature.ts`, `src/app/api/paystack-webhook/route.ts`

OPERASCH (`multitenant_school_management_system`):
- `prisma/schema.prisma`
- `src/lib/superadmin.ts`, `src/lib/superadmin-actions.ts`, `src/lib/monitoring.ts`, `src/lib/monitoring-actions.ts`
- `src/app/(app)/superadmin/**`
- `src/app/api/superadmin/billing/route.ts`, `src/app/api/superadmin/schools/[id]/export/route.ts`
- `src/lib/client-fetch.ts`
