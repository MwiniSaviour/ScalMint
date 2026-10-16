const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("http://127.0.0.1:4321", { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(2500);
  const info = await p.evaluate(() => {
    const sec = document.querySelector("main > section");
    const out = [];
    sec.querySelectorAll("h1, p, a, li, span").forEach((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (!el.textContent?.trim()) return;
      out.push({
        tag: el.tagName,
        text: el.textContent.trim().slice(0, 38),
        w: Math.round(r.width), h: Math.round(r.height),
        x: Math.round(r.x), y: Math.round(r.y),
        opacity: cs.opacity,
        transform: cs.transform === "none" ? "none" : "set",
        visibility: cs.visibility,
        color: cs.color,
        fontSize: cs.fontSize,
      });
    });
    return { sectionRect: sec.getBoundingClientRect().toJSON(), items: out.slice(0, 22) };
  });
  console.log(JSON.stringify(info, null, 1));
  await b.close();
})();
