"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ButtonLink } from "@/components/ui/primitives";

/* ---------------------------------------------------------------------------
   Nav — sticky, three mega-menus.

   Product           → product catalogue (live + coming soon)
   Services          → "What we build" (the 6 service lines previously under Product)
   Affiliate Program → the same products with affiliate-focused brief descriptions

   Plain links (About, Insights, Pricing) deliberately have no popup.

   Behaviour:
   - hover intent with short close delay
   - click toggles
   - scroll / esc / outside-click closes
   - mobile drawer stacks all groups
   ------------------------------------------------------------------------- */

type MenuId = "product" | "services" | "affiliate" | null;

type NavMenuItem = { id: Exclude<MenuId, null>; label: string; menu: true };
type NavLinkItem = { id: string; label: string; href: string };
type NavItem = NavMenuItem | NavLinkItem;

const NAV_ITEMS: NavItem[] = [
  { id: "product", label: "Product", menu: true },
  { id: "services", label: "Services", menu: true },
  { id: "affiliate", label: "Affiliate Program", menu: true },
  { id: "about", label: "About", href: "#about" },
  { id: "insights", label: "Insights", href: "#insights" },
  { id: "pricing", label: "Pricing", href: "#pricing" },
];

/* -- Services — the canonical 6 items previously under Product --------------- */

const SERVICE_ITEMS: {
  title: string;
  desc: string;
  beta?: boolean;
  href: string;
}[] = [
  {
    title: "Software development",
    desc: "Web, mobile and desktop applications engineered to scale.",
    href: "/services/software-development",
  },
  {
    title: "AI automation",
    desc: "WhatsApp and email receptionists that manage customer chat end to end.",
    href: "/services/ai-automation",
  },
  {
    title: "Structured data",
    desc: "Business research modelled into usable, queryable data.",
    href: "/services/structured-data",
  },
  {
    title: "Model fine-tuning",
    desc: "Models tuned for your specific tasks and your own domain data.",
    beta: true,
    href: "/services/model-fine-tuning",
  },
  {
    title: "Systems integration",
    desc: "Connect the platforms, data sources and tools you already run.",
    href: "/services/systems-integration",
  },
  {
    title: "Managed operations",
    desc: "Hosting, monitoring and support that continue after launch.",
    href: "/services/managed-operations",
  },
];

/* -- Products ---------------------------------------------------------------- */

type ProductItem = {
  name: string;
  desc: string;
  domain?: string;
  href?: string;
  status: "live" | "coming_soon";
  hint?: string;
};

const PRODUCT_ITEMS: ProductItem[] = [
  {
    name: "Nova POS",
    desc: "Retail-grade point of sale for stores, restaurants and multi-branch teams.",
    domain: "pos.scalmint.com",
    href: "https://pos.scalmint.com",
    status: "live",
  },
  {
    name: "Operasch",
    desc: "Operations, SOPs and field execution — work tracked from plan to proof.",
    domain: "smartsos.cloud",
    href: "https://smartsos.cloud",
    status: "live",
  },
  {
    name: "Jarvis",
    desc: "AI PDF study assistant — chat with documents, summaries and quizzes.",
    status: "coming_soon",
    hint: "AI PDF study assistant",
  },
  {
    name: "JobFinder",
    desc: "Discover and track the right roles faster with structured job intelligence.",
    status: "coming_soon",
  },
];

/* -- Affiliate Program — same products, affiliate-framed brief descriptions -- */

type AffiliateItem = {
  name: string;
  brief: string;
  domain?: string;
  href?: string;
  status: "live" | "coming_soon";
  badge: string;
};

const AFFILIATE_ITEMS: AffiliateItem[] = [
  {
    name: "Nova POS",
    brief: "POS for shops, restaurants & chains. Refer merchants and earn recurring commission on every subscription.",
    domain: "pos.scalmint.com",
    href: "https://pos.scalmint.com",
    status: "live",
    badge: "Up to 30% recurring",
  },
  {
    name: "Operasch",
    brief: "SOPs, field teams & proof-of-work. Invite companies to smartsos.cloud and earn when they scale.",
    domain: "smartsos.cloud",
    href: "https://smartsos.cloud",
    status: "live",
    badge: "Up to 25% recurring",
  },
  {
    name: "Jarvis",
    brief: "AI PDF study assistant — turn any document into chat, summaries and quizzes. Early affiliates lock priority.",
    status: "coming_soon",
    badge: "Early access",
  },
  {
    name: "JobFinder",
    brief: "Structured job intelligence to find and track the right roles faster. Join waitlist for pre-launch rate.",
    status: "coming_soon",
    badge: "Waitlist",
  },
];

