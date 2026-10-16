const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("http://127.0.0.1:4321", { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  const out = await p.evaluate(() => {
    // measure inside the LIVE page so we use the real loaded Inter at real size
    const probe = document.createElement("span");
    probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;font-family:var(--font-inter);font-weight:500;letter-spacing:-0.03em;font-size:64px;line-height:1.05;";
    document.body.appendChild(probe);
    const w = (t) => { probe.textContent = t; return Math.round(probe.getBoundingClientRect().width); };
    const s2col = 364, s7col = 379;
    const s2 = ["Many inputs.","One system.","Many tools.","Many sources.","Scattered input","Many systems","Many signals","One system","One source"];
    const s7 = ["Nothing re-keyed.","One record.","No re-keying.","Nothing lost.","One truth.","Nothing retyped.","No duplicates.","No re-typing.","Nothing twice","Nothing repeated"];
    return {
      s2: s2.map(t => ({ t, w: w(t), col: s2col, fit: w(t) <= s2col })),
      s7: s7.map(t => ({ t, w: w(t), col: s7col, fit: w(t) <= s7col })),
    };
  });
  const fmt = (label, rows) => { console.log(label); rows.forEach(r => console.log(`  ${String(r.w).padStart(4)}px ${r.fit ? "FIT " : "OVER"}  "${r.t}"`)); };
  fmt("S2 (column 364px, 64px Inter 500 -0.03em):", out.s2);
  fmt("S7 (column 379px, 64px Inter 500 -0.03em):", out.s7);
  await b.close();
})();
