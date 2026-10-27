import type { Metadata } from "next";
import { PageView } from "@/components/marketing/PageView";
import { PAGES } from "@/lib/marketing/pages";

export const metadata: Metadata = {
  title: "Changelog",
  description: PAGES.changelog.lede,
  alternates: { canonical: "https://scalmint.com/changelog" },
};

export default function Page() {
  return <PageView page={PAGES.changelog} />;
}
