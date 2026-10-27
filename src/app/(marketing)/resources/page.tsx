import type { Metadata } from "next";
import { PageList, PageView } from "@/components/marketing/PageView";
import { PAGES } from "@/lib/marketing/pages";

export const metadata: Metadata = {
  title: "Resources",
  description: PAGES.resources.lede,
  alternates: { canonical: "https://scalmint.com/resources" },
};

export default function Page() {
  return (
    <PageView page={PAGES.resources}>
      <PageList
        links={[
          { href: "/insights", title: "Insights", body: "Short, sourced notes." },
          { href: "/journal", title: "Journal", body: "Longer build logs." },
          { href: "/changelog", title: "Changelog", body: "What shipped." },
          { href: "/help", title: "Help centre", body: "Get unblocked." },
        ]}
      />
    </PageView>
  );
}
