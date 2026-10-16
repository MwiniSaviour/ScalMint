const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("http://127.0.0.1:4321", { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(900);
  const r = await p.evaluate(() => {
    const srgb=(v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
    const L=(c)=>0.2126*srgb(c[0])+0.7152*srgb(c[1])+0.0722*srgb(c[2]);
    const parse=(s)=>s.match(/\d+(\.\d+)?/g).slice(0,3).map(Number);
    const effBg=(el)=>{let n=el;while(n){const c=getComputedStyle(n).backgroundColor;if(c&&!/rgba\(0, 0, 0, 0\)|transparent/.test(c)){const a=(c.match(/[\d.]+\)$/)?.[0].replace(")","")||"1");if(parseFloat(a)>0.5)return parse(c);}n=n.parentElement;}return [10,10,10];};
    const rows=[];
    const targets=[...document.querySelectorAll("footer nav a, footer li a, footer p, footer span, main .t-eyebrow, main blockquote, main article a")].slice(0,40);
    for(const el of targets){
      const t=(el.textContent||"").trim(); if(!t) continue;
      const fg=parse(getComputedStyle(el).color), bg=effBg(el);
      const a=L(fg)+0.05, c=L(bg)+0.05;
      const ratio=+(Math.max(a,c)/Math.min(a,c)).toFixed(2);
      const px=parseFloat(getComputedStyle(el).fontSize);
      const large = px>=24 || (px>=18.66 && +getComputedStyle(el).fontWeight>=700);
      rows.push({t:t.slice(0,26), ratio, px:Math.round(px), pass: ratio>=(large?3:4.5)});
    }
    const fails = rows.filter(x=>!x.pass);
    return { total: rows.length, fails: fails.slice(0,12), lowest: rows.sort((x,y)=>x.ratio-y.ratio).slice(0,8) };
  });
  console.log("checked", r.total, "text nodes");
  console.log("AA failures:", r.fails.length);
  r.fails.forEach(f=>console.log("  FAIL", f.ratio, `${f.px}px`, `"${f.t}"`));
  console.log("lowest 8 ratios:");
  r.lowest.forEach(f=>console.log(`  ${f.pass?"ok  ":"LOW "} ${String(f.ratio).padStart(6)} ${String(f.px).padStart(3)}px  "${f.t}"`));
  await b.close();
})();
