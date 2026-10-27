export type PageBlock = {
  title: string;
  body: string;
};

export type MarketingPage = {
  slug: string;
  eyebrow: string;
  title: string;
  lede: string;
  blocks: PageBlock[];
  aside?: { title: string; items: string[] };
};

export const SERVICES: MarketingPage[] = [
  {
    slug: "software-development",
    eyebrow: "Services",
    title: "Software that ships and stays.",
    lede:
      "Web, mobile and desktop applications engineered for the load, the team and the market you actually have — not a slide deck.",
    blocks: [
      { title: "Web platforms", body: "Next.js and Node systems with auth, payments, ops dashboards and Ghana-ready MoMo / card rails." },
      { title: "Mobile", body: "iOS and Android apps that share a backend with your web product so you do not run two companies." },
      { title: "Desktop", body: "Electron and native tools for warehouses, clinics and branches where the browser is not enough." },
    ],
    aside: { title: "Typical engagement", items: ["Discovery 2–3 weeks", "Build in 4–12 week slices", "Handover or managed ops"] },
  },
  {
    slug: "ai-automation",
    eyebrow: "Services",
    title: "Reception that never sleeps.",
    lede:
      "WhatsApp and email receptionists that take the conversation from first message to a booked job, an order, or a qualified lead.",
    blocks: [
      { title: "WhatsApp", body: "MTN-first flows: FAQs, order status, appointment booking, handoff to a human when it matters." },
      { title: "Email", body: "Inbox triage, draft replies, CRM updates — with an audit trail your ops lead can read." },
      { title: "Guardrails", body: "You approve the knowledge, the tone and the escalation. The model does not invent policy." },
    ],
  },
  {
    slug: "structured-data",
    eyebrow: "Services",
    title: "Research you can query.",
    lede:
      "We turn messy business research — spreadsheets, PDFs, field notes — into structured, owned datasets you can actually use.",
    blocks: [
      { title: "Model the domain", body: "Entities, relationships, quality rules. Named in your language, not a vendor’s." },
      { title: "Ingest & clean", body: "Pipelines that survive the next intern, the next branch, the next format change." },
      { title: "Serve", body: "APIs, warehouses or simple admin tools — whichever your team will open on a Monday." },
    ],
  },
  {
    slug: "model-fine-tuning",
    eyebrow: "Services · Beta",
    title: "Models that know your work.",
    lede:
      "Fine-tuning and evaluation on your documents and tasks — so the model sounds like your desk, not a generic chatbot.",
    blocks: [
      { title: "Task first", body: "We start from a job: classify, extract, draft, decide. Not from a model card." },
      { title: "Your data", body: "Held in your project. Not mixed into a public corpus. Ghana Card and customer PII stay out." },
      { title: "Measure", body: "A eval set you can rerun. If it does not beat the baseline, it does not ship." },
    ],
  },
  {
    slug: "systems-integration",
    eyebrow: "Services",
    title: "Connect what you already run.",
    lede:
      "Paystack, MoMo, ERPs, CRMs, Excel exports — wired so staff stop copy-pasting between five tabs.",
    blocks: [
      { title: "Payments", body: "Paystack Ghana, Hubtel, bank files. Reconcile T+1 without a night shift." },
      { title: "Ops tools", body: "Inventory, HR, ticketing, field apps. Events, not nightly CSV dumps, where it counts." },
      { title: "Identity", body: "SSO, Ghana Card KYC hooks, role-based access that matches how the company is actually organised." },
    ],
  },
  {
    slug: "managed-operations",
    eyebrow: "Services",
    title: "After launch is the job.",
    lede:
      "Hosting, monitoring and support that continue when the build team leaves. Accra hours. Named humans.",
    blocks: [
      { title: "Run", body: "Uptime, backups, dependency patches. You get a status page, not a surprise invoice." },
      { title: "Watch", body: "Alerts that mean something. We page ourselves before your customers do." },
      { title: "Change", body: "Small, billed slices — a new report, a new MoMo flow — without reopening the whole project." },
    ],
  },
];

export const SERVICE_BY_SLUG = new Map(SERVICES.map((s) => [s.slug, s]));

