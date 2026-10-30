import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const PRODUCTS = [
  {
    id: "prd_nova",
    slug: "nova-pos",
    name: "Nova POS",
    domain: "pos.scalmint.com",
    href: "https://pos.scalmint.com",
    status: "LIVE",
    commissionType: "PERCENT_RECURRING",
    commissionRate: 3000,
    commissionCap: 50000,
    cookieDays: 30,
    minPayout: 5000,
  },
  {
    id: "prd_operasch",
    slug: "operasch",
    name: "Operasch",
    domain: "smartsos.cloud",
    href: "https://smartsos.cloud",
    status: "LIVE",
    commissionType: "PERCENT_ONE_TIME",
    commissionRate: 3000,
    commissionCap: 40000,
    cookieDays: 30,
    minPayout: 5000,
  },
  {
    id: "prd_jarvis",
    slug: "jarvis",
    name: "Jarvis",
    domain: null,
    href: null,
    status: "COMING_SOON",
    commissionType: "FLAT_CPA",
    commissionRate: 500,
    commissionCap: null,
    cookieDays: 30,
    minPayout: 5000,
  },
  {
    id: "prd_jobfinder",
    slug: "jobfinder",
    name: "JobFinder",
    domain: null,
    href: null,
    status: "COMING_SOON",
    commissionType: "FLAT_CPA",
    commissionRate: 1000,
    commissionCap: null,
    cookieDays: 30,
    minPayout: 5000,
  },
] as const;

async function main() {
  for (const product of PRODUCTS) {
    await db.product.upsert({
      where: { slug: product.slug },
      create: { ...product },
      update: {
        name: product.name,
        domain: product.domain,
        href: product.href,
        status: product.status,
        commissionType: product.commissionType,
        commissionRate: product.commissionRate,
        commissionCap: product.commissionCap,
        cookieDays: product.cookieDays,
        minPayout: product.minPayout,
      },
    });
  }

  await db.affiliate.upsert({
    where: { code: "SCAL-DEMO0001" },
    create: {
      code: "SCAL-DEMO0001",
      name: "Demo Affiliate",
      email: "demo@scalmint.com",
      passwordHash: await bcrypt.hash("demo1234", 12),
      status: "APPROVED",
    },
    update: {},
  });
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
