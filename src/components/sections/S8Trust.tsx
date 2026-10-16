"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  BadgeCheck,
  FileCheck,
  HeartPulse,
  KeyRound,
  Landmark,
  ScanSearch,
  ScrollText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { Container, Eyebrow, Section } from "@/components/ui/primitives";
import { staggerContainer, staggerItem } from "@/lib/motion";

/* ============================================================================
   S8 — TRUST / COMPLIANCE + TWO SIGNAL CARDS

   One section, three cards. The reference's two crops are alternate scroll
   states of the same band, not two sections.

   Geometry re-measured from design_reference/section8*.png rather than eyeballed.
   The screenshots are 845-851px wide captures of a 1440px viewport, so the
   scale factor is 1200 / 719 measured container = 1.669. Every number below is
   in CSS px at 1440 and cross-checked against a token:

     · container            1197 measured -> 1200  (--spacing-container)
     · card 2/3 width        586 measured -> 586   (1200 - 28 gap, halved)
     · gap between cards     30 measured -> 28
     · card 2/3 height      591 measured -> 598
     · card 1 height        450 measured -> 450
     · card padding          60-62 measured on all three cards
     · card body            16px, measured line pitch 23.6 -> leading 1.47
     · badge                41.5 measured -> 42 tall; badge gap 8; rows centred
     · video tile          257x151 measured -> 270x142 per the layout spec

   The reference's own typeface renders these titles at ~21px of ink height,
   but the token contract standardises card titles on `t-card` (26px). The
   token wins: consistency across sections beats matching one screenshot's
   font metrics.

   HONESTY. ScalMint is not audited, certified or accredited. The badge list
   therefore names *standards the work is engineered against*, and the card
   body says so in as many words. No badge claims a certificate.
   ========================================================================== */

const EYEBROW = "Security and compliance by default";

/* --- Card 1 copy ---------------------------------------------------------- */

const TRUST_TITLE = "Built for trust at scale";

/* The qualifier is load-bearing: without it the badge row reads as a
   certification wall, which would be a false claim about a real company. */
const TRUST_BODY =
  "We engineer to the frameworks below rather than claim them. Each control is written into the architecture and the logs, so your audit starts from evidence.";

/* Badge rows wrap 3 / 3 / 2 in a centred flex — the reference's rows centre on
   their own axis rather than aligning to the text column. */
type Badge = {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
};

const BADGES: readonly Badge[] = [
  { id: "soc2", label: "SOC 2 controls", icon: ShieldCheck },
  { id: "iso27001", label: "ISO 27001", icon: Landmark },
  { id: "iso42001", label: "ISO 42001", icon: BadgeCheck },
  { id: "gdpr", label: "GDPR & CCPA", icon: ScrollText },
  { id: "hipaa", label: "HIPAA-ready builds", icon: HeartPulse },
  { id: "dpa", label: "Signed DPAs", icon: FileCheck },
  { id: "pentest", label: "Pen-testing", icon: ScanSearch },
  { id: "sso", label: "SSO / SAML", icon: KeyRound },
];

const BADGE_LIST =
  "Illustration: eight standards ScalMint builds and engineers against.";

/* --- Card 2/3 copy --------------------------------------------------------- */

const SIGNAL_TITLE = "Signals in, systems out";
const SIGNAL_BODY =
  "Every engagement starts from patterns we have already proved — typed contracts, tested integrations, and a review gate before production.";

const PRIVACY_TITLE = "Privacy without the paperwork";
const PRIVACY_BODY =
  "PII is redacted at the point of capture and access is scoped per role, so sensitive data never reaches a prompt, a transcript or an unapproved vendor.";

const SIGNAL_ILLUSTRATION =
  "Illustration: many client inputs — discovery calls, support chat and live product telemetry — converging into one wireframe data stack, drawn as a floating disc over a narrowing mesh of records.";

const PRIVACY_ILLUSTRATION =
  "Illustration: a redacted conversation transcript beside a video-call tile, standing for sensitive data being stripped out at capture and shared only with the people scoped to it.";

