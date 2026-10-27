import type { Metadata } from "next";
import { PageView } from "@/components/marketing/PageView";
import { PAGES } from "@/lib/marketing/pages";

export const metadata: Metadata = {
  title: "Industries",
  description: PAGES.industries.lede,
  alternates: { canonical: "https://scalmint.com/industries" },
};

export default function Page() {
  return <PageView page={PAGES.industries} />;
}
