import fs from "fs";
import path from "path";
import type {
  AffiliateDashboard,
  AffiliateRow,
  ConversionRow,
  PayoutRow,
  ProductRow,
} from "@/lib/affiliate/types";

type AffiliateDelegate = {
  findUnique: (args: unknown) => Promise<AffiliateRow | AffiliateDashboard | null>;
  findFirst: (args: unknown) => Promise<AffiliateRow | null>;
  create: (args: unknown) => Promise<AffiliateRow>;
  update: (args: unknown) => Promise<AffiliateRow>;
  upsert: (args: unknown) => Promise<AffiliateRow>;
};

type ProductDelegate = {
  findUnique: (args: unknown) => Promise<ProductRow | null>;
  upsert: (args: unknown) => Promise<ProductRow>;
};

type ClickDelegate = {
  create: (args: unknown) => Promise<{ id: string }>;
};

type ConversionDelegate = {
  create: (args: unknown) => Promise<ConversionRow>;
  findMany: (args: unknown) => Promise<ConversionRow[]>;
  updateMany: (args: unknown) => Promise<{ count: number }>;
  count: (args: unknown) => Promise<number>;
};

type PayoutDelegate = {
  create: (args: unknown) => Promise<PayoutRow>;
  findUnique: (args: unknown) => Promise<PayoutRow | null>;
  update: (args: unknown) => Promise<PayoutRow>;
};

type WebhookDelegate = {
  create: (args: unknown) => Promise<{ id: string }>;
  update: (args: unknown) => Promise<{ id: string }>;
  findUnique: (args: unknown) => Promise<{ id: string } | null>;
};

export type DbClient = {
  affiliate: AffiliateDelegate;
  product: ProductDelegate;
  click: ClickDelegate;
  conversion: ConversionDelegate;
  payout: PayoutDelegate;
  webhookEvent: WebhookDelegate;
};

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function bump(current: number, data: unknown): number {
  if (typeof data === "number") return data;
  if (data && typeof data === "object" && "increment" in (data as object)) {
    return current + Number((data as { increment: number }).increment);
  }
  return current;
}

function prismaEngineReady(): boolean {
  try {
    const dir = path.join(process.cwd(), "node_modules", ".prisma", "client");
    return fs.readdirSync(dir).some((f) => f.includes("query_engine") || f.endsWith(".node"));
  } catch {
    return false;
  }
}

const STORE_PATH = path.join(process.cwd(), ".data", "affiliate-store.json");

