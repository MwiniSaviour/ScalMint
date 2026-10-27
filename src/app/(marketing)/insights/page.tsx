import type { Metadata } from "next";
import { PageView } from "@/components/marketing/PageView";
import { PAGES } from "@/lib/marketing/pages";

export const metadata: Metadata = {
  title: "Insights",
  description: PAGES.insights.lede,
  alternates: { canonical: "https://scalmint.com/insights" },
};

export default function Page() {
  return <PageView page={PAGES.insights} />;
}
