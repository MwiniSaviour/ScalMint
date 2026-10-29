import fs from "fs";
import path from "path";
import type { AffiliateRow, ConversionRow, PayoutRow, ProductRow } from "@/lib/affiliate/types";

export const DEFAULT_PRODUCTS: ProductRow[] = [
  { id: "prd_nova", slug: "nova-pos", name: "Nova POS", domain: "pos.scalmint.com", href: "https://pos.scalmint.com", status: "LIVE", commissionType: "PERCENT_RECURRING", commissionRate: 3000, commissionCap: 50000, cookieDays: 30, minPayout: 5000 },
  { id: "prd_operasch", slug: "operasch", name: "Operasch", domain: "smartsos.cloud", href: "https://smartsos.cloud", status: "LIVE", commissionType: "PERCENT_RECURRING", commissionRate: 2500, commissionCap: 40000, cookieDays: 30, minPayout: 5000 },
  { id: "prd_jarvis", slug: "jarvis", name: "Jarvis", domain: null, href: null, status: "COMING_SOON", commissionType: "FLAT_CPA", commissionRate: 500, commissionCap: null, cookieDays: 30, minPayout: 5000 },
  { id: "prd_jobfinder", slug: "jobfinder", name: "JobFinder", domain: null, href: null, status: "COMING_SOON", commissionType: "FLAT_CPA", commissionRate: 1000, commissionCap: null, cookieDays: 30, minPayout: 5000 },
];

export type DiskStore = {
  affiliates: AffiliateRow[];
  conversions: ConversionRow[];
  payouts: PayoutRow[];
  products: ProductRow[];
};

function storePath() {
  // Vercel lambdas are read-only except /tmp. Local uses .data/.
  if (process.env.VERCEL) return path.join("/tmp", "scalmint-affiliate-store.json");
  return path.join(process.cwd(), ".data", "affiliate-store.json");
}

const g = globalThis as unknown as { __scalmintAffStore?: DiskStore };

function empty(): DiskStore {
  return { affiliates: [], conversions: [], payouts: [], products: DEFAULT_PRODUCTS.map((p) => ({ ...p })) };
}

function reviveAffiliate(a: AffiliateRow): AffiliateRow {
  return {
    ...a,
    email: a.email.toLowerCase().trim(),
    createdAt: new Date(a.createdAt),
    updatedAt: new Date(a.updatedAt),
    lastActiveAt: a.lastActiveAt ? new Date(a.lastActiveAt) : null,
  };
}

function reviveConversion(c: ConversionRow): ConversionRow {
  return { ...c, createdAt: new Date(c.createdAt) };
}

function revivePayout(p: PayoutRow): PayoutRow {
  return { ...p, createdAt: new Date(p.createdAt) };
}

export function readStore(): DiskStore {
  if (g.__scalmintAffStore) return g.__scalmintAffStore;
  try {
    const file = storePath();
    if (!fs.existsSync(file)) {
      g.__scalmintAffStore = empty();
      return g.__scalmintAffStore;
    }
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<DiskStore>;
    g.__scalmintAffStore = {
      affiliates: (raw.affiliates ?? []).map(reviveAffiliate),
      conversions: (raw.conversions ?? []).map(reviveConversion),
      payouts: (raw.payouts ?? []).map(revivePayout),
      products: (raw.products && raw.products.length ? raw.products : DEFAULT_PRODUCTS).map((p) => ({ ...p })),
    };
    return g.__scalmintAffStore;
  } catch (err) {
    console.warn("[store] read failed", err);
    g.__scalmintAffStore = empty();
    return g.__scalmintAffStore;
  }
}

export function writeStore(store: DiskStore) {
  g.__scalmintAffStore = store;
  const file = storePath();
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(store));
    fs.renameSync(tmp, file);
  } catch (err) {
    console.warn("[store] persist skipped (ephemeral/read-only fs)", err);
  }
}

export function findAffiliate(where: Record<string, unknown>): AffiliateRow | null {
  const { affiliates } = readStore();
  if (typeof where.id === "string") return affiliates.find((a) => a.id === where.id) ?? null;
  if (typeof where.email === "string") {
    const email = where.email.toLowerCase().trim();
    return affiliates.find((a) => a.email === email) ?? null;
  }
  if (typeof where.code === "string") {
    const code = where.code.toUpperCase().trim();
    return affiliates.find((a) => a.code === code) ?? null;
  }
  return null;
}

export function upsertAffiliate(row: AffiliateRow) {
  const store = readStore();
  const idx = store.affiliates.findIndex((a) => a.id === row.id);
  if (idx >= 0) store.affiliates[idx] = row;
  else store.affiliates.push(row);
  writeStore(store);
}

export function mutateStore(mut: (store: DiskStore) => void) {
  const store = readStore();
  mut(store);
  writeStore(store);
}
