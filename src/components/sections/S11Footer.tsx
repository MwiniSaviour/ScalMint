"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import {
  ArrowUpRight,
  BetaChip,
  ButtonLink,
  Container,
  Eyebrow,
  Heading2,
} from "@/components/ui/primitives";
import { staggerContainer, staggerItem } from "@/lib/motion";

/* ============================================================================
   S11 — CLOSING CTA + FOOTER

   One section, two states. design_reference/section11.png and section11b.png are
   alternate scroll positions of the SAME band: `11` shows the CTA plus the top
   of the footer, `11b` the full footer. They are not two sections.

   GEOMETRY. Both crops are ~856-869px wide captures of a 1440px viewport, so
   the scale factor is 1200 / 717 measured container = 1.673 (`11`) and
   1200 / 724 = 1.657 (`11b`). Edges were located by column-brightness scans:

     · container            x 70 -> 787 img  = 1200  (--spacing-container)
     · footer column x      70 / 250 / 435 / 617 img
                             -> 116 / 414 / 721 / 1022, i.e. a ~308 pitch
     · columns + gaps       4 x 276 + 3 x 32 = 1200 exactly, so this is the
                             standard container, not a bespoke grid
     · H2 line 1            x 70 -> 466 img = 399 -> 667 real px at 64px/1.05
     · H2 line pitch        43 img px -> 72 (the `t-h2` 64 x 1.05 = 67 token
                             plus the face's own cap-to-cap offset)
     · buttons -> columns   118 img px (11) / 124 img px (11b) -> ~200-205
     · eyebrow -> link 1    19 img px -> 31.5 ~ 32
     · link row pitch       18 img px -> 29.8 ~ 32
     · link cap height      ~8 img px against the H2's ~30 -> 17px of face
     · promo card           133 x 66 img -> 220 x 109 measured; the written
                             spec's 227 x 132 (1.72:1) is used as given
     · card -> caption      22 img px -> 36
     · caption line pitch   ~14.5 img px -> 24
     · columns -> bottom bar ~166 img px in `11b`; the spec's tighter 159px is
                             used, so the band closes without the reference's
                             near-empty gap

   NO FOOTER RULE. The reference separates the link stack from the bottom bar
   with 160-270px of nothing at all — no hairline, no tonal shift. Adding one
   would be inventing structure the design does not have.

   `section-pad` supplies the only bottom breathing room (112px), so there is no
   extra bottom pad here: the reference shows none beyond the bar, and doubling
   the rhythm at the page's last section is the "cramped vs. doubled" failure
   the brief warns about.

   MOTION. `staggerContainer`/`staggerItem` drive every entrance rather than
   `riseIn`, because `riseIn` returns an `animate` target and this section sits
   below seven others — a mount animation would finish long before the reader
   ever reached it. `whileInView` is the only honest trigger down here.
   ========================================================================== */

/* ---------------------------------------------------------------------------
   CLOSING CTA
   ------------------------------------------------------------------------- */

/* Authored as two explicit lines at the measured 64px, both verified to fit the
   ~670px measure: "Bring us the problem" runs ~599px and "we'll build the
   system" ~616px in Inter at 64px with -0.03em. Below 1280 the spans stop being
   blocks and the headline reflows naturally, with the trailing space inside the
   first span rejoining the words. */
const CTA_LINES = ["Bring us the problem", "we\u2019ll build the system"] as const;

/* A near-invisible texture that should stay felt rather than seen. The mask sits
   on the WRAPPER and `wire-rects` on the child so the two multiply: the inner
   radial fade removes the grid's own edges, the outer linear fade top-loads it
   into the band above the headline instead of letting it reach the type. */
const WIRE_MASK =
  "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.55) 34%, rgba(0,0,0,0) 72%)";

/* ---------------------------------------------------------------------------
   FOOTER LINK COLUMNS
   ------------------------------------------------------------------------- */

type FooterLink = {
  readonly label: string;
  readonly href: string;
  /** Pre-1.0 offering — rendered with the shared BetaChip, as in the nav menu. */
  readonly beta?: boolean;
  /** Open roles — rendered as a small mono count badge. */
  readonly count?: number;
};

/* ScalMint's actual lines of business (see the nav mega-menu), then the two
   commercial routes and the industry index. Model fine-tuning is the only
   offering the rest of the site still marks beta, so it is the only one marked
   here — a chip on every row would stop meaning anything. */
const SERVICE_LINKS: readonly FooterLink[] = [
  { label: "Software development", href: "/services/software-development" },
  { label: "AI automation", href: "/services/ai-automation" },
  { label: "Structured data", href: "/services/structured-data" },
  { label: "Model fine-tuning", href: "/services/model-fine-tuning", beta: true },
  { label: "Managed operations", href: "/services/managed-operations" },
  { label: "Pricing", href: "/pricing" },
  { label: "Enterprise", href: "/enterprise" },
  { label: "Industries", href: "/industries" },
];

