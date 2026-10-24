import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ButtonLink, ArrowUpRight } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Affiliate Program — Earn recurring commission with ScalMint",
  description:
    "Promote Nova POS, Operasch, Jarvis and JobFinder. Earn up to 30% recurring commission. Payouts via Paystack to MTN MoMo or bank in Ghana. T+1 settlement, GHS 50 threshold.",
  alternates: { canonical: "https://affiliate.scalmint.com" },
  openGraph: {
    url: "https://affiliate.scalmint.com",
    title: "ScalMint Affiliate Program — affiliate.scalmint.com",
    description:
      "Turn your audience into recurring revenue. Up to 30% commission, 30-day tracking, Paystack MoMo payouts in Ghana.",
  },
};

function AffiliateNav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-page/80 backdrop-blur-md">
      <div className="mx-auto flex h-[64px] max-w-[1200px] items-center gap-6 px-6">
        <Link href="/affiliate" className="flex items-center gap-2.5">
          <Image src="/brand/mark.png" alt="" width={24} height={32} className="h-[32px] w-auto" />
          <span className="text-[15px] font-semibold tracking-[-0.02em]">
            <span className="text-[#e9edf2]">Sca</span>
            <span className="text-brand-teal">lMint</span>
          </span>
          <span className="ml-1 hidden rounded-[6px] border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted sm:inline-flex">
            Affiliates
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 md:flex" aria-label="Affiliate">
          <Link href="/affiliate#products" className="rounded-pill px-3 py-1.5 text-[13px] text-muted transition-colors hover:bg-white/[0.06] hover:text-hi">
            Products
          </Link>
          <Link href="/affiliate#how" className="rounded-pill px-3 py-1.5 text-[13px] text-muted transition-colors hover:bg-white/[0.06] hover:text-hi">
            How it works
          </Link>
          <Link href="/affiliate#earnings" className="rounded-pill px-3 py-1.5 text-[13px] text-muted transition-colors hover:bg-white/[0.06] hover:text-hi">
            Earnings
          </Link>
          <Link href="/affiliate#faq" className="rounded-pill px-3 py-1.5 text-[13px] text-muted transition-colors hover:bg-white/[0.06] hover:text-hi">
            FAQ
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/affiliate/login" className="hidden text-[13px] text-muted transition-colors hover:text-hi sm:inline-flex">
            Sign in
          </Link>
          <ButtonLink href="/affiliate/apply" className="h-[32px] px-4 text-[13px]">
            Apply now <ArrowUpRight size={12} />
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}

function AffiliateFooter() {
  return (
    <footer className="border-t border-line bg-[#0a0a0a]">
      <div className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="max-w-[360px]">
            <Link href="/affiliate" className="flex items-center gap-2">
              <Image src="/brand/mark.png" alt="" width={20} height={26} className="h-[26px] w-auto" />
              <span className="text-[13px] font-semibold tracking-[-0.02em] text-hi">ScalMint Affiliates</span>
            </Link>
            <p className="mt-3 text-[12px] leading-[1.6] text-muted">
              Affiliate program for Nova POS, Operasch, Jarvis & JobFinder. Operated by ScalMint • Accra, Ghana.
              Payouts via Paystack to MTN MoMo / bank • T+1 settlement • GHS 50 threshold for MoMo.
            </p>
          </div>
          <div className="flex gap-12 text-[12px]">
            <div>
              <p className="t-eyebrow text-eyebrow">Program</p>
              <ul className="mt-3 space-y-2 text-muted">
                <li><Link href="/affiliate#products" className="hover:text-hi">Products</Link></li>
                <li><Link href="/affiliate#how" className="hover:text-hi">How it works</Link></li>
                <li><Link href="/affiliate/apply" className="hover:text-hi">Apply</Link></li>
                <li><Link href="/affiliate/login" className="hover:text-hi">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <p className="t-eyebrow text-eyebrow">Legal</p>
              <ul className="mt-3 space-y-2 text-muted">
                <li><Link href="/legal/privacy" className="hover:text-hi">Privacy</Link></li>
                <li><Link href="/legal/terms" className="hover:text-hi">Terms</Link></li>
                <li><span className="text-muted">support@scalmint.com</span></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.06] pt-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-footer-legal">© 2026 ScalMint • affiliate.scalmint.com</p>
          <p className="text-[11px] text-muted">Paystack Ghana • Bank of Ghana PSP licensed • Mobile money: MTN MoMo • Telecel Cash • AirtelTigo</p>
        </div>
      </div>
    </footer>
  );
}

export default function AffiliateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page">
      <AffiliateNav />
      {children}
      <AffiliateFooter />
    </div>
  );
}