/* ============================================================================
   CARD 2 — FLOATING INPUTS GRAPHIC

Measured, in the graphic box's own coordinates (the box is 466 x 316):

     disc          cx 206  cy 74   rx 201  ry 30.5
     cone          cx 323  top  cy 108 rx 83.5 ry 12.5
                        bottom cy 166 rx 41.75 ry 6.25
     orb           cx 339  cy 45   r 17
     chat cards    (214, 0) 248w x 212 · (112, 62) 232w x 190 · (3, 91) 250w x 206
     cube cluster  x 48..128  y 140..222

   SCALING. The artwork is authored once on a fixed 466 x 316 grid and every
   absolute offset is emitted in container-query units against a `@container`
   wrapper locked to that aspect ratio. One rule of arithmetic then holds at
   every viewport: at the 466px design width the numbers land on the measured
   pixels exactly, and below it the whole composition — cards, cubes, orb —
   scales as one unit instead of spilling out of a 278px-wide card at 390px.
   Stating raw pixel offsets and adding a media query would have meant
   maintaining the cascade twice for a diagram that is simply a picture.

   THE CONE. A truncated cone, not a cylinder: the mesh narrows from 167px to
   84px across 58px of height, which is why it reads as depth rather than as a
   barrel. It is generated, not traced — RIBS vertical lines interpolated
   linearly between the two rims, and RINGS ellipses interpolated the same way.
   Tone is graded by `facing`, the same device S7 uses for its globe: a line
   near the silhouette is edge-on and sees almost nothing, one at the centre
   faces the viewer squarely. That single number spreads four existing wire
   tokens across the mesh and stops it reading as a flat grey blob.

   The disc is a constant tone rather than a graded one — a circle seen from
   this angle is uniformly foreshortened, so there is nothing to grade by. It
   is also the only stroke bright enough to survive being partly veiled by the
   translucent chat cards, so it carries the composition.
   ========================================================================== */

const VIEW_W = 466;
const VIEW_H = 316;

/** Design px -> container-query units against the VIEW_W-wide box. */
function cq(px: number): string {
  return `${Math.round((px / VIEW_W) * 10000) / 100}cqw`;
}

const DISC = { cx: 206, cy: 74, rx: 201, ry: 30.5 } as const;
const CONE = { cx: 323, topRy: 12.5, bottomRy: 6.25, top: 108, bottom: 166, topRx: 83.5, bottomRx: 41.75 } as const;

const RIBS = 13;
const RINGS = 7;

/* Four existing tones spanning #0B0B0B -> #171717. --color-wire (#131313) is
   the peak; --color-surface-3 marks the handful of lines facing most squarely. */
const WIRE_TONES = [
  "var(--color-wire-dim)",
  "var(--color-grid)",
  "var(--color-wire)",
  "var(--color-surface-3)",
] as const;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** `weight` is how squarely a line faces the viewer: 0 at the silhouette, 1
    dead centre. Thresholds are loose about the brightest tier so the mid tone
    stays the plurality rather than an outlier. */
function toneFor(weight: number): string {
  const w = Math.min(1, Math.max(0, weight));
  const index = w < 0.26 ? 0 : w < 0.5 ? 1 : w < 0.92 ? 2 : 3;
  return WIRE_TONES[index];
}

type Rib = { readonly key: string; readonly x1: number; readonly x2: number; readonly stroke: string };

/* Built once at module scope: deterministic, so server and client agree and
   the geometry is never recomputed on render. */
const CONE_RIBS: readonly Rib[] = Array.from({ length: RIBS }, (_, i) => {
  /* u runs -1 (left silhouette) -> +1 (right silhouette) and folds at 0. */
  const u = (i - (RIBS - 1) / 2) / ((RIBS - 1) / 2);
  const spread = Math.abs(u);
  /* cos of the angle this rib subtends — 0 at the silhouette, 1 at centre. */
  const facing = Math.sqrt(Math.max(0, 1 - spread * spread));

  return {
    key: `rib-${i}`,
    x1: CONE.cx + spread * CONE.topRx,
    x2: CONE.cx + spread * CONE.bottomRx,
    stroke: toneFor(facing),
  };
});

