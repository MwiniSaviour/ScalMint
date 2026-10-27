import type { Metadata } from "next";
import { PageList, PageView } from "@/components/marketing/PageView";
import { PAGES, SERVICES } from "@/lib/marketing/pages";

export const metadata: Metadata = {
  title: "Services",
  description: "Software development, AI automation, structured data, model fine-tuning, systems integration and managed operations.",
  alternates: { canonical: "https://scalmint.com/services" },
};

export default function ServicesIndex() {
  return (
    <PageView page={PAGES.services}>
      <PageList
        links={SERVICES.map((s) => ({
          href: `/services/${s.slug}`,
          title: s.title,
          body: s.lede,
        }))}
      />
    </PageView>
  );
}
