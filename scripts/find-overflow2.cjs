const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 900 } });
  await p.goto("http://127.0.0.1:4321", { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(900);
  const res = await p.evaluate(() => {
    const clipped = (el) => {
      let n = el.parentElement;
      while (n && n !== document.body) {
        const cs = getComputedStyle(n);
        if (cs.overflowX !== "visible" || cs.overflowY !== "visible") return true;
        n = n.parentElement;
      }
      return false;
    };
    const out = [];
    document.querySelectorAll("*").forEach((el) => {
      if (el.tagName === "svg" || el.ownerSVGElement) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || clipped(el)) return;
      if (r.right > 391 || r.left < -1) {
        out.push({
          tag: el.tagName,
          cls: (el.className?.toString?.() || "").slice(0, 90),
          x: Math.round(r.x), right: Math.round(r.right), w: Math.round(r.width),
        });
      }
    });
    return out.slice(0, 12);
  });
  console.log(JSON.stringify(res, null, 1));
  await b.close();
})();
