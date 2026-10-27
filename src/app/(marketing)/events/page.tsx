import type { Metadata } from "next";
import { PageView } from "@/components/marketing/PageView";
import { PAGES } from "@/lib/marketing/pages";

export const metadata: Metadata = {
  title: "Events",
  description: PAGES.events.lede,
  alternates: { canonical: "https://scalmint.com/events" },
};

export default function Page() {
  return <PageView page={PAGES.events} />;
}
