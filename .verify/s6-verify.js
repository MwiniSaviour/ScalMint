/* Measures the file:// S6 harness: computed font styles + line-box count for
   each quote, and validates that the harness font is byte-identical in metrics
   to the live dev server's Inter. */
const { chromium } = require("playwright");
const path = require("path");

const HARNESS = "file:///" + path.resolve(__dirname, "s6-harness.html").replace(/\\/g, "/");
const LIVE = "http://127.0.0.1:4321";

function linesFn() {
  window.__lines = function lines(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    const tops = [];
    let n;
    while ((n = walker.nextNode())) {
      for (let i = 0; i < n.nodeValue.length; i++) {
        range.setStart(n, i);
        range.setEnd(n, i + 1);
        const r = range.getBoundingClientRect();
        if (r.height === 0) continue;
        tops.push(Math.round(r.top * 2) / 2);
      }
    }
    tops.sort((a, b) => a - b);
    const g = [];
    for (const t of tops) if (!g.length || t - g[g.length - 1] > 4) g.push(t);
    return g.length;
  };
}

(async () => {
  const shot = process.argv[2] || null;
  const browser = await chromium.launch();

  // --- 1. live dev server, for the font-metrics cross-check -----------------
  const live = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await live.goto(LIVE, { waitUntil: "networkidle" });
  await live.evaluate(() => document.fonts.ready);
  const liveRef = await live.evaluate(() => {
    const el = document.querySelector("#testimonial blockquote");
    const cs = getComputedStyle(el);
    // Same string, same metrics the harness will use -> widths must match.
    const probe = document.createElement("span");
    probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font-family:${cs.fontFamily};font-size:44px;font-weight:400;letter-spacing:-0.03em`;
    probe.textContent = "The grid data was already there";
    document.body.appendChild(probe);
    const w = probe.getBoundingClientRect().width;
    probe.remove();
    return { family: cs.fontFamily, probeWidth: Math.round(w * 100) / 100 };
  });

  // --- 2. the harness ------------------------------------------------------
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(HARNESS, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(linesFn);

  const probe = await page.evaluate(() => {
    const p = document.createElement("span");
    p.style.cssText =
      "position:absolute;visibility:hidden;white-space:nowrap;font-family:InterApp;font-size:44px;font-weight:400;letter-spacing:-0.03em";
    p.textContent = "The grid data was already there";
    document.body.appendChild(p);
    const w = p.getBoundingClientRect().width;
    p.remove();
    return { family: "InterApp", probeWidth: Math.round(w * 100) / 100 };
  });

  const measured = await page.evaluate(() =>
    [...document.querySelectorAll("blockquote")].map((q) => {
      const cs = getComputedStyle(q);
      const r = q.getBoundingClientRect();
      return {
        head: q.textContent.slice(1, 26),
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        fontWeight: cs.fontWeight,
        fontFamily: cs.fontFamily.split(",")[0],
        lines: window.__lines(q),
        measureW: Math.round(r.width * 10) / 10,
        em: Math.round((r.width / parseFloat(cs.fontSize)) * 100) / 100,
      };
    }),
  );

  const geo = await page.evaluate(() => {
    const r = (s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return { x: Math.round(b.left), right: Math.round(b.right), w: Math.round(b.width) };
    };
    return { avatar: r(".avatar"), pager: r(".pager"), fig: r(".fig"), section: r("section") };
  });

  console.log("FONT CROSS-CHECK (same string @44px/400/-0.03em)");
  console.log("  live  :", liveRef.family.split(",")[0], liveRef.probeWidth);
  console.log("  harness:", probe.family, probe.probeWidth);
  console.log(
    "  match :",
    Math.abs(liveRef.probeWidth - probe.probeWidth) < 0.5 ? "YES" : "NO (metrics differ)",
  );

  console.log("\nGEOMETRY", JSON.stringify(geo));
  console.log("\nQUOTES");
  for (const [i, m] of measured.entries()) {
    console.log(
      `  slide${i + 1}  ${m.fontSize} / ${m.lineHeight} / ${m.letterSpacing} / w${m.fontWeight} / ${m.fontFamily}  ->  ${m.lines} lines  (measure ${m.measureW}px = ${m.em}em)  "${m.head}…"`,
    );
  }
  const allFive = measured.every((m) => m.lines === 5);
  console.log("\nALL THREE = 5 LINES :", allFive ? "PASS" : "FAIL");

  if (shot) {
    const sec = page.locator("section");
    await sec.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await sec.screenshot({ path: path.resolve(shot) });
    console.log("screenshot ->", path.resolve(shot));
  }

  await browser.close();
  process.exit(allFive ? 0 : 1);
})();