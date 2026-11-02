import { describe, expect, it } from "vitest";
import { hubSignature, verifyHubSignature } from "@/lib/hub/signature";

describe("ingest HMAC contract", () => {
  const secret = "ops_live_test_token";
  const body = JSON.stringify({ schemaVersion: "1", events: [] });

  it("accepts a fresh signature", () => {
    const header = hubSignature(secret, body);
    expect(verifyHubSignature(secret, body, header)).toBe(true);
  });

  it("rejects clock skew beyond 5 minutes", () => {
    const header = hubSignature(secret, body, Date.now() - 6 * 60 * 1000);
    expect(verifyHubSignature(secret, body, header)).toBe(false);
  });

  it("rejects a different body (replay of another payload)", () => {
    const header = hubSignature(secret, body);
    expect(verifyHubSignature(secret, body + "x", header)).toBe(false);
  });
});