export const PAGES: Record<string, MarketingPage> = {
  services: {
    slug: "services",
    eyebrow: "What we build",
    title: "Six lines. One standard.",
    lede:
      "Software, automation, data, models, integration and operations — sold as work with a beginning, a middle and an owner.",
    blocks: SERVICES.map((s) => ({ title: s.title, body: s.lede })),
  },
  pricing: {
    slug: "pricing",
    eyebrow: "Commercial",
    title: "Clear work. Clear money.",
    lede:
      "We do not sell seats. We sell slices of delivery: discover, build, then run. Quoted in GHS or USD. Invoiced through Paystack.",
    blocks: [
      { title: "Discover", body: "Fixed 2–3 week diagnostic. Scope, risks, architecture, a price for the first build slice. Credited if you proceed." },
      { title: "Build", body: "4–12 week slices with a demo every two weeks. You own the repo, the keys and the data from day one." },
      { title: "Run", body: "Monthly retainer for hosting, monitoring and a named engineer. Cancel on 30 days. No seat maths." },
    ],
    aside: { title: "How we quote", items: ["Written scope before kickoff", "Change requests priced in 48h", "No surprise ‘platform fees’"] },
  },
  enterprise: {
    slug: "enterprise",
    eyebrow: "Enterprise",
    title: "For teams that already have a stack.",
    lede:
      "Procurement, security review, SSO, and a delivery cadence that survives your steering committee.",
    blocks: [
      { title: "Security", body: "Access reviews, audit logs, data residency options. We will sit with your CISO without theatre." },
      { title: "Delivery", body: "A single account lead in Accra, a written RAID log, and demos your sponsors can watch." },
      { title: "Vendors", body: "We integrate with what you already pay for. We do not ask you to rip it out to prove a point." },
    ],
  },
  industries: {
    slug: "industries",
    eyebrow: "Industries",
    title: "The same craft. Different desks.",
    lede:
      "Retail, field operations, education and hiring — the domains behind Nova POS, Operasch, Jarvis and JobFinder.",
    blocks: [
      { title: "Retail & hospitality", body: "POS, inventory, multi-branch. Offline-tolerant. MoMo at the till." },
      { title: "Field operations", body: "SOPs, proof-of-work, dispatch. What Operasch is built to hold." },
      { title: "Education", body: "Document-heavy study workflows — the problem Jarvis is being built to solve." },
      { title: "Hiring", body: "Structured job intelligence for teams tired of unstructured boards." },
    ],
  },
  insights: {
    slug: "insights",
    eyebrow: "Insights",
    title: "Notes from the work.",
    lede:
      "Short, sourced pieces on payments, operations software and AI in Ghana — written by people who shipped the last one.",
    blocks: [
      { title: "Paystack T+1 in practice", body: "What settlement actually does to affiliate and SaaS cashflow. April 2026." },
      { title: "WhatsApp is the CRM", body: "Why Ghana SMEs will not move into your portal, and how to stop fighting it. March 2026." },
      { title: "Fine-tuning is not a strategy", body: "When a prompt and a retrieval index beat a custom model. February 2026." },
    ],
  },
  journal: {
    slug: "journal",
    eyebrow: "Journal",
    title: "The long pieces.",
    lede: "Essays and build logs. Same standard as the product work: named authors, dated, no filler.",
    blocks: [
      { title: "How we staff a 12-week slice", body: "Roles, rituals, what we refuse to parallelise. Journal · 12 min." },
      { title: "A POS that works when the lights go", body: "Designing Nova POS for load-shedding. Journal · 9 min." },
      { title: "Operasch field notes, Tamale", body: "What broke in week one of a three-depot rollout. Journal · 7 min." },
    ],
  },
  changelog: {
    slug: "changelog",
    eyebrow: "Changelog",
    title: "What shipped.",
    lede: "Public notes on ScalMint.com, Nova POS and Operasch. No marketing adjectives.",
    blocks: [
      { title: "2026.10 — Affiliate program", body: "affiliate.scalmint.com live. MoMo payouts, 30-day cookie, four products." },
      { title: "2026.09 — Nav catalogue", body: "Product, Services and Affiliate Program as separate menus." },
      { title: "2026.08 — Operasch workspaces", body: "Invite flow, SOP library, proof capture on Android." },
    ],
  },
  community: {
    slug: "community",
    eyebrow: "Community",
    title: "Operators, not an audience.",
    lede:
      "A small Accra circle: founders, ops leads, engineers. WhatsApp group, quarterly dinners. No lead-gen webinars.",
    blocks: [
      { title: "Who it’s for", body: "People who run software in production in Ghana. Vendors sell elsewhere." },
      { title: "How to join", body: "Write to community@scalmint.com with what you run. We keep it small on purpose." },
    ],
  },
  events: {
    slug: "events",
    eyebrow: "Events",
    title: "In the room.",
    lede: "Workshops and office hours in Accra. No virtual ‘summits’.",
    blocks: [
      { title: "Office hours", body: "Second Thursday, 16:00–18:00. Book a 25-minute slot. Bring a system, not a pitch." },
      { title: "Build clinic", body: "Quarterly, 12 people. One afternoon on payments, data or WhatsApp automation." },
    ],
  },
  help: {
    slug: "help",
    eyebrow: "Help centre",
    title: "Get unblocked.",
    lede: "For customers of Nova POS, Operasch and ScalMint-built systems. Affiliates use the affiliate dashboard.",
    blocks: [
      { title: "Products", body: "pos.scalmint.com/help and smartsos.cloud/help for in-product guides." },
      { title: "Projects", body: "If we built it, your Slack/WhatsApp channel is still the fastest path. Escalations: support@scalmint.com." },
      { title: "Affiliates", body: "Sign in at affiliate.scalmint.com/login. Payouts, links and conversions live there." },
    ],
  },
  academy: {
    slug: "academy",
    eyebrow: "Academy",
    title: "How we work, taught.",
    lede:
      "Short courses for client teams taking over a ScalMint system — not a content farm.",
    blocks: [
      { title: "Handover week", body: "Included in every build slice. Repo, runbooks, who to call." },
      { title: "Ops 101", body: "Monitoring, Paystack webhooks, MoMo failure modes. Half a day." },
    ],
  },
  careers: {
    slug: "careers",
    eyebrow: "Careers · 3 open",
    title: "Build here.",
    lede: "Accra-first. We hire people who have shipped. Portfolios beat certificates.",
    blocks: [
      { title: "Senior full-stack", body: "Next.js, Node, Postgres. You have owned a production system. Hybrid Accra." },
      { title: "Field engineer", body: "On-site with retail and ops clients. Diagnose, don’t escalate by default." },
      { title: "Designer", body: "Product UI in our existing system. You can sit in a 37px button and not invent a new one." },
    ],
    aside: { title: "How we hire", items: ["Paid work sample", "No trick algorithms", "Offer in writing"] },
  },
  resources: {
    slug: "resources",
    eyebrow: "Resources",
    title: "Take what is useful.",
    lede: "Public notes, changelogs and the 2026 systems report. No gate except your time.",
    blocks: [
      { title: "Insights", body: "Short pieces on payments and operations software." },
      { title: "Journal", body: "Longer build logs." },
      { title: "Changelog", body: "What shipped, dated." },
    ],
  },
};

export const LEGAL: Record<string, MarketingPage> = {
  privacy: {
    slug: "privacy",
    eyebrow: "Legal",
    title: "Privacy.",
    lede:
      "We collect what we need to deliver the work. We do not sell personal data. Ghana Data Protection Act 2012 applies.",
    blocks: [
      { title: "What we hold", body: "Contact details you send us, project files, and — for affiliates — Ghana Card ID, MoMo number and payout history." },
      { title: "Processors", body: "Vercel (hosting), Paystack (payments), email. No secondary marketing lists." },
      { title: "Requests", body: "Access, correction, deletion: privacy@scalmint.com. We answer in 30 days." },
    ],
  },
  terms: {
    slug: "terms",
    eyebrow: "Legal",
    title: "Terms.",
    lede: "Project work is governed by a signed statement of work. The affiliate program has its own terms at apply.",
    blocks: [
      { title: "Projects", body: "IP in custom work transfers on full payment. Our libraries and prior art stay ours; you get a licence to run them." },
      { title: "Affiliates", body: "No brand bidding, no spam, no self-referral. 7-day conversion hold. 30-day cookie." },
      { title: "Liability", body: "Capped at fees paid in the prior 12 months, except for fraud or data breach caused by us." },
    ],
  },
};