const RESOURCE_LINKS: readonly FooterLink[] = [
  { label: "Insights", href: "/insights" },
  { label: "Blog", href: "/journal" },
  { label: "Changelog", href: "/changelog" },
  { label: "Community", href: "/community" },
  { label: "Events", href: "/events" },
  { label: "Help centre", href: "/help" },
  { label: "Academy", href: "/academy" },
  { label: "Careers", href: "/careers", count: 3 },
];

/* The reference carries two links here and so does this. `intent` is a query
   parameter on the canonical /contact route, so both resolve to the same page
   and the two entries can still tell the sales team which door was knocked on. */
const CONTACT_LINKS: readonly FooterLink[] = [
  { label: "Request a demo", href: "/contact?intent=demo" },
  { label: "Contact sales", href: "/contact?intent=sales" },
];

const LEGAL_LINKS: readonly { readonly label: string; readonly href: string }[] = [
  { label: "Cookie preferences", href: "/legal/cookies" },
  { label: "Trust center", href: "/legal/trust" },
  { label: "Legal and privacy", href: "/legal/privacy" },
];

const COPYRIGHT = "\u00a9 2026 ScalMint";

/* The bottom bar is set wider and looser than an eyebrow. `t-eyebrow` already
   carries `letter-spacing: 0.12em` as an @utility, and AGENTS.md is explicit
   that a conflicting className on one of those silently loses — so this style
   is authored outright instead of trying to push the token around. */
const BAR =
  "font-mono text-[11px] uppercase leading-none tracking-[0.2em] transition-colors duration-150";

/* 17px is measured from the cap-height ratio against the 64px H2 (~8 of ~30
   image px). No token covers it: `t-ui` is 14px and `t-body-lg` is 21px, and
   either would be wrong by a visible amount at the foot of the page. */
const FOOTER_LINK =
  "text-[17px] leading-[1.2] tracking-[-0.01em] text-footer-link transition-colors duration-150 hover:text-hi";

/* BetaChip is hardcoded to the word "Beta", so the count badge restates its
   metrics rather than forking a near-copy of it. */
const COUNT_CHIP =
  "t-eyebrow inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] bg-surface-2 px-1.5 text-[9px] leading-none text-muted tabular-nums";

/* ============================================================================
   PROMO CARD — 227 x 132, 1.72:1, radius 8.

   The reference's card carries a photoreal 3D object branded to its author.
   Reproducing that would put another company's brand mark on ScalMint's page,
   so the white form here is drawn instead: an abstract wireframe lathe, which
   is also the "system of record" motif the rest of the page already speaks in.

   Tone is graded by `facing` — the same device S8 uses for its cone. A line at
   the silhouette is edge-on and sees almost nothing; one at the centre faces
   the viewer squarely. One number then spreads a single hue across three alphas
   and stops the form reading as a flat grey blob.
   ========================================================================== */

/* Sampled from the reference card rather than taken from the token file:
   --color-violet is #a855f7, and these are the two stops the card actually
   renders. A diagonal sweep that brightens off-centre and falls away at both
   corners reads as a lit surface rather than a flat swatch. */
const CARD_GRADIENT =
  "linear-gradient(135deg, #a350f3 0%, #b05af9 48%, #a350f3 100%)";

const GLYPH = { cx: 113.5, top: 20, bottom: 112, maxR: 27 } as const;

/** Horizontal rings, skipping both poles where the profile collapses. */
const RING_COUNT = 9;
/** Meridian positions as a fraction of the local radius. */
const MERIDIANS = [-0.86, -0.52, 0, 0.52, 0.86] as const;
/** Concentric contours behind the form, run off both card edges like the
    reference's. White this low lifts the purple by a shade without ever
    competing with the line art in front of it. */
const CONTOURS: readonly { rx: number; alpha: number }[] = [
  { rx: 100, alpha: 0.09 },
  { rx: 80, alpha: 0.11 },
  { rx: 60, alpha: 0.14 },
];

/** Lathe profile: radius at normalised height t, 0 at the top pole, 0 at the
    bottom. `sin^0.6` gives the closed silhouette; the sine term biases the
    bulge below the equator, which is what stops the form reading as a leaf. */
function profileRadius(t: number): number {
  return (
    GLYPH.maxR *
    Math.pow(Math.sin(Math.PI * t), 0.6) *
    (1 - 0.14 * Math.sin(2 * Math.PI * t))
  );
}

function profileY(t: number): number {
  return GLYPH.top + t * (GLYPH.bottom - GLYPH.top);
}

/** How squarely a line faces the viewer: 0 at the silhouette, 1 dead centre. */
function facing(u: number): number {
  return Math.sqrt(Math.max(0, 1 - u * u));
}

