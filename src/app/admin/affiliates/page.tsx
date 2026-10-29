"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/nextadmin/components/tailgrids/core/card";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/nextadmin/components/tailgrids/core/table";
import { Button } from "@/nextadmin/components/tailgrids/core/button";

type Affiliate = {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string | null;
  status: "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED";
  payoutMethod: string;
  payoutAccount: string | null;
  totalClicks: number;
  totalConversions: number;
  totalEarned: number;
};

async function loadAffiliates() {
  const res = await fetch("/api/admin/affiliates", { credentials: "include" });
  if (res.status === 401) {
    window.location.assign("/admin/login");
    throw new Error("Unauthorized");
  }
  const data = (await res.json()) as { affiliates: Affiliate[] };
  return data.affiliates;
}

export default function AffiliatesPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["ops-affiliates"], queryFn: loadAffiliates });
  const patch = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Affiliate["status"] }) => {
      const res = await fetch(`/api/admin/affiliates/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Update failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops-affiliates"] }),
  });

  return (
    <div className="mt-6 space-y-5">
      <div className="px-2 lg:px-6">
        <h1 className="mb-1 text-[28px] leading-8 font-medium text-text-primary">Affiliates</h1>
        <p className="text-sm leading-5 text-text-tertiary">Approve, suspend or reject programme members. v1.</p>
      </div>
      <div className="px-2 lg:px-5">
        <Card className="overflow-hidden p-0">
          <CardContent className="p-0">
            <TableRoot className="w-full rounded-none border-none">
              <TableHeader>
                <TableRow className="bg-background-gray-secondary_alt">
                  {["Code", "Name", "Email", "Status", "Clicks", "Earned", "Action"].map((h) => (
                    <TableHead key={h} className="px-6 py-2.5 text-xs font-semibold text-text-secondary">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell className="px-6 py-8 text-sm text-text-tertiary" colSpan={7}>
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell className="px-6 py-8 text-sm text-text-tertiary" colSpan={7}>
                      No affiliates yet. They appear here after Apply.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((a) => (
                    <TableRow key={a.id} className="[&_td]:border-none">
                      <TableCell className="h-16 px-6 font-mono text-sm text-text-primary">{a.code}</TableCell>
                      <TableCell className="h-16 px-6 text-sm text-text-primary">{a.name}</TableCell>
                      <TableCell className="h-16 px-6 text-sm text-text-primary">{a.email}</TableCell>
                      <TableCell className="h-16 px-6 text-sm text-text-primary">{a.status}</TableCell>
                      <TableCell className="h-16 px-6 text-sm text-text-primary">{a.totalClicks}</TableCell>
                      <TableCell className="h-16 px-6 text-sm text-text-primary">GHS {(a.totalEarned / 100).toFixed(2)}</TableCell>
                      <TableCell className="h-16 px-6">
                        <div className="flex flex-wrap gap-2">
                          {a.status !== "APPROVED" && (
                            <Button size="sm" onClick={() => patch.mutate({ id: a.id, status: "APPROVED" })}>
                              Approve
                            </Button>
                          )}
                          {a.status !== "SUSPENDED" && (
                            <Button size="sm" appearance="outline" onClick={() => patch.mutate({ id: a.id, status: "SUSPENDED" })}>
                              Suspend
                            </Button>
                          )}
                          {a.status !== "REJECTED" && (
                            <Button size="sm" appearance="outline" onClick={() => patch.mutate({ id: a.id, status: "REJECTED" })}>
                              Reject
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </TableRoot>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
