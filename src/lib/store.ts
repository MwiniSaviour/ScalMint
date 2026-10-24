import fs from "fs";
import path from "path";
import type { AffiliateRow, ConversionRow, PayoutRow } from "@/lib/affiliate/types";

export type DiskStore = {
  affiliates: AffiliateRow[];
  conversions: ConversionRow[];
  payouts: PayoutRow[];
};

const STORE_PATH = path.join(process.cwd(), ".data", "affiliate-store.json");

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
  try {
    if (!fs.existsSync(STORE_PATH)) return { affiliates: [], conversions: [], payouts: [] };
    const raw = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as Partial<DiskStore>;
    return {
      affiliates: (raw.affiliates ?? []).map(reviveAffiliate),
      conversions: (raw.conversions ?? []).map(reviveConversion),
      payouts: (raw.payouts ?? []).map(revivePayout),
    };
  } catch (err) {
    console.warn("[store] read failed", err);
    return { affiliates: [], conversions: [], payouts: [] };
  }
}

export function writeStore(store: DiskStore) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  const tmp = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store));
  fs.renameSync(tmp, STORE_PATH);
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
