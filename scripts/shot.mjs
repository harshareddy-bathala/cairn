import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

/**
 * Design QA: every surface, at a phone and at a desktop, into shots/.
 *
 * Two viewports because the app has two shells — a bottom tab bar below `sm`
 * and the fixed rail above it — and a change to one is very easy to make
 * without ever looking at the other.
 *
 * It also fails loudly on the two things a screenshot will not show you: a page
 * that scrolls sideways, and a console error. A 390px-wide layout that is one
 * `min-w` away from horizontal scroll looks perfectly fine in a full-page
 * capture, because the capture is as wide as the content.
 *
 * Needs `npm run dev` running. Set BASE to point somewhere else.
 *
 * CHROME_PATH overrides the browser binary, for sandboxes and CI images that
 * ship Chromium at a fixed location rather than the build Playwright expects.
 * The previous version of this script hardcoded one such path, which stopped
 * working the first time the dependency moved — hence an env var and a real
 * error message instead.
 */
const BASE = process.env.BASE ?? "http://localhost:3000";
const EMAIL = process.env.SHOT_EMAIL ?? "harshareddy.bathala@gmail.com";

const PAGES = [
  ["today", "/today"],
  ["review", "/review"],
  ["trail", "/roadmap"],
  ["module", "/module/dsa-binary-search"],
  ["unit", "/unit/dsa-bs-answer-space"],
  ["metrics", "/metrics"],
  ["projects", "/projects"],
  ["career", "/career"],
  ["certification", "/certification"],
  ["checkpoint", "/checkpoint/dsa-cpp-stl"],
  ["cohort", "/cohort"],
  ["settings", "/settings"],
];

const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, mobile: true },
  { name: "desktop", width: 1280, height: 860, mobile: false },
];

const problems = [];

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
).catch((e) => {
  console.error(
    `${e.message}\n\nRun "npx playwright install chromium", or set CHROME_PATH ` +
      `to an existing Chromium binary.`,
  );
  process.exit(1);
});

for (const vp of VIEWPORTS) {
  await mkdir(`shots/${vp.name}`, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
  });
  const page = await ctx.newPage();

  const errors = [];
  page.on("pageerror", (e) => errors.push(`page error: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 160)}`);
  });

  await page.goto(`${BASE}/api/dev-login?email=${encodeURIComponent(EMAIL)}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  for (const [name, path] of PAGES) {
    errors.length = 0;
    await page.goto(BASE + path, { waitUntil: "load", timeout: 60000 });
    // long enough for the boot stagger to settle, so captures are not mid-fade
    await page.waitForTimeout(900);
    await page.screenshot({ path: `shots/${vp.name}/${name}.png`, fullPage: true });

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      if (doc.scrollWidth <= doc.clientWidth) return null;
      const guilty = [...document.querySelectorAll("body *")]
        .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
        .slice(0, 3)
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
      return { by: doc.scrollWidth - doc.clientWidth, guilty };
    });

    if (overflow) {
      problems.push(
        `${vp.name}/${name}: scrolls ${overflow.by}px sideways — ${overflow.guilty.join(", ")}`,
      );
    }
    for (const e of errors) problems.push(`${vp.name}/${name}: ${e}`);

    console.log(`${vp.name.padEnd(8)} ${name.padEnd(14)} ${overflow || errors.length ? "!" : "ok"}`);
  }

  await ctx.close();
}

await browser.close();

if (problems.length) {
  console.error("\n" + problems.map((p) => `  · ${p}`).join("\n"));
  process.exit(1);
}
console.log("\nno overflow, no console errors");
