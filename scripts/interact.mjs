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

// expand the first problem
await p.locator('button[aria-expanded]').first().click();
await p.waitForTimeout(400);
const maskVisible = await p.getByText("reveal approach — recorded").first().isVisible();
console.log("hint masked before reveal:", maskVisible ? "PASS" : "FAIL");

await p.getByText("reveal approach — recorded").first().click();
await p.waitForTimeout(700);
const gone = await p.getByText("reveal approach — recorded").first().isVisible().catch(() => false);
console.log("mask cleared after reveal:", gone ? "FAIL" : "PASS");

// record an editorial -> should schedule a redo
await p.getByRole("button", { name: "opened editorial" }).first().click();
await p.waitForTimeout(600);
const redoImmediate = await p.getByText(/redo scheduled/).first().isVisible().catch(() => false);
console.log("redo shown immediately:  ", redoImmediate ? "PASS" : "FAIL");
await p.waitForTimeout(5000);
const redoDay = await p.getByText(/redo scheduled — day/).first().isVisible().catch(() => false);
console.log("redo day resolved:       ", redoDay ? "PASS" : "FAIL");

await p.screenshot({ path: "shots/unit-interactive.png", fullPage: false });

// mark the unit complete
await p.getByRole("button", { name: /mark complete/ }).click();
await p.waitForTimeout(1500);
const done = await p.getByRole("button", { name: /complete/ }).textContent();
console.log("unit marked complete:    ", done?.includes("✓") ? "PASS" : "FAIL");

await p.goto("http://localhost:3000/roadmap", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(1200);
await p.screenshot({ path: "shots/trail.png", fullPage: true });
console.log("trail rerendered");
await b.close();
