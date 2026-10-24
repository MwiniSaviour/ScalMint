import { z } from "zod";

const emptyToUndef = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().toLowerCase().trim(),
  phone: z.preprocess(emptyToUndef, z.string().regex(/^0\d{9}$/, "Use Ghana number: 0XXXXXXXXX").optional()),
  password: z.string().min(8).max(72),
  ghanaCardId: z.preprocess(emptyToUndef, z.string().min(5).max(50).optional()),
  payoutMethod: z.enum(["MOBILE_MONEY", "BANK"]).default("MOBILE_MONEY"),
  payoutAccount: z.string().min(10).max(20),
  payoutAccountName: z.preprocess(emptyToUndef, z.string().min(2).max(80).optional()),
  bankCode: z.preprocess(emptyToUndef, z.string().optional()),
  acceptedTerms: z.literal(true),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
