// Day 6 end-to-end: aptitude log, project deliverables, applications, STAR bank.
import { chromium } from "playwright";
const EXE = process.env.HOME + "/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell";
const b = await chromium.launch({ executablePath: EXE });
const ctx = await b.newContext({ viewport: { width: 1280, height: 1100 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
p.setDefaultTimeout(60000);
p.setDefaultNavigationTimeout(90000);
p.on("console", m => { if (m.type() === "error") console.log("  console error:", m.text().slice(0, 140)); });

const say = (l, ok) => console.log(`${l.padEnd(28)} ${ok ? "PASS" : "FAIL"}`);
const go = async (path) => {
  await p.goto("http://localhost:3000" + path, { waitUntil: "domcontentloaded" });
  await p.waitForLoadState("load");
  await p.waitForTimeout(2000);
};

await go("/api/dev-login?email=harshareddy.bathala@gmail.com");

// --- metrics + aptitude -------------------------------------------------
await go("/metrics");
say("metrics renders", await p.getByRole("heading", { name: "Metrics" }).isVisible());
say("dsa curve shown", await p.getByText(/(target|first mark) ~\d+ by day/).first().isVisible());
say("cadence listed", await p.getByText("Timed DSA pair").first().isVisible());

await p.getByLabel("correct").fill("19");
await p.getByRole("button", { name: "log", exact: true }).click();
await p.waitForTimeout(3500);
say("aptitude percent shown", await p.getByText("76%").first().isVisible().catch(() => false));
await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForTimeout(2500);
say("aptitude survives reload", await p.getByText("19/25").first().isVisible().catch(() => false));
await p.screenshot({ path: "shots/metrics.png", fullPage: true });

// --- projects -----------------------------------------------------------
await go("/projects");
const names = await Promise.all(["sentinel", "atlas", "atlas-k8s"].map((n) =>
  p.getByText(n, { exact: true }).first().isVisible().catch(() => false)));
say("three projects", names.every(Boolean));
say("resume line shown", await p.getByText(/Built a Linux monitoring agent/).isVisible());

const pledgeBtn = p.getByRole("button", { name: /I accept — no AI codegen in sentinel/ });
if (await pledgeBtn.isVisible().catch(() => false)) {
  await pledgeBtn.click();
  await p.waitForTimeout(3000);
}
say("pledge accepted", await p.getByText("no-AI pledge accepted").first().isVisible().catch(() => false));

// definition of done is shown, not hidden
await p.locator('button[aria-label="definition of done"]').first().click();
await p.waitForTimeout(500);
say("definition of done opens", await p.getByText(/A stranger can read the README/).isVisible().catch(() => false));

const sentinel = p.locator("section").filter({ hasText: "sentinel" }).first();
const doneBefore = Number((await sentinel.getByText(/^\d+\/6$/).first().innerText()).split("/")[0]);
const box = sentinel.getByRole("button", { name: "▢" }).first();
const canTick = await box.isVisible().catch(() => false);
if (canTick) {
  await box.click();
  await p.waitForTimeout(3000);
}
const doneAfter = Number((await sentinel.getByText(/^\d+\/6$/).first().innerText()).split("/")[0]);
say("deliverable ticks", canTick ? doneAfter === doneBefore + 1 : doneBefore === 6);
await p.screenshot({ path: "shots/projects.png", fullPage: true });

// --- career -------------------------------------------------------------
await go("/career");
say("career renders", await p.getByRole("heading", { name: "Career desk" }).isVisible());
say("star prompts listed", await p.getByText(/Tell me about yourself/).first().isVisible());

const apps = p.locator("section").filter({ has: p.getByRole("button", { name: "sent" }) });
await apps.getByLabel("company").fill("Zerodha");
await apps.getByLabel("role").fill("SRE Intern");
await p.getByRole("button", { name: "sent" }).click();
await p.waitForTimeout(3000);
say("application recorded", await p.getByText("Zerodha").first().isVisible().catch(() => false));

await p.getByRole("button", { name: "log", exact: true }).click();
await p.waitForTimeout(3000);
say("mock session logged", (await p.getByText("Timed DSA pair").count()) >= 2);

await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForTimeout(2500);
say("career survives reload", await p.getByText("Zerodha").first().isVisible().catch(() => false));
await p.screenshot({ path: "shots/career.png", fullPage: true });

// --- the numbers moved --------------------------------------------------
await go("/metrics");
say("metrics sees the work", await p.getByText(/applications/i).first().isVisible());

// --- links in, links out ------------------------------------------------
// Every URL on this page is typed by hand, stored, and later rendered as an
// href. Each one has to survive the round trip in the form a browser will
// accept ("github.com/x" is what people type; `new URL` rejects it), and each
// one has to refuse a scheme that would execute.
await go("/projects");

// untick then re-tick, so the row starts from a known state
const tick = p.locator("button[aria-pressed]").first();
if ((await tick.getAttribute("aria-pressed")) === "true") {
  await tick.click();
  await p.waitForTimeout(2500);
}
await tick.click();
await p.waitForTimeout(2500);
say("a tick without evidence is flagged", await p.getByText("no evidence").first().isVisible().catch(() => false));

await p.locator('button[aria-label="definition of done"]').first().click();
await p.waitForTimeout(600);
const evidence = p.getByLabel("evidence").first();
say("evidence is asked for", await evidence.isVisible().catch(() => false));

await evidence.fill("javascript:alert(1)");
await p.getByRole("heading", { name: "Projects" }).click();
await p.waitForTimeout(2500);
say("evidence refuses javascript:", await p.getByText("not a link").first().isVisible().catch(() => false));

await evidence.fill("github.com/me/sentinel/commit/abc123");
await p.getByRole("heading", { name: "Projects" }).click();
await p.waitForTimeout(3000);
const evHref = await p.getByRole("link", { name: "open evidence" }).first().getAttribute("href").catch(() => null);
say("evidence normalises the scheme", evHref === "https://github.com/me/sentinel/commit/abc123");

await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForTimeout(2500);
say("evidence survives reload", await p.getByText("◈ evidence").first().isVisible().catch(() => false));

await p.getByLabel("repo").first().fill("github.com/me/sentinel");
await p.getByRole("heading", { name: "Projects" }).click();
await p.waitForTimeout(3000);
const repoHref = await p.getByRole("link", { name: "open repo" }).first().getAttribute("href").catch(() => null);
say("repo url normalises", repoHref === "https://github.com/me/sentinel");

await go("/career");
const desk = p.locator("section").filter({ has: p.getByRole("button", { name: "sent" }) });
await desk.getByLabel("company").fill("Linkable Co");
await desk.getByLabel("role").fill("SRE");
await desk.getByLabel("link").fill("careers.example.com/jobs/42");
await p.getByRole("button", { name: "sent" }).click();
await p.waitForTimeout(3500);
await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForTimeout(2500);
const appHref = await p.getByRole("link", { name: "Linkable Co" }).first().getAttribute("href").catch(() => null);
say("application link is reachable", appHref === "https://careers.example.com/jobs/42");

// --- the aptitude form cannot log a phantom zero ------------------------
// Number("") is 0, so a blank field used to record a real 0% score.
await go("/metrics");
const rowsBefore = await p.locator("li", { hasText: "%" }).count();
await p.getByLabel("correct").fill("");
await p.getByRole("button", { name: "log", exact: true }).click();
await p.waitForTimeout(2500);
say("a blank score is refused", await p.getByText("how many did you get right?").isVisible().catch(() => false));
say("a blank score writes nothing", (await p.locator("li", { hasText: "%" }).count()) === rowsBefore);

await b.close();
