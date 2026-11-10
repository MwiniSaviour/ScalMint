import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { POST } from "@/app/api/admin/update-password/route";
import { requireOperator } from "@/lib/ops/guard";
import { rateLimit } from "@/lib/ops/rate-limit";
import { hashIp } from "@/lib/ops/crypto";
import type { OpsSession } from "@/lib/ops/types";

type OperatorRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  sessionVersion: number;
  passwordHash: string | null;
};

const CURRENT_PASSWORD = "correct-horse-battery-staple";
const NEW_PASSWORD = "changed-horse-battery-staple";
const OLD_HASH = "";
const IP = "203.0.113.9";

// Assigned as a real hash in beforeEach; the route's update predicate
// must carry this exact value, so it is captured, not assumed.
let lockedOldHash = OLD_HASH;

const h = vi.hoisted(() => ({
  findUnique: vi.fn(),
  txUpdate: vi.fn(),
  txAuditCreate: vi.fn(),
}));

vi.mock("@/lib/db", () => {
  const tx = {
    opsOperator: { update: h.txUpdate },
    auditActivity: { create: h.txAuditCreate },
  };
  return {
    opsDb: {
      opsOperator: { findUnique: h.findUnique },
      $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    },
  };
});

vi.mock("@/lib/ops/guard", () => ({
  requireOperator: vi.fn(),
}));

vi.mock("@/lib/ops/rate-limit", () => ({
  rateLimit: vi.fn(),
}));

const SESSION: OpsSession = {
  operatorId: "op_1",
  email: "ops@example.com",
  name: "Ops",
  role: "OWNER",
  sessionVersion: 3,
};

const store = {
  operator: null as OperatorRow | null,
  lastPasswordHash: null as string | null,
  auditCreated: 0,
  // When true, another write lands between the route's read and its
  // transaction — the live row changes but the route's snapshot does not.
  concurrentWriteAfterRead: false,
};