function createMemory(): DbClient {
  const affiliates = new Map<string, AffiliateRow>();
  const affiliatesByEmail = new Map<string, string>();
  const affiliatesByCode = new Map<string, string>();
  const products = new Map<string, ProductRow>();
  const conversions: ConversionRow[] = [];
  const payouts: PayoutRow[] = [];
  const webhooks = new Map<string, { id: string; processed: boolean }>();

  function persist() {
    try {
      fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
      fs.writeFileSync(
        STORE_PATH,
        JSON.stringify({
          affiliates: [...affiliates.values()],
          conversions,
          payouts,
        }),
      );
    } catch (err) {
      console.warn("[db] persist failed", err);
    }
  }

  function hydrate() {
    try {
      if (!fs.existsSync(STORE_PATH)) return;
      const raw = JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) as {
        affiliates?: AffiliateRow[];
        conversions?: ConversionRow[];
        payouts?: PayoutRow[];
      };
      for (const a of raw.affiliates ?? []) {
        const row = {
          ...a,
          email: a.email.toLowerCase(),
          createdAt: new Date(a.createdAt),
          updatedAt: new Date(a.updatedAt),
          lastActiveAt: a.lastActiveAt ? new Date(a.lastActiveAt) : null,
        };
        affiliates.set(row.id, row);
        affiliatesByEmail.set(row.email, row.id);
        affiliatesByCode.set(row.code, row.id);
      }
      for (const c of raw.conversions ?? []) {
        conversions.push({ ...c, createdAt: new Date(c.createdAt) });
      }
      for (const p of raw.payouts ?? []) {
        payouts.push({ ...p, createdAt: new Date(p.createdAt) });
      }
    } catch (err) {
      console.warn("[db] hydrate failed", err);
    }
  }

  const seedProducts: ProductRow[] = [
    { id: "prd_nova", slug: "nova-pos", name: "Nova POS", domain: "pos.scalmint.com", href: "https://pos.scalmint.com", status: "LIVE", commissionType: "PERCENT_RECURRING", commissionRate: 3000, commissionCap: 50000, cookieDays: 30, minPayout: 5000 },
    { id: "prd_operasch", slug: "operasch", name: "Operasch", domain: "smartsos.cloud", href: "https://smartsos.cloud", status: "LIVE", commissionType: "PERCENT_RECURRING", commissionRate: 2500, commissionCap: 40000, cookieDays: 30, minPayout: 5000 },
    { id: "prd_jarvis", slug: "jarvis", name: "Jarvis", domain: null, href: null, status: "COMING_SOON", commissionType: "FLAT_CPA", commissionRate: 500, commissionCap: null, cookieDays: 30, minPayout: 5000 },
    { id: "prd_jobfinder", slug: "jobfinder", name: "JobFinder", domain: null, href: null, status: "COMING_SOON", commissionType: "FLAT_CPA", commissionRate: 1000, commissionCap: null, cookieDays: 30, minPayout: 5000 },
  ];
  for (const p of seedProducts) products.set(p.slug, p);
  hydrate();

  function getAffiliate(where: Record<string, unknown>): AffiliateRow | null {
    if (typeof where.id === "string") return affiliates.get(where.id) ?? null;
    if (typeof where.email === "string") {
      const key = affiliatesByEmail.get(where.email.toLowerCase());
      return key ? affiliates.get(key) ?? null : null;
    }
    if (typeof where.code === "string") {
      const key = affiliatesByCode.get(where.code);
      return key ? affiliates.get(key) ?? null : null;
    }
    return null;
  }

  const client: DbClient = {
    affiliate: {
      findUnique: async (args) => {
        const a = args as { where: Record<string, unknown>; include?: { conversions?: unknown; payouts?: unknown } };
        const row = getAffiliate(a.where);
        if (!row) return null;
        if (a.include) {
          return {
            ...row,
            conversions: conversions.filter((c) => c.affiliateId === row.id).slice(0, 10),
            payouts: payouts.filter((p) => p.affiliateId === row.id).slice(0, 5),
          };
        }
        return row;
      },
      findFirst: async (args) => getAffiliate((args as { where: Record<string, unknown> }).where),
      create: async (args) => {
        const data = (args as { data: Partial<AffiliateRow> }).data;
        const row: AffiliateRow = {
          id: id("aff"),
          code: data.code!,
          email: data.email!.toLowerCase(),
          name: data.name!,
          phone: data.phone ?? null,
          passwordHash: data.passwordHash!,
          status: data.status ?? "PENDING",
          payoutMethod: data.payoutMethod ?? "MOBILE_MONEY",
          payoutAccount: data.payoutAccount ?? null,
          payoutAccountName: data.payoutAccountName ?? null,
          bankCode: data.bankCode ?? null,
          ghanaCardId: data.ghanaCardId ?? null,
          totalClicks: 0,
          totalConversions: 0,
          totalEarned: 0,
          totalPaid: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastActiveAt: null,
        };
        affiliates.set(row.id, row);
        affiliatesByEmail.set(row.email, row.id);
        affiliatesByCode.set(row.code, row.id);
        persist();
        return row;
      },
      update: async (args) => {
        const a = args as { where: Record<string, unknown>; data: Record<string, unknown> };
        const row = getAffiliate(a.where);
        if (!row) throw new Error("Affiliate not found");
        const next: AffiliateRow = {
          ...row,
          totalClicks: bump(row.totalClicks, a.data.totalClicks),
          totalConversions: bump(row.totalConversions, a.data.totalConversions),
          totalEarned: bump(row.totalEarned, a.data.totalEarned),
          totalPaid: bump(row.totalPaid, a.data.totalPaid),
          lastActiveAt: (a.data.lastActiveAt as Date | undefined) ?? row.lastActiveAt,
          updatedAt: new Date(),
        };
        affiliates.set(row.id, next);
        persist();
        return next;
      },
      upsert: async (args) => {
        const a = args as { where: Record<string, unknown>; create: Partial<AffiliateRow> };
        const existing = getAffiliate(a.where);
        if (existing) return existing;
        return client.affiliate.create({ data: a.create });
      },
    },
    product: {
      findUnique: async (args) => {
        const where = (args as { where: { slug?: string; id?: string } }).where;
        if (where.slug) return products.get(where.slug) ?? null;
        if (where.id) return [...products.values()].find((p) => p.id === where.id) ?? null;
        return null;
      },
      upsert: async (args) => {
        const a = args as { where: { slug: string }; create: ProductRow };
        const row = { ...a.create, id: a.create.id ?? id("prd") };
        products.set(row.slug, row);
        return row;
      },
    },
    click: {
      create: async () => ({ id: id("clk") }),
    },
    conversion: {
      create: async (args) => {
        const data = (args as { data: Partial<ConversionRow> & { productId: string } }).data;
        const product = [...products.values()].find((p) => p.id === data.productId);
        const row: ConversionRow = {
          id: id("cnv"),
          affiliateId: data.affiliateId!,
          productId: data.productId,
          product: { name: product?.name ?? "Unknown", slug: product?.slug ?? "" },
          amount: data.amount ?? 0,
          commissionAmount: data.commissionAmount ?? 0,
          status: data.status ?? "PENDING",
          createdAt: new Date(),
        };
        conversions.unshift(row);
        persist();
        return row;
      },
      findMany: async (args) => {
        const where = (args as { where?: { status?: string; createdAt?: { lt?: Date } } }).where;
        return conversions.filter((c) => {
          if (where?.status && c.status !== where.status) return false;
          if (where?.createdAt?.lt && !(c.createdAt < where.createdAt.lt)) return false;
          return true;
        });
      },
      updateMany: async (args) => {
        const a = args as {
          where: { id?: { in?: string[] }; affiliateId?: string; status?: string };
          data: Partial<ConversionRow>;
        };
        let count = 0;
        for (const c of conversions) {
          const matchId = !a.where.id?.in || a.where.id.in.includes(c.id);
          const matchAff = !a.where.affiliateId || c.affiliateId === a.where.affiliateId;
          const matchStatus = !a.where.status || c.status === a.where.status;
          if (matchId && matchAff && matchStatus) {
            if (a.data.status) c.status = a.data.status;
            count += 1;
          }
        }
        return { count };
      },
      count: async (args) => {
        const where = (args as { where?: { affiliateId?: string; status?: string } }).where;
        return conversions.filter((c) => {
          if (where?.affiliateId && c.affiliateId !== where.affiliateId) return false;
          if (where?.status && c.status !== where.status) return false;
          return true;
        }).length;
      },
    },
    payout: {
      create: async (args) => {
        const data = (args as { data: Partial<PayoutRow> }).data;
        const row: PayoutRow = {
          id: id("pay"),
          affiliateId: data.affiliateId!,
          amount: data.amount ?? 0,
          method: data.method ?? "MOBILE_MONEY",
          reference: data.reference ?? id("ref"),
          transferCode: data.transferCode ?? null,
          status: data.status ?? "QUEUED",
          createdAt: new Date(),
        };
        payouts.unshift(row);
        persist();
        return row;
      },
      findUnique: async (args) => {
        const where = (args as { where: { reference?: string; id?: string } }).where;
        return payouts.find((p) => p.reference === where.reference || p.id === where.id) ?? null;
      },
      update: async (args) => {
        const a = args as { where: { id: string }; data: Partial<PayoutRow> };
        const row = payouts.find((p) => p.id === a.where.id);
        if (!row) throw new Error("Payout not found");
        Object.assign(row, a.data);
        return row;
      },
    },
    webhookEvent: {
      create: async (args) => {
        const ref = (args as { data: { reference: string } }).data.reference;
        if (webhooks.has(ref)) throw new Error("duplicate");
        const rec = { id: id("wh"), processed: false };
        webhooks.set(ref, rec);
        return rec;
      },
      update: async (args) => {
        const ref = (args as { where: { reference: string } }).where.reference;
        const rec = webhooks.get(ref) ?? { id: id("wh"), processed: true };
        rec.processed = true;
        webhooks.set(ref, rec);
        return rec;
      },
      findUnique: async (args) => {
        const ref = (args as { where: { reference: string } }).where.reference;
        return webhooks.get(ref) ?? null;
      },
    },
  };

  return client;
}

const g = globalThis as unknown as { __scalmintDb?: DbClient; __scalmintMemory?: DbClient };

function getMemory(): DbClient {
  if (!g.__scalmintMemory) g.__scalmintMemory = createMemory();
  return g.__scalmintMemory;
}

function getPrisma(): DbClient | null {
  if (!prismaEngineReady()) return null;
  if (g.__scalmintDb) return g.__scalmintDb;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require("@prisma/client") as { PrismaClient: new (opts?: unknown) => DbClient };
    g.__scalmintDb = new pkg.PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
    return g.__scalmintDb;
  } catch {
    return null;
  }
}

export const db: DbClient = getPrisma() ?? getMemory();
export const isMockDb = () => !prismaEngineReady();
