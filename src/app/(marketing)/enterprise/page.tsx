import type { Metadata } from "next";
import { PageView } from "@/components/marketing/PageView";
import { PAGES } from "@/lib/marketing/pages";

export const metadata: Metadata = {
  title: "Enterprise",
  description: PAGES.enterprise.lede,
  alternates: { canonical: "https://scalmint.com/enterprise" },
};

export default function Page() {
  return <PageView page={PAGES.enterprise} />;
}
