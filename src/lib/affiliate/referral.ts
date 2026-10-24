import { customAlphabet } from "nanoid";

// Referral codes: SCAL-XXXXXX (8 char, no ambiguous chars)
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const nanoid = customAlphabet(ALPHABET, 8);

export function generateAffiliateCode(): string {
  return `SCAL-${nanoid()}`;
}

export function referralLink(baseUrl: string, code: string, slug?: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set("ref", code);
  if (slug) url.searchParams.set("p", slug);
  return url.toString();
}

export function normalizeRef(input: string | null | undefined): string | null {
  if (!input) return null;
  const v = input.trim().toUpperCase();
  if (!/^SCAL-[A-Z0-9]{8}$/.test(v)) return null;
  return v;
}

export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  // Simple non-cryptographic hash for indexing — replace with HMAC in production
  let h = 0;
  for (let i = 0; i < ip.length; i++) h = (Math.imul(31, h) + ip.charCodeAt(i)) | 0;
  return `ip_${Math.abs(h).toString(36)}`;
}

export const COOKIE_NAME = "_aff_ref";
export const CLICK_ID_COOKIE = "_aff_cid";
export const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days, matches Ghana standard

export type CommissionCalc = {
  commissionPesewas: number;
  rateApplied: number;
  capped: boolean;
};

export function calcCommission(
  product: { commissionType: string; commissionRate: number; commissionCap: number | null },
  amountPesewas: number,
): CommissionCalc {
  if (product.commissionType === "FLAT_CPA" || product.commissionType === "flat_cpa") {
    return { commissionPesewas: product.commissionRate, rateApplied: product.commissionRate, capped: false };
  }
  // percent recurring: rate is bps (3000 = 30%)
  let commission = Math.round((amountPesewas * product.commissionRate) / 10000);
  let capped = false;
  if (product.commissionCap != null && commission > product.commissionCap) {
    commission = product.commissionCap;
    capped = true;
  }
  return { commissionPesewas: commission, rateApplied: product.commissionRate, capped };
}
