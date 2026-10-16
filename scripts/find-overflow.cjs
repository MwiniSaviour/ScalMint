const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 900 } });
  await p.goto("http://127.0.0.1:4321", { waitUntil: "load" });
  await p.waitForTimeout(1200);
  const res = await p.evaluate(() => {
    const cw = document.documentElement.clientWidth;
    const out = [];
    document.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (cs.position === "fixed") return;
      // find the DEEPEST offenders only (no offending element inside them)
      const hasChildOffender = [...el.children].some((c) => {
        const cr = c.getBoundingClientRect();
        return cr.right > cw + 1;
      });
      if (r.right > cw + 1 && !hasChildOffender) {
        out.push({
          tag: el.tagName,
          cls: (el.className?.toString?.() || "").slice(0,80),
          right: Math.round(r.right),
          w: Math.round(r.width),
          overflowX: cs.overflowX,
          x: Math.round(r.x),
        });
      }
    });
    return { cw, out: out.slice(0, 10) };
  });
  console.log("clientWidth", res.cw);
  console.log(JSON.stringify(res.out, null, 1));
  await b.close();
})();
