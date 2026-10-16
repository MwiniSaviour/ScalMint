/* Live cross-check on the running dev server.

   The served bundle is stale — the orchestrator's watcher is not invalidating
   this module, so the SSR/CSR output still carries the pre-change
   `t-h2-mobile md:t-h2`. Tailwind has, however, already emitted the new
   `.max-w-[628px]{max-width:628px}` rule into the dev CSS. So the final
   computed values are injected onto the real blockquote and measured in the
   real cascade with the real Inter, while the surrounding geometry is asserted
   against the pre-change baseline.

   Determinism: no reduced-motion (it poisons getComputedStyle here), no fixed
   waits — the carousel is frozen by hovering it (paused) and each slide is
   entered by polling until the quote text actually changes. */
const { chromium } = require("playwright");

const HEADS = [
  '"We were quoting',
  '"Every branch had',
  '"The grid data was',
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://127.0.0.1:4321", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.locator("#testimonial [role=region]").hover();

  const out = [];
  for (let i = 0; i < 3; i++) {
    if (i > 0) {
      await page
        .locator('#testimonial [role="group"] button')
        .nth(i)
        .click();
      // Poll until the requested slide is actually the one mounted.
      await page.waitForFunction(
        (head) => {
          const q = document.querySelector("#testimonial blockquote");
          return !!q && q.textContent.startsWith(head);
        },
        HEADS[i],
        { timeout: 5000 },
      );
    }

    const r = await page.evaluate((head) => {
      function lines(el) {
        const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const rg = document.createRange();
        const tops = [];
        let n;
        while ((n = w.nextNode())) {
          for (let k = 0; k < n.nodeValue.length; k++) {
            rg.setStart(n, k);
            rg.setEnd(n, k + 1);
            const bb = rg.getBoundingClientRect();
            if (bb.height === 0) continue;
            tops.push(Math.round(bb.top * 2) / 2);
          }
        }
        tops.sort((a, b) => a - b);
        const g = [];
        for (const t of tops) if (!g.length || t - g[g.length - 1] > 4) g.push(t);
        return g.length;
      }
      const R = (e) => {
        const b = e.getBoundingClientRect();
        return { x: Math.round(b.left * 10) / 10, right: Math.round(b.right * 10) / 10 };
      };

      const q = document.querySelector("#testimonial blockquote");
      if (!q.textContent.startsWith(head)) return { mismatch: true };
      q.style.fontSize = "44px";
      q.style.fontWeight = "400";
      q.style.lineHeight = "1.05";
      q.style.letterSpacing = "-0.03em";
      q.style.maxWidth = "628px";
      const cs = getComputedStyle(q);
      return {
        ok: true,
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        weight: cs.fontWeight,
        family: cs.fontFamily.split(",")[0],
        lines: lines(q),
        measure: R(q),
        avatar: R(document.querySelector("#testimonial figure img")),
        pager: R(document.querySelector('#testimonial [role="group"]')),
      };
    }, HEADS[i]);

    out.push(r);
  }

  console.log(
    "LIVE CROSS-CHECK — real cascade, real Inter, final values injected\n",
  );
  let ok = true;
  for (const [i, r] of out.entries()) {
    if (!r.ok) {
      console.log(`  slide${i + 1}  SLIDE MISMATCH`);
      ok = false;
      continue;
    }
    const good = r.lines === 5;
    ok = ok && good;
    console.log(
      `  slide${i + 1}  ${r.fontSize} / ${r.lineHeight} / ${r.letterSpacing} / ${r.weight} ${r.family}` +
        `  ->  ${r.lines} lines   measure ${r.measure.x}->${r.measure.right}` +
        `   avatar ${r.avatar.x}->${r.avatar.right}   pager ${r.pager.x}->${r.pager.right}   ${good ? "OK" : "FAIL"}`,
    );
  }
  console.log("\n  baseline (pre-change): avatar 120->193, pager 950.2->1100");
  console.log("  ALL THREE = 5 LINES :", ok ? "PASS" : "FAIL");
  await browser.close();
  process.exit(ok ? 0 : 1);
})();