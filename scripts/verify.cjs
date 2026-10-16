/**
 * Orchestrator-only visual verification harness.
 * Starts nothing itself — expects a server already listening on PORT.
 * Screenshots each section at 1440x900 for side-by-side comparison with
 * ../design_reference/*.png
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || "4321";
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = path.join(__dirname, "..", ".verify");
const W = 1440;
const H = 900;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    colorScheme: "dark",
    reducedMotion: "no-preference",
  });

  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(`PAGEERROR: ${e.message}`));

  // networkidle never settles (the hero/testimonial <video> keeps a request
  // open), so wait on load + fonts + an explicit settle.
  await page.goto(BASE, { waitUntil: "load", timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);

  // Full-page shot
  await page.screenshot({ path: path.join(OUT, "full.png"), fullPage: true });

  // Report geometry of every top-level section
  const geometry = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll("main > section, main > div, footer").forEach((el) => {
      const r = el.getBoundingClientRect();
      out.push({
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        top: Math.round(r.top + window.scrollY),
        height: Math.round(r.height),
        width: Math.round(r.width),
      });
    });
    return out;
  });
  fs.writeFileSync(
    path.join(OUT, "geometry.json"),
    JSON.stringify(geometry, null, 2),
  );

  // scroll through the whole page so every scroll-driven section settles into
  // its active state, then shoot each section in view.
  // globals.css sets `scroll-behavior: smooth`, which makes programmatic
  // scrollTo animate and never settle inside our wait windows. Force instant.
  await page.addStyleTag({ content: "html{scroll-behavior:auto !important}" });

  const total = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < total; y += Math.round(H * 0.6)) {
    await page.evaluate((v) => window.scrollTo({ top: v, behavior: "instant" }), y);
    await page.waitForTimeout(220);
  }
  await page.waitForTimeout(900);

  // Per-section shots, captured by scrolling each section to the viewport top
  const sections = await page.evaluate(() => {
    const list = [];
    document.querySelectorAll("main > *").forEach((el, i) => {
      const r = el.getBoundingClientRect();
      list.push({ i, id: el.id || null, top: Math.round(r.top + window.scrollY), h: Math.round(r.height) });
    });
    return list;
  });

  let n = 0;
  for (const s of sections) {
    if (s.h < 40) continue;
    await page.evaluate(
      (y) => window.scrollTo({ top: y, behavior: "instant" }),
      Math.max(0, s.top),
    );
    await page.waitForTimeout(900);
    const at = await page.evaluate(() => Math.round(window.scrollY));
    n += 1;
    await page.screenshot({
      path: path.join(OUT, `section-${String(n).padStart(2, "0")}${s.id ? "-" + s.id : ""}.png`),
    });
    console.log(`  ${String(n).padStart(2, "0")} ${s.id || "(hero)"} -> wanted ${s.top} at ${at}`);
  }

  // Overflow audit at 3 widths
  const overflow = {};
  for (const w of [1440, 1280, 768, 390]) {
    await page.setViewportSize({ width: w, height: H });
    await page.waitForTimeout(500);
    overflow[w] = await page.evaluate(() => {
      const de = document.documentElement;
      const bad = [];
      document.querySelectorAll("*").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > de.clientWidth + 2 || r.left < -2)) {
          const cs = getComputedStyle(el);
          if (cs.position === "fixed" || cs.visibility === "hidden") return;
          bad.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className?.toString?.() || "").slice(0, 70),
            left: Math.round(r.left),
            right: Math.round(r.right),
          });
        }
      });
      return {
        scrollW: de.scrollWidth,
        clientW: de.clientWidth,
        horizontalScroll: de.scrollWidth > de.clientWidth + 1,
        offenders: bad.slice(0, 8),
      };
    });
  }
  fs.writeFileSync(path.join(OUT, "overflow.json"), JSON.stringify(overflow, null, 2));

  await page.setViewportSize({ width: W, height: H });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "hero-1440.png") });

  fs.writeFileSync(
    path.join(OUT, "console-errors.json"),
    JSON.stringify(consoleErrors, null, 2),
  );

  console.log("sections captured:", n);
  console.log("page height:", total);
  console.log("console errors:", consoleErrors.length);
  if (consoleErrors.length) console.log(consoleErrors.slice(0, 10).join("\n"));
  console.log("overflow:", JSON.stringify(overflow, null, 2).slice(0, 2000));

  await browser.close();
})().catch((e) => {
  console.error("HARNESS FAILED:", e.message);
  process.exit(1);
});