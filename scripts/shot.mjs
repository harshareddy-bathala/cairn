import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: process.env.HOME + "/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell" });
const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto("http://localhost:3000/api/dev-login?email=harshareddy.bathala@gmail.com", { waitUntil: "domcontentloaded", timeout: 60000 });
for (const [name, url] of [["today","http://localhost:3000/today"],["trail","http://localhost:3000/roadmap"],["module","http://localhost:3000/module/dsa-binary-search"],["unit","http://localhost:3000/unit/dsa-bs-answer-space"]]) {
  await p.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForLoadState("load");
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `shots/${name}.png`, fullPage: true });
  console.log(name, "ok");
}
await ctx.clearCookies();
await p.goto("http://localhost:3000/signin", { waitUntil: "domcontentloaded", timeout: 60000 });
await p.waitForTimeout(1000);
await p.screenshot({ path: "shots/signin.png" });
console.log("signin ok");
await b.close();
