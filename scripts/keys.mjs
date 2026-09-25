import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { loginPath, prepareAccount, reporter } from "./e2e-account.mjs";

/**
 * The keyboard and reduced-motion walkthrough the README asks for, scripted.
 *
 * Axe checks what a page is; this checks what it does. Every step here removes
 * the control that was just used — flipping a card, grading it, submitting a
 * paper, closing the day — and each one has to leave focus somewhere useful
 * rather than on <body>. The quiz is a radio group, so arrow keys have to move
 * the answer. And with reduce-motion on, a transform must jump, not travel.
 *
 * Needs `npm run dev`. Resets the e2e account, like the other scripts.
 */
prepareAccount();
execFileSync("npx", ["tsx", "--env-file=.env.local", "scripts/e2e-cards.ts"], { stdio: "inherit" });
const say = reporter(38);
const B = "http://localhost:3000";
const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const active = (p) => p.evaluate(() => {
  const a = document.activeElement;
  return { tag: a?.tagName, text: (a?.textContent ?? "").trim().slice(0, 60), type: a?.getAttribute("type") };
});

// --- recall deck, keyboard only ---------------------------------------------
{
  const p = await (await b.newContext()).newPage();
  p.setDefaultTimeout(60000);
  await p.goto(B + loginPath());
  await p.goto(B + "/review", { waitUntil: "load" });
  await p.waitForTimeout(1200);
  await p.evaluate(() => document.activeElement?.blur());
  await p.keyboard.press("Space");
  await p.waitForTimeout(500);
  say("space flips; focus on the answer", /^Answer:/.test((await active(p)).text));
  await p.keyboard.press("3");
  await p.waitForTimeout(900);
  const a2 = await active(p);
  say("grading focuses next 'show answer'", a2.tag === "BUTTON" && /show answer/.test(a2.text));
  await p.keyboard.press("Enter");
  await p.waitForTimeout(500);
  say("enter on it flips, focus follows", /^Answer:/.test((await active(p)).text));
  await p.keyboard.press("3");
  await p.waitForTimeout(900);
  say("last grade focuses 'Deck clear'", /Deck clear/.test((await active(p)).text));
}

// --- checkpoint radios --------------------------------------------------------
{
  const p = await (await b.newContext()).newPage();
  p.setDefaultTimeout(60000);
  await p.goto(B + loginPath());
  await p.goto(B + "/checkpoint/dsa-cpp-stl", { waitUntil: "load" });
  await p.getByRole("button", { name: /^begin/ }).click();
  await p.locator("ol > li").first().waitFor();
  const radios = p.locator("ol > li").first().getByRole("radio");
  say("options are a radio group", (await radios.count()) >= 3);
  await radios.first().focus();
  await p.keyboard.press("Space");
  await p.keyboard.press("ArrowDown");
  const checked = await radios.evaluateAll((rs) => rs.findIndex((r) => r.checked));
  say("arrow keys move the answer", checked === 1);
  const ring = await p.locator("ol > li").first().locator("label").nth(1).evaluate((l) => getComputedStyle(l).outlineStyle);
  say("focused option shows a ring", ring === "solid");
  const legend = await p.locator("ol > li").first().getByRole("group").getAttribute("aria-label").catch(() => null);
  const name = await p.locator("ol > li fieldset").first().evaluate((f) => f.querySelector("legend")?.textContent?.trim().length ?? 0);
  say("each question is a named group", name > 10 || !!legend);
  await p.getByRole("button", { name: "submit checkpoint" }).focus();
  await p.keyboard.press("Enter");
  await p.waitForTimeout(4000);
  say("grading focuses the score", /passed: \d+\/\d+/i.test((await active(p)).text));
}

// --- close the day, and reopen ----------------------------------------------
{
  const p = await (await b.newContext()).newPage();
  p.setDefaultTimeout(60000);
  await p.goto(B + loginPath());
  await p.goto(B + "/today", { waitUntil: "load" });
  await p.waitForTimeout(1500);
  const reopen = p.getByRole("button", { name: /reopen/ });
  if (await reopen.isVisible().catch(() => false)) { await reopen.click(); await p.waitForTimeout(3000); }
  await p.getByPlaceholder(/one honest sentence/).fill("keyboard walkthrough");
  await p.getByRole("button", { name: "close the day" }).focus();
  await p.keyboard.press("Enter");
  await p.waitForTimeout(1500);
  say("closing focuses the summary", /closed\./.test((await active(p)).text));
  await p.getByRole("button", { name: /reopen/ }).focus();
  await p.keyboard.press("Enter");
  await p.waitForTimeout(1500);
  say("reopening focuses the first field", (await active(p)).tag === "TEXTAREA");
}

// --- reduced motion -------------------------------------------------------------
for (const reduce of [false, true]) {
  const ctx = await b.newContext({ reducedMotion: reduce ? "reduce" : "no-preference" });
  const p = await ctx.newPage();
  p.setDefaultTimeout(60000);
  await p.goto(B + loginPath());
  await p.goto(B + "/unit/dsa-bs-answer-space", { waitUntil: "load" });
  await p.waitForTimeout(1200);
  const btn = p.getByRole("button", { name: /mark complete|✓ complete/ });
  if (/✓ complete/.test(await btn.textContent())) { await btn.click(); await p.waitForTimeout(3000); }
  // sampled per frame in the page: a Playwright round trip is too coarse to
  // catch a 320ms sweep mid-flight
  const xs = await btn.evaluate(async (el) => {
    el.click();
    const out = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 500) {
      await new Promise((r) => requestAnimationFrame(r));
      const sp = el.querySelector("span.absolute");
      if (sp) out.push(Math.round(new DOMMatrix(getComputedStyle(sp).transform).m41));
    }
    return out;
  });
  const end = xs[xs.length - 1];
  const between = xs.filter((x) => x !== xs[0] && x !== end).length;
  say(reduce ? "reduced: pulse jumps, no frames between" : "normal: pulse sweeps through frames", reduce ? between === 0 : between >= 3);
  await p.waitForTimeout(2500);
  await ctx.close();
}
await b.close();
