import type { Metadata } from "next";
import { PageView } from "@/components/marketing/PageView";
import { PAGES } from "@/lib/marketing/pages";

export const metadata: Metadata = {
  title: "Pricing",
  description: PAGES.pricing.lede,
  alternates: { canonical: "https://scalmint.com/pricing" },
};

export default function Page() {
  return <PageView page={PAGES.pricing} />;
}