/** The two silhouette curves closed into one outline. Every meridian of a lathe
    converges on both poles, so the path starts and ends on the axis. */
const GLYPH_OUTLINE = (() => {
  const N = 36;
  const points: string[] = [];

  for (let i = 0; i <= N; i += 1) {
    const t = i / N;
    const r = profileRadius(t);
    points.push(`${(GLYPH.cx - r).toFixed(2)} ${profileY(t).toFixed(2)}`);
  }
  for (let i = N; i >= 0; i -= 1) {
    const t = i / N;
    const r = profileRadius(t);
    points.push(`${(GLYPH.cx + r).toFixed(2)} ${profileY(t).toFixed(2)}`);
  }

  return `M${points.join("L")}Z`;
})();

type Ring = {
  readonly key: string;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
};

/* Built once at module scope: deterministic, so the server and the client emit
   identical path data and no geometry is recomputed on every render. */
function geom(n: number) {
  return Math.round(n * 1e4) / 1e4;
}

const GLYPH_RINGS: readonly Ring[] = Array.from(
  { length: RING_COUNT },
  (_, j) => {
    const t = (j + 1) / (RING_COUNT + 1);
    const r = profileRadius(t);
    return {
      key: `ring-${j}`,
      cy: geom(profileY(t)),
      rx: geom(r),
      /* 0.3 is a ~17 degree elevation: enough for the ring to read as a circle
         in perspective, not enough to fight the verticality of the form. */
      ry: geom(r * 0.3),
    };
  },
);

type Meridian = {
  readonly key: string;
  readonly u: number;
  readonly points: string;
  readonly alpha: number;
};

const GLYPH_MERIDIANS: readonly Meridian[] = MERIDIANS.map((u) => {
  const N = 28;
  const points: string[] = [];
  for (let i = 0; i <= N; i += 1) {
    const t = i / N;
    points.push(
      `${(GLYPH.cx + u * profileRadius(t)).toFixed(2)} ${profileY(t).toFixed(2)}`,
    );
  }

  /* Alpha rises toward the centre meridian. The thresholds are loose so the mid
     tones stay the plurality rather than an outlier. */
  const f = facing(u);
  const alpha = f < 0.62 ? 0.26 : f < 0.94 ? 0.44 : 0.72;

  return { key: `meridian-${u}`, u, points: `M${points.join("L")}`, alpha };
});

/** Decorative line art. The card's link name comes from the caption below it,
    so the whole drawing is hidden from assistive technology. */
