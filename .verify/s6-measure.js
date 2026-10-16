/* S6 measurement harness — read-only, talks to the already-running dev server.
   Usage: node .verify/s6-measure.js [--shot outfile.png] */
const { chromium } = require("playwright");
const path = require("path");

const URL = "http://127.0.0.1:4321";

const inPage = () => {
  function lines(el) {
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
    const groups = [];
    for (const t of tops) {
      if (groups.length === 0 || t - groups[groups.length - 1] > 4) groups.push(t);
    }
    return groups.length;
  }

  const q = document.querySelector("#testimonial blockquote");
  if (!q) return null;
  const cs = getComputedStyle(q);
  const fig = document.querySelector("#testimonial figure");
  const avatar = document.querySelector("#testimonial figure img");
  const pager = document.querySelector('#testimonial [role="group"]');
  const cap = document.querySelector("#testimonial figcaption");

  const rect = (e) => {
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return {
      x: Math.round(r.left * 10) / 10,
      right: Math.round(r.right * 10) / 10,
      w: Math.round(r.width * 10) / 10,
    };
  };

  return {
    text: q.textContent.slice(0, 34),
    fontSize: cs.fontSize,
    lineHeight: cs.lineHeight,
    letterSpacing: cs.letterSpacing,
    fontWeight: cs.fontWeight,
    fontFamily: cs.fontFamily.split(",")[0],
    lines: lines(q),
    measure: rect(q),
    column: rect(fig ? fig.children[1] : null),
    avatar: rect(avatar),
    byline: rect(cap),
    pager: rect(pager),
    sectionH: Math.round(
      document.querySelector("#testimonial").getBoundingClientRect().height,
    ),
  };
};

(async () => {
  const shotIdx = process.argv.indexOf("--shot");
  const shot = shotIdx > -1 ? process.argv[shotIdx + 1] : null;

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  const results = [];
  for (let i = 0; i < 3; i++) {
    if (i > 0) {
      await page
        .locator('#testimonial [role="group"] button')
        .nth(i)
        .click();
      await page.waitForTimeout(450);
    }
    results.push(await page.evaluate(inPage));
  }

  console.log(JSON.stringify(results, null, 2));
  console.log(
    "\nSUMMARY",
    results
      .map((r, i) => `slide${i + 1}: ${r.fontSize} / ${r.lines} lines / w=${r.measure.w}`)
      .join("  |  "),
  );

  if (shot) {
    const sec = page.locator("#testimonial");
    await sec.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.resolve(shot),
      clip: await sec.boundingBox(),
    });
    console.log("screenshot ->", path.resolve(shot));
  }

  await browser.close();
})();