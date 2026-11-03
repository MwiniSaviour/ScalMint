export function daysUntil(expiresAt: Date, now = new Date()): number {
  return Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000);
}

/** Spec 7.11: alerts at 30/14/7/1 days. */
export function expiryBucket(expiresAt: Date, now = new Date()): 30 | 14 | 7 | 1 | null {
  const days = daysUntil(expiresAt, now);
  if (days <= 1) return 1;
  if (days <= 7) return 7;
  if (days <= 14) return 14;
  if (days <= 30) return 30;
  return null;
}

export async function upsertExpiryAlert(
  tx: {
    alert: {
      findFirst: (args: unknown) => Promise<{ id: string } | null>;
      update: (args: unknown) => Promise<unknown>;
      create: (args: unknown) => Promise<unknown>;
    };
  },
  input: { projectId: string; assetId: string; name: string; expiresAt: Date; now?: Date },
) {
  const now = input.now ?? new Date();
  const bucket = expiryBucket(input.expiresAt, now);
  if (!bucket) return null;
  const dedupe = `asset:${input.assetId}:${bucket}`;
  const existing = await tx.alert.findFirst({
    where: { projectId: input.projectId, openDedupeKey: dedupe },
  });
  const title = `${input.name} expires in ${bucket} day${bucket === 1 ? "" : "s"}`;
  const detail = `Expiry ${input.expiresAt.toISOString().slice(0, 10)}`;
  if (existing) {
    await tx.alert.update({ where: { id: existing.id }, data: { lastSeenAt: now, title, detail } });
    return existing.id;
  }
  const created = await tx.alert.create({
    data: {
      projectId: input.projectId,
      type: "asset.expiry",
      severity: bucket <= 7 ? "P1" : "P2",
      state: "OPEN",
      dedupeKey: dedupe,
      openDedupeKey: dedupe,
      title,
      detail,
    },
  });
  return (created as { id: string }).id;
}