export default function Nav() {
  const [openMenu, setOpenMenu] = useState<MenuId>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenMenu(null);
      setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (mq.matches) setMobileOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!openMenu) return;
    const onScroll = () => setOpenMenu(null);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [openMenu]);

  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (headerRef.current && !headerRef.current.contains(target)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [openMenu]);

  const hoverOpen = (id: MenuId) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenMenu(id);
  };
  const hoverClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), 140);
  };
  const toggleMenu = (id: Exclude<MenuId, null>) => {
    setOpenMenu((v) => (v === id ? null : id));
  };
  const isOpen = (id: MenuId) => openMenu === id;

  return (
    <header ref={headerRef} className="sticky top-0 z-50 w-full">
      <div
        className={cn(
          "w-full px-6 transition-colors duration-300",
          scrolled ? "bg-page/85 backdrop-blur-md" : "bg-transparent",
        )}
        onMouseLeave={hoverClose}
      >
        <nav className="flex h-[72px] items-center" aria-label="Primary" onMouseEnter={() => openMenu && hoverOpen(openMenu)}>
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="ScalMint — home">
            <Image src="/brand/mark.png" alt="" width={28} height={37} priority className="h-[37px] w-auto" />
            <span className="text-[17px] font-semibold tracking-[-0.02em]">
              <span className="text-[#e9edf2]">Sca</span>
              <span className="text-brand-teal">lMint</span>
            </span>
          </Link>

          <ul className="ml-8 hidden items-center gap-2 lg:flex">
            {NAV_ITEMS.map((item) => {
              if ("menu" in item && item.menu) {
                const menuId = item.id;
                const open = isOpen(menuId);
                return (
                  <li key={item.label}>
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-haspopup="true"
                      aria-controls={`mega-${menuId}`}
                      onMouseEnter={() => hoverOpen(menuId)}
                      onFocus={() => hoverOpen(menuId)}
                      onClick={() => toggleMenu(menuId)}
                      className={cn(
                        "nav-pill hover:nav-pill-hover cursor-pointer",
                        open && "bg-white/[0.05] text-white",
                      )}
                    >
                      {item.label}
                      <svg
                        width="9"
                        height="6"
                        viewBox="0 0 9 6"
                        fill="none"
                        aria-hidden="true"
                        className={cn("ml-1.5 transition-transform duration-200", open && "rotate-180")}
                      >
                        <path d="M1 1L4.5 4.5L8 1" stroke="currentColor" strokeWidth="1.2" />
                      </svg>
                    </button>
                  </li>
                );
              }
              return (
                <li key={item.label}>
                  <Link
                    href={(item as NavLinkItem).href}
                    className="nav-pill hover:nav-pill-hover"
                    onMouseEnter={hoverClose}
                    onFocus={hoverClose}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <ButtonLink href="/contact" variant="primary" className="ml-1">
              Start a project
            </ButtonLink>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-pill text-hi lg:hidden"
          >
            <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
              <path
                d={mobileOpen ? "M1 1L17 11M17 1L1 11" : "M0 1H18M0 6H18M0 11H18"}
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </nav>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <div id="mobile-nav" className="max-h-[calc(100vh-72px)] overflow-y-auto border-t border-line bg-[#1b1b1b] lg:hidden">
          <div className="px-6 py-6">
            <p className="t-eyebrow mb-4 text-eyebrow">Menu</p>
            <ul className="flex flex-col">
              {NAV_ITEMS.map((item) => (
                <li key={item.label} className="border-b border-line/60 last:border-0">
                  <Link
                    href={"href" in item && item.href ? (item.href.startsWith("#") ? `/${item.href}` : item.href) : `/${item.id}`}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between py-3.5 text-[15px] text-hi"
                  >
                    {item.label}
                    {"menu" in item && item.menu ? (
                      <span className="t-eyebrow rounded-[4px] bg-white/[0.06] px-1.5 py-1 text-[10px] text-muted">Menu</span>
                    ) : (
                      <ArrowUpRight className="text-muted" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>

            <p className="t-eyebrow mb-4 mt-8 text-eyebrow">Products</p>
            <ul className="grid grid-cols-1 gap-y-4">
              {PRODUCT_ITEMS.map((p) => (
                <li key={p.name}>
                  {p.status === "live" && p.href ? (
                    <a
                      href={p.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-[6px] border border-transparent p-2 transition-colors hover:border-white/[0.04] hover:bg-white/[0.03]"
                    >
                      <span className="flex items-center gap-2 text-[13px] font-medium text-[#f0f0f0]">
                        {p.name}
                        <span className="inline-flex items-center gap-1 rounded-[4px] bg-white px-1.5 py-0.5 text-[9px] font-medium leading-none tracking-wide text-black">
                          Live
                        </span>
                        <ArrowUpRight size={11} className="ml-auto text-muted" />
                      </span>
                      <span className="mt-1 block text-[12px] leading-[1.45] text-[#8a8a8a]">{p.desc}</span>
                      <span className="mt-1.5 flex items-center gap-1 font-mono text-[11px] tracking-wide text-brand-teal/90">
                        {p.domain}
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                          <path d="M3 7L7 3M7 3H4M7 3V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
                        </svg>
                      </span>
                    </a>
                  ) : (
                    <div className="block rounded-[6px] border border-white/[0.03] bg-white/[0.02] p-2 opacity-90">
                      <span className="flex items-center gap-2 text-[13px] font-medium text-[#f0f0f0]">
                        {p.name}
                        <span className="t-eyebrow inline-flex h-[16px] items-center rounded-[4px] bg-[#242424] px-1.5 text-[9px] leading-none text-[#9a9a9a]">
                          Coming soon
                        </span>
                      </span>
                      <span className="mt-1 block text-[12px] leading-[1.45] text-[#8a8a8a]">{p.desc}</span>
                      {p.hint && <span className="mt-1.5 block font-mono text-[11px] tracking-wide text-muted">{p.hint}</span>}
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <p className="t-eyebrow mb-4 mt-8 text-eyebrow">What we build</p>
            <ul className="grid grid-cols-1 gap-y-4">
              {SERVICE_ITEMS.map((item) => (
                <li key={item.title}>
                  <Link href={item.href} onClick={() => setMobileOpen(false)} className="block rounded-[6px] p-2 transition-colors hover:bg-white/[0.03]">
                    <span className="flex items-center gap-2 text-[13px] font-medium text-[#f0f0f0]">
                      {item.title}
                      {item.beta && (
                        <span className="t-eyebrow inline-flex h-[16px] items-center rounded-[4px] bg-[#1a1a1a] px-1.5 text-[9px] leading-none text-[#959595]">
                          Beta
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-[1.45] text-[#8a8a8a]">{item.desc}</span>
                  </Link>
                </li>
              ))}
            </ul>

            <p className="t-eyebrow mb-4 mt-8 text-eyebrow">Affiliate Program</p>
            <p className="mb-3 text-[12px] leading-[1.5] text-muted">Promote our products and earn recurring commission.</p>
            <ul className="grid grid-cols-1 gap-y-4">
              {AFFILIATE_ITEMS.map((p) => (
                <li key={p.name}>
                  {p.status === "live" && p.href ? (
                    <Link
                      href="/affiliate"
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-[6px] border border-white/[0.06] bg-white/[0.02] p-2.5 transition-colors hover:bg-white/[0.04]"
                    >
                      <span className="flex items-center gap-2 text-[13px] font-medium text-[#f0f0f0]">
                        {p.name}
                        <span className="inline-flex h-[16px] items-center rounded-[4px] bg-brand-teal px-1.5 text-[9px] font-semibold leading-none text-black">
                          {p.badge}
                        </span>
                      </span>
                      <span className="mt-1 block text-[12px] leading-[1.45] text-[#8a8a8a]">{p.brief}</span>
                      <span className="mt-1.5 inline-flex items-center gap-1 font-mono text-[11px] tracking-wide text-brand-teal">
                        {p.domain} <ArrowUpRight size={10} />
                      </span>
                    </Link>
                  ) : (
                    <div className="block rounded-[6px] border border-white/[0.04] bg-white/[0.015] p-2.5">
                      <span className="flex items-center gap-2 text-[13px] font-medium text-[#f0f0f0]">
                        {p.name}
                        <span className="t-eyebrow inline-flex h-[16px] items-center rounded-[4px] bg-[#242424] px-1.5 text-[9px] leading-none text-[#a0a0a0]">
                          {p.badge}
                        </span>
                      </span>
                      <span className="mt-1 block text-[12px] leading-[1.45] text-[#8a8a8a]">{p.brief}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex items-center gap-2">
              <ButtonLink href="/contact" variant="primary" className="flex-1">
                Start a project
              </ButtonLink>
            </div>
          </div>
        </div>
      )}

      {/* Mega-menu — Products */}
      {openMenu === "product" && (
        <div
          id="mega-product"
          role="region"
          aria-label="Products"
          className="absolute inset-x-0 top-full hidden lg:block"
          onMouseEnter={() => hoverOpen("product")}
          onMouseLeave={hoverClose}
        >
          <div className="mx-6 mb-4 max-w-[720px] rounded-[12px] border border-[#1c1c1c] bg-[#1b1b1b] p-7 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between">
              <p className="t-eyebrow text-eyebrow">Products</p>
              <Link
                href="/products"
                className="t-eyebrow inline-flex items-center gap-1 text-[11px] text-muted transition-colors hover:text-hi"
              >
                View all <ArrowUpRight size={10} />
              </Link>
            </div>

            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
              {PRODUCT_ITEMS.map((p) => (
                <li key={p.name}>
                  {p.status === "live" && p.href ? (
                    <a
                      href={p.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex h-full flex-col rounded-[8px] border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/[0.10] hover:bg-white/[0.05]"
                    >
                      <span className="flex items-center gap-2 text-[13.5px] font-medium leading-none tracking-[-0.01em] text-[#f0f0f0]">
                        {p.name}
                        <span className="inline-flex h-[16px] items-center rounded-[4px] bg-white px-1.5 text-[9px] font-semibold leading-none tracking-wide text-black">
                          Live
                        </span>
                        <span className="ml-auto inline-flex size-5 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] opacity-70 transition-all group-hover:opacity-100 group-hover:border-white/20">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" className="text-hi">
                            <path d="M3 7L7 3M7 3H4M7 3V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
                          </svg>
                        </span>
                      </span>
                      <span className="mt-2 block text-[12px] leading-[1.45] text-[#8a8a8a]">{p.desc}</span>
                      <span className="mt-3 inline-flex items-center gap-1 font-mono text-[11px] tracking-wide text-brand-teal">
                        {p.domain} <span aria-hidden="true" className="text-brand-teal/70">↗</span>
                      </span>
                    </a>
                  ) : (
                    <div className="flex h-full flex-col rounded-[8px] border border-white/[0.05] bg-white/[0.015] p-4">
                      <span className="flex items-center gap-2 text-[13.5px] font-medium leading-none tracking-[-0.01em] text-[#f0f0f0]">
                        {p.name}
                        <span className="t-eyebrow inline-flex h-[16px] items-center rounded-[4px] border border-white/10 bg-[#242424] px-1.5 text-[9px] leading-none text-[#a0a0a0]">
                          Coming soon
                        </span>
                      </span>
                      <span className="mt-2 block text-[12px] leading-[1.45] text-[#8a8a8a]">{p.desc}</span>
                      {p.hint && <span className="mt-3 font-mono text-[11px] tracking-wide text-muted">{p.hint}</span>}
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-center gap-3 border-t border-white/[0.06] pt-4">
              <p className="text-[12px] leading-none text-muted">
                <span className="text-[#b0b0b0]">Need something custom?</span> Talk to us about your workflow.
              </p>
              <Link
                href="/contact"
                className="ml-auto inline-flex h-7 items-center gap-1 rounded-[8px] bg-white px-3 text-[12px] font-medium text-black transition-colors hover:bg-[#e8e8e8]"
              >
                Start a project <ArrowUpRight size={11} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Mega-menu — Services (What we build) */}
      {openMenu === "services" && (
        <div
          id="mega-services"
          role="region"
          aria-label="Services"
          className="absolute inset-x-0 top-full hidden lg:block"
          onMouseEnter={() => hoverOpen("services")}
          onMouseLeave={hoverClose}
        >
          <div className="mx-6 mb-4 max-w-[880px] rounded-[12px] border border-[#1c1c1c] bg-[#1b1b1b] p-7 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8)]">
            <p className="t-eyebrow text-eyebrow">What we build</p>
            <ul className="mt-4 grid grid-cols-3 gap-x-6 gap-y-5">
              {SERVICE_ITEMS.map((item) => (
                <li key={item.title}>
                  <Link href={item.href} className="group block rounded-[6px] p-2 transition-colors hover:bg-white/[0.04]">
                    <span className="flex items-center gap-2 text-[13px] font-medium text-[#f0f0f0]">
                      {item.title}
                      {item.beta && (
                        <span className="t-eyebrow inline-flex h-[16px] items-center rounded-[4px] bg-[#1a1a1a] px-1.5 text-[9px] leading-none text-[#959595]">
                          Beta
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-[12px] leading-[1.45] text-[#8a8a8a]">{item.desc}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Mega-menu — Affiliate Program — products with brief descriptions */}
      {openMenu === "affiliate" && (
        <div
          id="mega-affiliate"
          role="region"
          aria-label="Affiliate Program"
          className="absolute inset-x-0 top-full hidden lg:block"
          onMouseEnter={() => hoverOpen("affiliate")}
          onMouseLeave={hoverClose}
        >
          <div className="mx-6 mb-4 max-w-[720px] rounded-[12px] border border-[#1c1c1c] bg-[#1b1b1b] p-7 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="t-eyebrow text-eyebrow">Affiliate Program</p>
                <p className="mt-1.5 max-w-[420px] text-[12px] leading-[1.5] text-[#8a8a8a]">
                  Promote ScalMint products and earn recurring commission. Share your link, we handle billing and support.
                </p>
              </div>
              <Link
                href="/affiliate"
                className="t-eyebrow shrink-0 inline-flex items-center gap-1 rounded-[8px] bg-white px-3 py-1.5 text-[11px] font-medium text-black transition-colors hover:bg-[#e8e8e8]"
              >
                Join program <ArrowUpRight size={10} />
              </Link>
            </div>

            <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
              {AFFILIATE_ITEMS.map((p) => (
                <li key={p.name}>
                  {p.status === "live" && p.href ? (
                    <Link
                      href="/affiliate"
                      className="group flex h-full flex-col rounded-[8px] border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/[0.10] hover:bg-white/[0.05]"
                    >
                      <span className="flex items-center gap-2 text-[13.5px] font-medium leading-none tracking-[-0.01em] text-[#f0f0f0]">
                        {p.name}
                        <span className="inline-flex h-[16px] items-center rounded-[4px] bg-brand-teal px-1.5 text-[9px] font-semibold leading-none tracking-wide text-black">
                          {p.badge}
                        </span>
                      </span>
                      <span className="mt-2 block text-[12px] leading-[1.45] text-[#8a8a8a]">{p.brief}</span>
                      <span className="mt-3 inline-flex items-center gap-1 font-mono text-[11px] tracking-wide text-brand-teal">
                        {p.domain} <span aria-hidden="true" className="text-brand-teal/70">↗</span>
                      </span>
                    </Link>
                  ) : (
                    <div className="flex h-full flex-col rounded-[8px] border border-white/[0.05] bg-white/[0.015] p-4">
                      <span className="flex items-center gap-2 text-[13.5px] font-medium leading-none tracking-[-0.01em] text-[#f0f0f0]">
                        {p.name}
                        <span className="t-eyebrow inline-flex h-[16px] items-center rounded-[4px] border border-white/10 bg-[#242424] px-1.5 text-[9px] leading-none text-[#a0a0a0]">
                          {p.badge}
                        </span>
                      </span>
                      <span className="mt-2 block text-[12px] leading-[1.45] text-[#8a8a8a]">{p.brief}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
              <p className="text-[12px] leading-none text-muted">
                <span className="text-[#b0b0b0]">Already an affiliate?</span> Access your dashboard →
              </p>
              <div className="ml-auto flex items-center gap-2">
                <Link
                  href="/affiliate/login"
                  className="inline-flex h-7 items-center rounded-[8px] border border-white/10 px-3 text-[12px] font-medium text-white transition-colors hover:bg-white/[0.06]"
                >
                  Sign in
                </Link>
                <Link
                  href="/affiliate"
                  className="inline-flex h-7 items-center gap-1 rounded-[8px] bg-white px-3 text-[12px] font-medium text-black transition-colors hover:bg-[#e8e8e8]"
                >
                  Become an affiliate <ArrowUpRight size={11} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
