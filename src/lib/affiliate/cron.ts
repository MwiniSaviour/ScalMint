// Cron: approve pending conversions after 7-day verification window
// Run via Vercel Cron: vercel.json crons[ { path: "/api/affiliate/cron/approve", schedule: "0 2 * * *" } ]

import { db } from "@/lib/db";

export async function approveDueConversions() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const due = await db.conversion.findMany({
    where: { status: "PENDING", createdAt: { lt: cutoff } },
    select: { id: true },
  });
  if (due.length === 0) return { approved: 0 };
  await db.conversion.updateMany({ where: { id: { in: due.map((d: { id: string }) => d.id) } }, data: { status: "APPROVED", verifiedAt: new Date() } });
  return { approved: due.length };
}
