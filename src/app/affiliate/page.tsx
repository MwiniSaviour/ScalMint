import Link from "next/link";
import { Container, Section, Eyebrow, Heading2, ButtonLink, ArrowUpRight } from "@/components/ui/primitives";
import { AffiliateProductGrid } from "@/components/affiliate/ProductCard";

export const dynamic = "force-static";

export default function AffiliateHome() {
  return (
    <main>
      {/* Hero — measured dark blueprint */}
      <section className="relative overflow-hidden bg-page">
        <div className="pointer-events-none absolute inset-0 blueprint opacity-[0.14] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_20%,#000_40%,transparent_85%)]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-page" />
        <div className="pointer-events-none absolute left-1/2 top-[-80px] h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-brand-teal/6 blur-[80px]" />

        <Container className="relative py-[56px] md:py-[88px]">
          <div className="mx-auto max-w-[760px] text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-pill border border-white/[0.08] bg-white/[0.03] px-3 py-1">
              <span className="size-[6px] rounded-full bg-brand-teal shadow-[0_0_12px_rgba(20,200,180,0.6)]" />
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Affiliate program • Live in Ghana</span>
              <span className="hidden h-[14px] w-px bg-white/10 sm:inline-block" />
              <span className="hidden font-mono text-[11px] tracking-wide text-body sm:inline">affiliate.scalmint.com</span>
            </div>

            <h1 className="t-hero mt-6 text-hi">
              Turn your audience
              <br />
              <span className="text-brand-teal">into recurring revenue.</span>
            </h1>
            <p className="t-body-lg mx-auto mt-5 max-w-[560px] text-body">
              Promote Nova POS and Operasch — live today — plus Jarvis and JobFinder on waitlist. Earn
              <span className="text-hi"> up to 30% recurring</span> for 12 months. Payouts to MTN MoMo or bank via Paystack Ghana.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/affiliate/apply">
                Apply as affiliate <ArrowUpRight />
              </ButtonLink>
              <ButtonLink href="/affiliate/login" variant="ghost">
                Affiliate sign in
              </ButtonLink>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 font-mono text-[11px] tracking-wide text-muted">
              <span className="inline-flex items-center gap-1.5"><span className="size-1 rounded-full bg-white/40" />GHS 50 MoMo threshold</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-1 rounded-full bg-white/40" />30-day tracking</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-1 rounded-full bg-white/40" />T+1 Paystack settlement</span>
            </div>
          </div>

          {/* Trust strip */}
          <div className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { k: "Up to 30%", v: "Recurring on Nova POS" },
              { k: "Up to 25%", v: "Recurring on Operasch" },
              { k: "T+1 • GHS 1", v: "MoMo payouts via Paystack" },
              { k: "30-day", v: "Cookie window • Ghana" },
            ].map((s) => (
              <div key={s.k} className="rounded-[12px] border border-white/[0.06] bg-surface-1 px-4 py-4">
                <p className="text-[16px] font-semibold tracking-[-0.02em] text-hi">{s.k}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">{s.v}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Products */}
      <Section id="products" className="border-t border-line bg-page">
        <Container>
          <div className="mx-auto max-w-[720px] text-center">
            <Eyebrow className="justify-center">Products you can promote</Eyebrow>
            <Heading2 className="mt-4">Four products, one link.</Heading2>
            <p className="t-body-lg mx-auto mt-4 max-w-[560px] text-body">
              One referral code powers all products. Your `?ref=SCAL-XXXX` works across Nova POS, Operasch, Jarvis and JobFinder — we attribute automatically.
            </p>
          </div>
          <div className="mt-10">
            <AffiliateProductGrid />
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/affiliate/apply" className="inline-flex h-[36px] items-center gap-1.5 rounded-pill bg-white px-5 text-[14px] font-medium text-black hover:bg-[#e8e8e8]">
              Get your affiliate link <ArrowUpRight size={13} />
            </Link>
            <span className="inline-flex h-[36px] items-center rounded-pill border border-line bg-surface-1 px-4 font-mono text-[11px] tracking-wide text-muted">
              Example: affiliate.scalmint.com/r/SCAL-A7F3K9PQ → pos.scalmint.com?ref=SCAL-A7F3K9PQ
            </span>
          </div>
        </Container>
      </Section>

      {/* How it works */}
      <Section id="how" className="border-t border-line bg-[#0f0f0f]">
        <Container>
          <Eyebrow>How it works</Eyebrow>
          <Heading2 className="mt-4 max-w-[560px]">Built for Ghana. Payouts that actually arrive.</Heading2>
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                n: "01",
                t: "Apply in 60s",
                d: "Ghana Card + MoMo or bank. We verify in <24h. You get SCAL-XXXX code and dashboard.",
                meta: "KYC: Ghana Card • Phone verified",
              },
              {
                n: "02",
                t: "Share your link",
                d: "One link works everywhere: website, WhatsApp, TikTok, radio show. 30-day cookie survives WhatsApp browser.",
                meta: "ref param • 30d cookie • server-side click_id",
              },
              {
                n: "03",
                t: "Earn & withdraw",
                d: "Customer pays via Paystack. We hold 7d for fraud/returns, then mark Approved. Withdraw to MoMo (GHS 1 fee) or bank (GHS 8).",
                meta: "T+1 settlement • GHS 50 threshold • Manual payouts",
              },
            ].map((s) => (
              <div key={s.n} className="rounded-[12px] border border-white/[0.06] bg-surface-1 p-6">
                <p className="font-mono text-[12px] tracking-[0.14em] text-brand-teal">{s.n}</p>
                <h3 className="mt-3 text-[16px] font-medium tracking-[-0.01em] text-hi">{s.t}</h3>
                <p className="mt-2 text-[13px] leading-[1.6] text-muted">{s.d}</p>
                <p className="mt-4 border-t border-white/[0.06] pt-3 font-mono text-[11px] tracking-wide text-eyebrow">{s.meta}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Earnings */}
      <Section id="earnings" className="border-t border-line bg-page">
        <Container>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[480px_1fr]">
            <div>
              <Eyebrow>Earnings</Eyebrow>
              <Heading2 className="mt-4">Simple math. No surprises.</Heading2>
              <p className="mt-4 text-[14px] leading-[1.6] text-body">
                Nova POS: GHS 200/mo plan × 30% = <span className="text-hi">GHS 60/mo</span> for 12 months per store. 10 stores = GHS 600/mo passive.
                Operasch: GHS 350/mo × 25% = GHS 87.5/mo + GHS 30 CPA per workspace.
              </p>
              <div className="mt-6 overflow-hidden rounded-[12px] border border-white/[0.06] bg-surface-1">
                <div className="grid grid-cols-3 gap-px bg-white/[0.06] font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                  <div className="bg-surface-1 px-4 py-3">Product</div>
                  <div className="bg-surface-1 px-4 py-3">You earn</div>
                  <div className="bg-surface-1 px-4 py-3">For</div>
                </div>
                <div className="divide-y divide-white/[0.06] text-[13px]">
                  {[
                    ["Nova POS", "30% / month", "12 months"],
                    ["Operasch", "25% + GHS 30", "12 months"],
                    ["Jarvis", "GHS 5", "per verified student"],
                    ["JobFinder", "GHS 10", "per live job"],
                  ].map((r) => (
                    <div key={r[0]} className="grid grid-cols-3 gap-px">
                      <div className="bg-surface-1 px-4 py-3 text-hi">{r[0]}</div>
                      <div className="bg-surface-1 px-4 py-3 text-body">{r[1]}</div>
                      <div className="bg-surface-1 px-4 py-3 text-muted">{r[2]}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-[16px] border border-white/[0.06] bg-surface-1 p-6 md:p-8">
              <p className="t-eyebrow text-eyebrow">Payouts • Paystack Ghana</p>
              <h3 className="mt-3 text-[20px] font-medium tracking-[-0.02em] text-hi">MTN MoMo first. Bank when you need it.</h3>
              <ul className="mt-4 space-y-3 text-[13px] leading-[1.6] text-muted">
                <li className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-brand-teal" />Registered business — Required for Transfers (Starter GH accounts cannot pay affiliates).</li>
                <li className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-brand-teal" />Manual payouts enabled — funds sit in Paystack Balance, we batch nightly to MoMo.</li>
                <li className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-brand-teal" />Cost: <span className="text-body">GHS 1 to MoMo • GHS 8 to bank</span> — we default to MoMo (8× cheaper).</li>
                <li className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-brand-teal" />Threshold: <span className="text-body">GHS 50 MoMo • GHS 100 bank</span> — monthly on the 15th, instant above threshold.</li>
                <li className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-brand-teal" />Docs: Ghana Card + MoMo name match. Settlement T+1 (next working day, Mon-Sat → Mon).</li>
              </ul>
              <div className="mt-6 flex gap-2">
                <ButtonLink href="/affiliate/apply">Apply — get paid via MoMo</ButtonLink>
                <Link href="#faq" className="inline-flex h-[37px] items-center rounded-pill border border-line px-4 text-[13px] text-muted hover:text-hi">
                  How verification works
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* FAQ */}
      <Section id="faq" className="border-t border-line bg-[#0f0f0f]">
        <Container>
          <div className="mx-auto max-w-[760px]">
            <Eyebrow className="justify-center text-center">FAQ</Eyebrow>
            <Heading2 className="mx-auto mt-4 max-w-[520px] text-center">What Ghana affiliates ask first.</Heading2>
            <div className="mt-10 divide-y divide-white/[0.07] rounded-[12px] border border-white/[0.07] bg-surface-1">
              {[
                { q: "How do you track in Ghana's network (WhatsApp, power cuts)?", a: "We use server-side click_id plus 30-day cookie. If cookie is wiped, click_id from the initial redirect still attributes via Paystack webhook. Status goes Pending (7d) → Approved → Paid." },
                { q: "What documents do I need?", a: "Ghana Card (or voter ID + Ghana Card later), phone-verified MoMo number matching your name, and payout account (MoMo number or bank + bank code). Approval <24h." },
                { q: "When do I get paid?", a: "Conversions become Approved after 7 days (fraud/returns window). Payouts run nightly if you are above GHS 50 (MoMo). Monthly batch on the 15th for smaller balances. Paystack T+1 settlement to your MoMo/bank." },
                { q: "Do I need a website?", a: "No. Share on WhatsApp, TikTok, Instagram, YouTube, radio, church/work groups. Provide value (e.g., 'POS that works offline'), not spam. Brand-bidding and bot traffic are banned." },
              ].map((f) => (
                <details key={f.q} className="group px-6 py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14px] font-medium tracking-[-0.01em] text-hi">
                    {f.q}
                    <span className="grid size-7 shrink-0 place-items-center rounded-full border border-white/10 text-muted transition-colors group-open:rotate-45 group-open:bg-white group-open:text-black">+</span>
                  </summary>
                  <p className="mt-3 max-w-[640px] text-[13px] leading-[1.6] text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
          <div className="mx-auto mt-10 flex max-w-[760px] flex-col items-center justify-between gap-4 rounded-[12px] border border-white/[0.06] bg-page px-6 py-6 md:flex-row">
            <div>
              <p className="text-[16px] font-medium tracking-[-0.02em] text-hi">Ready to earn in Ghana?</p>
              <p className="mt-1 text-[13px] text-muted">One application covers all 4 products. Live + waitlist.</p>
            </div>
            <ButtonLink href="/affiliate/apply" className="shrink-0">
              Apply to affiliate program <ArrowUpRight />
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </main>
  );
}
