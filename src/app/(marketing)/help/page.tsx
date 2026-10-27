import type { Metadata } from "next";
import { PageView } from "@/components/marketing/PageView";
import { PAGES } from "@/lib/marketing/pages";

export const metadata: Metadata = {
  title: "Help centre",
  description: PAGES.help.lede,
  alternates: { canonical: "https://scalmint.com/help" },
};

export default function Page() {
  return <PageView page={PAGES.help} ctaHref="/affiliate/login" ctaLabel="Affiliate sign in" />;
}
