// Day 7 end-to-end: self-placement, checkpoint, phase exam, certificate, profile.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { loginPath, prepareAccount, reporter } from "./e2e-account.mjs";

prepareAccount();
// CHROME_PATH overrides the browser binary, for images that ship Chromium
// somewhere other than where Playwright expects it. Pinning a path here is
// what silently broke every one of these scripts once the version moved.
const b = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);
const ctx = await b.newContext({ viewport: { width: 1280, height: 1100 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
p.setDefaultTimeout(60000);
p.setDefaultNavigationTimeout(90000);
p.on("console", m => { if (m.type() === "error") console.log("  console error:", m.text().slice(0, 140)); });

const say = reporter(30);
const go = async (path) => {
  await p.goto("http://localhost:3000" + path, { waitUntil: "domcontentloaded" });
  await p.waitForLoadState("load");
  await p.waitForTimeout(2000);
};

await go(loginPath());

// Options are shuffled per sitting and a failed paper returns no key, so the
// driver answers the way someone who knows the material does: by the text of
// the right option, read from content/ rather than from the page.
const KEY = JSON.parse(execFileSync("npx", ["tsx", "scripts/e2e-key.ts"], { encoding: "utf8" }));
async function answerPaper(right) {
  const lis = p.locator("ol > li");
  const n = await lis.count();
  for (let i = 0; i < n; i++) {
    const li = lis.nth(i);
    const correct = KEY[(await li.locator("p span.prose-cairn").first().textContent())?.trim()];
    const opts = li.locator("ul button");
    for (let j = 0; j < await opts.count(); j++) {
      const text = (await opts.nth(j).locator("span.prose-cairn").textContent())?.trim();
      if ((text === correct) === right) { await opts.nth(j).click(); break; }
    }
  }
  return n;
}
const begin = async (name) => {
  await p.getByRole("button", { name }).click();
  await p.locator("ol > li").first().waitFor();
};

// --- the answer key must not be in the page ------------------------------
await go("/checkpoint/dsa-cpp-stl");
say("checkpoint renders", await p.getByRole("heading", { name: /C\+\+ & STL/ }).isVisible());
await begin(/^begin — \d+ questions/);
// "why" text only exists server-side, and only reaches the page after a pass
say("answer key withheld", !(await p.content()).includes("Growing a vector reallocates"));

await answerPaper(false);
await p.getByRole("button", { name: "submit checkpoint" }).click();
await p.waitForTimeout(4000);
say("checkpoint scores", await p.getByText(/^\d+\/\d+$/).first().isVisible().catch(() => false));
say("failed paper withholds key", !(await p.content()).includes("Growing a vector reallocates"));
say("misses are marked", (await p.getByText("✕").count()) > 0);
await p.screenshot({ path: "shots/checkpoint.png", fullPage: true });

await p.getByRole("button", { name: "sit a fresh paper" }).first().click();
await p.getByRole("button", { name: "submit checkpoint" }).waitFor();
await answerPaper(true);
await p.getByRole("button", { name: "submit checkpoint" }).click();
await p.waitForTimeout(4000);
say("a pass shows explanations", await p.getByText(/Growing a vector reallocates/).isVisible().catch(() => false));

// --- the exam is gated on progress ---------------------------------------
await go("/exam/foundations");
say("exam gated below 80%", await p.getByRole("heading", { name: "Not yet" }).isVisible().catch(() => false));
say("gate explains itself", await p.getByText(/gated on your progress, never the reverse/).isVisible().catch(() => false));

// --- self-placement banks prior work -------------------------------------
await go("/start");
say("self-placement renders", await p.getByRole("heading", { name: /Where are you actually/ }).isVisible());
// bank every module except one, to clear the 80% exam gate
const mods = p.locator("ul.divide-y > li");
const mc = await mods.count();
for (let i = 0; i < mc - 1; i++) await mods.nth(i).locator("button").first().click();
await p.waitForTimeout(300);
const label = await p.getByRole("button", { name: /bank \d+ and start/ }).textContent();
say(`banks a selection (${label?.trim()})`, Boolean(label));
await p.getByRole("button", { name: /bank \d+ and start/ }).click();
await p.waitForTimeout(6000);
say("lands on today", p.url().endsWith("/today"));

// banked work must not put stones on the cairn or inflate velocity
const velocity = await p.locator("section").filter({ hasText: "VELOCITY" }).first().textContent().catch(() => "");
say("banked work is not velocity", /—|0\.00/.test(velocity ?? ""));

// --- now the exam is open ------------------------------------------------
await go("/exam/foundations");
say("exam unlocks at 80%", await p.getByText(/questions drawn across every module/).isVisible().catch(() => false));
say("nothing drawn until begin", (await p.locator("ol > li").count()) === 0);
await begin("begin the exam");
const eg = p.locator("ol > li");
const en = await eg.count();
say(`exam paper served (${en} questions)`, en === 20);
say("timer running", await p.getByText(/^\d\d:\d\d$/).first().isVisible().catch(() => false));
await p.screenshot({ path: "shots/exam.png", fullPage: false });

// --- certification overview ----------------------------------------------
await go("/progress/certification");
say("certification renders", await p.getByRole("heading", { name: "Certification" }).isVisible());
await go("/progress");
await p.getByLabel("public handle").fill("e2e-cairn");
await p.getByRole("button", { name: "claim" }).click();
await p.waitForTimeout(3500);
say("handle claimed", await p.getByText("/u/e2e-cairn").first().isVisible().catch(() => false));

// --- the public profile needs no session ---------------------------------
const anon = await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const ap = await anon.newPage();
await ap.goto("http://localhost:3000/u/e2e-cairn", { waitUntil: "domcontentloaded" });
await ap.waitForTimeout(2500);
say("profile is public", await ap.getByText("/u/e2e-cairn").first().isVisible().catch(() => false));
say("profile shows the record", await ap.getByText("units").first().isVisible().catch(() => false));
await ap.screenshot({ path: "shots/profile.png", fullPage: true });

// --- cohort ---------------------------------------------------------------
await go("/progress/cohort");
say("cohort renders", await p.getByRole("heading", { name: "Cohort" }).isVisible());

// --- installable ----------------------------------------------------------
const mres = await p.request.get("http://localhost:3000/manifest.webmanifest");
const mj = await mres.json().catch(() => ({}));
say("manifest served", mj.name === "Cairn" && mj.start_url === "/today");

// --- the whole spine: pass the exam, defend it, issue the certificate -----
// A reload resumes the sitting already open — same paper, same clock.
await go("/exam/foundations");
await begin("begin the exam");
await answerPaper(false);
await p.getByRole("button", { name: "submit exam" }).click();
await p.waitForTimeout(5000);
say("failed exam: no key", (await p.locator("ol > li ul button", { hasText: "\u2713" }).count()) === 0);
say("failed exam: breakdown", await p.getByText(/breakdown shows where/).isVisible().catch(() => false));
const firstPaper = await p.locator("ol > li p span.prose-cairn").allTextContents();

await p.getByRole("button", { name: "sit a fresh paper" }).first().click();
await p.getByRole("button", { name: "submit exam" }).waitFor();
const secondPaper = await p.locator("ol > li p span.prose-cairn").allTextContents();
say("retake is a new paper", firstPaper.join() !== secondPaper.join());
await answerPaper(true);
await p.getByRole("button", { name: "submit exam" }).click();
await p.waitForTimeout(5000);
say("exam passes", await p.getByText(/^Passed\./).isVisible().catch(() => false));

await p.getByLabel("recording url").fill("https://example.com/defense.mp4");
await p.getByRole("button", { name: "attach" }).click();
await p.waitForTimeout(3500);
// the certificate is not issuable on the exam alone — the checkpoints are the
// part that was actually demonstrated, module by module
say("certificate needs checkpoints",
  await p.getByText(/module checkpoints passed/).isVisible().catch(() => false));

// pass every checkpoint, then come back
const allModules = ["dsa-cpp-stl","devops-linux-foundations","sde-cpp-internals","corecs-os",
  "dsa-arrays-sorting","sde-oop","devops-git","corecs-dbms","sde-rest-fastapi",
  "devops-networking","dsa-binary-search","corecs-cn","dsa-strings","devops-docker",
  "dsa-recursion-backtracking","dsa-bit-manipulation","dsa-linked-lists"];
for (const m of allModules) {
  await go(`/checkpoint/${m}`);
  await begin(/^begin — \d+ questions/);
  await answerPaper(true);
  await p.getByRole("button", { name: "submit checkpoint" }).click();
  await p.waitForTimeout(2500);
}
await go("/progress/certification");
say("all checkpoints passed",
  (await p.locator("li", { hasText: "units" }).locator("span.text-phos").count()) >= 14);

await go("/exam/foundations");
await p.waitForTimeout(1500);
say("defense attached", await p.getByRole("button", { name: /issue the certificate/ }).isVisible().catch(() => false));
await p.getByRole("button", { name: /issue the certificate/ }).click();
await p.waitForTimeout(4000);
const certLink = await p.locator('a[href^="/c/"]').first().getAttribute("href").catch(() => null);
say("certificate issued", Boolean(certLink));

if (certLink) {
  const cp = await anon.newPage();
  await cp.goto("http://localhost:3000" + certLink, { waitUntil: "domcontentloaded" });
  await cp.waitForTimeout(2500);
  say("certificate is public", await cp.getByText("certificate of completion").isVisible().catch(() => false));
  say("certificate has the snapshot", await cp.getByText(/passed \d+ module/).isVisible().catch(() => false));
  await cp.screenshot({ path: "shots/certificate.png", fullPage: true });

  await ap.reload({ waitUntil: "domcontentloaded" });
  await ap.waitForTimeout(2000);
  say("profile lists the certificate", await ap.getByText("Foundations").first().isVisible().catch(() => false));
  await ap.screenshot({ path: "shots/profile.png", fullPage: true });
}

await b.close();
