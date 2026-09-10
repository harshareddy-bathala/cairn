// Day 7 end-to-end: self-placement, checkpoint, phase exam, certificate, profile.
import { chromium } from "playwright";
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

const say = (l, ok) => console.log(`${l.padEnd(30)} ${ok ? "PASS" : "FAIL"}`);
const go = async (path) => {
  await p.goto("http://localhost:3000" + path, { waitUntil: "domcontentloaded" });
  await p.waitForLoadState("load");
  await p.waitForTimeout(2000);
};

await go("/api/dev-login?email=harshareddy.bathala@gmail.com");

// --- the answer key must not be in the page ------------------------------
await go("/checkpoint/dsa-cpp-stl");
const html = await p.content();
say("checkpoint renders", await p.getByRole("heading", { name: /C\+\+ & STL/ }).isVisible());
// "why" text only exists server-side until submission
say("answer key withheld", !html.includes("Growing a vector reallocates"));

// answer every question with option (a) — deliberately mostly wrong
const groups = p.locator("ol > li");
const n = await groups.count();
for (let i = 0; i < n; i++) await groups.nth(i).locator("ul button").first().click();
await p.getByRole("button", { name: "submit checkpoint" }).click();
await p.waitForTimeout(4000);
say("checkpoint scores", await p.getByText(/^\d+$/).first().isVisible().catch(() => false));
say("explanations appear", await p.getByText(/Growing a vector reallocates/).isVisible().catch(() => false));
await p.screenshot({ path: "shots/checkpoint.png", fullPage: true });

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
const eg = p.locator("ol > li");
const en = await eg.count();
say(`exam paper served (${en} questions)`, en === 20);
say("timer running", await p.getByText(/^\d\d:\d\d$/).first().isVisible().catch(() => false));
await p.screenshot({ path: "shots/exam.png", fullPage: false });

// --- certification overview ----------------------------------------------
await go("/certification");
say("certification renders", await p.getByRole("heading", { name: "Certification" }).isVisible());
await p.getByLabel("public handle").fill("harsha");
await p.getByRole("button", { name: "claim" }).click();
await p.waitForTimeout(3500);
say("handle claimed", await p.getByText("/u/harsha").first().isVisible().catch(() => false));

// --- the public profile needs no session ---------------------------------
const anon = await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const ap = await anon.newPage();
await ap.goto("http://localhost:3000/u/harsha", { waitUntil: "domcontentloaded" });
await ap.waitForTimeout(2500);
say("profile is public", await ap.getByText("/u/harsha").first().isVisible().catch(() => false));
say("profile shows the record", await ap.getByText("units").first().isVisible().catch(() => false));
await ap.screenshot({ path: "shots/profile.png", fullPage: true });

// --- cohort ---------------------------------------------------------------
await go("/cohort");
say("cohort renders", await p.getByRole("heading", { name: "Cohort" }).isVisible());

// --- installable ----------------------------------------------------------
const mres = await p.request.get("http://localhost:3000/manifest.webmanifest");
const mj = await mres.json().catch(() => ({}));
say("manifest served", mj.name === "Cairn" && mj.start_url === "/today");

// --- the whole spine: pass the exam, defend it, issue the certificate -----
// Grading happens on the server, so the driver needs the key the same way you
// would: by taking the paper once, reading the explanations, and retaking it.
await go("/exam/foundations");
const q1 = p.locator("ol > li");
for (let i = 0; i < await q1.count(); i++) await q1.nth(i).locator("ul button").first().click();
await p.getByRole("button", { name: "submit exam" }).click();
await p.waitForTimeout(5000);

// the marked paper shows which option was right on every question
const key = await p.locator("ol > li").evaluateAll((lis) =>
  lis.map((li) => [...li.querySelectorAll("ul button")].findIndex((b) => b.textContent?.trim().startsWith("\u2713"))),
);
say("marked paper shows the key", key.every((k) => k >= 0));

// a failed attempt just serves the paper again — the seed is fixed per user
// and phase, so it is the same twenty questions in the same order
await go("/exam/foundations");
const q2 = p.locator("ol > li");
for (let i = 0; i < await q2.count(); i++) await q2.nth(i).locator("ul button").nth(key[i]).click();
await p.getByRole("button", { name: "submit exam" }).click();
await p.waitForTimeout(5000);
say("exam passes with the key", await p.getByText(/^Passed\./).isVisible().catch(() => false));

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
  const li = p.locator("ol > li");
  const c = await li.count();
  for (let i = 0; i < c; i++) await li.nth(i).locator("ul button").first().click();
  await p.getByRole("button", { name: "submit checkpoint" }).click();
  await p.waitForTimeout(2500);
  const k = await p.locator("ol > li").evaluateAll((lis) =>
    lis.map((el) => [...el.querySelectorAll("ul button")].findIndex((b) => b.textContent?.trim().startsWith("\u2713"))),
  );
  await go(`/checkpoint/${m}`);
  const li2 = p.locator("ol > li");
  for (let i = 0; i < c; i++) await li2.nth(i).locator("ul button").nth(k[i]).click();
  await p.getByRole("button", { name: "submit checkpoint" }).click();
  await p.waitForTimeout(2500);
}
await go("/certification");
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
