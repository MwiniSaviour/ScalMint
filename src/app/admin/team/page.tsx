"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { opsFetch } from "@/lib/ops/client-fetch";
import { OpsError, OpsSkeleton } from "@/components/ops/PageStates";
import { Button } from "@/nextadmin/components/tailgrids/core/button";

type Operator = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
  sessionVersion: number;
};

export default function TeamPage() {
  const qc = useQueryClient();
  const [invite, setInvite] = useState({ email: "", name: "", role: "SUPPORT" });
  const [token, setToken] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["ops-team"],
    queryFn: async () => {
      const res = await opsFetch<{ operators: Operator[] }>("/api/admin/team");
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data.operators;
    },
  });
  const create = useMutation({
    mutationFn: async () => {
      const res = await opsFetch<{ resetToken: string }>("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invite),
      });
      if (!res.ok || !res.data) throw new Error(res.error ?? "Failed");
      return res.data;
    },
    onSuccess: (d) => {
      setToken(d.resetToken);
      void qc.invalidateQueries({ queryKey: ["ops-team"] });
    },
  });
  const patch = useMutation({
    mutationFn: async (body: { id: string; status?: string }) => {
      const res = await opsFetch(`/api/admin/team/${body.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(res.error ?? "Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops-team"] }),
  });
  return (
    <div className="mt-6 space-y-5 px-2 lg:px-6">
      <div>
        <h1 className="text-[28px] font-medium">Team and access</h1>
        <p className="text-sm text-text-tertiary">OWNER cannot be removed by ADMIN. Disabling increments sessionVersion immediately.</p>
      </div>
      {q.isLoading && <OpsSkeleton />}
      {q.isError && <OpsError message={q.error.message} onRetry={() => q.refetch()} />}
      {q.data && (
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs">
            <tr>
              {["Name", "Email", "Role", "Status", "Last login", ""].map((h) => (
                <th key={h} className="px-3 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {q.data.map((o) => (
              <tr key={o.id} className="border-t border-card-border">
                <td className="px-3 py-3">{o.name}</td>
                <td className="px-3 py-3">{o.email}</td>
                <td className="px-3 py-3">{o.role}</td>
                <td className="px-3 py-3">{o.status}</td>
                <td className="px-3 py-3 text-xs">{o.lastLoginAt ? o.lastLoginAt.slice(0, 16).replace("T", " ") : "Never"}</td>
                <td className="px-3 py-3">
                  {o.role !== "OWNER" && o.status === "ACTIVE" && (
                    <Button size="xs" appearance="outline" onPress={() => patch.mutate({ id: o.id, status: "DISABLED" })}>
                      Disable
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form
        className="grid gap-3 rounded-xl border border-card-border p-5 md:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <input required placeholder="Name" value={invite.name} onChange={(e) => setInvite((s) => ({ ...s, name: e.target.value }))} className="rounded-lg border border-card-border px-3 py-2 text-sm" />
        <input required type="email" placeholder="Email" value={invite.email} onChange={(e) => setInvite((s) => ({ ...s, email: e.target.value }))} className="rounded-lg border border-card-border px-3 py-2 text-sm" />
        <select value={invite.role} onChange={(e) => setInvite((s) => ({ ...s, role: e.target.value }))} className="rounded-lg border border-card-border px-3 py-2 text-sm">
          <option>ADMIN</option>
          <option>ANALYST</option>
          <option>SUPPORT</option>
        </select>
        <Button type="submit" size="sm" isDisabled={create.isPending}>
          Invite
        </Button>
        {token && <p className="font-mono text-xs md:col-span-4">Reset token (once): {token}</p>}
        {create.isError && <p className="text-sm text-error-500 md:col-span-4">{create.error.message}</p>}
      </form>
    </div>
  );
}
