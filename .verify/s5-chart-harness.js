/* S5 chart harness - renders the section's chart markup as a standalone
   file:// page at 1:1 so Playwright can measure real CSS pixels.
   Not part of the app. */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const OUT = __dirname;

const CHART_W = 877;
const CHART_H = 500;
const MARKER_PX = 32;
const NODE_PX = 10;
const LEADER_X = 8;
const LEADER_RUN = 43;
const LEADER_CORNER_X = LEADER_X + LEADER_RUN;
const CHART_MID_Y = CHART_H / 2;
const LINE_STROKE = "#333333";
const LINE_WIDTH = 1.5;
const CHART_NODE = [664, 249];
const MARKER_VERTICES = [0, 2, 3, 4];

const SLIDES = [
  {
    id: "roi",
    stat: "2.3x",
    subline: "Value lands sooner",
    vertices: [
      [90, 289],
      [290, 289],
      [410, 169],
      [610, 169],
      [720, 59],
      [780, 59],
      [830, 59],
    ],
  },
  {
    id: "velocity",
    stat: "3.1x",
    subline: "Ships per quarter",
    vertices: [
      [110, 309],
      [290, 309],
      [430, 169],
      [580, 169],
      [700, 49],
      [790, 49],
      [850, 49],
    ],
  },
  {
    id: "cost",
    stat: "28%",
    subline: "Less manual rework",
    vertices: [
      [150, 349],
      [330, 349],
      [470, 209],
      [630, 209],
      [740, 99],
      [810, 99],
      [870, 99],
    ],
  },
  {
    id: "response",
    stat: "-64%",
    subline: "First reply to a customer",
    vertices: [
      [110, 309],
      [230, 309],
      [360, 179],
      [550, 179],
      [680, 49],
      [810, 49],
      [870, 49],
    ],
  },
];

const fmt = (v) => v.map(([x, y]) => `${x},${y}`).join(" ");
const pct = (v, t) => `${((v / t) * 100).toFixed(4)}%`;

function slideMarkup(s) {
  const leader = fmt([
    [LEADER_X, CHART_MID_Y],
    [LEADER_CORNER_X, CHART_MID_Y],
    s.vertices[0],
  ]);
  const markers = MARKER_VERTICES.map((vi) => {
    const [x, y] = s.vertices[vi];
    return `<span class="mk" style="left:${pct(x, CHART_W)};top:${pct(y, CHART_H)};width:${MARKER_PX}px;height:${MARKER_PX}px;margin-left:${-MARKER_PX / 2}px;margin-top:${-MARKER_PX / 2}px"><span class="core"></span></span>`;
  }).join("");
  return `
  <figure class="chart" data-slide="${s.id}" data-marker-x="${MARKER_VERTICES.map((vi) => s.vertices[vi][0]).join(",")}">
    <div class="blueprint-fade-radial grid-layer"></div>
    <svg viewBox="0 0 ${CHART_W} ${CHART_H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <polyline fill="none" stroke="${LINE_STROKE}" stroke-width="${LINE_WIDTH}" stroke-linejoin="miter" points="${fmt(s.vertices)}"></polyline>
      <polyline fill="none" stroke="${LINE_STROKE}" stroke-width="${LINE_WIDTH}" stroke-linejoin="miter" points="${leader}"></polyline>
      <rect x="${LEADER_X - NODE_PX / 2}" y="${CHART_MID_Y - NODE_PX / 2}" width="${NODE_PX}" height="${NODE_PX}" fill="#ffffff"></rect>
      <rect x="${CHART_NODE[0] - NODE_PX / 2}" y="${CHART_NODE[1] - NODE_PX / 2}" width="${NODE_PX}" height="${NODE_PX}" fill="#ffffff"></rect>
    </svg>
    ${markers}
  </figure>`;
}

const CSS = `
  :root { --color-page:#0A0A0A; --color-surface-1:#101010; --color-line:#262626;
          --color-warm:#e0461b; --color-grid:#0c0c0c; --color-hi:#ffffff; --color-body:#d9d9d9;
          --ease-expo:cubic-bezier(0.22,1,0.36,1); }
  * { box-sizing: border-box; margin: 0; padding: 0; border-color: var(--color-line); }
  html, body { background: var(--color-page); }
  body { font-family: Inter, system-ui, sans-serif; padding: 24px; }
  .chart { position: relative; aspect-ratio: ${CHART_W}/${CHART_H}; width: ${CHART_W}px; overflow: hidden; margin-bottom: 24px; }
  .grid-layer { position: absolute; inset: 0;
    background-image: linear-gradient(to right, var(--color-grid) 1px, transparent 1px),
                      linear-gradient(to bottom, var(--color-grid) 1px, transparent 1px);
    background-size: 83px 83px;
    -webkit-mask-image: radial-gradient(ellipse 60% 70% at 50% 50%, #000, transparent 75%);
    mask-image: radial-gradient(ellipse 60% 70% at 50% 50%, #000, transparent 75%); }
  svg { position: absolute; inset: 0; height: 100%; width: 100%; }
  .mk { position: absolute; display: block; }
  .core { position: absolute; inset: 0; display: block; border-radius: 0; background: var(--color-warm);
          box-shadow: 0 0 28px 0 rgba(224,70,27,0.5); }
  /* animation neutralised so measurements land on the settled 32x32 state */
  @media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; } }
`;

function html() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
${SLIDES.map(slideMarkup).join("")}
</body></html>`;
}

(async () => {
  const file = path.join(OUT, "s5-chart-harness.html");
  fs.writeFileSync(file, html(), "utf8");

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: CHART_W + 80, height: 1200 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  await page.goto("file:///" + file.replace(/\\/g, "/"));
  await page.waitForTimeout(1200);

  for (const s of SLIDES) {
    const el = page.locator(`figure[data-slide="${s.id}"]`);
    await el.screenshot({ path: path.join(OUT, `s5-chart-${s.id}.png`) });
    const box = await el.boundingBox();
    console.log(
      `${s.id}: box ${box.width}x${box.height} @ ${box.x},${box.y}  markerX=[${
        MARKER_VERTICES.map((vi) => s.vertices[vi][0]).join(", ")
      }]`
    );
  }

  await page.screenshot({ path: path.join(OUT, "s5-chart-all.png"), fullPage: true });
  await browser.close();
  console.log("harness done ->", OUT);
})();