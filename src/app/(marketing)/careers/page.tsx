import type { Metadata } from "next";
import { PageView } from "@/components/marketing/PageView";
import { PAGES } from "@/lib/marketing/pages";

export const metadata: Metadata = {
  title: "Careers",
  description: PAGES.careers.lede,
  alternates: { canonical: "https://scalmint.com/careers" },
};

export default function Page() {
  return <PageView page={PAGES.careers} ctaHref="mailto:careers@scalmint.com" ctaLabel="Send a portfolio" />;
}
