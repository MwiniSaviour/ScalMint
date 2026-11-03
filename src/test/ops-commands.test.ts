import { describe, expect, it } from "vitest";
import { assertPublicHttpUrl, isCommandType, jsonSafe } from "@/lib/ops/ensure";

describe("command helpers", () => {
  it("accepts known command types only", () => {
    expect(isCommandType("check.create")).toBe(true);
    expect(isCommandType("revenue.record")).toBe(true);
    expect(isCommandType("rm -rf")).toBe(false);
  });

  it("rejects private probe targets", () => {
    expect(() => assertPublicHttpUrl("https://scalmint.com/health")).not.toThrow();
    expect(() => assertPublicHttpUrl("http://127.0.0.1/secret")).toThrow(/Private/);
    expect(() => assertPublicHttpUrl("http://10.0.0.4/x")).toThrow(/Private/);
    expect(() => assertPublicHttpUrl("ftp://example.com")).toThrow(/http/);
  });

  it("serializes bigint as number", () => {
    expect(jsonSafe({ amount: BigInt(1500) })).toEqual({ amount: 1500 });
  });
});
