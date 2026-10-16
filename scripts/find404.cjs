const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const bad = new Set();
  p.on("response", (r) => { if (r.status() >= 400) bad.add(`${r.status()} ${r.url()}`); });
  p.on("requestfailed", (r) => bad.add(`FAILED ${r.url()} :: ${r.failure()?.errorText}`));
  await p.goto("http://127.0.0.1:4321", { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1500);
  // scroll to trigger lazy images
  const h = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 700) { await p.evaluate(v => window.scrollTo(0,v), y); await p.waitForTimeout(180); }
  await p.waitForTimeout(1200);
  console.log([...bad].join("\n") || "no failed requests");
  await b.close();
})();
