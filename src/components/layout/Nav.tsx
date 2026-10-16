"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ButtonLink } from "@/components/ui/primitives";

/* ---------------------------------------------------------------------------
   Sticky nav. Transparent background, no hairline — the measured samples at
   mid-bar are identical to the page base, so any separator is wrong.
   Pill height 36px, 12px radius, 8px gaps, 24px inline padding.
   Height: 22px offset + 36px pill + 14px breathing room = ~72px.
   ------------------------------------------------------------------------- */

const NAV_ITEMS = [
  { label: "Product", menu: true },
  { label: "Services", menu: false },
  { label: "Industries", menu: false },
  { label: "About", menu: false },
  { label: "Insights", menu: false },
  { label: "Pricing", menu: false },
] as const;

const MENU_GROUPS: { label: string; items: { title: string; desc: string; beta?: boolean }[] }[] = [
  {
    label: "What we build",
    items: [
      {
        title: "Software development",
        desc: "Web, mobile and desktop applications engineered to scale.",
      },
      {
        title: "AI automation",
        desc: "WhatsApp and email receptionists that manage customer chat end to end.",
      },
      {
        title: "Structured data",
        desc: "Business research modelled into usable, queryable data.",
      },
      {
        title: "Model fine-tuning",
        desc: "Models tuned for your specific tasks and your own domain data.",
        beta: true,
      },
      {
        title: "Systems integration",
        desc: "Connect the platforms, data sources and tools you already run.",
      },
      {
        title: "Managed operations",
        desc: "Hosting, monitoring and support that continue after launch.",
      },
    ],
  },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Growing past the lg breakpoint reveals the desktop bar, which owns the
  // mega-menu — leaving the mobile panel open would stack two menus.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (mq.matches) {
        setMobileOpen(false);
        setOpen(false);
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Page scroll closes the panel — it is a hover surface, not a modal.
  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  const hoverOpen = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hoverClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      <div
        className={cn(
          "w-full px-6 transition-colors duration-300",
          scrolled ? "bg-page/85 backdrop-blur-md" : "bg-transparent",
        )}
        onMouseLeave={hoverClose}
      >
        <nav
          className="flex h-[72px] items-center"
          aria-label="Primary"
          onMouseEnter={hoverOpen}
        >
          {/* Wordmark */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5"
            aria-label="ScalMint — home"
          >
            <Image
              src="/brand/mark.png"
              alt=""
              width={28}
              height={37}
              priority
              className="h-[37px] w-auto"
            />
            <span className="text-[17px] font-semibold tracking-[-0.02em]">
              <span className="text-[#e9edf2]">Sca</span>
              <span className="text-brand-teal">lMint</span>
            </span>
          </Link>

          {/* Primary items — desktop only; below lg the panel takes over */}
          <ul className="ml-8 hidden items-center gap-2 lg:flex">
            {NAV_ITEMS.map((item) => {
              if (item.menu) {
                return (
                  <li key={item.label}>
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-haspopup="true"
                      onClick={() => setOpen((v) => !v)}
                      className="nav-pill hover:nav-pill-hover"
                    >
                      {item.label}
                      <svg
                        width="9"
                        height="6"
                        viewBox="0 0 9 6"
                        fill="none"
                        aria-hidden="true"
                        className={cn(
                          "ml-1.5 transition-transform duration-200",
                          open && "rotate-180",
                        )}
                      >
                        <path
                          d="M1 1L4.5 4.5L8 1"
                          stroke="currentColor"
                          strokeWidth="1.2"
                        />
                      </svg>
                    </button>
                  </li>
                );
              }
              return (
                <li key={item.label}>
                  <Link
                    href={`#${item.label.toLowerCase()}`}
                    className="nav-pill hover:nav-pill-hover"
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Right side — desktop */}
          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <Link href="/login" className="nav-pill hover:nav-pill-hover">
              Log in
            </Link>
            <ButtonLink href="/contact" variant="primary" className="ml-1">
              Start a project
            </ButtonLink>
          </div>

          {/* Mobile trigger */}
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
        <div
          id="mobile-nav"
          className="max-h-[calc(100vh-72px)] overflow-y-auto border-t border-line bg-[#1b1b1b] lg:hidden"
        >
          <div className="px-6 py-6">
            <p className="t-eyebrow mb-4 text-eyebrow">Menu</p>
            <ul className="flex flex-col">
              {NAV_ITEMS.map((item) => (
                <li key={item.label} className="border-b border-line/60 last:border-0">
                  <Link
                    href={item.menu ? "/services" : `/#${item.label.toLowerCase()}`}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between py-3.5 text-[15px] text-hi"
                  >
                    {item.label}
                    <ArrowUpRight className="text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
            <p className="t-eyebrow mb-4 mt-8 text-eyebrow">What we build</p>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-4">
              {MENU_GROUPS[0].items.map((item) => (
                <li key={item.title}>
                  <Link
                    href="/services"
                    onClick={() => setMobileOpen(false)}
                    className="block"
                  >
                    <span className="text-[13px] font-medium text-[#f0f0f0]">{item.title}</span>
                    <span className="mt-0.5 block text-[12px] leading-[1.45] text-[#8a8a8a]">
                      {item.desc}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex items-center gap-2">
              <ButtonLink href="/contact" variant="primary" className="flex-1">
                Start a project
              </ButtonLink>
              <ButtonLink href="/login" variant="ghost" className="flex-1">
                Log in
              </ButtonLink>
            </div>
          </div>
        </div>
      )}

      {/* Mega-menu — flat #1B1B1B panel, 2x3 item grid */}
      {open && (
        <div
          className="absolute inset-x-0 top-full hidden lg:block"
          onMouseEnter={hoverOpen}
          onMouseLeave={hoverClose}
        >
          <div className="mx-6 mb-4 max-w-[880px] rounded-[12px] border border-[#1c1c1c] bg-[#1b1b1b] p-7 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8)]">
            {MENU_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="t-eyebrow mb-4 text-eyebrow">{group.label}</p>
                <ul className="grid grid-cols-3 gap-x-6 gap-y-5">
                  {group.items.map((item) => (
                    <li key={item.title}>
                      <Link
                        href="#services"
                        className="group block rounded-[6px] p-2 transition-colors hover:bg-white/[0.04]"
                      >
                        <span className="flex items-center gap-2 text-[13px] font-medium text-[#f0f0f0]">
                          {item.title}
                          {item.beta && (
                            <span className="t-eyebrow inline-flex h-[16px] items-center rounded-[4px] bg-[#1a1a1a] px-1.5 text-[9px] leading-none text-[#959595]">
                              Beta
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block text-[12px] leading-[1.45] text-[#8a8a8a]">
                          {item.desc}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}