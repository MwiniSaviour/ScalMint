import type { Metadata } from "next";
import { PageView } from "@/components/marketing/PageView";
import { PAGES } from "@/lib/marketing/pages";

export const metadata: Metadata = {
  title: "Community",
  description: PAGES.community.lede,
  alternates: { canonical: "https://scalmint.com/community" },
};

export default function Page() {
  return <PageView page={PAGES.community} />;
}
