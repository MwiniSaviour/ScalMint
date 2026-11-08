"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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

export function TransactionsTable({ rows }: { rows: TransactionRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.orderRef, row.createdAtLabel, row.customerLabel, row.amountLabel, STATUS_LABEL[row.status]]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, query]);

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
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Filtering is not available yet"
            aria-label="Filter transactions (not available yet)"
            className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg border border-button-primary-outline-stroke bg-button-primary-outline-background p-1.5 text-icon-tertiary opacity-60"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
              <path d="M2 4.5H14M4 8H12M6.25 11.5H9.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Export is not available yet"
            aria-label="Export transactions (not available yet)"
            className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg border border-button-primary-outline-stroke bg-button-primary-outline-background p-1.5 text-icon-tertiary opacity-60"
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
                    {rows.length === 0 ? "No transactions yet" : "No transactions match your search"}
                  </p>
                  <p className="mt-1 text-xs leading-4 text-text-tertiary">
                    {rows.length === 0
                      ? "Verified affiliate conversions will appear here."
                      : "Try a different order, customer or status."}
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
