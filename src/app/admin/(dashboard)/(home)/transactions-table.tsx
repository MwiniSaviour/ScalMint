"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { DemoBadge } from "@/components/demo/primitives";
import type { DemoBadgeTone } from "@/components/demo/primitives";
import type { TransactionRow, TransactionStatus } from "./dashboard-data";

const STATUS_TONE: Record<TransactionStatus, DemoBadgeTone> = {
  PENDING: "warning",
  APPROVED: "success",
  PAID: "success",
  REJECTED: "error",
};

const STATUS_LABEL: Record<TransactionStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  PAID: "Paid",
  REJECTED: "Rejected",
};

const STATUS_OPTIONS = ["ALL", "PENDING", "APPROVED", "PAID", "REJECTED"] as const;

export function TransactionsTable({ rows }: { rows: TransactionRow[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const okStatus = statusFilter === "ALL" || row.status === statusFilter;
      const okQuery =
        !q ||
        [row.orderRef, row.createdAtLabel, row.customerLabel, row.amountLabel, STATUS_LABEL[row.status]]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return okStatus && okQuery;
    });
  }, [rows, query, statusFilter]);

  function exportCsv() {
    if (rows.length === 0) {
      toast.warning("No transactions to export yet");
      return;
    }
    if (filtered.length === 0) {
      toast.warning("No transactions match the current filter — nothing to export");
      return;
    }
    const csv = ["order,date,customer,amount,status"]
      .concat(
        filtered.map((r) =>
          [r.orderRef, r.createdAtLabel, r.customerLabel, r.amountLabel, STATUS_LABEL[r.status]]
            .map((v) => `"${v.replace(/"/g, '""')}"`)
            .join(","),
        ),
      )
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} row${filtered.length === 1 ? "" : "s"}`);
  }

  return (
    <>
      <div className="relative flex w-full flex-wrap items-center justify-between gap-3 mb-6">
        <h3 className="leading-6 font-semibold tracking-[-0.2px] text-text-primary">Last Transaction</h3>
        <div className="flex items-center gap-1.5">
          <div
            role="group"
            className="group flex w-full items-center rounded-lg border border-card-border bg-input-background py-1.5 transition-all focus-within:border-input-primary-focus-border focus-within:ring-4 focus-within:ring-input-primary-focus-border/20"
          >
            <div className="flex shrink-0 items-center justify-center px-3 pr-0 text-icon-tertiary">
              <svg className="size-4" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
                <circle cx="9.58341" cy="9.58317" r="7.91667" stroke="currentColor" strokeWidth="1.5" />
                <path d="M15.4167 15.4165L18.3334 18.3332" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <label className="sr-only" htmlFor="transaction-search">Search transactions</label>
            <input
              id="transaction-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full min-w-0 flex-1 rounded-none border-none bg-transparent py-0 pl-2 text-sm text-title-50 shadow-none outline-none placeholder:text-input-placeholder-text focus:border-none focus:ring-0"
              placeholder="Search"
            />
          </div>
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as (typeof STATUS_OPTIONS)[number])}
            className="flex h-8 min-w-24 cursor-pointer items-center rounded-lg border border-button-primary-outline-stroke bg-button-primary-outline-background px-2 text-xs font-medium text-icon-secondary outline-none focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "All statuses" : STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={exportCsv}
            aria-label="Export transactions as CSV"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-button-primary-outline-stroke bg-button-primary-outline-background p-1.5 text-icon-tertiary transition hover:text-text-primary focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
              <path d="M2 10C2 11.8856 2 12.8284 2.58579 13.4142C3.17157 14 4.11438 14 6 14H10C11.8856 14 12.8284 14 13.4142 13.4142C14 12.8284 14 11.8856 14 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8.00004 1.99984V10.6665M5.33337 7.74984L8.00004 10.6665L10.6667 7.74984" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-200 border-separate border-spacing-0 overflow-clip text-left">
          <caption className="sr-only">Last 10 affiliate conversions</caption>
          <thead className="text-title-50 [&_th]:border-b [&_th]:border-border-primary [&_th]:text-xs">
            <tr className="not-last:*:border-border-primary not-last:[&>th]:border-b [&_th]:border-t">
              <th scope="col" className="px-6 py-2.5 text-xs leading-4 font-semibold text-text-secondary">Order</th>
              <th scope="col" className="whitespace-nowrap px-6 py-2.5 text-xs leading-4 font-semibold text-text-secondary">Date</th>
              <th scope="col" className="px-6 py-2.5 text-xs leading-4 font-semibold text-text-secondary">Customer</th>
              <th scope="col" className="px-6 py-2.5 text-xs leading-4 font-semibold text-text-secondary">Amount</th>
              <th scope="col" className="px-6 py-2.5 text-xs leading-4 font-semibold text-text-secondary">Status</th>
              <th scope="col" className="px-6 py-2.5 text-xs leading-4 font-semibold text-text-secondary">
                <div className="flex items-center justify-center">Action</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center">
                  <p className="text-sm font-medium text-text-primary">
                    {rows.length === 0 ? "No transactions yet" : "No transactions match your filter or search"}
                  </p>
                  <p className="mt-1 text-xs leading-4 text-text-tertiary">
                    {rows.length === 0
                      ? "Verified affiliate conversions will appear here."
                      : "Try a different status, order, customer or search term."}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.id}
                  className="not-last:*:border-border-primary not-last:[&>td]:border-b not-last:[&_td]:border-none"
                >
                  <td className="whitespace-nowrap px-6 py-3.5 text-sm leading-5 font-medium text-text-primary">
                    {row.orderRef}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5 text-sm leading-5 font-medium text-text-secondary">
                    {row.createdAtLabel}
                  </td>
                  <td className="max-w-48 truncate whitespace-nowrap px-6 py-3.5 text-sm leading-5 font-medium text-text-primary">
                    {row.customerLabel}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5 text-sm leading-5 font-medium text-text-primary">
                    {row.amountLabel}
                  </td>
                  <td className="px-6 py-3.5">
                    <DemoBadge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</DemoBadge>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center justify-center">
                      <Link
                        href="/admin/conversions"
                        aria-label={`View ${row.orderRef} in conversions`}
                        className="flex h-7.5 w-8 items-center justify-center rounded-lg border-none p-1.5 text-icon-secondary shadow-xs transition hover:bg-button-primary-outline-hover-background"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
                          <path d="M5.83333 10.0002C5.83333 10.9206 5.08714 11.6668 4.16667 11.6668C3.24619 11.6668 2.5 10.9206 2.5 10.0002C2.5 9.07969 3.24619 8.3335 4.16667 8.3335C5.08714 8.3335 5.83333 9.07969 5.83333 10.0002Z" fill="currentColor" />
                          <path d="M11.6667 10.0002C11.6667 10.9206 10.9205 11.6668 10 11.6668C9.07953 11.6668 8.33333 10.9206 8.33333 10.0002C8.33333 9.07969 9.07953 8.3335 10 8.3335C10.9205 8.3335 11.6667 9.07969 11.6667 10.0002Z" fill="currentColor" />
                          <path d="M17.5 10.0002C17.5 10.9206 16.7538 11.6668 15.8333 11.6668C14.9129 11.6668 14.1667 10.9206 14.1667 10.0002C14.1667 9.07969 14.9129 8.3335 15.8333 8.3335C16.7538 8.3335 17.5 9.07969 17.5 10.0002Z" fill="currentColor" />
                        </svg>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
