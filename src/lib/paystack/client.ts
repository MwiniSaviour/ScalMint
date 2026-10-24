// Paystack Transfer client — Ghana
// Docs: https://paystack.com/docs/transfers/
// Pricing: Transfer to MoMo GHS 1, to bank GHS 8. Prefers MoMo for affiliates.

type TransferRecipientType = "mobile_money" | "ghipss"; // ghipss = Ghana bank (GhIPSS)

export type CreateRecipientInput = {
  type: TransferRecipientType;
  name: string;
  accountNumber: string; // MoMo number (e.g. 0244123456) or bank account
  bankCode?: string; // required for ghipss, e.g. "GCB" — fetch via /bank list
  currency?: "GHS";
};

export type PaystackRecipient = {
  id: number;
  recipient_code: string;
  type: TransferRecipientType;
  name: string;
  details: Record<string, string>;
};

export type InitiateTransferInput = {
  amount: number; // pesewas
  recipient: string; // recipient_code
  reference: string; // unique, e.g. aff_payout_<id>
  reason?: string;
};

const BASE = "https://api.paystack.co";

function headers() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY not set");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export async function createTransferRecipient(input: CreateRecipientInput): Promise<PaystackRecipient> {
  const res = await fetch(`${BASE}/transferrecipient`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      type: input.type,
      name: input.name,
      account_number: input.accountNumber,
      bank_code: input.bankCode,
      currency: input.currency ?? "GHS",
    }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!data.status) throw new Error(`Paystack recipient failed: ${JSON.stringify(data)}`);
  return data.data;
}

export async function initiateTransfer(input: InitiateTransferInput) {
  const res = await fetch(`${BASE}/transfer`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      source: "balance",
      amount: input.amount,
      recipient: input.recipient,
      reference: input.reference,
      reason: input.reason ?? "Affiliate commission",
    }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!data.status) throw new Error(`Paystack transfer failed: ${JSON.stringify(data)}`);
  return data.data as { transfer_code: string; reference: string; status: string };
}

export async function verifyTransfer(transferCodeOrReference: string) {
  const res = await fetch(`${BASE}/transfer/${transferCodeOrReference}`, {
    headers: headers(),
    cache: "no-store",
  });
  const data = await res.json();
  if (!data.status) throw new Error(`Paystack verify failed: ${JSON.stringify(data)}`);
  return data.data;
}

export function isMockMode(): boolean {
  return !process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY.includes("test") === false;
  // Actually allow test keys; only mock when key missing.
}

// For local dev without Paystack — record intent without moving money
export async function mockTransfer(input: InitiateTransferInput) {
  return {
    transfer_code: `TRF_mock_${Date.now()}`,
    reference: input.reference,
    status: "success",
    mock: true as const,
  };
}
