/**
 * Checks every link the curriculum hands out: unit resources, problem pages and
 * the aptitude sites. A dead link in a unit is worse than no link — it is the
 * one thing the unit said to open, and it opens nothing.
 *
 *   npm run links                 all links, 8 at a time
 *   npm run links -- --only dsa   links whose owner contains "dsa"
 *
 * HEAD first, then GET for servers that refuse HEAD. A 403/418/429 is reported
 * as "blocked" rather than dead: several sites turn away scripts while serving
 * browsers, and that says nothing about the page.
 *
 * LeetCode refuses scripts on every problem page, so a problem link is checked
 * against LeetCode's own GraphQL instead: the slug has to resolve to a question,
 * and a difficulty that disagrees with ours is reported (not failed).
 * Exits non-zero if anything is dead.
 */
import { modules } from "@/content";
import { APTITUDE_SOURCES } from "@/content/aptitude";

type Link = { owner: string; url: string; difficulty?: string };

const links: Link[] = [];
for (const m of modules) {
  for (const u of m.units) for (const r of u.resources) links.push({ owner: u.slug, url: r.url });
  for (const p of m.problems ?? [])
    links.push({ owner: `${m.slug} problem ${p.slug}`, url: p.url, difficulty: p.difficulty });
}
for (const s of APTITUDE_SOURCES) links.push({ owner: "aptitude", url: s.url });

const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
const todo = only ? links.filter((l) => l.owner.includes(only)) : links;

// the same url checked once, however many units cite it
const unique = [...new Set(todo.map((l) => l.url))];

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

type Verdict = { status: number | "error"; final: string; note?: string; difficulty?: string; paid?: boolean };

const LEETCODE = /^https:\/\/leetcode\.com\/problems\/([a-z0-9-]+)\/?$/;

async function leetcode(slug: string): Promise<Verdict & { difficulty?: string; paid?: boolean }> {
  try {
    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": UA, referer: "https://leetcode.com" },
      body: JSON.stringify({
        query: "query q($s: String!) { question(titleSlug: $s) { difficulty isPaidOnly } }",
        variables: { s: slug },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return { status: res.status, final: res.url };
    const body = (await res.json()) as { data?: { question: { difficulty: string; isPaidOnly: boolean } | null } };
    const q = body.data?.question;
    if (!q) return { status: 404, final: res.url, note: "no such problem" };
    return { status: 200, final: res.url, difficulty: q.difficulty.toLowerCase(), paid: q.isPaidOnly };
  } catch (e) {
    return { status: "error", final: slug, note: (e as Error).message };
  }
}

async function probe(url: string): Promise<Verdict> {
  const lc = LEETCODE.exec(url);
  if (lc) return leetcode(lc[1]!);
  const attempt = async (method: "HEAD" | "GET") => {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      headers: { "user-agent": UA, accept: "text/html,*/*" },
      signal: AbortSignal.timeout(20_000),
    });
    if (method === "GET") await res.body?.cancel();
    return res;
  };
  try {
    let res = await attempt("HEAD");
    if (res.status >= 400) res = await attempt("GET");
    return { status: res.status, final: res.url };
  } catch (e) {
    try {
      const res = await attempt("GET");
      return { status: res.status, final: res.url };
    } catch {
      return { status: "error", final: url, note: (e as Error).message };
    }
  }
}

/** a soft 404: some sites answer 200 and bounce a missing page to their front door */
function softMiss(url: string, final: string) {
  const a = new URL(url);
  const b = new URL(final);
  return a.pathname.length > 1 && (b.pathname === "/" || b.pathname === "") && a.host.endsWith(b.host.replace(/^www\./, ""));
}

async function main() {
  const results = new Map<string, Verdict>();
  let next = 0;
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (next < unique.length) {
        const url = unique[next++]!;
        results.set(url, await probe(url));
      }
    }),
  );

  let dead = 0;
  let blocked = 0;
  let warned = 0;
  for (const url of unique) {
    const v = results.get(url)!;
    const owners = todo.filter((l) => l.url === url).map((l) => l.owner);
    const isBlocked = v.status === 403 || v.status === 418 || v.status === 429 || v.status === 999;
    const isDead =
      !isBlocked && (v.status === "error" || v.status >= 400 || softMiss(url, v.final));
    if (isBlocked) {
      blocked++;
      console.log(`blocked ${v.status}  ${url}  (${owners.join(", ")})`);
    } else if (isDead) {
      dead++;
      const why = v.status === "error" ? v.note : softMiss(url, v.final) ? `-> ${v.final}` : "";
      console.log(`DEAD    ${v.status}  ${url}  ${why ?? ""}  (${owners.join(", ")})`);
    } else {
      for (const l of todo.filter((l) => l.url === url && l.difficulty && v.difficulty)) {
        if (l.difficulty !== v.difficulty) {
          warned++;
          console.log(`warn    ${l.owner}: we say ${l.difficulty}, LeetCode says ${v.difficulty}`);
        }
      }
      if (v.paid) {
        warned++;
        console.log(`warn    ${url} is LeetCode Premium  (${owners.join(", ")})`);
      }
    }
  }
  console.log(
    `\n${unique.length} links: ${unique.length - dead - blocked} ok, ${blocked} blocked, ${dead} dead` +
      (warned ? `; ${warned} warnings` : ""),
  );
  process.exit(dead ? 1 : 0);
}

main();
