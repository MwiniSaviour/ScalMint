import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageView } from "@/components/marketing/PageView";
import { LEGAL } from "@/lib/marketing/pages";

export function generateStaticParams() {
  return Object.keys(LEGAL).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = LEGAL[slug];
  if (!page) return {};
  return {
    title: page.title,
    description: page.lede,
    alternates: { canonical: `https://scalmint.com/legal/${slug}` },
  };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = LEGAL[slug];
  if (!page) notFound();
  return <PageView page={page} ctaHref="mailto:privacy@scalmint.com" ctaLabel="Email legal" />;
}
