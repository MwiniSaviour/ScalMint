/**
 * S1Hero roster measurement.
 *
 * The server on :4321 is a production build, so source edits are not reflected
 * there. This harness measures the live DOM (real Inter, real Tailwind output)
 * and then applies the edited source's geometry to it in-page, which is an
 * exact simulation of what a rebuild emits — every Tailwind class involved
 * (`max-w-*`, `mx-auto`, `gap-x-*`, `flex-nowrap`, `justify-between`) maps 1:1
 * to a style we set directly, and the SVG attributes are set to the same values
 * the new CLIENTS table holds.
 */
const { chromium } = require("playwright");

const BASE = "http://127.0.0.1:4321";
const OUT = ".verify";

// name, width, size, markWidth — mirrors CLIENTS in S1Hero.tsx
const CANDIDATE = [
  ["HALVARD", 90, 15, 0],
  ["Brightline", 94, 17, 9],
  ["Cadenza", 78, 18, 0],
  ["KESTREL", 88, 15, 10],
  ["Northpoint", 98, 17, 9],
  ["Lumenar", 76, 15, 0],
  ["Vesper Bay", 86, 16, 0],
  ["Trellis", 79, 17, 18],
  ["OSTARA", 80, 17, 0],
];
const UL_MAX = 1020;
const XL_GAP = 24;
const REF_SIZE = 22;
const BASELINE_Y = 21;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });

  await page.goto(BASE, { waitUntil: "load", timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);

  const inspect = () =>
    page.evaluate(() => {
      const ul = document.querySelector('ul[aria-labelledby="s1-roster-label"]');
      const ur = ul.getBoundingClientRect();
      const rows = new Set();
      const items = [...ul.querySelectorAll("li")].map((li) => {
        const lr = li.getBoundingClientRect();
        const svg = li.querySelector("svg");
        const text = li.querySelector("text");
        const tb = text.getBBox();
        const box = +svg.getAttribute("width");
        rows.add(+lr.top.toFixed(1));
        return {
          title: text.textContent,
          left: +lr.left.toFixed(1),
          right: +lr.right.toFixed(1),
          top: +lr.top.toFixed(1),
          h: +lr.height.toFixed(1),
          box,
          inkW: +tb.width.toFixed(1),
          inkOver: +(tb.x + tb.width - box).toFixed(1),
          gapBefore: 0,
        };
      });
      for (let i = 1; i < items.length; i++)
        items[i].gapBefore = +(items[i].left - items[i - 1].right).toFixed(1);
      return {
        ulWidth: +ur.width.toFixed(1),
        ulLeft: +ur.left.toFixed(1),
        ulHeight: +ur.height.toFixed(1),
        rowCount: rows.size,
        tops: [...rows],
        minGap: Math.min(...items.slice(1).map((i) => i.gapBefore)),
        maxGap: Math.max(...items.slice(1).map((i) => i.gapBefore)),
        boxSum: items.reduce((a, i) => a + i.box, 0),
        items,
      };
    });

  const base = await inspect();
  console.log(
    `BASELINE @1440 (current build): ul w=${base.ulWidth} h=${base.ulHeight} ROWS=${base.rowCount} tops=${JSON.stringify(
      [...base.tops],
    )} boxSum=${base.boxSum}`,
  );

  const applyMarks = () =>
    page.evaluate(
      ([marks, ref, by]) => {
        const ul = document.querySelector('ul[aria-labelledby="s1-roster-label"]');
        [...ul.querySelectorAll("li")].forEach((li, i) => {
          const [, w, s, mw] = marks[i];
          const svg = li.querySelector("svg");
          const text = li.querySelector("text");
          const glyph = svg.querySelector(":scope > rect, :scope > path, :scope > circle, :scope > g");
          const scale = s / ref;

          svg.setAttribute("width", String(w));
          svg.setAttribute("viewBox", `0 0 ${w} 28`);
          if (glyph) {
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            glyph.replaceWith(g);
            g.setAttribute("transform", `translate(0 ${by}) scale(${scale}) translate(0 ${-by})`);
            g.appendChild(glyph);
          }
          const oldFs = +text.getAttribute("font-size");
          const tracking = +text.getAttribute("letter-spacing") / oldFs;
          text.setAttribute("font-size", String(s));
          text.setAttribute("letter-spacing", String(+(tracking * s).toFixed(3)));
          const start = text.getAttribute("text-anchor") === "start";
          text.setAttribute("x", String(start ? +((mw + 9) * scale).toFixed(2) : w / 2));
          text.setAttribute("y", String(by));
        });
      },
      [CANDIDATE, REF_SIZE, BASELINE_Y],
    );

  const applyXl = (on) =>
    page.evaluate(
      ([o, max, gap]) => {
        const ul = document.querySelector('ul[aria-labelledby="s1-roster-label"]');
        if (o) {
          ul.style.maxWidth = `${max}px`;
          ul.style.marginInline = "auto";
          ul.style.columnGap = `${gap}px`;
          ul.style.justifyContent = "space-between";
          ul.style.flexWrap = "nowrap";
        } else {
          ul.style.maxWidth = "";
          ul.style.marginInline = "";
          ul.style.columnGap = "";
          ul.style.justifyContent = "";
          ul.style.flexWrap = "";
        }
      },
      [on, UL_MAX, XL_GAP],
    );

  await applyMarks();

  for (const w of [1440, 1366, 1280, 1279, 1024, 768, 390]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(400);
    await applyXl(w >= 1280);
    const r = await inspect();
    console.log(
      `@${w}  ul w=${r.ulWidth} left=${r.ulLeft} h=${r.ulHeight} ROWS=${r.rowCount} tops=${JSON.stringify(
        [...r.tops],
      )} gaps=${r.minGap}..${r.maxGap} boxSum=${r.boxSum}`,
    );
    if (w === 1440) console.table(r.items);
  }

  // hero screenshot with the candidate applied at 1440
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(500);
  await applyXl(true);
  await page.locator('ul[aria-labelledby="s1-roster-label"]').screenshot({
    path: `${OUT}/roster-candidate.png`,
  });
  await page.screenshot({ path: `${OUT}/hero-candidate.png` });

  await browser.close();
})().catch((e) => {
  console.error("HARNESS FAILED:", e.message);
  process.exit(1);
});