import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { loginPath, SURFACES } from "./e2e-account.mjs";

/**
 * The axe pass the README asks for: every surface, in both themes, at both
 * shells, against WCAG 2.2 A and AA.
 *
 * Read-only — it signs in as the e2e account and looks, and it never resets
 * it, so it can run straight after an e2e script and see a lived-in account
 * rather than an empty one. Needs `npm run dev` running; BASE points it
 * elsewhere. Exits non-zero on any violation.
 *
 * Both themes, because contrast is the rule most likely to break and the two
 * grounds break it differently: a colour that clears 4.5:1 on the dark panel
 * can fail on paper.
 */
const BASE = process.env.BASE ?? "http://localhost:3000";
const THEMES = ["dark", "light"];
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, mobile: true },
  { name: "desktop", width: 1280, height: 860, mobile: false },
];
const PUBLIC = [["signin", "/signin"]];

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);

const found = new Map(); // rule id -> { impact, help, where: Set, sample }
let pages = 0;
const hand = { n: 0, min: Infinity, at: "" }; // the hand-measured nodes, for the summary

async function scan(page, label) {
  // after the boot stagger, so nothing is caught mid-fade at partial opacity
  await page.waitForTimeout(900);
  // Every panel draws its top hairline with ::before, and axe gives up on the
  // contrast of anything under a pseudo-element — which silently exempted
  // every panel in the app. The hairline sits above the text, never behind
  // it, so removing it for the scan changes no ratio axe measures.
  await page.addStyleTag({ content: ".rounded-panel::before{content:none!important}" });
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  pages++;

  // What axe still cannot decide — the panel legends, notched over the border
  // line — is measured here instead, the same way axe would: the element's
  // colours composited over its first opaque background, against 4.5:1 (3:1
  // for large text). Glyph-only nodes stay exempt; they are aria-hidden.
  const unsure = r.incomplete
    .filter((v) => v.id === "color-contrast")
    .flatMap((v) => v.nodes)
    .filter((n) => !/only non-text/.test(n.any[0]?.message ?? ""))
    .map((n) => n.target.join(" "));
  const measured = await page.evaluate(measure, unsure);
  for (const m of measured) {
    hand.n++;
    if (m.ratio < hand.min) Object.assign(hand, { min: m.ratio, at: `${label} "${m.text}"` });
  }
  const failed = measured.filter((m) => m.ratio < m.need);
  if (failed.length) {
    r.violations.push({
      id: "color-contrast-measured",
      impact: "serious",
      help: "Text axe could not measure, measured here, is below the WCAG AA ratio",
      nodes: failed.map((m) => ({ target: [m.sel], failureSummary: `\n${m.ratio.toFixed(2)}:1 < ${m.need}:1 ("${m.text}")` })),
    });
  }

  for (const v of r.violations) {
    const f = found.get(v.id) ?? { impact: v.impact, help: v.help, where: new Set(), sample: [] };
    f.where.add(label);
    for (const n of v.nodes.slice(0, 2)) {
      if (f.sample.length < 4) f.sample.push(`${label}: ${n.target.join(" ")} — ${n.failureSummary?.split("\n")[1]?.trim() ?? ""}`);
    }
    found.set(v.id, f);
  }
  console.log(`${label.padEnd(30)} ${r.violations.length ? r.violations.map((v) => v.id).join(", ") : "ok"}`);
}

/** runs in the page: contrast of each selector's text over its effective background */
function measure(selectors) {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const g = c.getContext("2d", { willReadFrequently: true });
  const px = () => [...g.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  const lum = ([r, gg, b]) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(gg) + 0.0722 * f(b);
  };
  const out = [];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (!el || !el.textContent.trim()) continue;
    // backgrounds from the element outward, until one is opaque
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const bg = getComputedStyle(n).backgroundColor;
      g.clearRect(0, 0, 1, 1);
      g.fillStyle = bg;
      g.fillRect(0, 0, 1, 1);
      const a = g.getImageData(0, 0, 1, 1).data[3];
      if (a === 0) continue;
      layers.unshift(bg);
      if (a === 255) break;
    }
    g.clearRect(0, 0, 1, 1);
    g.fillStyle = "#000";
    g.fillRect(0, 0, 1, 1);
    for (const l of layers) {
      g.fillStyle = l;
      g.fillRect(0, 0, 1, 1);
    }
    const bg = px();
    const cs = getComputedStyle(el);
    g.fillStyle = cs.color;
    g.globalAlpha = Number(cs.opacity);
    g.fillRect(0, 0, 1, 1);
    g.globalAlpha = 1;
    const fg = px();
    const [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
    out.push({ sel, text: el.textContent.trim().slice(0, 30), ratio: (hi + 0.05) / (lo + 0.05), need: large ? 3 : 4.5 });
  }
  return out;
}

for (const theme of THEMES) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.mobile,
      hasTouch: vp.mobile,
    });
    // the theme is a per-device choice read from storage before first paint
    await ctx.addInitScript((t) => {
      try {
        localStorage.setItem("cairn-theme", t);
      } catch {}
    }, theme);
    const page = await ctx.newPage();
    page.setDefaultTimeout(60000);

    for (const [name, path] of PUBLIC) {
      await page.goto(BASE + path, { waitUntil: "load" });
      await scan(page, `${theme}/${vp.name}/${name}`);
    }
    await page.goto(BASE + loginPath(), { waitUntil: "domcontentloaded" });
    for (const [name, path] of SURFACES) {
      await page.goto(BASE + path, { waitUntil: "load" });
      await scan(page, `${theme}/${vp.name}/${name}`);
    }
    await ctx.close();
  }
}

await browser.close();

if (found.size) {
  console.error(`\n${found.size} rule(s) violated across ${pages} page scans:`);
  for (const [id, f] of found) {
    console.error(`\n  ${id} (${f.impact}) — ${f.help}\n    on ${f.where.size} scan(s)`);
    for (const s of f.sample) console.error(`    · ${s}`);
  }
  process.exit(1);
}
console.log(`\n${pages} page scans, no violations`);
console.log(`${hand.n} notched legends measured by hand, lowest ${hand.min.toFixed(2)}:1 at ${hand.at}`);