function PromoGlyph() {
  return (
    <svg
      viewBox="0 0 227 132"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 h-full w-full"
    >
      {CONTOURS.map((contour) => (
        <ellipse
          key={`contour-${contour.rx}`}
          cx={GLYPH.cx}
          cy={(GLYPH.top + GLYPH.bottom) / 2}
          rx={contour.rx}
          ry={contour.rx * 0.42}
          fill="none"
          stroke="#ffffff"
          strokeOpacity={contour.alpha}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {GLYPH_RINGS.map((ring) => (
        <ellipse
          key={ring.key}
          cx={GLYPH.cx}
          cy={ring.cy}
          rx={ring.rx}
          ry={ring.ry}
          fill="none"
          stroke="#ffffff"
          strokeOpacity={0.34}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {GLYPH_MERIDIANS.map((meridian) => (
        <path
          key={meridian.key}
          d={meridian.points}
          fill="none"
          stroke="#ffffff"
          strokeOpacity={meridian.alpha}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {/* The silhouette is the one stroke bright enough to survive being partly
          veiled by the mesh behind it, so it carries the whole form. */}
      <path
        d={GLYPH_OUTLINE}
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.95}
        strokeWidth={1.2}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

const PROMO = {
  eyebrow: "Field note",
  href: "/journal/building-the-intake-agent",
} as const;

/* Split so the name cannot break across the two measured lines. Measured in
   Inter at 15px, "Building the intake agent with" is ~205px and "Dana Okonjo,
   head of AI" ~168px, both inside the 276px column. */
const PROMO_CAPTION_BEFORE = "Building the intake agent with";
const PROMO_CAPTION_NAME = "Dana Okonjo";
const PROMO_CAPTION_AFTER = ", head of AI";

/* ---------------------------------------------------------------------------
   LINK COLUMN
   ------------------------------------------------------------------------- */

function LinkColumn({
  label,
  ariaLabel,
  items,
}: {
  label: string;
  ariaLabel: string;
  items: readonly FooterLink[];
}) {
  return (
    <nav aria-label={ariaLabel}>
      <Eyebrow>{label}</Eyebrow>

      {/* h-8 per row is the measured 32px pitch, and it also centres a 17px
          face and an 18px chip on the same axis without per-item offsets. */}
      <ul className="mt-8">
        {items.map((item) => (
          <li key={item.href} className="flex h-8 items-center">
            <Link href={item.href} className={FOOTER_LINK}>
              {item.label}
            </Link>
            {item.beta === true && <BetaChip className="ml-2" />}
            {item.count !== undefined && (
              <span className={`${COUNT_CHIP} ml-2`}>{item.count}</span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ============================================================================
   SECTION
   ========================================================================== */

export default function S11Footer() {
  const reduce = useReducedMotion();
  const still = reduce === true;

  return (
    <footer className="section-pad relative overflow-hidden bg-page">
      {/* The recurring "system of record" motif, top-loaded into the band above
          the headline. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[300px] overflow-hidden"
        style={{ WebkitMaskImage: WIRE_MASK, maskImage: WIRE_MASK }}
      >
        <div className="absolute inset-0 wire-rects" />
      </div>

      <Container className="relative z-10">
        {/* ------------------------------------------------------ CLOSING CTA */}
        <motion.div
          initial={still ? false : "hidden"}
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer(0.09)}
        >
          <motion.div variants={staggerItem}>
            <Heading2 className="max-w-[670px]">
              {CTA_LINES.map((line, i) => (
                <span key={line} className="min-[1280px]:block">
                  {line}
                  {i < CTA_LINES.length - 1 ? " " : null}
                </span>
              ))}
            </Heading2>
          </motion.div>

          <motion.div variants={staggerItem} className="mt-12 flex flex-wrap items-center gap-2">
            <ButtonLink href="/contact" variant="primary">
              Start a project
            </ButtonLink>
            <ButtonLink href="/contact?intent=sales" variant="ghost">
              Contact sales
            </ButtonLink>
          </motion.div>
        </motion.div>

        {/* ---------------------------------------------------- FOOTER COLUMNS */}
        <motion.div
          initial={still ? false : "hidden"}
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer(0.07)}
          className="mt-[184px] grid grid-cols-1 items-start gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-4"
        >
          <motion.div variants={staggerItem}>
            <LinkColumn
              label="Services"
              ariaLabel="Footer — services"
              items={SERVICE_LINKS}
            />
          </motion.div>

          <motion.div variants={staggerItem}>
            <LinkColumn
              label="Resources"
              ariaLabel="Footer — resources"
              items={RESOURCE_LINKS}
            />
          </motion.div>

          <motion.div variants={staggerItem}>
            <LinkColumn
              label="Contact"
              ariaLabel="Footer — contact"
              items={CONTACT_LINKS}
            />
          </motion.div>

          {/* ------------------------------------------------------ PROMO CARD */}
          <motion.div variants={staggerItem}>
            <Eyebrow>{PROMO.eyebrow}</Eyebrow>

            {/* One link wraps the card and its caption, so the accessible name
                is the sentence a reader would say out loud. `rounded-[10px]`
                lets the global focus ring hug the card and the text together. */}
            <Link
              href={PROMO.href}
              className="group mt-8 block max-w-[276px] rounded-[10px]"
            >
              <div
                className="relative aspect-[227/132] w-[227px] max-w-full overflow-hidden rounded-[8px]"
                style={{ backgroundImage: CARD_GRADIENT }}
              >
                <PromoGlyph />
              </div>

              <p className="mt-9 text-[15px] leading-[1.6] text-hi transition-colors duration-150 group-hover:text-hi">
                {PROMO_CAPTION_BEFORE} {PROMO_CAPTION_NAME}
                {PROMO_CAPTION_AFTER}{" "}
                <ArrowUpRight className="relative top-[1px] ml-0.5" />
              </p>
            </Link>
          </motion.div>
        </motion.div>

        {/* ------------------------------------------------------- BOTTOM BAR */}
        <motion.div
          initial={still ? false : "hidden"}
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          variants={staggerContainer(0.06, 0.1)}
          className="mt-[159px] flex flex-wrap items-center justify-between gap-x-10 gap-y-4"
        >
          <motion.p variants={staggerItem} className={`${BAR} text-footer-legal`}>
            {COPYRIGHT}
          </motion.p>

          <motion.ul
            variants={staggerItem}
            className="flex flex-wrap items-center gap-x-5 gap-y-2"
          >
            {LEGAL_LINKS.map((item, i) => (
              <li key={item.href} className="flex items-center gap-5">
                {/* Decorative only — the links carry their own names, so the
                    separator is hidden rather than read as a bare "dot". */}
                {i > 0 && (
                  <span aria-hidden="true" className="text-muted">
                    &middot;
                  </span>
                )}
                <Link
                  href={item.href}
                  className={`${BAR} text-footer-legal hover:text-muted`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </motion.ul>
        </motion.div>
      </Container>
    </footer>
  );
}
