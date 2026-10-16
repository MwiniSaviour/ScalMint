import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, ButtonLink } from "@/components/ui/primitives";

/* ---------------------------------------------------------------------------
   Scope for this build is the homepage only, but the nav and footer link to
   ~24 real paths. Rather than ship dead links (or 24 stub pages that each
   need their own SEO metadata), every unmatched path resolves here.

   A small allow-list of genuinely unknown paths still returns a true 404 so
   the site does not answer 200 to arbitrary URLs.
   ------------------------------------------------------------------------- */

const KNOWN_ROOTS = new Set([
  "login",
  "contact",
  "journal",
  "insights",
  "changelog",
  "community",
  "events",
  "help",
  "academy",
  "careers",
  "pricing",
  "enterprise",
  "industries",
  "services",
  "resources",
  "legal",
]);

const SECTION_LABEL: Record<string, string> = {
  login: "Log in",
  contact: "Start a project",
  journal: "Journal",
  insights: "Insights",
  changelog: "Changelog",
  community: "Community",
  events: "Events",
  help: "Help centre",
  academy: "Academy",
  careers: "Careers",
  pricing: "Pricing",
  enterprise: "Enterprise",
  industries: "Industries",
  services: "Services",
  resources: "Resources",
  legal: "Legal",
};

function titleCase(segment: string) {
  return segment
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const root = slug?.[0] ?? "";
  const label = SECTION_LABEL[root] ?? titleCase(root);
  return {
    title: slug?.length ? `${label} — coming soon` : "Not found",
    description:
      "This part of ScalMint is still being built. Return to the homepage to see what we do and how we work.",
    robots: { index: false, follow: true },
  };
}

export default async function Placeholder({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const segments = slug ?? [];

  if (segments.length === 0) notFound();
  const root = segments[0];
  if (!KNOWN_ROOTS.has(root)) notFound();

  const section = SECTION_LABEL[root] ?? titleCase(root);
  const leaf = segments.length > 1 ? titleCase(segments[segments.length - 1]) : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-page px-6 py-32">
      <Container className="max-w-[720px]">
        <p className="t-eyebrow mb-6 text-eyebrow">Coming soon</p>
        <h1 className="t-h2-mobile md:t-h2 text-hi">
          {leaf ? `${section}: ${leaf}` : section}
        </h1>
        <p className="t-body-lg mt-6 max-w-[560px] text-body">
          We are building this part of ScalMint now. Everything below is live and
          running today — if you would rather not wait, start with the work.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-2">
          <ButtonLink href="/">Back to home</ButtonLink>
          <ButtonLink href="/contact" variant="ghost">
            Start a project
          </ButtonLink>
        </div>
        <nav aria-label="Quick links" className="mt-14 border-t border-line pt-6">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {["services", "journal", "insights", "contact"].map((p) => (
              <li key={p}>
                <Link
                  href={`/${p}`}
                  className="t-ui text-muted transition-colors hover:text-hi"
                >
                  {SECTION_LABEL[p]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </main>
  );
}