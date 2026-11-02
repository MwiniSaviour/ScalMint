import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaFailed?: boolean };

function stub(): PrismaClient {
  const missing = async () => {
    throw new Error("Prisma client is not generated. Run prisma generate && prisma migrate deploy.");
  };
  return new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "$transaction") {
          return async (fn: (tx: unknown) => unknown) => fn(stub());
        }
        if (typeof prop === "symbol") return undefined;
        return new Proxy(
          {},
          {
            get: () => missing,
          },
        );
      },
    },
  ) as PrismaClient;
}

function getClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  if (globalForPrisma.prismaFailed) return stub();
  try {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
    });
    return globalForPrisma.prisma;
  } catch {
    globalForPrisma.prismaFailed = true;
    return stub();
  }
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const instance = getClient();
    const value = (instance as unknown as Record<PropertyKey, unknown>)[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(instance) : value;
  },
});

/** Ops models after `prisma generate`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const opsDb = db as typeof db & Record<string, any>;
