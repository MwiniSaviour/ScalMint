import Link from "next/link";
import { ArrowUpRight } from "@/components/ui/primitives";
import { AFFILIATE_PRODUCTS } from "@/lib/affiliate/products";

export function AffiliateProductGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {AFFILIATE_PRODUCTS.map((p) => (
        <div
          key={p.slug}
          className="group relative flex flex-col rounded-[12px] border border-white/[0.06] bg-surface-1 p-6 transition-colors hover:border-white/[0.10] hover:bg-white/[0.02]"
        >
          {p.status === "coming_soon" && (
            <span className="absolute right-4 top-4 t-eyebrow inline-flex h-[18px] items-center rounded-[6px] bg-[#1a1a1a] px-2 text-[10px] text-muted">
              Coming soon
            </span>
          )}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[18px] font-medium leading-none tracking-[-0.02em] text-hi">{p.name}</h3>
              {p.domain && <p className="mt-1.5 font-mono text-[11px] tracking-wide text-brand-teal">{p.domain}</p>}
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-[8px] bg-white px-2.5 py-1 text-[11px] font-semibold leading-none text-black">
              {p.commissionLabel}
            </span>
          </div>
          <p className="mt-3 text-[13px] leading-[1.6] text-muted">{p.tagline}</p>
          <p className="mt-3 rounded-[8px] bg-white/[0.03] px-3 py-2 text-[12px] leading-[1.5] text-body">{p.affiliateBrief}</p>
          <p className="mt-3 text-[11px] leading-[1.4] text-eyebrow">{p.commissionDetail}</p>

          <div className="mt-5 flex items-center gap-2">
            {p.status === "live" ? (
              <>
                <Link
                  href={p.href!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-[32px] items-center gap-1 rounded-pill border border-white/10 bg-white px-3 text-[12px] font-medium text-black transition-colors hover:bg-[#e8e8e8]"
                >
                  View product <ArrowUpRight size={11} />
                </Link>
                <span className="ml-1 font-mono text-[11px] text-muted">30d cookie • T+1 payout</span>
              </>
            ) : (
              <span className="inline-flex h-[32px] items-center rounded-pill border border-white/10 bg-white/[0.06] px-3 text-[12px] font-medium text-muted">
                Joins waitlist <span className="ml-1.5 size-[5px] rounded-full bg-amber-400" />
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
