# ScalMint — Agent Operating Rules

Project: Next.js 15 App Router marketing site for ScalMint (digital transformation agency).
Reproduces the design in `../design_reference/*.png` at 1440x900.

---

## FORBIDDEN COMMANDS — never run these, under any circumstance

An agent previously ran `npx next dev -p 3111`, which spawned a long-lived dev server
that held a port and had to be killed manually. This is not allowed again.

**NEVER run any command that starts a server or holds a port:**

| Forbidden | Why |
|---|---|
| `npm run dev` | starts a dev server on a port |
| `npx next dev` | same — including with `-p <port>` |
| `npm run start` / `next start` | starts a production server on a port |
| `next dev`, `next start`, `vite`, `serve`, `http-server`, `python -m http.server` | any listener |
| Any `npx next build && next start` combo | starts a server after building |

**NEVER run `npm run build` either** — 11 agents write files concurrently, so a
production build will fail on other agents' half-written sections and produce noise.

### What you MAY run

- `npx tsc --noEmit` — typecheck only. Safe, no port, no writes.
- `npx eslint <your-file>` — lint a single file.
- `npx prettier --check <your-file>`

If you need to verify something visual, **stop and ask the orchestrator.** Do not
self-start a server. The orchestrator runs the build and browser verification centrally,
after all agents have finished.

---

## Parallel agent boundaries

- You own **exactly one** section file. Do not create or edit other `S*.tsx` files.
- These are **READ-ONLY** shared contract files. Editing them causes conflicts:
  - `src/app/globals.css` — the design token contract
  - `src/app/layout.tsx`, `src/app/page.tsx`
  - `src/components/ui/primitives.tsx` — shared components
  - `src/components/layout/Nav.tsx`
  - `src/lib/motion.ts`, `src/lib/utils.ts`
- If you believe a shared file is wrong, **report it** — do not fix it yourself.

### Typecheck noise is expected

`npx tsc --noEmit` compiles the whole project. Other agents' in-progress files may
produce errors. **Only errors in your own file are yours.** Report them, don't chase them.

---

## Design contract (do not re-derive)

`src/app/globals.css` holds every token, reverse-engineered from the reference
screenshots. Use the token classes and utilities; **never hardcode a hex that already
exists as a token.**

Key utilities: `t-hero` · `t-h2-mobile` `md:t-h2` · `t-editorial` · `t-card` · `t-h3` ·
`t-body-lg` · `t-ui` · `t-eyebrow` · `shell` · `section-pad` · `card` · `node-card` ·
`badge` · `btn-base` + `btn-primary`/`btn-ghost` · `nav-pill` · `blueprint` ·
`blueprint-fade-y` · `blueprint-fade-radial` · `wire-rects` · `glow-warm` ·
`glow-violet` · `animate-sparkle` · `animate-marker` · `animate-orb` · `sr-only`

### Custom `@utility` classes cannot be overridden

`btn-base`, `t-h2`, `shell`, `card`, etc. are Tailwind v4 `@utility` classes.
`tailwind-merge` does **not** deduplicate them, so passing a conflicting `className`
will silently do nothing. Compose with wrappers, grid, or `gap` instead of trying to
override sizes or padding.

### Reference-measured geometry

Viewport **1440x900**. Container `max-width: 1200px` with 120px gutters. 4-col grid =
276px col + 32px gap. Buttons are **37px tall with a 12px radius** — NOT
`rounded-full`; the long edges stay straight. Nav pill 36px, radius 12px. H2 is 64px
with `leading-[1.05]` and `tracking-[-0.03em]` — the leading is mandatory, without it
the headline visibly breaks apart.

---

## Content rules

This site is **ScalMint**: software development (web/mobile/desktop), AI automation
(WhatsApp + email receptionists), structured data & business research, AI model
fine-tuning.

The design reference is by a **different company**. Never reuse its copy, product
names, customer names, statistics, or brand marks. Invent fictional clients and
original copy. Never make a factual claim about a real company or real person.

**Never reproduce screenshot-review artefacts** that are annotations, not design:
- the green hand-drawn marker scribble in `section10.png`
- the "comments / changes" markings in `section6-comments-changes.png`
- the mega-menu *open* state in `section1.png` (a second frame, not part of the page)
- anything clipped by the screenshot's crop edge — e.g. the "next card bleeding in"
  at the bottom of `section7.png` is a cropping artefact, not a design element

`b`-suffixed files (`section2b`, `section5b`, `section8b`, `section9b`, `section11b`)
are **alternate scroll states of the same section** — use them to infer motion, not
as separate sections.

---

## Engineering standards

- TypeScript strict. No `any`, no `@ts-ignore`, no unsafe non-null assertions.
- `"use client"` only where interactivity demands it (Framer Motion, scroll, state).
- Accessibility is not optional: semantic elements, real headings, `alt` text,
  `aria-label` on icon-only controls, keyboard-operable carousels, visible focus
  rings, and every interactive state distinguishable **without** animation.
- `prefers-reduced-motion` must be honoured — `globals.css` neutralises CSS animation
  globally, but you must also guard JS-driven scroll and auto-advance.
- Performance: `next/image` with real `width`/`height` and a `sizes` prop;
  `loading="lazy"` below the fold; `preload="none"` on any video below the fold.
- Comments only where the reasoning is non-obvious. Never narrate obvious code.

---

## Assets available in `public/`

- `brand/mark.png` — ScalMint "S" ribbon mark, transparent, aspect 0.748 (taller than wide; size by height)
- `projects/work-01-operasch-home.jpg` … `work-04-pulse-fm.jpg` + `work-0N-lqip.jpg` — 4 case studies, 1600x1000
- `graphics/blog-01.jpg` (dark bronze macro) · `blog-02.jpg` (smoke) · `blog-03.jpg` (crystalline) · `footer-feature.jpg`
- `people/hero-portrait-01.jpg` (true-black bg) · `hero-portrait-02.jpg` · `video-tile-01/04/06.jpg` · `avatar-01/03/04/05/09/10/11.jpg` · `team-01..09.jpg`
- `video/bg-testimonial-01.mp4` — the only video (3.5 MB)

All photography is Pexels-licensed (free commercial use, no attribution).
The project screenshots contain **generated mock data only** — no real client PII.