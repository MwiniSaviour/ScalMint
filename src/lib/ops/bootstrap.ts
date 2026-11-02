import bcrypt from "bcryptjs";
import { opsDb as db } from "@/lib/db";
import { hashToken, randomToken } from "@/lib/ops/crypto";
import { writeAudit } from "@/lib/ops/audit";

export type BootstrapResult =
  | { status: "exists"; email: string }
  | { status: "seeded-password"; email: string; warning: string }
  | { status: "seeded-reset"; email: string; resetToken: string; expiresAt: string };

export async function bootstrapOwner(): Promise<BootstrapResult> {
  const existing = await db.opsOperator.findFirst({ where: { role: "OWNER" } });
  if (existing) return { status: "exists", email: existing.email };

  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const name = (process.env.ADMIN_NAME ?? "ScalMint Owner").trim();
  if (!email || !email.includes("@")) {
    throw new Error("ADMIN_EMAIL must be set to bootstrap the OWNER account");
  }

  const oneTimePassword = process.env.ADMIN_PASSWORD?.trim() || "";
  const operator = await db.opsOperator.create({
    data: {
      email,
      name,
      role: "OWNER",
      status: "ACTIVE",
      passwordHash: oneTimePassword ? await bcrypt.hash(oneTimePassword, 12) : null,
    },
  });

  await writeAudit(db, {
    actorType: "SYSTEM",
    actorId: "bootstrap",
    action: "operator.bootstrap",
    targetType: "OpsOperator",
    targetId: operator.id,
    meta: { email, passwordSeeded: Boolean(oneTimePassword) },
  });

  if (oneTimePassword) {
    return {
      status: "seeded-password",
      email,
      warning: "ADMIN_PASSWORD was used once to seed the OWNER hash. Remove it from the environment now.",
    };
  }

  const resetToken = randomToken(32);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.passwordReset.create({
    data: {
      operatorId: operator.id,
      tokenHash: hashToken(resetToken),
      expiresAt,
    },
  });
  return { status: "seeded-reset", email, resetToken, expiresAt: expiresAt.toISOString() };
}

export const DEFAULT_PROJECTS = [
  {
    key: "operasch",
    name: "OPERASCH",
    kind: "SAAS" as const,
    lifecycleStage: "GROW" as const,
    criticality: "P1" as const,
    revenueBasis: "SUBSCRIPTION" as const,
    homepageUrl: "https://smartsos.cloud",
    timezone: "Africa/Accra",
    currency: "GHS",
    firstValueEvent: "school.activated",
    description: "School management SaaS.",
  },
  {
    key: "nova-pos",
    name: "Nova POS",
    kind: "POS" as const,
    lifecycleStage: "GROW" as const,
    criticality: "P1" as const,
    revenueBasis: "SUBSCRIPTION" as const,
    homepageUrl: "https://pos.scalmint.com",
    timezone: "Africa/Accra",
    currency: "GHS",
    firstValueEvent: "merchant.first_sale",
    description: "Retail point of sale.",
  },
  {
    key: "jarvis",
    name: "Jarvis",
    kind: "WEBAPP" as const,
    lifecycleStage: "BUILD" as const,
    criticality: "P2" as const,
    revenueBasis: "PROJECT" as const,
    homepageUrl: null,
    timezone: "Africa/Accra",
    currency: "GHS",
    description: "In build. No live ingest yet.",
  },
  {
    key: "jobfinder",
    name: "JobFinder",
    kind: "WEBAPP" as const,
    lifecycleStage: "BUILD" as const,
    criticality: "P2" as const,
    revenueBasis: "PROJECT" as const,
    homepageUrl: null,
    timezone: "Africa/Accra",
    currency: "GHS",
    description: "In build. No live ingest yet.",
  },
  {
    key: "scalmint-web",
    name: "scalmint.com",
    kind: "WEBSITE" as const,
    lifecycleStage: "MAINTAIN" as const,
    criticality: "P2" as const,
    revenueBasis: "INTERNAL" as const,
    homepageUrl: "https://scalmint.com",
    timezone: "Africa/Accra",
    currency: "GHS",
    description: "Marketing site.",
  },
  {
    key: "scalmint-ops",
    name: "Ops Console",
    kind: "INTERNAL" as const,
    lifecycleStage: "LAUNCH" as const,
    criticality: "P1" as const,
    revenueBasis: "INTERNAL" as const,
    homepageUrl: "https://admin.scalmint.com",
    timezone: "Africa/Accra",
    currency: "GHS",
    description: "This console. Self-health project.",
  },
] as const;

export async function seedProjects() {
  for (const p of DEFAULT_PROJECTS) {
    await db.project.upsert({
      where: { key: p.key },
      create: { ...p },
      update: {
        name: p.name,
        kind: p.kind,
        homepageUrl: p.homepageUrl,
        description: p.description,
      },
    });
  }
}
