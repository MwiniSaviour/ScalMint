import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const products = [
    {
      slug: "nova-pos",
      name: "Nova POS",
      domain: "pos.scalmint.com",
      href: "https://pos.scalmint.com",
      status: "LIVE" as const,
      commissionType: "PERCENT_RECURRING" as const,
      commissionRate: 3000,
      commissionCap: 50000,
      cookieDays: 30,
      minPayout: 5000,
    },
    {
      slug: "operasch",
      name: "Operasch",
      domain: "smartsos.cloud",
      href: "https://smartsos.cloud",
      status: "LIVE" as const,
      commissionType: "PERCENT_RECURRING" as const,
      commissionRate: 2500,
      commissionCap: 40000,
      cookieDays: 30,
      minPayout: 5000,
    },
    {
      slug: "jarvis",
      name: "Jarvis",
      domain: null,
      href: null,
      status: "COMING_SOON" as const,
      commissionType: "FLAT_CPA" as const,
      commissionRate: 500,
      commissionCap: null,
      cookieDays: 30,
      minPayout: 5000,
    },
    {
      slug: "jobfinder",
      name: "JobFinder",
      domain: null,
      href: null,
      status: "COMING_SOON" as const,
      commissionType: "FLAT_CPA" as const,
      commissionRate: 1000,
      commissionCap: null,
      cookieDays: 30,
      minPayout: 5000,
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: p as never,
      create: p as never,
    });
  }

  const demoHash = await hash("demo1234", 12);
  await prisma.affiliate.upsert({
    where: { email: "demo@scalmint.com" },
    update: {},
    create: {
      code: "SCAL-DEMODEMO",
      email: "demo@scalmint.com",
      name: "Demo Affiliate",
      phone: "0244000000",
      passwordHash: demoHash,
      status: "APPROVED",
      payoutMethod: "MOBILE_MONEY",
      payoutAccount: "0244000000",
      payoutAccountName: "Demo Affiliate",
    },
  });

  console.log("Seeded 4 products + demo affiliate");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
