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
import { useState } from "react";

type Product = {
  id: string;
  slug: string;
  name: string;
  status: string;
  commissionType: string;
  commissionRate: number;
  commissionCap: number | null;
  cookieDays: number;
  minPayout: number;
};

async function loadProducts() {
  const res = await fetch("/api/admin/products", { credentials: "include" });
  if (res.status === 401) {
    window.location.assign("/admin/login");
    throw new Error("Unauthorized");
  }
  const data = (await res.json()) as { products: Product[] };
  return data.products;
}

export default function CommissionsPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["ops-products"], queryFn: loadProducts });
  const [draft, setDraft] = useState<Record<string, number>>({});
  const save = useMutation({
    mutationFn: async (p: Product) => {
      const rate = draft[p.id] ?? p.commissionRate;
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, commissionRate: rate }),
      });
      if (!res.ok) throw new Error("Save failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ops-products"] }),
  });

  return (
    <div className="mt-6 space-y-5">
      <div className="px-2 lg:px-6">
        <h1 className="mb-1 text-[28px] leading-8 font-medium text-text-primary">Commissions</h1>
        <p className="text-sm leading-5 text-text-tertiary">
          Rates are basis points for percent products (3000 = 30%) and pesewas for flat CPA.
        </p>
      </div>
      <div className="px-2 lg:px-5">
        <Card className="overflow-hidden p-0">
          <CardContent className="p-0">
            <TableRoot className="w-full rounded-none border-none">
              <TableHeader>
                <TableRow className="bg-background-gray-secondary_alt">
                  {["Product", "Type", "Rate", "Cap", "Cookie", "Action"].map((h) => (
                    <TableHead key={h} className="px-6 py-2.5 text-xs font-semibold text-text-secondary">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((p) => (
                  <TableRow key={p.id} className="[&_td]:border-none">
                    <TableCell className="h-16 px-6 text-sm text-text-primary">
                      {p.name} <span className="text-text-tertiary">· {p.status}</span>
                    </TableCell>
                    <TableCell className="h-16 px-6 font-mono text-xs text-text-secondary">{p.commissionType}</TableCell>
                    <TableCell className="h-16 px-6">
                      <input
                        type="number"
                        defaultValue={p.commissionRate}
                        onChange={(e) => setDraft((d) => ({ ...d, [p.id]: Number(e.target.value) }))}
                        className="w-28 rounded-lg border border-[#e5e7eb] px-2 py-1.5 text-sm"
                      />
                    </TableCell>
                    <TableCell className="h-16 px-6 text-sm text-text-primary">
                      {p.commissionCap == null ? "—" : p.commissionCap}
                    </TableCell>
                    <TableCell className="h-16 px-6 text-sm text-text-primary">{p.cookieDays}d</TableCell>
                    <TableCell className="h-16 px-6">
                      <Button size="sm" onClick={() => save.mutate(p)} isDisabled={save.isPending}>
                        Save
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </TableRoot>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
