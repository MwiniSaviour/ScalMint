// Canonical product catalogue — single source of truth for
// landing, nav mega-menus, affiliate engine and API.
// Keep in sync with prisma/seed.ts

export type AffiliateProduct = {
  slug: "nova-pos" | "operasch" | "jarvis" | "jobfinder";
  name: string;
  domain: string | null;
  href: string | null;
  status: "live" | "coming_soon";
  tagline: string;
  affiliateBrief: string;
  commissionLabel: string; // badge text
  commissionDetail: string; // tooltip / long copy
  rateBps: number; // 3000 = 30% ; flat: pesewas
  type: "percent_recurring" | "flat_cpa";
  cookieDays: number;
  trackingParam: string;
};

export const AFFILIATE_PRODUCTS: AffiliateProduct[] = [
  {
    slug: "nova-pos",
    name: "Nova POS",
    domain: "pos.scalmint.com",
    href: "https://pos.scalmint.com",
    status: "live",
    tagline: "Point of sale for retail, restaurants & multi-branch teams.",
    affiliateBrief:
      "Refer merchants to Nova POS and earn recurring commission on every active location.",
    commissionLabel: "Up to 30% recurring",
    commissionDetail: "30% of subscription for 12 months, capped at GHS 500 per store/month. T+1 settlement via Paystack.",
    rateBps: 3000,
    type: "percent_recurring",
    cookieDays: 30,
    trackingParam: "ref",
  },
  {
    slug: "operasch",
    name: "Operasch",
    domain: "smartsos.cloud",
    href: "https://smartsos.cloud",
    status: "live",
    tagline: "Operations, SOPs and field execution — plan to proof.",
    affiliateBrief:
      "Invite companies to Operasch on smartsos.cloud. Earn when teams create workspaces and invite teammates.",
    commissionLabel: "Up to 25% recurring",
    commissionDetail: "25% + GHS 30 CPA on qualified workspace (≥3 teammates) for 12 months, cap GHS 400.",
    rateBps: 2500,
    type: "percent_recurring",
    cookieDays: 30,
    trackingParam: "ref",
  },
  {
    slug: "jarvis",
    name: "Jarvis",
    domain: null,
    href: null,
    status: "coming_soon",
    tagline: "AI PDF study assistant — chat with documents, summaries & quizzes.",
    affiliateBrief:
      "Early affiliates for Jarvis lock priority. Earn per verified student when Jarvis launches.",
    commissionLabel: "GHS 5 per student",
    commissionDetail: "GHS 5 flat CPA per verified student email. Waitlist converts at launch.",
    rateBps: 500,
    type: "flat_cpa",
    cookieDays: 30,
    trackingParam: "ref",
  },
  {
    slug: "jobfinder",
    name: "JobFinder",
    domain: null,
    href: null,
    status: "coming_soon",
    tagline: "Structured job intelligence — find & track the right roles faster.",
    affiliateBrief:
      "Join JobFinder waitlist program. Earn when employers publish live jobs.",
    commissionLabel: "GHS 10 per job",
    commissionDetail: "GHS 10 flat CPA per live job (active ≥7 days). Pre-launch waitlist.",
    rateBps: 1000,
    type: "flat_cpa",
    cookieDays: 30,
    trackingParam: "ref",
  },
];

export const PRODUCT_BY_SLUG = new Map(AFFILIATE_PRODUCTS.map((p) => [p.slug, p]));
export const LIVE_PRODUCTS = AFFILIATE_PRODUCTS.filter((p) => p.status === "live");
export const COMING_SOON = AFFILIATE_PRODUCTS.filter((p) => p.status === "coming_soon");
