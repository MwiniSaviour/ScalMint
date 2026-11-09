import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { POST } from "@/app/api/admin/reset-password/route";
import { hashToken } from "@/lib/ops/crypto";
import {
  createPasswordReset,
  supersedePendingResets,
  type ResetDb,
} from "@/lib/ops/password-reset";

type ResetRow = {
  id: string;
  operatorId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
};

type OperatorRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  sessionVersion: number;
};

const TOKEN = "or_0123456789abcdefghijklmnopqrstuvwxyzAB";
export const PASSWORD = "correct-horse-battery-staple";

const store: {
  resetRow: ResetRow | null;
  operator: OperatorRow | null;
  lastPasswordHash: string | null;
  auditCreated: number;
} = {
  resetRow: null,
  operator: null,
  lastPasswordHash: null,
  auditCreated: 0,
};

vi.mock("@/lib/db", () => {
  const tx = {
    passwordReset: {
      // Mirrors the atomic claim: only wins when the row still matches the
      // "unused and unexpired" predicate, exactly like Prisma's updateMany.
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: {
            id?: string;
            operatorId?: string;
            usedAt?: null;
            expiresAt?: { gt: Date };
          };
          data: { usedAt: Date };
        }) => {
          if (!store.resetRow) return { count: 0 };
          const matchesId =
            where.id === undefined || where.id === store.resetRow.id;
          const matchesOperator =
            where.operatorId === undefined ||
            where.operatorId === store.resetRow.operatorId;
          const matchesUnused =
            where.usedAt === undefined || store.resetRow.usedAt === null;
          const matchesExpiry =
            where.expiresAt?.gt === undefined ||
            store.resetRow.expiresAt > where.expiresAt.gt;
          if (
            matchesId &&
            matchesOperator &&
            matchesUnused &&
            matchesExpiry
          ) {
            store.resetRow.usedAt = data.usedAt;
            return { count: 1 };
          }
          return { count: 0 };
        },
      ),
    },
    opsOperator: {
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: {
            passwordHash?: string;
            sessionVersion?: { increment: number };
            status?: string;
          };
        }) => {
          if (!store.operator || where.id !== store.operator.id) {
            throw new Error("operator not found");
          }
          if (typeof data.passwordHash === "string") {
            store.lastPasswordHash = data.passwordHash;
          }
          if (data.sessionVersion?.increment) {
            store.operator.sessionVersion += data.sessionVersion.increment;
          }
          if (data.status) store.operator.status = data.status;
          return store.operator;
        },
      ),
    },
    auditActivity: {
      create: vi.fn(async () => {
        store.auditCreated += 1;
        return {};
      }),
    },
  };
  return {
    opsDb: {
      passwordReset: {
        findUnique: vi.fn(async ({ where }: { where: { tokenHash: string } }) =>
          store.resetRow && where.tokenHash === store.resetRow.tokenHash
            ? store.resetRow
            : null,
        ),
      },
      opsOperator: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
          store.operator && where.id === store.operator.id
            ? store.operator
            : null,
        ),
      },
      $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    },
  };
});

// Issue-side helper tests use their own fake client, unrelated to the route.
function fakeResetClient(rows: ResetRow[]) {
  return {
    passwordReset: {
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: {
            operatorId?: string;
            usedAt?: null;
            expiresAt?: { gt: Date };
          };
          data: { usedAt: Date };
        }) => {
          let count = 0;
          for (const row of rows) {
            if (
              (where.operatorId === undefined ||
                where.operatorId === row.operatorId) &&
              (where.usedAt === undefined || row.usedAt === null) &&
              (where.expiresAt?.gt === undefined ||
                row.expiresAt > where.expiresAt.gt)
            ) {
              row.usedAt = data.usedAt;
              count += 1;
            }
          }
          return { count };
        },
      ),
      create: vi.fn(
        async ({ data }: { data: { operatorId: string; tokenHash: string; expiresAt: Date } }) => {
          const row: ResetRow = {
            id: `reset_${rows.length + 1}`,
            operatorId: data.operatorId,
            tokenHash: data.tokenHash,
            expiresAt: data.expiresAt,
            usedAt: null,
          };
          rows.push(row);
          return row;
        },
      ),
    },
  };
}

