"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const CURRENCIES = ["USD", "GHS", "NGN", "EUR", "GBP"] as const;
type Currency = (typeof CURRENCIES)[number];

export type Tab = { label: string; href: string; active: boolean };

function TabButton({ label, active, href }: { label: string; active: boolean; href: string }) {
  if (active) {
    return (
      <button type="button" role="tab" aria-selected={true} className={`flex items-center gap-2 px-3 py-4 text-sm font-medium whitespace-nowrap text-text-100 outline-none [&>svg]:size-5 [&>svg]:text-current! focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring focus-visible:ring-offset-2 ${active ? "border-b-2 border-brand-500 text-brand-500" : "text-text-tertiary hover:text-text-primary"}`}>
        {label}
      </button>
    );
  }
  return (
    <Link role="tab" aria-selected={false} href={href} className={`flex items-center gap-2 px-3 py-4 text-sm font-medium whitespace-nowrap text-text-100 outline-none [&>svg]:size-5 [&>svg]:text-current! focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring focus-visible:ring-offset-2 ${active ? "border-b-2 border-brand-500 text-brand-500" : "text-text-tertiary hover:text-text-primary"}`}>
      {label}
    </Link>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-text-secondary">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "peer mt-1 w-full rounded-lg border border-border-secondary-alt bg-card-background px-2.5 py-2 text-sm text-title-50 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none";

type Item = { id: number; description: string; quantity: string; rate: string };

export default function InvoiceBuilder({
  variant,
  tabs,
}: {
  variant: "business" | "payment";
  tabs: Tab[];
}) {
  const [number, setNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientWebsite, setClientWebsite] = useState("");
  const [clientTaxId, setClientTaxId] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [taxRate, setTaxRate] = useState("0");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [nextId, setNextId] = useState(1);

  const addItem = () => {
    setItems((prev) => [...prev, { id: nextId, description: "", quantity: "1", rate: "0" }]);
    setNextId((n) => n + 1);
  };

  const updateItem = (id: number, patch: Partial<Item>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const parsed = useMemo(() => {
    const rows = items.map((it) => {
      const quantity = Number(it.quantity);
      const rate = Number(it.rate);
      const quantityValid = Number.isFinite(quantity) && quantity > 0;
      const rateValid = Number.isFinite(rate) && rate >= 0;
      return { id: it.id, description: it.description, quantityValid, rateValid, amount: quantityValid && rateValid ? quantity * rate : null };
    });
    const subtotal = rows.reduce((sum, r) => (r.amount == null ? sum : sum + r.amount), 0);
    const tr = Number(taxRate);
    const taxValid = Number.isFinite(tr) && tr >= 0 && tr <= 100;
    const tax = taxValid ? (subtotal * tr) / 100 : null;
    return { rows, subtotal, tax, taxValid, total: tax == null ? subtotal : subtotal + tax };
  }, [items, taxRate]);

  const invalidCount = parsed.rows.filter((r) => r.amount == null).length;
  const fmt = new Intl.NumberFormat(undefined, { style: "currency", currency });
  const hasPreview = number.trim() !== "" || items.length > 0 || clientName.trim() !== "";

  return (
    <section className="px-2 lg:px-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:px-6">
        <div className="lg:col-span-5 space-y-6 print:hidden">
          <div className="max-w-full rounded-xl border border-card-border w-full bg-card-background p-4">
            <div className="max-sm:w-full border-b border-card-border [&>div]:w-full">
              <div role="tablist" aria-label="Invoice type" className="overflow-x-auto overflow-y-hidden flex gap-4">
                {tabs.map((tab) => (
                  <TabButton key={tab.label} label={tab.label} active={tab.active} href={tab.href} />
                ))}
              </div>
            </div>
            <div className="px-4 py-6">
              <div role="tabpanel" className="space-y-6 text-sm font-normal text-text-100 p-0">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label={variant === "business" ? "Invoice Number" : "Reference Number"} htmlFor={`${variant}-number`}>
                      <input id={`${variant}-number`} type="text" placeholder="Invoice #" value={number} onChange={(e) => setNumber(e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Currency" htmlFor={`${variant}-currency`}>
                      <select id={`${variant}-currency`} aria-label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className={inputClass}>
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label={variant === "business" ? "Issue Date" : "Issued Date"}>
                      <input id={`${variant}-issue-date`} type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={inputClass} />
                    </Field>
                    {variant === "business" && (
                      <Field label="Due Date">
                        <input id="business-due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
                      </Field>
                    )}
                  </div>
                  <div className="space-y-4 border-t border-border-secondary-alt pt-4">
                    <h3 className="text-sm font-semibold text-text-primary">Billed To (Client Details)</h3>
                    <div className="space-y-4">
                      <Field label="Client Name">
                        <input id={`${variant}-client-name`} type="text" placeholder="Client name" value={clientName} onChange={(e) => setClientName(e.target.value)} className={inputClass} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {variant === "payment" && (
                        <Field label="Client Email">
                          <input id="payment-client-email" type="email" placeholder="client@example.com" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className={inputClass} />
                        </Field>
                      )}
                      {variant === "payment" && (
                        <Field label="Client Phone">
                          <input id="payment-client-phone" type="tel" placeholder="+1 (555) 000-0000" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className={inputClass} />
                        </Field>
                      )}
                    </div>
                    {variant === "payment" && (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Client Website">
                          <input id="payment-client-website" type="url" placeholder="https://example.com" value={clientWebsite} onChange={(e) => setClientWebsite(e.target.value)} className={inputClass} />
                        </Field>
                        <Field label="Client Tax ID">
                          <input id="payment-client-tax-id" type="text" placeholder="Tax ID" value={clientTaxId} onChange={(e) => setClientTaxId(e.target.value)} className={inputClass} />
                        </Field>
                      </div>
                    )}
                    <div className="flex w-full flex-col">
                      <span className="block text-sm font-medium text-text-secondary">Client Address {variant === "business" ? "& Info" : ""}</span>
                      <textarea id={`${variant}-client-address`} placeholder="Street, City, Country" rows={3} value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className={inputClass} />
                    </div>
                  </div>
                  <div className="space-y-3 border-t border-border-secondary-alt pt-4">
                    <h3 className="text-sm font-semibold text-text-primary">Invoice Items</h3>
                    {items.length === 0 ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-center">
                        <p className="text-sm text-text-tertiary">No invoice items yet</p>
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {items.map((it, idx) => {
                          const row = parsed.rows[idx];
                          return (
                            <li key={it.id} className="rounded-lg border border-card-border p-3">
                              <div className="flex items-stretch gap-2">
                                <div className="min-w-0 flex-1">
                                  <input
                                    aria-label={`Item ${idx + 1} description`}
                                    type="text"
                                    placeholder="Description"
                                    value={it.description}
                                    onChange={(e) => updateItem(it.id, { description: e.target.value })}
                                    className="w-full rounded-md border border-border-secondary-alt bg-card-background px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                                  />
                                  {row && !row.quantityValid && (
                                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">Quantity must be a positive number</p>
                                  )}
                                  {row && !row.rateValid && (
                                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">Rate must be a number, zero or more</p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeItem(it.id)}
                                  aria-label={`Remove item ${idx + 1}`}
                                  className="min-h-8 rounded-md border border-card-border px-2 text-xs text-text-tertiary hover:text-red-600 dark:hover:text-red-400"
                                >
                                  Remove
                                </button>
                              </div>
                              <div className="mt-2 grid grid-cols-3 gap-2">
                                <div>
                                  <span className="block text-xs text-text-tertiary">Quantity</span>
                                  <input
                                    aria-label={`Item ${idx + 1} quantity`}
                                    type="number"
                                    min={0.01}
                                    step={0.01}
                                    value={it.quantity}
                                    onChange={(e) => updateItem(it.id, { quantity: e.target.value })}
                                    className="w-full rounded-md border border-border-secondary-alt bg-card-background px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                                  />
                                </div>
                                <div>
                                  <span className="block text-xs text-text-tertiary">Rate ({currency})</span>
                                  <input
                                    aria-label={`Item ${idx + 1} rate in ${currency}`}
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={it.rate}
                                    onChange={(e) => updateItem(it.id, { rate: e.target.value })}
                                    className="w-full rounded-md border border-border-secondary-alt bg-card-background px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                                  />
                                </div>
                                <div>
                                  <span className="block text-xs text-text-tertiary">Amount</span>
                                  <span className="block px-2 py-1.5 text-sm text-text-primary" aria-live="polite">
                                    {row?.amount == null ? "—" : fmt.format(row.amount)}
                                  </span>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    <button
                      type="button"
                      onClick={addItem}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-card-border bg-card-background px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-background-gray-secondary_alt focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                    >
                      Add Item
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Tax rate (%)">
                        <input
                          aria-label="Tax rate percent"
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={taxRate}
                          onChange={(e) => setTaxRate(e.target.value)}
                          className={inputClass}
                        />
                      </Field>
                      <div aria-hidden="true" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 pt-4 border-t border-border-secondary-alt">
                    <div className="flex justify-between text-sm text-text-secondary">
                      <span>Subtotal</span>
                      <span className="text-text-primary">{items.length === 0 ? "No data" : invalidCount === items.length ? "—" : fmt.format(parsed.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-text-secondary">
                      <span>Tax</span>
                      <span className="text-text-primary">
                        {!parsed.taxValid ? "Invalid rate" : items.length === 0 ? "No data" : invalidCount === items.length ? "—" : fmt.format(parsed.tax ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-base font-semibold text-text-primary">
                      <span>Total</span>
                      <span>{items.length === 0 ? "No data" : !parsed.taxValid || invalidCount === items.length ? "—" : fmt.format(parsed.total)}</span>
                    </div>
                    {invalidCount > 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400" role="status">
                        {invalidCount === items.length
                          ? "No valid items — totals are unavailable until quantity/rate are corrected."
                          : `${invalidCount} item${invalidCount === 1 ? "" : "s"} have invalid quantity/rate and are excluded from totals.`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between gap-3 border-b border-card-border bg-card-background p-4 print:hidden">
            <span className="text-sm font-medium text-text-secondary">Live Preview</span>
            <button
              type="button"
              onClick={() => window.print()}
              aria-label="Print or save invoice as PDF"
              className="flex items-center justify-center gap-1.5 h-9.5 rounded-lg border border-border-secondary-alt bg-button-primary-outline-background px-4 py-2 text-sm font-medium text-button-primary-outline-text transition outline-none hover:bg-background-gray-secondary_alt focus-visible:ring-2 focus-visible:ring-button-outline-focus-ring"
            >
              Print / Save PDF
            </button>
          </div>
          <div className="flex items-center justify-center min-h-[400px] py-6">
            {hasPreview ? (
              <div
                id="invoice-print-area"
                className="w-full max-w-2xl rounded-xl border border-card-border bg-white p-8 text-neutral-900 print:rounded-none print:border-0"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">ScalMint</p>
                    <h2 className="mt-1 text-2xl font-semibold">{variant === "business" ? "Business Invoice" : "Payment Invoice"}</h2>
                  </div>
                  <div className="text-sm text-neutral-600 text-right">
                    <p className="font-medium text-neutral-900">{number.trim() ? number : "—"}</p>
                    <p>Issued: {issueDate ? issueDate : "—"}</p>
                    {variant === "business" && <p>Due: {dueDate ? dueDate : "—"}</p>}
                  </div>
                </div>
                <div className="mt-6 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Billed to</p>
                  <p className="mt-1 font-medium">{clientName.trim() ? clientName : "—"}</p>
                  {clientEmail.trim() && <p>{clientEmail}</p>}
                  {variant === "payment" && clientPhone.trim() && <p>{clientPhone}</p>}
                  {variant === "payment" && clientWebsite.trim() && <p>{clientWebsite}</p>}
                  {variant === "payment" && clientTaxId.trim() && <p>Tax ID: {clientTaxId}</p>}
                  <p className="whitespace-pre-line text-neutral-600">{clientAddress.trim() ? clientAddress : "—"}</p>
                </div>
                <table className="mt-6 w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-300 text-left text-xs uppercase tracking-wider text-neutral-500">
                      <th className="py-2 font-semibold">Description</th>
                      <th className="py-2 text-right font-semibold">Qty</th>
                      <th className="py-2 text-right font-semibold">Rate</th>
                      <th className="py-2 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-3 text-center text-neutral-500">No items</td>
                      </tr>
                    ) : (
                      parsed.rows.map((r, idx) => (
                        <tr key={r.id} className="border-b border-neutral-200">
                          <td className="py-2">{items[idx]?.description || "—"}</td>
                          <td className="py-2 text-right">{items[idx]?.quantity || "—"}</td>
                          <td className="py-2 text-right">{r.rateValid ? fmt.format(Number(items[idx]?.rate ?? 0)) : "—"}</td>
                          <td className="py-2 text-right">{r.amount == null ? "—" : fmt.format(r.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="pt-2 text-right text-neutral-600">Subtotal</td>
                      <td className="pt-2 text-right font-medium">{items.length === 0 ? "—" : fmt.format(parsed.subtotal)}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="text-right text-neutral-600">Tax ({parsed.taxValid ? taxRate : "invalid"}%)</td>
                      <td className="text-right font-medium">{items.length === 0 || !parsed.taxValid ? "—" : fmt.format(parsed.tax ?? 0)}</td>
                    </tr>
                    <tr className="border-t border-neutral-300">
                      <td colSpan={3} className="pt-2 text-right font-semibold">Total</td>
                      <td className="pt-2 text-right text-base font-semibold">{items.length === 0 || !parsed.taxValid ? "—" : fmt.format(parsed.total)}</td>
                    </tr>
                  </tfoot>
                </table>
                <p className="mt-6 text-xs text-neutral-500">Amounts shown in {currency}. Generated by ScalMint.</p>
              </div>
            ) : (
              <p className="text-text-tertiary">No invoice to preview — add an invoice number, client or item above.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