type Ring = { readonly key: string; readonly cy: number; readonly rx: number; readonly ry: number; readonly stroke: string };

const CONE_RINGS: readonly Ring[] = Array.from({ length: RINGS }, (_, j) => {
  const t = (j + 1) / (RINGS + 1);
  return {
    key: `ring-${j}`,
    cy: lerp(CONE.top, CONE.bottom, t),
    rx: lerp(CONE.topRx, CONE.bottomRx, t),
    ry: lerp(CONE.topRy, CONE.bottomRy, t),
    /* A horizontal ring is uniformly foreshortened, so it is graded only by
       how deep into the cone it sits. */
    stroke: toneFor(1 - t * 0.55),
  };
});

/* The orb and its data points. The orb is drawn in a layer ABOVE the chat
   cards (the reference shows it crisp, with a card edge passing behind it)
   while the disc and cone sit below them (the reference shows the mesh
   visibly dimmed where it passes under a card). Two layers, one SVG each. */
const ORB = { cx: 339, cy: 45, r: 17 } as const;

const ORB_POINTS: readonly { readonly key: string; readonly cx: number; readonly cy: number; readonly r: number; readonly tone: string }[] = [
  { key: "p1", cx: 300, cy: 34, r: 2.6, tone: "var(--color-blue)" },
  { key: "p2", cx: 372, cy: 44, r: 2.4, tone: "var(--color-blue)" },
  { key: "p3", cx: 322, cy: 70, r: 2.6, tone: "var(--color-blue)" },
  { key: "p4", cx: 356, cy: 64, r: 2.2, tone: "var(--color-blue)" },
  { key: "p5", cx: 388, cy: 33, r: 2.3, tone: "var(--color-red)" },
  { key: "p6", cx: 366, cy: 24, r: 2, tone: "var(--color-red)" },
  { key: "p7", cx: 283, cy: 51, r: 2.2, tone: "var(--color-red)" },
];

