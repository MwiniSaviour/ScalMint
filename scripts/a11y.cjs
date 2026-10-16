const { chromium } = require("playwright");
const srgb = (c) => { c /= 255; return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); };
const lum = ([r,g,b]) => 0.2126*srgb(r)+0.7152*srgb(g)+0.0722*srgb(b);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("http://127.0.0.1:4321", { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1200);

  const audit = await p.evaluate(() => {
    const out = { headings: [], imagesNoAlt: [], emptyLinks: [], btnNoName: [], iframeNoTitle: 0, dupIds: [] };
    document.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach(h =>
      out.headings.push({ tag: h.tagName, text: (h.textContent||"").trim().slice(0,40) }));
    document.querySelectorAll("img").forEach(i => { if (i.getAttribute("alt") === null) out.imagesNoAlt.push(i.src.slice(-40)); });
    document.querySelectorAll("a").forEach(a => {
      const t = (a.textContent||"").trim();
      if (!t && !a.getAttribute("aria-label") && !a.querySelector("[aria-label]")) out.emptyLinks.push(a.getAttribute("href"));
    });
    document.querySelectorAll("button").forEach(bt => {
      const t = (bt.textContent||"").trim();
      if (!t && !bt.getAttribute("aria-label")) out.btnNoName.push(bt.className.slice(0,50));
    });
    out.iframeNoTitle = [...document.querySelectorAll("iframe")].filter(f=>!f.title).length;
    const ids = {}; document.querySelectorAll("[id]").forEach(e => { ids[e.id] = (ids[e.id]||0)+1; });
    out.dupIds = Object.entries(ids).filter(([,n]) => n>1).map(([k])=>k);
    return out;
  });

  console.log("H1 count:", audit.headings.filter(h=>h.tag==="H1").length);
  const order = audit.headings.map(h=>h.tag).join(" ");
  console.log("heading order:", order);
  console.log("images missing alt:", audit.imagesNoAlt.length, audit.imagesNoAlt);
  console.log("links w/o accessible name:", audit.emptyLinks.length, audit.emptyLinks.slice(0,5));
  console.log("buttons w/o accessible name:", audit.btnNoName.length, audit.btnNoName.slice(0,5));
  console.log("duplicate ids:", audit.dupIds);

  // contrast on the main text tokens
  const ratios = await p.evaluate(() => {
    const parse = (s) => s.match(/\d+(\.\d+)?/g).slice(0,3).map(Number);
    const lin = (v) => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); };
    const L = (rgb) => 0.2126*lin(rgb[0])+0.7152*lin(rgb[1])+0.0722*lin(rgb[2]);
    const bg = [10,10,10];
    const probe = (sel) => {
      const el = document.querySelector(sel); if (!el) return null;
      const rgb = parse(getComputedStyle(el).color);
      const a = L(rgb)+0.05, bb = L(bg)+0.05;
      return { sel, color: getComputedStyle(el).color, ratio: +(Math.max(a,bb)/Math.min(a,bb)).toFixed(2) };
    };
    return ["h1","main p","footer a","header a"].map(probe).filter(Boolean);
  });
  console.log("contrast vs #0A0A0A:");
  ratios.forEach(r => console.log(`  ${r.ratio>=4.5?"AA ":r.ratio>=3?"AA-lg":"LOW"} ${r.ratio}  ${r.sel}  ${r.color}`));

  // keyboard: tab to first 6 stops
  const tabs = [];
  for (let i=0;i<6;i++){ await p.keyboard.press("Tab"); tabs.push(await p.evaluate(()=>{ const a=document.activeElement; return a.tagName+":"+((a.textContent||"").trim().slice(0,22)||a.getAttribute("aria-label")||""); })); }
  console.log("first tab stops:", tabs);
  await b.close();
})();
