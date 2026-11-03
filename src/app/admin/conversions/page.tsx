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
import { OpsError } from "@/components/ops/PageStates";

type Conversion = {
  id: string;
  affiliateId: string;
  product: { name: string; slug: string };
  amount: number;
  commissionAmount: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
  createdAt: string;
};

async function load() {
  const { opsFetch } = await import("@/lib/ops/client-fetch");
  const res = await opsFetch<{ conversions: Conversion[] }>("/api/admin/conversions");
  if (res.unauthorized) throw new Error("Unauthorized");
  if (!res.ok || !res.data) throw new Error(res.error ?? "Failed to load conversions");
  return res.data.conversions;
}

export default function ConversionsPage() {
  const qc = useQueryClient();
  const { data = [], isLoading, isError, error, refetch } = useQuery({ queryKey: ["ops-conversions"], queryFn: load });
  const patch = useMutation({
    mutationFn: async (body: { id: string; status: Conversion["status"] }) => {
      const { opsFetch } = await import("@/lib/ops/client-fetch");
      const res = await opsFetch("/api/admin/conversions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(res.error ?? "Update failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops-conversions"] }),
  });

  return (
    <div className="mt-6 space-y-5">
      <div className="px-2 lg:px-6">
        <h1 className="mb-1 text-[28px] leading-8 font-medium text-text-primary">Conversions</h1>
        <p className="text-sm leading-5 text-text-tertiary">7-day window is automatic; override here when needed.</p>
      </div>
      {patch.isError && (
        <div className="px-2 lg:px-5">
          <OpsError message={patch.error.message} />
        </div>
      )}
      <div className="px-2 lg:px-5">
        <Card className="overflow-hidden p-0">
          <CardContent className="p-0">
            <TableRoot className="w-full rounded-none border-none">
              <TableHeader>
                <TableRow className="bg-background-gray-secondary_alt">
                  {["Date", "Product", "Amount", "Commission", "Status", "Action"].map((h) => (
                    <TableHead key={h} className="px-6 py-2.5 text-xs font-semibold text-text-secondary">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isError ? (
                  <TableRow>
                    <TableCell className="px-6 py-8" colSpan={6}>
                      <OpsError message={error.message} onRetry={() => refetch()} />
                    </TableCell>
                  </TableRow>
                ) : isLoading ? (
                  <TableRow>
                    <TableCell className="px-6 py-8 text-sm text-text-tertiary" colSpan={6}>
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell className="px-6 py-8 text-sm text-text-tertiary" colSpan={6}>
                      No conversions yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((c) => (
                    <TableRow key={c.id} className="[&_td]:border-none">
                      <TableCell className="h-16 px-6 text-sm text-text-secondary">
                        {String(c.createdAt).slice(0, 10)}
                      </TableCell>
                      <TableCell className="h-16 px-6 text-sm text-text-primary">{c.product?.name}</TableCell>
                      <TableCell className="h-16 px-6 text-sm">GHS {(c.amount / 100).toFixed(2)}</TableCell>
                      <TableCell className="h-16 px-6 text-sm">GHS {(c.commissionAmount / 100).toFixed(2)}</TableCell>
                      <TableCell className="h-16 px-6 text-sm">{c.status}</TableCell>
                      <TableCell className="h-16 px-6">
                        <div className="flex gap-2">
                          {c.status === "PENDING" && (
                            <>
                              <Button size="sm" onClick={() => patch.mutate({ id: c.id, status: "APPROVED" })}>
                                Approve
                              </Button>
                              <Button size="sm" appearance="outline" onClick={() => patch.mutate({ id: c.id, status: "REJECTED" })}>
                                Reject
                              </Button>
                            </>
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
