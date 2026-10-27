import type { Metadata } from "next";
import { PageView } from "@/components/marketing/PageView";
import { PAGES } from "@/lib/marketing/pages";

export const metadata: Metadata = {
  title: "Journal",
  description: PAGES.journal.lede,
  alternates: { canonical: "https://scalmint.com/journal" },
};

export default function Page() {
  return <PageView page={PAGES.journal} />;
}