/** Disc + cone. Below the chat cards. */
function SignalStack() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 h-full w-full"
    >
      {/* 20% white is one deliberate step above the card surface — the only
          stroke in this graphic bright enough to read through the cards. */}
      <ellipse cx={DISC.cx} cy={DISC.cy} rx={DISC.rx} ry={DISC.ry} fill="none" stroke="rgb(255 255 255 / 0.2)" strokeWidth={1} vectorEffect="non-scaling-stroke" />

      {CONE_RINGS.map((ring) => (
        <ellipse key={ring.key} cx={CONE.cx} cy={ring.cy} rx={ring.rx} ry={ring.ry} fill="none" stroke={ring.stroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}

      {CONE_RIBS.map((rib) => (
        <line key={rib.key} x1={rib.x1} y1={CONE.top} x2={rib.x2} y2={CONE.bottom} stroke={rib.stroke} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

/** Orb + data points. Above the chat cards. */
function SignalOrb() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 h-full w-full"
    >
      <defs>
        <radialGradient id="s8-orb-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-red)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--color-red)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="s8-orb-fill" cx="34%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#ff7f59" />
          <stop offset="55%" stopColor="var(--color-red)" />
          <stop offset="100%" stopColor="var(--color-warm-deep)" />
        </radialGradient>
      </defs>

      {/* Cheap bloom: a radial gradient rather than a blur filter, which would
          cost a filter pass per frame on a below-the-fold element. */}
      <circle cx={ORB.cx} cy={ORB.cy} r={ORB.r * 2.1} fill="url(#s8-orb-glow)" />
      <circle cx={ORB.cx} cy={ORB.cy} r={ORB.r} fill="url(#s8-orb-fill)" />

      {ORB_POINTS.map((point) => (
        <circle key={point.key} cx={point.cx} cy={point.cy} r={point.r} fill={point.tone} />
      ))}
    </svg>
  );
}

/* ============================================================================
   FLOATING CUBES

   Sampled from the reference: nine flat squares, 6-22px, stepping up-right
   across an 80 x 82px envelope. Blue and red-orange dominate with two pale
   squares --bg-body among them -- and two of the smallest carry a hairline
   border so they do not disappear into the card surface.
   ========================================================================== */

type Cube = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly className: string;
};

const CUBES: readonly Cube[] = [
  { id: "c1", x: 96, y: 140, size: 22, className: "bg-red" },
  { id: "c2", x: 62, y: 160, size: 12, className: "bg-red" },
  { id: "c3", x: 76, y: 162, size: 18, className: "bg-blue" },
  { id: "c4", x: 52, y: 178, size: 10, className: "bg-blue" },
  { id: "c5", x: 100, y: 176, size: 15, className: "bg-body" },
  { id: "c6", x: 120, y: 184, size: 8, className: "border border-line bg-body" },
  { id: "c7", x: 56, y: 200, size: 12, className: "bg-blue" },
  { id: "c8", x: 116, y: 206, size: 7, className: "border border-line bg-blue" },
  { id: "c9", x: 48, y: 216, size: 6, className: "bg-red" },
];

function CubeCluster() {
  return (
    <div aria-hidden="true" className="absolute inset-0">
      {CUBES.map((cube) => (
        <span
          key={cube.id}
          className={`absolute block ${cube.className}`}
          style={{ left: cq(cube.x), top: cq(cube.y), width: cq(cube.size), height: cq(cube.size) }}
        />
      ))}
    </div>
  );
}

/* ============================================================================
   CARD 2 — FLOATING CHAT CARDS

   Three panels cascading down-left, translucent so the cone reads dimly
   through them. Each is bottom-aligned: the avatar row is pinned to the
   panel's foot and the space above it stays empty, which is what makes the
   stack read as glass rather than as cards with content in them.
   ========================================================================== */

type ChatCard = {
  readonly id: string;
  readonly title: string;
  readonly owner: string;
  readonly avatar: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly duration: number;
  readonly delay: number;
};

const CHAT_CARDS: readonly ChatCard[] = [
  { id: "calls", title: "Discovery calls", owner: "Marcus Reyes", avatar: "avatar-05.jpg", x: 214, y: 0, width: 248, height: 212, duration: 7.4, delay: 0 },
  { id: "chat", title: "Support chat", owner: "Aisha Karim", avatar: "avatar-04.jpg", x: 112, y: 62, width: 232, height: 190, duration: 8.6, delay: 0.9 },
  { id: "usage", title: "Usage data", owner: "Elena Duarte", avatar: "avatar-01.jpg", x: 3, y: 91, width: 250, height: 206, duration: 9.8, delay: 1.8 },
];

function FloatingChatCards({ still }: { still: boolean }) {
  return (
    <>
      {CHAT_CARDS.map((card, index) => (
        <motion.div
          key={card.id}
          className="absolute flex flex-col justify-end rounded-[8px] border border-line bg-surface-2/40 p-3 lg:p-[18px]"
          style={{ left: cq(card.x), top: cq(card.y), width: cq(card.width), height: cq(card.height), zIndex: 20 + index }}
          /* Only the vertical drift is driven here. Framer owns `transform` on
             this node, so nothing inside it may also animate `y`. */
          animate={still ? undefined : { y: [0, -7, 0] }}
          transition={still ? undefined : { duration: card.duration, repeat: Infinity, ease: "easeInOut", delay: card.delay }}
        >
          <div className="flex items-center gap-[9px]">
            {/* The name sits in text directly beside the portrait, so the image
                adds no information and is correctly marked decorative. */}
            <Image src={`/people/${card.avatar}`} alt="" aria-hidden="true" width={18} height={18} loading="lazy" sizes="18px" className="size-[18px] shrink-0 rounded-full object-cover" />
            <p className="min-w-0">
              <span className="block truncate text-[12px] leading-[1.35] font-medium text-[#ededed]">{card.title}</span>
              <span className="block truncate text-[11px] leading-[1.35] text-[#8a8a8a]">{card.owner}</span>
            </p>
          </div>
        </motion.div>
      ))}
    </>
  );
}

/* ============================================================================
   CARD 3 — REDACTED TRANSCRIPT + VIDEO TILE

   Transcript card 420 x 292 at the box origin; video tile 270 x 142 at
   right:0 / top:137px, so it overlaps the transcript's lower-right corner
   and truncates the second speaker's line — which is the whole point of the
   illustration. The tile sits on #161616, so the source image has to be dark
   or the frame reads as a bright hole in the card.
   ========================================================================== */

const TILE_W = 270;
const TILE_H = 142;

type Turn = {
  readonly id: string;
  readonly speaker: string;
  readonly avatar: string;
  readonly lines: readonly { readonly text: string; readonly redacted?: boolean }[];
};

/* Invented mock data, no real person or address. The redaction chip is the
   subject of the illustration, so it is a real <span>, not a glyph. */
const TRANSCRIPT: readonly Turn[] = [
  {
    id: "customer",
    speaker: "Customer",
    avatar: "avatar-09.jpg",
    lines: [
      { text: "Please resend the order form to" },
      { text: "", redacted: true },
      { text: "— finance needs it loaded before Friday." },
    ],
  },
  {
    id: "lead",
    speaker: "Account lead",
    avatar: "avatar-11.jpg",
    lines: [{ text: "Sent. It's in the shared folder and the request is logged." }],
  },
];

function RedactedTranscript({ still }: { still: boolean }) {
  return (
    <>
      <div className="absolute left-0 top-0 z-10 rounded-[8px] border border-line bg-surface-2/30 p-4 lg:p-[22px]" style={{ width: cq(420), height: cq(292) }}>
        {TRANSCRIPT.map((turn, index) => (
          <div key={turn.id} className={index === 0 ? "" : "mt-4 lg:mt-[22px]"}>
            <div className="flex items-center gap-[9px]">
              <Image src={`/people/${turn.avatar}`} alt="" aria-hidden="true" width={18} height={18} loading="lazy" sizes="18px" className="size-[18px] shrink-0 rounded-full object-cover" />
              <p className="text-[14px] leading-none font-medium text-[#ededed]">{turn.speaker}</p>
            </div>

            <div className="mt-[10px] text-[14px] leading-[1.45] text-[#c9c9c9]">
              {turn.lines.map((line, lineIndex) => (
                <p key={lineIndex}>
                  {line.text}
                  {line.redacted === true && (
                    <span className="mx-[3px] inline-block rounded-[2px] border border-line-node bg-surface-2 px-[5px] py-[1px] align-baseline font-mono text-[11px] leading-[1.3] text-[#e8e8e8]">
                      redacted
                    </span>
                  )}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <motion.div
        className="absolute right-0 z-20 overflow-hidden rounded-[8px] border border-[#1e1e1e] bg-[#161616]"
        style={{ top: cq(137), width: cq(TILE_W), height: cq(TILE_H) }}
        animate={still ? undefined : { y: [0, 5, 0] }}
        transition={still ? undefined : { duration: 7.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      >
        <Image
          src="/people/video-tile-04.jpg"
          alt="Illustrative video-call tile"
          width={TILE_W}
          height={TILE_H}
          loading="lazy"
          sizes="270px"
          /* The source is 1600x900 and the tile is 1.9:1, so cover crops. The
             focal point is pinned to the face rather than the centre crop. */
          className="size-full object-cover object-[36%_34%]"
        />
      </motion.div>
    </>
  );
}

/* ============================================================================
   BADGE ROW
   ========================================================================== */

function BadgeRow() {
  return (
    <>
      <p className="sr-only">{BADGE_LIST}</p>
      <ul className="flex flex-wrap justify-center gap-2">
        {BADGES.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id} className="badge inline-flex h-[42px] items-center gap-2 px-3">
              <Icon size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-[#b4b4b4]" />
              <span className="text-[14px] leading-none tracking-[-0.01em] text-[#ededed]">{item.label}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/* ============================================================================
   SECTION
   ========================================================================== */

export default function S8Trust() {
  const reduce = useReducedMotion();
  const still = reduce === true;

  return (
    <Section id="trust" className="overflow-hidden bg-page">
      {/* The recurring "system of record" motif, fading out behind the trust
          card's top edge. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[280px] wire-rects" />

      <Container className="relative z-10">
        {/* ---------------------------------------------------------- CARD 1 */}
        {/* Content is vertically centred in a fixed-height box: the reference
            leaves ~176px of air above and below a 98px block, so the height is
            a property of the card rather than of its copy. `min-h` keeps the
            floor without clipping the paragraph when it reflows. */}
        <motion.div
          initial={still ? false : "hidden"}
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer(0.08)}
          className="card flex min-h-[450px] flex-col justify-center p-8 lg:px-[60px] lg:py-[64px]"
        >
          <div className="grid gap-y-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-center lg:gap-x-[72px]">
            <motion.div variants={staggerItem}>
              <Eyebrow>{EYEBROW}</Eyebrow>
              <h2 className="t-card mt-6 text-hi">{TRUST_TITLE}</h2>
              <p className="mt-5 max-w-[340px] text-[16px] leading-[1.47] text-[#8a8a8a]">{TRUST_BODY}</p>
            </motion.div>

            <motion.div variants={staggerItem}>
              <BadgeRow />
            </motion.div>
          </div>
        </motion.div>

        {/* ------------------------------------------------------- CARDS 2/3 */}
        <div className="mt-[28px] grid grid-cols-1 gap-[28px] min-[1024px]:grid-cols-2">
          {/* -------------------------------------------------------- CARD 2 */}
          <motion.article
            initial={still ? false : "hidden"}
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer(0.09)}
            className="card flex min-h-[598px] flex-col p-8 lg:px-[60px] lg:pb-[72px]"
          >
            <p className="sr-only">{SIGNAL_ILLUSTRATION}</p>

            <motion.div variants={staggerItem} className="@container relative aspect-[466/316] w-full shrink-0 overflow-hidden">
              <SignalStack />
              <CubeCluster />
              <FloatingChatCards still={still} />
              <SignalOrb />
            </motion.div>

            <div className="mt-auto">
              <div className="h-px w-full bg-line-soft" />
              <motion.h3 variants={staggerItem} className="t-card mt-[30px] text-hi">
                {SIGNAL_TITLE}
              </motion.h3>
              <motion.p variants={staggerItem} className="mt-[14px] max-w-[340px] text-[16px] leading-[1.47] text-[#8a8a8a]">
                {SIGNAL_BODY}
              </motion.p>
            </div>
          </motion.article>

          {/* -------------------------------------------------------- CARD 3 */}
          <motion.article
            initial={still ? false : "hidden"}
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer(0.09, 0.09)}
            className="card flex min-h-[598px] flex-col p-8 lg:px-[60px] lg:pb-[72px]"
          >
            <p className="sr-only">{PRIVACY_ILLUSTRATION}</p>

            <motion.div variants={staggerItem} className="@container relative aspect-[466/316] w-full shrink-0">
              <RedactedTranscript still={still} />
            </motion.div>

            <div className="mt-auto">
              <div className="h-px w-full bg-line-soft" />
              <motion.h3 variants={staggerItem} className="t-card mt-[30px] text-hi">
                {PRIVACY_TITLE}
              </motion.h3>
              <motion.p variants={staggerItem} className="mt-[14px] max-w-[340px] text-[16px] leading-[1.47] text-[#8a8a8a]">
                {PRIVACY_BODY}
              </motion.p>
            </div>
          </motion.article>
        </div>
      </Container>
    </Section>
  );
}