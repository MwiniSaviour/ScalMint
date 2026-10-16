"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import {
  ButtonLink,
  CategoryChip,
  Container,
  Heading2,
  Section,
} from "@/components/ui/primitives";
import { staggerContainer, staggerItem } from "@/lib/motion";

/* ============================================================================
   S10 — JOURNAL

   A three-card editorial row under a section headline.

   GEOMETRY. Re-measured from design_reference/section10.png rather than
   eyeballed. The crop is 869px wide for a 1440px viewport, so every value below
   is image-px x 1.6736 (1200 / 717 measured container). Edges were located by
   column-brightness scans, not by eye:

     · container           x 71 -> 789   = 1200  (--spacing-container)
     · H2 ink top          y 113; line box bottom y 144
     · header button       x 720 -> 789, y 115 -> 139
     · card row top        y 202          -> 97px below the H2 line box
     · featured card       x 70 -> 357    = 480 wide
     · small card 2        x 438 -> 602   = 274 wide
     · small card 3        x 622 -> 786   = 274 wide
     · gap 1 (wide)        81 img px      = 136
     · gap 2 (tight)       20 img px      =  33
     · featured thumb      y 202 -> 383   = 480 x 303  (aspect 1.58)
     · small thumb         y 202 -> 301   = 274 x 166  (aspect 1.65)
     · featured title      ink y 410 / 428 -> 30px line pitch
     · small title         ink y 332 / 346 / 359 -> 23px line pitch
     · title -> chips      37 img px      =  37 (featured) / 32 (small)

   THE ASYMMETRY IS THE POINT. A plain `grid-cols-3` would read as a template;
   what makes this row look editorial is that the two small cards huddle
   together while the featured card stands alone. `justify-between` alone cannot
   express that — it distributes free space into EQUAL gaps — so the featured
   track is authored 104px wider than its card and that difference is given back
   as `margin-right`. Tracks then total 1132 of the 1200 container, leaving 68px
   of free space, i.e. the measured 34px gaps, and the featured card's real gap
   becomes 104 + 34 = 138.

   ALL THREE THUMBNAILS SHARE ONE ASPECT (measured 1.58 and 1.65, both ~16:10)
   so `aspect-[16/10]` is used rather than three magic numbers.

   NOT REPRODUCED. The reference carries a large bright-green (#26E600)
   hand-written annotation — "random glitch card popup" with a long bracket —
   drawn ON the screenshot during design review. It is a note to the designer,
   not part of the design, and is absent here. --color-green exists in the token
   file for that same reason and is deliberately unused.
   ========================================================================== */

/** Section headline — editorial, about what ScalMint actually publishes. */
const HEADING = "Field notes from the systems we build";

type Article = {
  readonly id: string;
  readonly title: string;
  readonly href: string;
  readonly image: string;
  readonly alt: string;
  /** Rendered widths the browser may pick a source for. */
  readonly sizes: string;
  /** Featured cards span the row at `md` and set their own type scale. */
  readonly featured: boolean;
  readonly categories: readonly string[];
};

const ARTICLES: readonly Article[] = [
  {
    id: "re-keying",
    title: "What it actually costs to re-key the same data four times",
    href: "/journal/the-cost-of-re-keying-the-same-data-four-times",
    image: "/graphics/blog-01.jpg",
    alt: "Close-up of a machined bronze surface catching warm amber light",
    sizes: "(min-width: 1280px) 480px, 100vw",
    featured: true,
    categories: ["Platform team", "Engineering"],
  },
  {
    id: "first-response",
    title: "Automating the first response without losing the human",
    href: "/journal/automating-the-first-response-without-losing-the-human",
    image: "/graphics/blog-02.jpg",
    alt: "A slow drift of smoke crossing a dark neutral background",
    sizes: "(min-width: 1280px) 274px, (min-width: 768px) 50vw, 100vw",
    featured: false,
    categories: ["Practice", "AI"],
  },
  {
    id: "structured-data",
    title: "Structured data before dashboards",
    href: "/journal/structured-data-before-dashboards",
    image: "/graphics/blog-03.jpg",
    alt: "A crystalline structure lit from one side against a dark background",
    sizes: "(min-width: 1280px) 274px, (min-width: 768px) 50vw, 100vw",
    featured: false,
    categories: ["Data", "Engineering"],
  },
];

export default function S10Journal() {
  const reduce = useReducedMotion();

  return (
    <Section id="journal" className="overflow-hidden bg-page">
      <Container>
        {/* H2 sits left, the outline button is flush to the container's right
            edge and dropped ~19px so its box top clears the H2's cap line. */}
        <motion.div
          initial={reduce ? false : "hidden"}
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer(0.08)}
          className="flex flex-wrap items-start justify-between gap-x-10 gap-y-6"
        >
          <motion.div variants={staggerItem} className="min-w-0 max-w-[760px]">
            <Heading2>{HEADING}</Heading2>
          </motion.div>

          <motion.div variants={staggerItem} className="shrink-0 lg:mt-5">
            <ButtonLink href="/journal" variant="ghost">
              See all articles
            </ButtonLink>
          </motion.div>
        </motion.div>

        {/* See the geometry note above: the 584px track minus a 104px margin is
            the measured 480px card, and `justify-between` turns the 68px of
            slack into the measured 34px gutters. */}
        <motion.ul
          initial={reduce ? false : "hidden"}
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer(0.09, 0.1)}
          className="mt-24 grid grid-cols-1 items-start gap-y-14 md:grid-cols-2 md:gap-x-7 xl:grid-cols-[584px_274px_274px] xl:justify-between xl:gap-x-0 xl:gap-y-0"
        >
          {ARTICLES.map((article) => (
            <motion.li
              key={article.id}
              variants={staggerItem}
              className={
                article.featured
                  ? "md:col-span-2 xl:col-span-1 xl:mr-[104px]"
                  : undefined
              }
            >
              <article className="group">
                <Link
                  href={article.href}
                  className="block rounded-[5px] focus-visible:outline-offset-8"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[5px] border border-line opacity-90 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Image
                      src={article.image}
                      alt={article.alt}
                      fill
                      sizes={article.sizes}
                      loading="lazy"
                      className="object-cover"
                    />
                  </div>

                  {/* `t-h3` is 21px and matches the featured card's measured 30px
                      line pitch. The 274px cards measure a 23px pitch, which is
                      a ~17px face — `t-h3` would wrap them to four lines, so
                      they get the measured size directly. No token covers 17px. */}
                  <h3
                    className={
                      article.featured
                        ? "t-h3 mt-10 text-hi"
                        : "mt-10 text-[17px] leading-[1.38] tracking-[-0.01em] text-hi"
                    }
                  >
                    {article.title}
                  </h3>

                  <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
                    {article.categories.map((category) => (
                      <CategoryChip key={category}>{category}</CategoryChip>
                    ))}
                  </div>
                </Link>
              </article>
            </motion.li>
          ))}
        </motion.ul>
      </Container>
    </Section>
  );
}