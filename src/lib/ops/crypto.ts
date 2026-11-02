import crypto from "crypto";

function key(): Buffer {
  const s =
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === "production" ? "" : "dev-only-auth-secret-change-me");
  if (!s || s.length < 16) throw new Error("AUTH_SECRET must be set to 32+ chars");
  return crypto.createHash("sha256").update(s).digest();
}

export function hashToken(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const truncated = ip.split(",")[0]?.trim() ?? "";
  if (!truncated) return null;
  return crypto.createHash("sha256").update(truncated).digest("hex").slice(0, 32);
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${enc.toString("base64url")}`;
}

export function decryptSecret(stored: string): string {
  const [ver, ivB, tagB, dataB] = stored.split(":");
  if (ver !== "v1" || !ivB || !tagB || !dataB) throw new Error("Invalid ciphertext");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataB, "base64url")), decipher.final()]).toString("utf8");
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}
