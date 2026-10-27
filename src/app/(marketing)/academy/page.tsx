import type { Metadata } from "next";
import { PageView } from "@/components/marketing/PageView";
import { PAGES } from "@/lib/marketing/pages";

export const metadata: Metadata = {
  title: "Academy",
  description: PAGES.academy.lede,
  alternates: { canonical: "https://scalmint.com/academy" },
};

export default function Page() {
  return <PageView page={PAGES.academy} />;
}
