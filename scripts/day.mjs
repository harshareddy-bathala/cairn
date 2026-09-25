// Day 4 end-to-end: the plan, catch-up, bad day, and closing the day.
import { chromium } from "playwright";
import { loginPath, prepareAccount, reporter } from "./e2e-account.mjs";

prepareAccount();
// CHROME_PATH overrides the browser binary, for images that ship Chromium
// somewhere other than where Playwright expects it. Pinning a path here is
// what silently broke every one of these scripts once the version moved.
const b = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);
const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
p.setDefaultTimeout(60000);
p.setDefaultNavigationTimeout(90000);
p.on("console", m => { if (m.type() === "error") console.log("  console error:", m.text().slice(0, 140)); });

const say = reporter(26);

await p.goto("http://localhost:3000" + loginPath(), { waitUntil: "domcontentloaded" });
await p.goto("http://localhost:3000/today", { waitUntil: "domcontentloaded" });
await p.waitForLoadState("load");
await p.waitForTimeout(2000);

const rows = p.locator("ul[data-plan] > li");
const n1 = await rows.count();
// the day's very first load must plan a full day, not a stunted one
say(`plan generated (${n1} blocks)`, n1 >= 5);

const hasClose = await p.getByText("Close the day").first().isVisible();
say("close block is last", hasClose);

const budget = await p.locator("header span", { hasText: /budget/ }).first().textContent().catch(() => null);
say(`budget shown${budget ? ` (${budget.trim()})` : ""}`, Boolean(budget));

await p.screenshot({ path: "shots/today-plan.png", fullPage: true });

// --- catch-up 2x pulls the next unit in each track
await p.getByRole("button", { name: "2×" }).click();
await p.waitForTimeout(4000);
const n2 = await rows.count();
say(`2x expands plan (${n1} -> ${n2})`, n2 > n1);
const stretch = await p.locator('span[title="pulled in by catch-up"]').count();
say(`stretch blocks marked (${stretch})`, stretch > 0);
await p.screenshot({ path: "shots/today-catchup.png", fullPage: true });

// --- bad day collapses to the minimum chain
//
// Asserted as a shape rather than a count. The chain is one problem, the log,
// and the deck when anything is due — five minutes of recall is the one block
// that protects work already paid for, so it survives a bad day deliberately.
// A hardcoded number here fails the day that policy changes, which tells you
// nothing about whether the collapse still works.
await p.getByRole("button", { name: "bad day" }).click();
await p.waitForTimeout(4000);
const n3 = await rows.count();
const badTitles = await rows.locator("a, span").allInnerTexts();
const learning = badTitles.filter((t) => /^(Filesystem|Processes|Toolchain|Complexity|Stack)/.test(t));
say(`bad day collapses (${n3} blocks)`, n3 < n2 && n3 <= 3);
say("bad day drops new learning", learning.length === 0);
const heading = await p.getByRole("heading", { level: 1 }).textContent();
say("bad day is named, not hidden", heading?.includes("Bad day"));
await p.screenshot({ path: "shots/today-badday.png", fullPage: true });

// --- every block can finish: recording the one problem finishes the chain.
// dsa:minimum used to have no completion signal at all, so a bad day could
// never show as done however much of it you did.
const glyphOf = (row) => row.locator("span[aria-hidden]").first().textContent();
const minimum = rows.filter({ hasText: "One problem" });
if (await minimum.count()) {
  const expand = p.getByRole("button", { name: /^Expand One problem/ });
  if ((await expand.getAttribute("aria-expanded")) !== "true") await expand.click();
  await minimum.getByRole("button", { name: "solved clean" }).first().click();
  await p.waitForTimeout(4000);
  say("minimum chain finishes", (await glyphOf(minimum)) === "✓");
} else say("minimum chain finishes", false);
const openLeft = [];
for (const row of await rows.all()) {
  const text = await row.innerText();
  if (!/Close the day/.test(text) && (await glyphOf(row)) !== "✓") openLeft.push(text.split("\n")[0]);
}
say(`all blocks done but the close${openLeft.length ? ` (${openLeft.join(", ")})` : ""}`, openLeft.length === 0);

// the pace steps are meaningless during a bad day, so they are disabled — the
// only way back out is the toggle itself
const stepDisabled = await p.getByRole("button", { name: "1×" }).isDisabled();
say("pace locked during bad day", stepDisabled);
await p.getByRole("button", { name: "bad day" }).click();
await p.waitForTimeout(4000);
say("returns to normal pace", (await rows.count()) > 2);

// --- logging a score in the plan finishes the aptitude block
const apt = rows.filter({ hasText: "25 questions" });
const aptExpand = p.getByRole("button", { name: /^Expand 25 questions/ });
if ((await aptExpand.getAttribute("aria-expanded")) !== "true") await aptExpand.click();
await apt.getByLabel("correct").fill("18");
await apt.getByRole("button", { name: "log", exact: true }).click();
await p.waitForTimeout(4000);
say("aptitude log finishes block", (await glyphOf(apt)) === "✓");

// --- close the day: the stone drops
await p.getByPlaceholder(/one honest sentence/).fill("binary search on the answer space, not the array");
await p.getByPlaceholder(/the exact task you open first/).fill("koko eating bananas, timed");
await p.getByRole("button", { name: "close the day" }).click();
await p.waitForTimeout(1500);
const closedNow = await p.getByText(/closed\./).first().isVisible().catch(() => false);
say("day closes immediately", closedNow);
await p.screenshot({ path: "shots/today-closed.png", fullPage: true });

await p.waitForTimeout(4000);
await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForTimeout(2500);
const stillClosed = await p.getByText(/stones? on the cairn/).first().isVisible().catch(() => false);
say("close survives a reload", stillClosed);
const tomorrow = await p.getByText(/koko eating bananas/).first().isVisible().catch(() => false);
say("tomorrow's first task kept", tomorrow);

await p.getByRole("button", { name: /reopen/ }).click();
await p.waitForTimeout(3000);
say("day can be reopened", await p.getByRole("button", { name: "close the day" }).isVisible().catch(() => false));

await b.close();
