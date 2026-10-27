import type { Metadata } from "next";
import Nav from "@/components/layout/Nav";
import { JsonLd } from "@/components/seo/JsonLd";
import S1Hero from "@/components/sections/S1Hero";
import S2FromNoise from "@/components/sections/S2FromNoise";
import S3Statement from "@/components/sections/S3Statement";
import S4Work from "@/components/sections/S4Work";
import S5Roi from "@/components/sections/S5Roi";
import S6Testimonial from "@/components/sections/S6Testimonial";
import S7SourceOfTruth from "@/components/sections/S7SourceOfTruth";
import S8Trust from "@/components/sections/S8Trust";
import S9VideoStory from "@/components/sections/S9VideoStory";
import S10Journal from "@/components/sections/S10Journal";
import S11Footer from "@/components/sections/S11Footer";

export const metadata: Metadata = {
  alternates: { canonical: "https://scalmint.com" },
};

export default function Home() {
  return (
    <>
      <JsonLd />
      <Nav />
      <main>
        <article className="sr-only">
          <h1>ScalMint — Software, Data and AI for digital transformation</h1>
          <p>
            ScalMint is a software company in Accra, Ghana. We turn business needs into working
            software: web, mobile and desktop applications, AI automation, structured data, and
            model fine-tuning.
          </p>
          <p>
            Products: Nova POS (pos.scalmint.com), Operasch (smartsos.cloud), Jarvis (coming soon),
            JobFinder (coming soon). Affiliate program: https://affiliate.scalmint.com
          </p>
        </article>
        <S1Hero />
        <S2FromNoise />
        <S3Statement />
        <S4Work />
        <S5Roi />
        <S6Testimonial />
        <S7SourceOfTruth />
        <S8Trust />
        <S9VideoStory />
        <S10Journal />
      </main>
      <S11Footer />
    </>
  );
}