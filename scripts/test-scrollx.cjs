const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 768, 1440]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    await p.goto("http://127.0.0.1:4321", { waitUntil: "load" });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(900);
    const r = await p.evaluate(() => {
      const de = document.documentElement;
      window.scrollTo(300, 0);
      const moved = window.scrollX;
      window.scrollTo(0, 0);
      return {
        clientW: de.clientWidth,
        docScrollW: de.scrollWidth,
        bodyScrollW: document.body.scrollWidth,
        bodyOverflowX: getComputedStyle(document.body).overflowX,
        canScrollX: moved,
      };
    });
    console.log(w + "px ->", JSON.stringify(r));
    await p.close();
  }
  await b.close();
})();