function resetPost(body: unknown, ip: string) {
  return POST(
    new Request("https://admin.scalmint.com/api/admin/reset-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://admin.scalmint.com",
        "x-forwarded-for": ip,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  store.resetRow = {
    id: "reset_1",
    operatorId: "op_1",
    tokenHash: hashToken(TOKEN),
    expiresAt: new Date(Date.now() + 3_600_000),
    usedAt: null,
  };
  store.operator = {
    id: "op_1",
    email: "ops@example.com",
    name: "Ops",
    role: "OWNER",
    status: "ACTIVE",
    sessionVersion: 3,
  };
  store.lastPasswordHash = null;
  store.auditCreated = 0;
  vi.stubEnv("AUTH_SECRET", "ops-reset-test-secret-0123456789");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/admin/reset-password", () => {
  it("rejects a missing token", async () => {
    const res = await resetPost({ token: "", password: PASSWORD }, "10.0.0.1");
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Token and a password of 12+ characters are required",
    });
  });

  it("rejects a malformed body", async () => {
    const res = await resetPost(null, "10.0.0.11");
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Token and a password of 12+ characters are required",
    });
  });

  it("rejects a password under 12 characters", async () => {
    const res = await resetPost({ token: TOKEN, password: "too-short" }, "10.0.0.2");
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Token and a password of 12+ characters are required",
    });
  });

  it("rejects an unknown token", async () => {
    const res = await resetPost(
      { token: "unknown-token-unknown-token-123456", password: PASSWORD },
      "10.0.0.3",
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Reset token is invalid or expired",
    });
  });

  it("rejects an expired token", async () => {
    store.resetRow = {
      ...store.resetRow!,
      expiresAt: new Date(Date.now() - 1_000),
    };
    const res = await resetPost({ token: TOKEN, password: PASSWORD }, "10.0.0.4");
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Reset token is invalid or expired",
    });
  });

  it("rejects an already-used token", async () => {
    store.resetRow = { ...store.resetRow!, usedAt: new Date() };
    const res = await resetPost({ token: TOKEN, password: PASSWORD }, "10.0.0.5");
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Reset token is invalid or expired",
    });
  });

  it("rejects when the operator no longer exists", async () => {
    store.operator = null;
    const res = await resetPost({ token: TOKEN, password: PASSWORD }, "10.0.0.7");
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Reset token is invalid or expired",
    });
  });

  it("refuses to reactivate a disabled operator", async () => {
    store.operator = { ...store.operator!, status: "DISABLED" };
    const res = await resetPost({ token: TOKEN, password: PASSWORD }, "10.0.0.8");
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Account is disabled",
    });
    expect(store.lastPasswordHash).toBeNull();
  });

  it("sets the password, burns the token and signs the operator in", async () => {
    const res = await resetPost({ token: TOKEN, password: PASSWORD }, "10.0.0.6");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });

    expect(store.resetRow?.usedAt).toBeInstanceOf(Date);
    expect(store.operator?.status).toBe("ACTIVE");
    expect(store.operator?.sessionVersion).toBe(4);
    expect(store.lastPasswordHash).not.toBe(PASSWORD);
    expect(await bcrypt.compare(PASSWORD, store.lastPasswordHash ?? "")).toBe(true);
    expect(store.auditCreated).toBe(1);
    expect(res.headers.get("set-cookie") ?? "").toContain("ops_session=");
  });

  it("lets only one of two concurrent requests claim the same token", async () => {
    const ip = "10.0.0.10";
    const [a, b] = await Promise.all([
      resetPost({ token: TOKEN, password: PASSWORD }, ip),
      resetPost({ token: TOKEN, password: PASSWORD }, ip),
    ]);
    const statuses = [a.status, b.status].sort((x, y) => x - y);
    expect(statuses).toEqual([200, 400]);
  });

  it("rate-limits repeated attempts from one IP", async () => {
    store.resetRow = null;
    const statuses: number[] = [];
    for (let i = 0; i < 11; i += 1) {
      const res = await resetPost({ token: TOKEN, password: PASSWORD }, "10.0.0.9");
      statuses.push(res.status);
      if (res.status === 429) {
        expect(res.headers.get("retry-after")).toBeTruthy();
      }
    }
    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(400));
    expect(statuses[10]).toBe(429);
  });
});

describe("issue-side reset helpers", () => {
  it("supersedes earlier tokens before creating a new one", async () => {
    const now = new Date();
    const rows: ResetRow[] = [
      {
        id: "reset_old",
        operatorId: "op_1",
        tokenHash: "old",
        expiresAt: new Date(now.getTime() + 3_600_000),
        usedAt: null,
      },
      {
        id: "reset_other",
        operatorId: "op_2",
        tokenHash: "other",
        expiresAt: new Date(now.getTime() + 3_600_000),
        usedAt: null,
      },
    ];
    // Test double for the Prisma transaction client surface the helpers need.
    const client = fakeResetClient(rows) as unknown as ResetDb;
    const superseded = await supersedePendingResets(client, "op_1");
    expect(superseded).toBe(1);

    const { token, expiresAt } = await createPasswordReset(client, "op_1");
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
    expect(rows.length).toBe(3);
    const created = rows.find((r) => r.tokenHash === hashToken(token));
    expect(created).toBeDefined();
    expect(created?.operatorId).toBe("op_1");
    expect(created?.usedAt).toBeNull();
    // The other operator's token was left alone.
    expect(rows.find((r) => r.operatorId === "op_2")?.usedAt).toBeNull();
  });
});
