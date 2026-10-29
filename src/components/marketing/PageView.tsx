import Link from "next/link";
import { MarketingShell } from "@/components/layout/MarketingShell";
import { ButtonLink, Container, Eyebrow, Section } from "@/components/ui/primitives";
import type { MarketingPage } from "@/lib/marketing/pages";

export function PageView({
  page,
  ctaHref = "/contact",
  ctaLabel = "Start a project",
  children,
}: {
  page: MarketingPage;
  ctaHref?: string;
  ctaLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <MarketingShell>
      <main>
        <section className="relative overflow-hidden border-b border-line bg-page">
          <div className="pointer-events-none absolute inset-0 blueprint opacity-[0.10] [mask-image:linear-gradient(to_bottom,#000_20%,transparent_80%)]" />
          <Container className="relative py-[72px] md:py-[96px]">
            <Eyebrow>{page.eyebrow}</Eyebrow>
            <h1 className="t-h2-mobile md:t-h2 mt-4 max-w-[820px] text-hi">{page.title}</h1>
            <p className="t-body-lg mt-5 max-w-[560px] text-body">{page.lede}</p>
            <div className="mt-8 flex flex-wrap gap-2">
              <ButtonLink href={ctaHref}>{ctaLabel}</ButtonLink>
              <ButtonLink href="/" variant="ghost">
                Back to home
              </ButtonLink>
            </div>
          </Container>
        </section>

        <Section className="bg-page">
          <Container>
            <div className={`grid grid-cols-1 gap-4 ${page.aside ? "lg:grid-cols-[1fr_320px]" : "md:grid-cols-2 lg:grid-cols-3"}`}>
              <div className={`grid grid-cols-1 gap-4 ${page.aside ? "md:grid-cols-2 lg:col-span-1" : "md:grid-cols-2 lg:grid-cols-3 lg:col-span-full"}`}>
                {page.blocks.map((b) => (
                  <article
                    key={b.title}
                    className="rounded-[12px] border border-line bg-surface-1 p-6"
                  >
                    <h2 className="text-[16px] font-medium tracking-[-0.02em] text-hi">{b.title}</h2>
                    <p className="mt-2 text-[13px] leading-[1.65] text-muted">{b.body}</p>
                  </article>
                ))}
              </div>
              {page.aside && (
                <aside className="h-fit rounded-[12px] border border-line bg-surface-3 p-6">
                  <p className="t-eyebrow text-brand-teal">{page.aside.title}</p>
                  <ul className="mt-4 space-y-2 text-[13px] leading-[1.6] text-muted">
                    {page.aside.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-2 size-1 shrink-0 rounded-full bg-brand-teal" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </aside>
              )}
            </div>
            {children}
          </Container>
        </Section>
      </main>
    </MarketingShell>
  );
}

export function PageList({
  links,
}: {
  links: { href: string; title: string; body: string }[];
}) {
  return (
    <ul className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2">
      {links.map((l) => (
        <li key={l.href}>
          <Link
            href={l.href}
            className="block rounded-[12px] border border-line bg-surface-1 p-5 transition-colors hover:border-line"
          >
            <p className="text-[15px] font-medium tracking-[-0.02em] text-hi">{l.title}</p>
            <p className="mt-1 text-[13px] leading-[1.55] text-muted">{l.body}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
