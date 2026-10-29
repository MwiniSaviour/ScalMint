import fs from "fs";
import path from "path";
import type {
  AffiliateDashboard,
  AffiliateRow,
  ConversionRow,
  PayoutRow,
  ProductRow,
} from "@/lib/affiliate/types";
import { DEFAULT_PRODUCTS, findAffiliate, mutateStore, readStore, upsertAffiliate } from "@/lib/store";

type AffiliateDelegate = {
  findUnique: (args: unknown) => Promise<AffiliateRow | AffiliateDashboard | null>;
  findFirst: (args: unknown) => Promise<AffiliateRow | null>;
  findMany: (args?: unknown) => Promise<AffiliateRow[]>;
  create: (args: unknown) => Promise<AffiliateRow>;
  update: (args: unknown) => Promise<AffiliateRow>;
  upsert: (args: unknown) => Promise<AffiliateRow>;
};

type ProductDelegate = {
  findUnique: (args: unknown) => Promise<ProductRow | null>;
  findMany: () => Promise<ProductRow[]>;
  update: (args: unknown) => Promise<ProductRow>;
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

function products(): ProductRow[] {
  const stored = readStore().products;
  return stored.length ? stored : DEFAULT_PRODUCTS;
}

function createFileDb(): DbClient {
  return {
    affiliate: {
      findUnique: async (args) => {
        const a = args as { where: Record<string, unknown>; include?: { conversions?: unknown; payouts?: unknown } };
        const row = findAffiliate(a.where);
        if (!row) return null;
        if (a.include) {
          const store = readStore();
          return {
            ...row,
            conversions: store.conversions.filter((c) => c.affiliateId === row.id).slice(0, 10),
            payouts: store.payouts.filter((p) => p.affiliateId === row.id).slice(0, 5),
          };
        }
        return row;
      },
      findMany: async () => readStore().affiliates,
      findFirst: async (args) => findAffiliate((args as { where: Record<string, unknown> }).where),
      create: async (args) => {
        const data = (args as { data: Partial<AffiliateRow> }).data;
        const row: AffiliateRow = {
          id: id("aff"),
          code: data.code!,
          email: data.email!.toLowerCase().trim(),
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
        upsertAffiliate(row);
        return row;
      },
      update: async (args) => {
        const a = args as { where: Record<string, unknown>; data: Record<string, unknown> };
        const row = findAffiliate(a.where);
        if (!row) throw new Error("Affiliate not found");
        const next: AffiliateRow = {
          ...row,
          name: typeof a.data.name === "string" ? a.data.name : row.name,
          phone: a.data.phone === undefined ? row.phone : (a.data.phone as string | null),
          status: (a.data.status as AffiliateRow["status"] | undefined) ?? row.status,
          payoutMethod: (a.data.payoutMethod as AffiliateRow["payoutMethod"] | undefined) ?? row.payoutMethod,
          payoutAccount: a.data.payoutAccount === undefined ? row.payoutAccount : (a.data.payoutAccount as string | null),
          payoutAccountName: a.data.payoutAccountName === undefined ? row.payoutAccountName : (a.data.payoutAccountName as string | null),
          totalClicks: bump(row.totalClicks, a.data.totalClicks),
          totalConversions: bump(row.totalConversions, a.data.totalConversions),
          totalEarned: bump(row.totalEarned, a.data.totalEarned),
          totalPaid: bump(row.totalPaid, a.data.totalPaid),
          lastActiveAt: (a.data.lastActiveAt as Date | undefined) ?? row.lastActiveAt,
          updatedAt: new Date(),
        };
        upsertAffiliate(next);
        return next;
      },
      upsert: async (args) => {
        const a = args as { where: Record<string, unknown>; create: Partial<AffiliateRow> };
        const existing = findAffiliate(a.where);
        if (existing) return existing;
        return createFileDb().affiliate.create({ data: a.create });
      },
    },
    product: {
      findUnique: async (args) => {
        const where = (args as { where: { slug?: string; id?: string } }).where;
        if (where.slug) return products().find((p) => p.slug === where.slug) ?? null;
        if (where.id) return products().find((p) => p.id === where.id) ?? null;
        return null;
      },
      findMany: async () => products(),
      update: async (args) => {
        const a = args as { where: { id?: string; slug?: string }; data: Partial<ProductRow> };
        let next: ProductRow | null = null;
        mutateStore((s) => {
          if (!s.products.length) s.products = DEFAULT_PRODUCTS.map((p) => ({ ...p }));
          const row = s.products.find((p) => p.id === a.where.id || p.slug === a.where.slug);
          if (!row) return;
          Object.assign(row, a.data);
          next = row;
        });
        if (!next) throw new Error("Product not found");
        return next;
      },
      upsert: async (args) => (args as { create: ProductRow }).create,
    },
    click: {
      create: async () => ({ id: id("clk") }),
    },
    conversion: {
      create: async (args) => {
        const data = (args as { data: Partial<ConversionRow> & { productId: string } }).data;
        const product = products().find((p) => p.id === data.productId);
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
        mutateStore((s) => {
          s.conversions.unshift(row);
        });
        return row;
      },
      findMany: async (args) => {
        const where = (args as { where?: { status?: string; createdAt?: { lt?: Date } } }).where;
        return readStore().conversions.filter((c) => {
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
        mutateStore((s) => {
          for (const c of s.conversions) {
            const matchId = !a.where.id?.in || a.where.id.in.includes(c.id);
            const matchAff = !a.where.affiliateId || c.affiliateId === a.where.affiliateId;
            const matchStatus = !a.where.status || c.status === a.where.status;
            if (matchId && matchAff && matchStatus) {
              if (a.data.status) c.status = a.data.status;
              count += 1;
            }
          }
        });
        return { count };
      },
      count: async (args) => {
        const where = (args as { where?: { affiliateId?: string; status?: string } }).where;
        return readStore().conversions.filter((c) => {
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
        mutateStore((s) => {
          s.payouts.unshift(row);
        });
        return row;
      },
      findUnique: async (args) => {
        const where = (args as { where: { reference?: string; id?: string } }).where;
        return readStore().payouts.find((p) => p.reference === where.reference || p.id === where.id) ?? null;
      },
      update: async (args) => {
        const a = args as { where: { id: string }; data: Partial<PayoutRow> };
        let next: PayoutRow | null = null;
        mutateStore((s) => {
          const row = s.payouts.find((p) => p.id === a.where.id);
          if (!row) return;
          Object.assign(row, a.data);
          next = row;
        });
        if (!next) throw new Error("Payout not found");
        return next;
      },
    },
    webhookEvent: {
      create: async () => ({ id: id("wh") }),
      update: async () => ({ id: "wh" }),
      findUnique: async () => null,
    },
  };
}

function prismaEngineReady(): boolean {
  try {
    const dir = path.join(process.cwd(), "node_modules", ".prisma", "client");
    return fs.readdirSync(dir).some((f) => f.includes("query_engine") || f.endsWith(".node"));
  } catch {
    return false;
  }
}

const fileDb = createFileDb();

export const db: DbClient = fileDb;
export const isMockDb = () => !prismaEngineReady();
