import { chromium } from "playwright";
const EXE = process.env.HOME + "/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell";
const b = await chromium.launch({ executablePath: EXE });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
p.setDefaultTimeout(60000);
p.setDefaultNavigationTimeout(90000);
p.on("console", m => { if (m.type() === "error") console.log("  console error:", m.text().slice(0,120)); });

await p.goto("http://localhost:3000/api/dev-login?email=harshareddy.bathala@gmail.com", { waitUntil: "domcontentloaded" });
await p.goto("http://localhost:3000/unit/dsa-bs-answer-space", { waitUntil: "domcontentloaded" });
await p.waitForLoadState("load"); await p.waitForTimeout(1200);

// A reveal is permanent by design — it is recorded, which is the whole point of
// the mask. So these two checks are only meaningful on a cold user, and say so
// rather than reporting a stale run as a failure.
const say = (l, r) => console.log(`${l.padEnd(26)} ${r}`);

// expand the first problem
await p.locator('button[aria-expanded]').first().click();
await p.waitForTimeout(400);
const mask = p.getByText("reveal approach — recorded").first();
const maskVisible = await mask.isVisible().catch(() => false);

if (!maskVisible) {
  say("hint masked before reveal:", "SKIP  already revealed — `npm run reset-me` for a cold run");
  say("mask cleared after reveal:", "SKIP  already revealed");
} else {
  say("hint masked before reveal:", "PASS");
  await mask.click();
  await p.waitForTimeout(700);
  const gone = await p.getByText("reveal approach — recorded").first().isVisible().catch(() => false);
  say("mask cleared after reveal:", gone ? "FAIL" : "PASS");
}

// record an editorial -> should schedule a redo
await p.getByRole("button", { name: "opened editorial" }).first().click();
await p.waitForTimeout(600);
const redoImmediate = await p.getByText(/redo scheduled/).first().isVisible().catch(() => false);
say("redo shown immediately:", redoImmediate ? "PASS" : "FAIL");
await p.waitForTimeout(5000);
const redoDay = await p.getByText(/redo scheduled — day/).first().isVisible().catch(() => false);
say("redo day resolved:", redoDay ? "PASS" : "FAIL");

await p.screenshot({ path: "shots/unit-interactive.png", fullPage: false });

// mark the unit complete
const markBtn = p.getByRole("button", { name: /mark complete/ }).first();
if (await markBtn.isVisible().catch(() => false)) {
  await markBtn.click();
  await p.waitForTimeout(1500);
}
const done = await p.getByRole("button", { name: /complete/ }).first().textContent();
say("unit marked complete:", done?.includes("✓") ? "PASS" : "FAIL");

await p.goto("http://localhost:3000/roadmap", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1200);
await p.screenshot({ path: "shots/trail.png", fullPage: true });
console.log("trail rerendered");
await b.close();
