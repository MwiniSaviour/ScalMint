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
  const res = await fetch("/api/admin/conversions", { credentials: "include" });
  if (res.status === 401) {
    window.location.assign("/admin/login");
    throw new Error("Unauthorized");
  }
  const data = (await res.json()) as { conversions: Conversion[] };
  return data.conversions;
}

export default function ConversionsPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["ops-conversions"], queryFn: load });
  const patch = useMutation({
    mutationFn: async (body: { id: string; status: Conversion["status"] }) => {
      const res = await fetch("/api/admin/conversions", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Update failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops-conversions"] }),
  });

  return (
    <div className="mt-6 space-y-5">
      <div className="px-2 lg:px-6">
        <h1 className="mb-1 text-[28px] leading-8 font-medium text-text-primary">Conversions</h1>
        <p className="text-sm leading-5 text-text-tertiary">7-day window is automatic; override here when needed.</p>
      </div>
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
                {data.length === 0 ? (
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
