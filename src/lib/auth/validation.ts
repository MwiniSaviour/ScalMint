import { z } from "zod";

const emptyToUndef = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

function normalizeEmail(v: unknown) {
  if (typeof v !== "string") return v;
  return v.trim().toLowerCase();
}

/** Ghana local 0XXXXXXXXX — also accepts +233 / 233. */
export function normalizeGhPhone(v: unknown): unknown {
  if (typeof v !== "string" || v.trim() === "") return undefined;
  const digits = v.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("233")) return `0${digits.slice(3)}`;
  if (digits.length === 9) return `0${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return digits;
  return v.trim();
}

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.preprocess(normalizeEmail, z.string().email()),
  phone: z.preprocess(normalizeGhPhone, z.string().regex(/^0\d{9}$/, "Use a Ghana number (0244123456 or +233244123456)").optional()),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  ghanaCardId: z.preprocess(emptyToUndef, z.string().min(5).max(50).optional()),
  payoutMethod: z.enum(["MOBILE_MONEY", "BANK"]).default("MOBILE_MONEY"),
  payoutAccount: z.preprocess(normalizeGhPhone, z.string().min(10).max(20)),
  payoutAccountName: z.preprocess(emptyToUndef, z.string().min(2).max(80).optional()),
  bankCode: z.preprocess(emptyToUndef, z.string().optional()),
  acceptedTerms: z.literal(true),
});

export const loginSchema = z.object({
  email: z.preprocess(normalizeEmail, z.string().email()),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
