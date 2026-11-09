import type { Prisma } from "@prisma/client";
import { hashToken, randomToken } from "@/lib/ops/crypto";

export const RESET_TTL_MS = 24 * 60 * 60 * 1000;

/** The Prisma client surface the issue-side helpers need. */
export type ResetDb = Pick<Prisma.TransactionClient, "passwordReset">;

/**
 * Mark every still-valid reset token for the operator as spent, so that issuing
 * a new one leaves exactly one outstanding token. Call inside the caller's
 * transaction, before creating the replacement.
 */
export async function supersedePendingResets(db: ResetDb, operatorId: string): Promise<number> {
  const now = new Date();
  const superseded = await db.passwordReset.updateMany({
    where: { operatorId, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  return superseded.count;
}

/**
 * Create a fresh single-use reset token (24h). Call inside the caller's
 * transaction, after supersedePendingResets, so the new token is the only one
 * outstanding.
 */
export async function createPasswordReset(db: ResetDb, operatorId: string) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);
  await db.passwordReset.create({
    data: { operatorId, tokenHash: hashToken(token), expiresAt },
  });
  return { token, expiresAt };
}
