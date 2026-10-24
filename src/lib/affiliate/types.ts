export type AffiliateStatus = "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";
export type PayoutMethod = "MOBILE_MONEY" | "BANK";
export type ProductStatus = "LIVE" | "COMING_SOON";
export type CommissionType = "PERCENT_RECURRING" | "PERCENT_ONE_TIME" | "FLAT_CPA";
export type ConversionStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";
export type PayoutStatus = "QUEUED" | "PROCESSING" | "SUCCESS" | "FAILED" | "REVERSED";

export type AffiliateRow = {
  id: string;
  code: string;
  email: string;
  name: string;
  phone: string | null;
  passwordHash: string;
  status: AffiliateStatus;
  payoutMethod: PayoutMethod;
  payoutAccount: string | null;
  payoutAccountName: string | null;
  bankCode: string | null;
  ghanaCardId: string | null;
  totalClicks: number;
  totalConversions: number;
  totalEarned: number;
  totalPaid: number;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date | null;
};

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  href: string | null;
  status: ProductStatus;
  commissionType: CommissionType;
  commissionRate: number;
  commissionCap: number | null;
  cookieDays: number;
  minPayout: number;
};

export type ConversionRow = {
  id: string;
  affiliateId: string;
  productId: string;
  product: { name: string; slug: string };
  amount: number;
  commissionAmount: number;
  status: ConversionStatus;
  createdAt: Date;
};

export type PayoutRow = {
  id: string;
  affiliateId: string;
  amount: number;
  method: PayoutMethod;
  reference: string;
  transferCode: string | null;
  status: PayoutStatus;
  createdAt: Date;
};

export type AffiliateDashboard = AffiliateRow & {
  conversions: ConversionRow[];
  payouts: PayoutRow[];
};
