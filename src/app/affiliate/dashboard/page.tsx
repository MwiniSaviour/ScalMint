"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AFFILIATE_PRODUCTS } from "@/lib/affiliate/products";
import { Container, Eyebrow } from "@/components/ui/primitives";
import { PayoutButton } from "@/components/affiliate/PayoutButton";
import {
  affiliateAuthHeaders,
  clearAffiliateToken,
  readAffiliateToken,
} from "@/lib/auth/client";
import type { AffiliateDashboard } from "@/lib/affiliate/types";

function pesewasToGhs(n: number) {
  return (n / 100).toFixed(2);
}

export default function DashboardPage() {
  const [affiliate, setAffiliate] = useState<AffiliateDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const token = readAffiliateToken();
      const res = await fetch("/api/affiliate/me", {
        credentials: "include",
        headers: affiliateAuthHeaders(),
        cache: "no-store",
      });
      if (res.status === 401) {
        if (!token) {
          window.location.replace("/affiliate/login");
          return;
        }
        clearAffiliateToken();
        window.location.replace("/affiliate/login");
        return;
      }
      if (!res.ok) {
        if (!cancelled) setError("Could not load dashboard.");
        return;
      }
      const data = (await res.json()) as { affiliate: AffiliateDashboard };
      if (!cancelled) setAffiliate(data.affiliate);
    }
    load().catch(() => {
      if (!cancelled) setError("Could not load dashboard.");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    clearAffiliateToken();
    await fetch("/api/affiliate/logout", { method: "POST", credentials: "include" });
    window.location.assign("/affiliate/login");
  }

  if (error) {
    return (
      <main className="bg-page">
        <Container className="py-20">
          <p className="text-[14px] text-[#ff8a7a]">{error}</p>
          <Link href="/affiliate/login" className="mt-4 inline-flex text-[13px] text-hi underline underline-offset-4">
            Back to sign in
          </Link>
        </Container>
      </main>
    );
  }

  if (!affiliate) {
    return (
      <main className="bg-page">
        <Container className="py-20">
          <p className="font-mono text-[12px] tracking-wide text-muted">Loading dashboard…</p>
        </Container>
      </main>
    );
  }

  const pendingPesewas = Math.max(0, affiliate.totalEarned - affiliate.totalPaid);

  return (
    <main className="bg-page">
      <div className="border-b border-white/[0.06] bg-[#0f0f0f]">
        <Container className="py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-teal">Affiliate dashboard</p>
              <h1 className="mt-2 text-[24px] font-medium tracking-[-0.02em] text-hi">
                Welcome, {affiliate.name}{" "}
                <span className="font-mono text-[12px] font-normal tracking-wide text-muted">({affiliate.code})</span>
              </h1>
              <p className="mt-1 text-[13px] text-muted">
                Payout:{" "}
                <span className="text-body">
                  {affiliate.payoutMethod === "MOBILE_MONEY" ? "MTN MoMo / Telecel / AirtelTigo" : "Bank"}
                </span>{" "}
                • <span className="font-mono text-brand-teal">{affiliate.payoutAccount}</span> • Balance threshold GHS 50
              </p>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="rounded-pill border border-white/10 bg-white/[0.04] px-4 py-2 text-[12px] text-muted hover:text-hi"
            >
              Sign out
            </button>
          </div>
        </Container>
      </div>

      <Container className="py-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Total clicks", value: String(affiliate.totalClicks), hint: "All time" },
            { label: "Conversions", value: String(affiliate.totalConversions), hint: "Approved" },
            { label: "Approved earnings", value: `GHS ${pesewasToGhs(affiliate.totalEarned)}`, hint: "Pending + paid" },
            {
              label: "Available to withdraw",
              value: `GHS ${pesewasToGhs(pendingPesewas)}`,
              hint: pendingPesewas >= 5000 ? "Eligible" : "Min GHS 50",
            },
          ].map((s) => (
            <div key={s.label} className="rounded-[12px] border border-white/[0.06] bg-surface-1 p-4">
              <p className="t-eyebrow text-eyebrow">{s.label}</p>
              <p className="mt-2 text-[20px] font-semibold tracking-[-0.02em] text-hi">{s.value}</p>
              <p className="mt-1 font-mono text-[11px] text-muted">{s.hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-[16px] border border-white/[0.07] bg-surface-1 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Eyebrow>Your referral links</Eyebrow>
            <span className="rounded-[6px] bg-brand-teal px-2 py-1 font-mono text-[11px] font-semibold tracking-wide text-black">
              {affiliate.code}
            </span>
          </div>
          <p className="mt-2 max-w-[640px] text-[13px] leading-[1.6] text-muted">
            Append <span className="font-mono text-body">?ref={affiliate.code}</span> to any ScalMint URL. 30-day cookie.
            Add <span className="font-mono text-body">&p=slug</span> to segment in reports.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {AFFILIATE_PRODUCTS.map((p) => {
              const url = p.href
                ? `${p.href}?ref=${affiliate.code}`
                : `https://scalmint.com/affiliate?p=${p.slug}&ref=${affiliate.code}`;
              return (
                <div key={p.slug} className="rounded-[10px] border border-white/[0.06] bg-page px-4 py-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-medium text-hi">{p.name}</p>
                    <span
                      className={`rounded-[6px] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${p.status === "live" ? "bg-white text-black" : "bg-[#1a1a1a] text-muted"}`}
                    >
                      {p.status === "live" ? p.commissionLabel : "Coming soon"}
                    </span>
                  </div>
                  <p className="mt-2 break-all rounded-[8px] bg-white/[0.04] px-2 py-1.5 font-mono text-[11px] text-brand-teal">{url}</p>
                  <p className="mt-2 text-[11px] leading-[1.4] text-muted">{p.tagline}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_0.9fr]">
          <div className="rounded-[16px] border border-white/[0.07] bg-surface-1">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <h3 className="text-[14px] font-medium tracking-[-0.01em] text-hi">Recent conversions</h3>
              <p className="mt-1 font-mono text-[11px] tracking-wide text-muted">
                Pending 7d → Approved → Paid • Paystack T+1
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-4 py-3 font-normal">Date</th>
                    <th className="px-4 py-3 font-normal">Product</th>
                    <th className="px-4 py-3 font-normal">Amount</th>
                    <th className="px-4 py-3 font-normal">Commission</th>
                    <th className="px-4 py-3 font-normal">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {affiliate.conversions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted">
                        No conversions yet. Share your link — clicks appear in real time.
                      </td>
                    </tr>
                  ) : (
                    affiliate.conversions.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-3 text-muted">{new Date(c.createdAt).toLocaleDateString("en-GB")}</td>
                        <td className="px-4 py-3 text-body">{c.product.name}</td>
                        <td className="px-4 py-3 font-mono text-body">GHS {pesewasToGhs(c.amount)}</td>
                        <td className="px-4 py-3 font-mono text-brand-teal">GHS {pesewasToGhs(c.commissionAmount)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-[6px] px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide ${c.status === "APPROVED" ? "bg-brand-teal text-black" : c.status === "PENDING" ? "bg-amber-400 text-black" : c.status === "PAID" ? "bg-white text-black" : "bg-white/10 text-muted"}`}
                          >
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[16px] border border-white/[0.07] bg-surface-1 p-5">
              <h3 className="text-[14px] font-medium text-hi">Payouts</h3>
              <p className="mt-1 text-[12px] leading-[1.5] text-muted">
                MoMo GHS 1 vs bank GHS 8 via Paystack Transfer. Threshold GHS 50 MoMo.
              </p>
              <div className="mt-4 divide-y divide-white/[0.06]">
                {affiliate.payouts.length === 0 ? (
                  <p className="py-6 text-center text-[12px] text-muted">
                    No payouts yet. Available balance: GHS {pesewasToGhs(pendingPesewas)}.
                  </p>
                ) : (
                  affiliate.payouts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-mono text-[12px] text-body">GHS {pesewasToGhs(p.amount)}</p>
                        <p className="font-mono text-[11px] text-muted">
                          {new Date(p.createdAt).toLocaleDateString("en-GB")} • {p.method}
                        </p>
                      </div>
                      <span
                        className={`rounded-[6px] px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide ${p.status === "SUCCESS" ? "bg-brand-teal text-black" : "bg-white/10 text-muted"}`}
                      >
                        {p.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <PayoutButton eligible={pendingPesewas >= 5000} pendingGhs={pesewasToGhs(pendingPesewas)} />
              <p className="mt-2 text-center font-mono text-[11px] text-muted">Weekly batch • 15th monthly sweep</p>
            </div>

            <div className="rounded-[16px] border border-white/[0.07] bg-[#111111] p-5">
              <p className="t-eyebrow text-brand-teal">Need help?</p>
              <p className="mt-2 text-[13px] leading-[1.6] text-muted">
                Support: support@scalmint.com • Responses in &lt;12h (Accra).
              </p>
              <Link href="/affiliate" className="mt-3 inline-flex text-[12px] text-muted underline underline-offset-4 hover:text-hi">
                Back to affiliate home
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
