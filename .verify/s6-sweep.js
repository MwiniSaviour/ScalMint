/* Deterministic in-page sweep. `reducedMotion: reduce` freezes the carousel:
   the auto-advance effect returns early and the slide swap has duration 0,
   so each measurement sees a settled slide. */
const { chromium } = require("playwright");

const URL = "http://127.0.0.1:4321";

(async () => {
  const size = Number(process.argv[2] || 44);
  const weight = process.argv[3] || "400";
  const candidates = (process.argv[4] || "605")
    .split(",")
    .map(Number);

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  const out = await page.evaluate(
    async ({ size, weight, candidates }) => {
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
        const g = [];
        for (const t of tops) if (!g.length || t - g[g.length - 1] > 4) g.push(t);
        return g.length;
      }

      const results = [];

      for (const w of candidates) {
        const per = [];
        for (let i = 0; i < 3; i++) {
          // Re-query every iteration: the pager lives inside <motion.figure
          // key={slide.id}>, so it is unmounted and remounted on each swap.
          const btns = [
            ...document.querySelectorAll('#testimonial [role="group"] button'),
          ];
          btns[i].click();
          await new Promise((r) => requestAnimationFrame(r));
          await new Promise((r) => requestAnimationFrame(r));
          const q = document.querySelector("#testimonial blockquote");
          q.style.fontSize = size + "px";
          q.style.fontWeight = weight;
          q.style.lineHeight = "1.05";
          q.style.letterSpacing = "-0.03em";
          q.style.maxWidth = w + "px";
          await new Promise((r) => requestAnimationFrame(r));
          per.push({ n: lines(q), head: q.textContent.slice(1, 18) });
        }
        results.push({ width: w, per });
      }
      return results;
    },
    { size, weight, candidates },
  );

  for (const r of out) {
    const n = r.per.map((p) => p.n);
    const ok = n.every((v) => v === 5) ? "OK " : "   ";
    console.log(
      `${ok}w=${String(r.width).padStart(4)}  lines=[${n.join(",")}]  em=${(r.width / size).toFixed(2)}   ${r.per.map((p) => p.head).join(" / ")}`,
    );
  }
  await browser.close();
})();