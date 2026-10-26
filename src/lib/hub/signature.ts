import crypto from "crypto";

export const HUB_TOLERANCE_MS = 5 * 60 * 1000;

export function hubSignature(secret: string, raw: string, timestamp = Date.now()): string {
  const v1 = crypto.createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex");
  return `t=${timestamp},v1=${v1}`;
}

export function verifyHubSignature(
  secret: string | undefined,
  raw: string,
  header: string | null,
  toleranceMs = HUB_TOLERANCE_MS,
): boolean {
  if (!secret || !header) return false;

  let timestamp = Number.NaN;
  let signature = "";
  for (const part of header.split(",")) {
    const index = part.indexOf("=");
    if (index <= 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key === "t") timestamp = Number(value);
    else if (key === "v1") signature = value;
  }

  if (!Number.isFinite(timestamp) || !signature) return false;
  if (Math.abs(Date.now() - timestamp) > toleranceMs) return false;

  const expected = Buffer.from(
    crypto.createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex"),
    "hex",
  );
  const received = Buffer.from(signature, "hex");
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}
