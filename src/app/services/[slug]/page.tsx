import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageView } from "@/components/marketing/PageView";
import { SERVICE_BY_SLUG, SERVICES } from "@/lib/marketing/pages";

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = SERVICE_BY_SLUG.get(slug);
  if (!page) return {};
  return {
    title: page.title,
    description: page.lede,
    alternates: { canonical: `https://scalmint.com/services/${slug}` },
  };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = SERVICE_BY_SLUG.get(slug);
  if (!page) notFound();
  return <PageView page={page} />;
}