function buildRequest(body: unknown) {
  return new Request("https://admin.scalmint.com/api/admin/update-password", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://admin.scalmint.com",
      "x-forwarded-for": IP,
    },
    // A string is passed through verbatim so malformed JSON is testable.
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  lockedOldHash = bcrypt.hashSync(CURRENT_PASSWORD, 10);
  store.operator = {
    id: "op_1",
    email: "ops@example.com",
    name: "Ops",
    role: "OWNER",
    status: "ACTIVE",
    sessionVersion: 3,
    passwordHash: lockedOldHash,
  };
  store.lastPasswordHash = null;
  store.auditCreated = 0;
  store.concurrentWriteAfterRead = false;

  // Mirrors Prisma's single-record semantics: the route receives a snapshot
  // of the row as it was at read time, while a concurrent write mutates only
  // the LIVE row. The transaction's hash predicate is therefore checked
  // against the live value, so a concurrent password change makes the write
  // fail loudly (P2025) instead of clobbering it.
  h.findUnique.mockReset();
  h.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
    if (!store.operator || where.id !== store.operator.id) return null;
    const snapshot = { ...store.operator };
    if (store.concurrentWriteAfterRead) {
      store.operator = {
        ...store.operator,
        // Real concurrent writers hash the new password; using a genuine
        // hash keeps bcrypt.compare against the snapshot meaningful.
        passwordHash: bcrypt.hashSync("changed-by-a-concurrent-write", 10),
      };
    }
    return snapshot;
  });

  h.txUpdate.mockReset();
  h.txUpdate.mockImplementation(async ({
    where,
    data,
  }: {
    where: { id: string; passwordHash?: string };
    data: { passwordHash?: string; sessionVersion?: { increment: number } };
  }) => {
    if (!store.operator || where.id !== store.operator.id) {
      throw new Error("operator not found");
    }
    if (
      where.passwordHash !== undefined &&
      store.operator.passwordHash !== where.passwordHash
    ) {
      throw new Error("P2025: the record was concurrently modified");
    }
    if (typeof data.passwordHash === "string") {
      store.lastPasswordHash = data.passwordHash;
    }
    if (data.sessionVersion?.increment) {
      store.operator.sessionVersion += data.sessionVersion.increment;
    }
    return store.operator;
  });

  h.txAuditCreate.mockReset();
  h.txAuditCreate.mockImplementation(async () => {
    store.auditCreated += 1;
    return {};
  });

  vi.mocked(rateLimit).mockReset();
  vi.mocked(rateLimit).mockReturnValue({ ok: true, retryAfterSec: 900 });
  vi.mocked(requireOperator).mockReset();
  vi.mocked(requireOperator).mockResolvedValue({ session: SESSION });

  vi.stubEnv("AUTH_SECRET", "ops-update-test-secret-0123456789");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/admin/update-password", () => {
  it("rejects a malformed JSON body", async () => {
    const res = await POST(buildRequest("{not-json"));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "A password of 12+ characters is required",
    });
    expect(h.txUpdate).not.toHaveBeenCalled();
    expect(h.txAuditCreate).not.toHaveBeenCalled();
  });

  it("rejects a new password under 12 characters", async () => {
    const res = await POST(buildRequest({
      currentPassword: CURRENT_PASSWORD,
      newPassword: "short",
    }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "A password of 12+ characters is required",
    });
    expect(h.findUnique).not.toHaveBeenCalled();
  });

  it("rejects passwords changing longer than 128 characters", async () => {
    const res = await POST(buildRequest({
      currentPassword: "x".repeat(129),
      newPassword: "y".repeat(129),
    }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "A password of 12+ characters is required",
    });
    expect(h.findUnique).not.toHaveBeenCalled();
  });

  it("updates the hash, bumps the session version, records the audit and re-signs the session", async () => {
    const res = await POST(buildRequest({
      currentPassword: CURRENT_PASSWORD,
      newPassword: NEW_PASSWORD,
    }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });

    // The guard is called with the full four-role list — password changes
    // are an account-security mutation any signed-in operator may perform
    // on their own account.
    expect(requireOperator).toHaveBeenCalledTimes(1);
    expect(vi.mocked(requireOperator).mock.calls[0]![1]).toEqual({
      roles: ["OWNER", "ADMIN", "ANALYST", "SUPPORT"],
    });

    // Rate limit is keyed per operator: 5 attempts / 15 minutes.
    expect(rateLimit).toHaveBeenCalledTimes(1);
    expect(vi.mocked(rateLimit).mock.calls[0]).toEqual([
      "ops-passwd:op_1",
      5,
      15 * 60 * 1000,
    ]);

    // Prisma contract, exact: the update predicate carries the pre-read
    // hash so a concurrent change fails the write instead of clobbering it.
    expect(h.txUpdate).toHaveBeenCalledTimes(1);
    const updateArgs = h.txUpdate.mock.calls[0]![0];
    expect(updateArgs.where).toEqual({ id: "op_1", passwordHash: lockedOldHash });
    expect(updateArgs.data.sessionVersion).toEqual({ increment: 1 });
    expect(await bcrypt.compare(NEW_PASSWORD, store.lastPasswordHash ?? "")).toBe(true);

    expect(store.operator?.sessionVersion).toBe(4);
    expect(h.txAuditCreate).toHaveBeenCalledTimes(1);
    const auditArgs = h.txAuditCreate.mock.calls[0]![0];
    expect(auditArgs.data.actorType).toBe("OPERATOR");
    expect(auditArgs.data.actorId).toBe("op_1");
    expect(auditArgs.data.action).toBe("operator.password_changed");
    expect(auditArgs.data.targetType).toBe("OpsOperator");
    expect(auditArgs.data.targetId).toBe("op_1");
    expect(auditArgs.data.ipHash).toBe(hashIp(IP));

    expect(res.headers.get("set-cookie") ?? "").toContain("ops_session=");
  });

  it("rejects the wrong current password without touching the store", async () => {
    const res = await POST(buildRequest({
      currentPassword: "wrong-current-password",
      newPassword: NEW_PASSWORD,
    }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Current password is incorrect",
    });
    expect(store.lastPasswordHash).toBeNull();
    expect(store.operator?.sessionVersion).toBe(3);
    expect(h.txUpdate).not.toHaveBeenCalled();
    expect(h.txAuditCreate).not.toHaveBeenCalled();
  });

  it("rejects a new password equal to the current one", async () => {
    const res = await POST(buildRequest({
      currentPassword: CURRENT_PASSWORD,
      newPassword: CURRENT_PASSWORD,
    }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "New password must be different from the current password",
    });
    expect(store.lastPasswordHash).toBeNull();
    expect(store.operator?.sessionVersion).toBe(3);
    expect(h.txUpdate).not.toHaveBeenCalled();
    expect(h.txAuditCreate).not.toHaveBeenCalled();
  });

  it("returns 409 when the operator has no password set (bootstrap-only)", async () => {
    store.operator = { ...store.operator!, passwordHash: null };
    const res = await POST(buildRequest({
      currentPassword: CURRENT_PASSWORD,
      newPassword: NEW_PASSWORD,
    }));
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: "Password not set. Use the one-time reset token from bootstrap.",
    });
    expect(h.txUpdate).not.toHaveBeenCalled();
    expect(h.txAuditCreate).not.toHaveBeenCalled();
  });

  it("returns 401 when the operator row no longer exists", async () => {
    store.operator = null;
    const res = await POST(buildRequest({
      currentPassword: CURRENT_PASSWORD,
      newPassword: NEW_PASSWORD,
    }));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Session is invalid" });
    expect(h.txUpdate).not.toHaveBeenCalled();
    expect(h.txAuditCreate).not.toHaveBeenCalled();
  });

  it("returns 401 when the operator is not ACTIVE (soft-disabled)", async () => {
    store.operator = { ...store.operator!, status: "DISABLED" };
    const res = await POST(buildRequest({
      currentPassword: CURRENT_PASSWORD,
      newPassword: NEW_PASSWORD,
    }));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Session is invalid" });
    expect(h.txUpdate).not.toHaveBeenCalled();
    expect(h.txAuditCreate).not.toHaveBeenCalled();
  });

  it("returns 429 with Retry-After when rate limited", async () => {
    vi.mocked(rateLimit).mockReturnValueOnce({ ok: false, retryAfterSec: 615 });
    const res = await POST(buildRequest({
      currentPassword: CURRENT_PASSWORD,
      newPassword: NEW_PASSWORD,
    }));
    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toEqual({ error: "Too many attempts" });
    expect(res.headers.get("retry-after")).toBe("615");
    expect(h.findUnique).not.toHaveBeenCalled();
    expect(h.txUpdate).not.toHaveBeenCalled();
    expect(h.txAuditCreate).not.toHaveBeenCalled();
  });

  it("passes the guard error straight through", async () => {
    vi.mocked(requireOperator).mockResolvedValueOnce({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(buildRequest({
      currentPassword: CURRENT_PASSWORD,
      newPassword: NEW_PASSWORD,
    }));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(h.findUnique).not.toHaveBeenCalled();
    expect(h.txUpdate).not.toHaveBeenCalled();
    expect(h.txAuditCreate).not.toHaveBeenCalled();
  });

  it("fails loudly instead of clobbering a concurrent password change", async () => {
    store.concurrentWriteAfterRead = true;
    await expect(
      POST(buildRequest({
        currentPassword: CURRENT_PASSWORD,
        newPassword: NEW_PASSWORD,
      })),
    ).rejects.toThrow("concurrently modified");

    // Nothing was persisted: same session version, no new hash, no audit.
    expect(store.operator?.sessionVersion).toBe(3);
    expect(store.lastPasswordHash).toBeNull();
    expect(h.txAuditCreate).not.toHaveBeenCalled();
  });
});
