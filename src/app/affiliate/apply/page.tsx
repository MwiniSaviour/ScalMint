"use client";

import { useState } from "react";
import Link from "next/link";
import { Container, Eyebrow } from "@/components/ui/primitives";
import { Button } from "@/components/ui/primitives";
import { storeAffiliateToken } from "@/lib/auth/client";

export default function ApplyPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    // acceptedTerms checkbox → "on" ; coerce
    const payload: Record<string, unknown> = { ...body, acceptedTerms: fd.get("acceptedTerms") === "on" ? true : false };
    try {
      const res = await fetch("/api/affiliate/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string; code?: string; token?: string };
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed");
      if (data.token) storeAffiliateToken(data.token);
      setStatus("success");
      setMsg(`Your code: ${data.code}. Opening dashboard…`);
      window.location.assign("/affiliate/dashboard");
    } catch (err: unknown) {
      setStatus("error");
      setMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <main className="bg-page">
      <div className="border-b border-white/[0.06] bg-[#0f0f0f]">
        <Container className="py-10">
          <Eyebrow>Become an affiliate</Eyebrow>
          <h1 className="mt-3 text-[32px] font-medium leading-[0.95] tracking-[-0.03em] text-hi md:text-[40px]">
            Apply in 60 seconds.
            <br />
            <span className="text-brand-teal">Get your SCAL- code.</span>
          </h1>
          <p className="mt-4 max-w-[560px] text-[14px] leading-[1.6] text-muted">
            One code for all 4 products. Ghana Card verified, MoMo payouts via Paystack. You’ll get dashboard access immediately in dev; production verifies &lt;24h.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 font-mono text-[11px] tracking-wide text-muted">
            <span className="rounded-[6px] border border-white/10 bg-white/[0.04] px-2 py-1">DNS: affiliate.scalmint.com</span>
            <span className="rounded-[6px] border border-white/10 bg-white/[0.04] px-2 py-1">MoMo default • GHS 50 threshold</span>
            <span className="rounded-[6px] border border-white/10 bg-white/[0.04] px-2 py-1">30-day cookie</span>
          </div>
        </Container>
      </div>

      <Container className="py-10">
        <div className="mx-auto grid max-w-[1080px] grid-cols-1 gap-6 lg:grid-cols-[1.35fr_0.75fr]">
          <form onSubmit={onSubmit} className="rounded-[16px] border border-white/[0.07] bg-surface-1 p-6 md:p-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="t-eyebrow text-eyebrow">Full name *</span>
                <input name="name" required placeholder="Ama Mensah" className="mt-2 w-full rounded-[10px] border border-white/[0.08] bg-page px-3 py-[10px] text-[14px] text-hi placeholder:text-muted/60 focus:border-white/20 focus:outline-none" />
              </label>
              <label className="block">
                <span className="t-eyebrow text-eyebrow">Email *</span>
                <input name="email" type="email" required placeholder="ama@example.com" className="mt-2 w-full rounded-[10px] border border-white/[0.08] bg-page px-3 py-[10px] text-[14px] text-hi focus:border-white/20 focus:outline-none" />
              </label>
              <label className="block">
                <span className="t-eyebrow text-eyebrow">Phone (Ghana) *</span>
                <input name="phone" required placeholder="0244123456" pattern="0[0-9]{9}" className="mt-2 w-full rounded-[10px] border border-white/[0.08] bg-page px-3 py-[10px] text-[14px] text-hi focus:border-white/20 focus:outline-none" />
              </label>
              <label className="block">
                <span className="t-eyebrow text-eyebrow">Password *</span>
                <input name="password" type="password" required minLength={8} placeholder="••••••••" className="mt-2 w-full rounded-[10px] border border-white/[0.08] bg-page px-3 py-[10px] text-[14px] text-hi focus:border-white/20 focus:outline-none" />
              </label>
              <label className="block">
                <span className="t-eyebrow text-eyebrow">Payout method *</span>
                <select name="payoutMethod" defaultValue="MOBILE_MONEY" className="mt-2 w-full rounded-[10px] border border-white/[0.08] bg-page px-3 py-[10px] text-[14px] text-hi focus:border-white/20 focus:outline-none">
                  <option value="MOBILE_MONEY">Mobile Money (MTN MoMo • Telecel • AirtelTigo)</option>
                  <option value="BANK">Bank (Ghana — GhIPSS)</option>
                </select>
              </label>
              <label className="block">
                <span className="t-eyebrow text-eyebrow">MoMo number / Bank account *</span>
                <input name="payoutAccount" required placeholder="0244123456 or 1234567890" className="mt-2 w-full rounded-[10px] border border-white/[0.08] bg-page px-3 py-[10px] text-[14px] text-hi focus:border-white/20 focus:outline-none" />
              </label>
              <label className="block">
                <span className="t-eyebrow text-eyebrow">Account name (as on MoMo/bank)</span>
                <input name="payoutAccountName" placeholder="Ama Mensah" className="mt-2 w-full rounded-[10px] border border-white/[0.08] bg-page px-3 py-[10px] text-[14px] text-hi focus:border-white/20 focus:outline-none" />
              </label>
              <label className="block">
                <span className="t-eyebrow text-eyebrow">Ghana Card ID (for verification)</span>
                <input name="ghanaCardId" placeholder="GHA-XXXXXXXXX" className="mt-2 w-full rounded-[10px] border border-white/[0.08] bg-page px-3 py-[10px] text-[14px] text-hi focus:border-white/20 focus:outline-none" />
              </label>
            </div>

            <label className="mt-6 flex items-start gap-2">
              <input type="checkbox" name="acceptedTerms" required className="mt-1 size-4 rounded border-white/20 bg-page" />
              <span className="text-[12px] leading-[1.5] text-muted">
                I agree to the <Link href="/legal/terms" className="text-hi underline underline-offset-4">Affiliate Terms</Link> — no brand bidding, no spam, self-referral banned. 7-day verification window, 30-day cookie.
              </span>
            </label>

            <div className="mt-6 flex items-center gap-3">
              <Button type="submit" disabled={status === "loading"} className="min-w-[160px]">
                {status === "loading" ? "Creating…" : "Create affiliate account"}
              </Button>
              <Link href="/affiliate/login" className="text-[13px] text-muted hover:text-hi">
                Already have an account? Sign in
              </Link>
            </div>

            {msg && (
              <p className={`mt-4 rounded-[10px] border px-3 py-2 text-[13px] ${status === "success" ? "border-brand-teal/30 bg-brand-teal/10 text-brand-teal" : "border-red-500/20 bg-red-500/10 text-[#ff8a7a]"}`}>
                {msg}
              </p>
            )}
            <p className="mt-3 text-[11px] leading-[1.5] text-muted">
              In production this goes to <span className="text-body">PENDING → staff approves in admin (nextAdmin)</span>. Dev auto-approves for testing.
            </p>
          </form>

          <div className="rounded-[16px] border border-white/[0.07] bg-[#111111] p-6">
            <p className="t-eyebrow text-brand-teal">Why Ghana affiliates choose ScalMint</p>
            <ul className="mt-4 space-y-3 text-[13px] leading-[1.6] text-muted">
              <li>• One link for Nova POS + Operasch (live) + Jarvis/JobFinder waitlist — you earn wherever they convert.</li>
              <li>• Recurring on SaaS: 30% Nova POS / 25% Operasch for 12 months — not one-off.</li>
              <li>• MoMo first: GHS 1 fee vs GHS 8 bank. We pay to MTN MoMo by default.</li>
              <li>• Real support: Accra team, not a faceless network. `support@scalmint.com` & WhatsApp.</li>
            </ul>
            <div className="mt-6 rounded-[12px] bg-white/[0.04] p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Example link after approval</p>
              <p className="mt-2 break-all font-mono text-[12px] text-brand-teal">https://pos.scalmint.com?ref=SCAL-A7F3K9PQ</p>
              <p className="mt-1 break-all font-mono text-[12px] text-muted">https://smartsos.cloud?ref=SCAL-A7F3K9PQ</p>
              <p className="mt-2 text-[11px] text-muted">Add `&p=nova-pos` to segment by product in dashboard.</p>
            </div>
            <div className="mt-6 rounded-[12px] border border-amber-500/15 bg-amber-500/5 p-4">
              <p className="text-[12px] font-medium text-amber-200">DNS — affiliate.scalmint.com</p>
              <p className="mt-1 font-mono text-[11px] leading-[1.5] text-muted">
                CNAME affiliate → cname.vercel-dns.com (Vercel). Add domain in project settings, enable auto-TLS. Middleware routes affiliate.* to /affiliate.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
