/* Evidence capture from the real page.

   The dev server is still serving the pre-change bundle (its watcher never
   invalidated this module), so the final values are injected as a stylesheet
   that mirrors exactly what the source now asks Tailwind for. Everything else
   on the page — mosaic, avatar, wordmark, byline, pager, neighbours — is the
   real thing. Restart the dev server and this becomes what it renders itself. */
const { chromium } = require("playwright");
const path = require("path");

const HEADS = ['"We were quoting', '"Every branch had', '"The grid data was'];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://127.0.0.1:4321", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.locator("#testimonial [role=region]").hover();

  // The final computed styles, applied the way the class in the source resolves.
  await page.addStyleTag({
    content: `#testimonial blockquote {
      max-width: 628px !important;
      font-size: 44px !important;
      font-weight: 400 !important;
      line-height: 1.05 !important;
      letter-spacing: -0.03em !important;
    }`,
  });

  const section = page.locator("#testimonial");
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);

  const names = [
    "section-06-testimonial.png",
    "section-06-testimonial-slide2.png",
    "section-06-testimonial-slide3.png",
  ];

  for (let i = 0; i < 3; i++) {
    if (i > 0) {
      await page
        .locator('#testimonial [role="group"] button')
        .nth(i)
        .click();
      await page.waitForFunction(
        (h) =>
          document
            .querySelector("#testimonial blockquote")
            ?.textContent.startsWith(h),
        HEADS[i],
        { timeout: 5000 },
      );
      await page.waitForTimeout(500);
    }
    const box = await section.boundingBox();
    const out = path.resolve(".verify", names[i]);
    await page.screenshot({ path: out, clip: box });
    console.log(`slide${i + 1} -> ${out}  (${Math.round(box.width)}x${Math.round(box.height)})`);
  }

  await browser.close();
})();