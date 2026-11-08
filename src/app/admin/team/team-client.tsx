"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { opsFetch } from "@/lib/ops/client-fetch";

type Operator = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  sessionVersion: number;
  lastLoginAt: string | null;
  createdAt: string;
};

const ROLE_FILTERS = ["ALL", "OWNER", "ADMIN", "ANALYST", "SUPPORT"] as const;

function SearchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M11.3253 2.92485C15.9645 2.92485 19.7256 6.68564 19.7257 11.3243C19.7256 13.374 18.9897 15.2511 17.7697 16.709L20.8556 19.795C21.1483 20.0878 21.1481 20.5626 20.8556 20.8555C20.5627 21.1484 20.0879 21.1484 19.795 20.8555L16.7091 17.7696C15.2511 18.9882 13.3743 19.7227 11.3253 19.7227C6.68631 19.7225 2.92518 15.9627 2.92493 11.3243C2.92507 6.68575 6.68624 2.92503 11.3253 2.92485ZM11.3253 4.42485C7.51438 4.42503 4.42507 7.51446 4.42493 11.3243C4.42518 15.134 7.51445 18.2225 11.3253 18.2227C15.1363 18.2227 18.2255 15.1341 18.2257 11.3243C18.2256 7.51435 15.1364 4.42485 11.3253 4.42485Z" fill="currentColor" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6 12.0002H18.0007M12.0002 6V18.0007" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function statusBadge(status: string) {
  const active = status === "ACTIVE";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
      }`}
    >
      {active ? "Active" : "Disabled"}
    </span>
  );
}

export default function TeamClient() {
  const [operators, setOperators] = useState<Operator[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<string>>(() => new Set());
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_FILTERS)[number]>("ALL");
  const [showAdd, setShowAdd] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [addRole, setAddRole] = useState<"ADMIN" | "ANALYST" | "SUPPORT">("SUPPORT");
  const [adding, setAdding] = useState(false);
  const [tokenPanel, setTokenPanel] = useState<{ email: string; token: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const res = await opsFetch<{ operators: Operator[] }>("/api/admin/team");
    setLoading(false);
    if (res.ok && res.data?.operators) {
      setOperators(res.data.operators);
    } else {
      setOperators(null);
      setLoadError(res.error ?? "Failed to load team members");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (!operators) return [];
    const needle = search.trim().toLowerCase();
    return operators.filter((m) => {
      const okRole = roleFilter === "ALL" || m.role === roleFilter;
      const okSearch =
        !needle ||
        m.id.toLowerCase().includes(needle) ||
        m.name.toLowerCase().includes(needle) ||
        m.email.toLowerCase().includes(needle);
      return okRole && okSearch;
    });
  }, [operators, search, roleFilter]);

  async function patchOperator(member: Operator, body: object, successMessage: string) {
    setBusyIds((prev) => new Set(prev).add(member.id));
    try {
      const res = await opsFetch<{ operator?: Operator; resetToken?: string }>(
        `/api/admin/team/${member.id}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      );
      if (res.ok) {
        toast.success(successMessage);
        if (res.data?.resetToken) setTokenPanel({ email: member.email, token: res.data.resetToken });
        if (res.data?.operator) {
          const updated = res.data.operator;
          setOperators(
            (prev) =>
              prev?.map((m) =>
                m.id === updated.id ? { ...m, ...updated, lastLoginAt: updated.lastLoginAt ?? m.lastLoginAt } : m,
              ) ?? prev,
          );
        }
      } else {
        toast.error(res.error ?? "Request failed");
      }
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(member.id);
        return next;
      });
    }
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!addEmail.trim() || !addName.trim()) {
      toast.error("Email and name are required");
      return;
    }
    setAdding(true);
    const res = await opsFetch<{ operator: Operator; resetToken: string; warning: string }>("/api/admin/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: addEmail, name: addName, role: addRole }),
    });
    setAdding(false);
    if (res.ok && res.data) {
      toast.warning(res.data.warning ?? "Reset token issued");
      setTokenPanel({ email: res.data.operator.email, token: res.data.resetToken });
      setShowAdd(false);
      setAddEmail("");
      setAddName("");
      setAddRole("SUPPORT");
      void load();
    } else {
      toast.error(res.error ?? "Failed to add member");
    }
  }

  function copyToken() {
    if (!tokenPanel) return;
    void navigator.clipboard
      .writeText(tokenPanel.token)
      .then(() => toast.success("Token copied"))
      .catch(() => toast.error("Copy failed — select the token manually"));
  }

  const columns = ["ID", "Name", "Email", "Status", "Role", "Joined At", "Action"];

  return (
    <div className="flex flex-col gap-4">
      {tokenPanel && (
        <div className="mx-5 mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 leading-relaxed">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            One-time reset token for {tokenPanel.email}
          </p>
          <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/80">
            Single use, expires in 24 hours. The member signs in via /admin/login?reset=&lt;token&gt;. It cannot be shown again.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code
              className="min-w-0 flex-1 basis-52 truncate rounded bg-card-background px-2 py-1.5 font-mono text-sm text-text-primary"
              title={tokenPanel.token}
            >
              {tokenPanel.token}
            </code>
            <button
              type="button"
              onClick={copyToken}
              className="min-h-8 rounded-lg border border-card-border bg-card-background px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-background-gray-secondary_alt"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => setTokenPanel(null)}
              className="min-h-8 rounded-lg px-2 py-1.5 text-sm text-text-tertiary hover:text-text-primary"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-text-tertiary" role="status" aria-live="polite">
            <span className="size-4 animate-spin rounded-full border-2 border-border-primary border-t-transparent" />
            <span>Loading team members…</span>
          </div>
        ) : loadError ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">{loadError}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="min-h-8 rounded-lg border border-card-border bg-card-background px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-background-gray-secondary_alt"
            >
              Retry
            </button>
            <p className="text-xs text-text-tertiary">If your session expired, sign in again from /admin/login.</p>
          </div>
        ) : (
          <div className="group flex h-9 w-full items-center rounded-lg border border-card-border bg-input-background max-w-70.5">
            <div className="order-first flex shrink-0 items-center justify-center px-3 pr-0 text-icon-tertiary">
              <SearchIcon />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="peer min-w-0 flex-1 border-none bg-transparent pl-2 text-sm text-title-50 outline-none placeholder:text-input-placeholder-text"
              placeholder="Search by id, name, or email..."
            />
          </div>
        )}
        <div className="flex items-center gap-2.5">
          <select
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as (typeof ROLE_FILTERS)[number])}
            className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-button-primary-outline-stroke bg-button-primary-outline-background px-3 py-1.5 text-sm font-medium text-button-primary-outline-text outline-none hover:bg-button-primary-outline-hover-background focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring focus-visible:ring-offset-2"
          >
            {ROLE_FILTERS.map((r) => (
              <option key={r} value={r}>
                {r === "ALL" ? "Filter: All roles" : r}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex h-9 min-h-8 items-center justify-center gap-1.5 rounded-lg bg-button-primary-background px-3 py-1.5 text-sm font-medium text-button-primary-text outline-none transition hover:bg-button-primary-hover-background focus-visible:ring-2 focus-visible:ring-button-primary-focus-ring focus-visible:ring-offset-2"
          >
            <PlusIcon />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-full overflow-clip border-separate border-spacing-0 border-border-primary text-left border-none">
          <thead className="text-title-50 [&_th]:border-b [&_th]:border-border-primary [&_th]:text-xs">
            <tr className="[_th]:border-t not-last:[&_>td]:border-b not-last:[_>th]:border-b bg-transparent">
              {columns.map((col) => (
                <th
                  key={col}
                  className={["select-none whitespace-nowrap px-6 py-4 text-sm font-medium text-text-tertiary", col === "Action" ? "w-48" : ""].filter(Boolean).join(" ")}
                >
                  <span className="inline-flex items-center gap-2 text-sm">{col}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="not-last:[&_>td]:border-b not-last:[&_>td]:border-border-primary">
                {columns.map((col) => (
                  <td key={col} className="px-6 py-4 text-sm whitespace-nowrap">
                    <span className="block h-2.5 w-20 animate-pulse rounded bg-background-gray-secondary" />
                  </td>
                ))}
              </tr>
            ) : loadError ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <p className="text-sm font-medium text-text-secondary">Failed to load team</p>
                  <p className="mt-1 text-sm text-text-tertiary">Use Retry above. If your session expired, sign in again.</p>
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <p className="text-sm font-medium text-text-secondary">
                    {operators?.length ? "No members match this filter" : "No members"}
                  </p>
                  <p className="mt-1 text-sm text-text-tertiary">
                    {operators?.length
                      ? "Clear the search box or role filter to see all members."
                      : "No team members have been added yet. Use Add Member to invite one."}
                  </p>
                </td>
              </tr>
            ) : (
              visible.map((m) => (
                <tr key={m.id} className="not-last:[&_>td]:border-b not-last:[&_>td]:border-border-primary">
                  <td className="truncate px-6 py-4 text-sm whitespace-nowrap">
                    <span title={m.id} className="block max-w-24 font-mono text-xs text-text-tertiary">
                      {m.id.slice(0, 12)}…
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    <span className="text-text-primary">{m.name}</span>
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-text-secondary">{m.email}</td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">{statusBadge(m.status)}</td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-text-secondary">{m.role}</td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap text-text-tertiary">
                    {m.createdAt ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(m.createdAt)) : "—"}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busyIds.has(m.id)}
                        onClick={() => void patchOperator(m, { reset: true }, `Reset token issued for ${m.email}`)}
                        className="min-h-8 rounded-lg border border-card-border px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-background-gray-secondary_alt disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyIds.has(m.id) ? "…" : "Reset token"}
                      </button>
                      {m.role !== "OWNER" && (
                        <button
                          type="button"
                          disabled={busyIds.has(m.id)}
                          onClick={() => {
                            const willDisable = m.status === "ACTIVE";
                            if (willDisable && !window.confirm(`Disable ${m.email}? Their active sessions will be revoked.`)) return;
                            void patchOperator(
                              m,
                              { status: willDisable ? "DISABLED" : "ACTIVE" },
                              willDisable ? `${m.email} disabled` : `${m.email} enabled`,
                            );
                          }}
                          className="min-h-8 rounded-lg px-2.5 py-1 text-xs font-medium text-text-tertiary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {m.status === "ACTIVE" ? "Disable" : "Enable"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Add team member">
          <div className="w-full max-w-md rounded-xl border border-card-border bg-card-background p-5 shadow-lg">
            <h3 className="text-base font-semibold text-text-primary">Add team member</h3>
            <p className="mt-1 text-sm text-text-tertiary">The member receives a one-time reset token to set their password.</p>
            <form onSubmit={(e) => void addMember(e)} className="mt-4 space-y-3">
              <div>
                <label htmlFor="add-member-email" className="block text-sm font-medium text-text-secondary">Email</label>
                <input
                  id="add-member-email"
                  type="email"
                  required
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border-secondary-alt bg-card-background px-2.5 py-2 text-sm text-title-50 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  placeholder="member@scalmint.com"
                />
              </div>
              <div>
                <label htmlFor="add-member-name" className="block text-sm font-medium text-text-secondary">Name</label>
                <input
                  id="add-member-name"
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border-secondary-alt bg-card-background px-2.5 py-2 text-sm text-title-50 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label htmlFor="add-member-role" className="block text-sm font-medium text-text-secondary">Role</label>
                <select
                  id="add-member-role"
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as "ADMIN" | "ANALYST" | "SUPPORT")}
                  className="mt-1 w-full rounded-lg border border-border-secondary-alt bg-card-background px-2.5 py-2 text-sm text-title-50 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="ANALYST">ANALYST</option>
                  <option value="SUPPORT">SUPPORT</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="min-h-8 rounded-lg px-3 py-2 text-sm text-text-tertiary hover:text-text-primary"
                  disabled={adding}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="min-h-8 rounded-lg bg-button-primary-background px-4 py-2 text-sm font-medium text-button-primary-text hover:bg-button-primary-hover-background disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {adding ? "Adding…" : "Add member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
