// The account the browser scripts drive, and the guard around it.
//
// Development shares the production database, so an e2e run is a real user
// doing real things to real rows. These scripts used to sign in as the owner's
// own account — every run banked units, passed checkpoints and claimed a
// handle on it. They now drive a dedicated account instead, reset at the start
// of each run, and refuse any address outside @cairn.local (an address Google
// sign-in can never produce) unless told explicitly.
//
//   E2E_EMAIL=someone@cairn.local npm run e2e:cert
//   npm run e2e:cert -- --i-know        with a real address, on purpose
//
// The account has to be on the allowlist once: npm run invite -- e2e@cairn.local "e2e"
import { execFileSync } from "node:child_process";

export const E2E_EMAIL = (process.env.E2E_EMAIL ?? "e2e@cairn.local").toLowerCase();

export function guardAccount() {
  if (!E2E_EMAIL.endsWith("@cairn.local") && !process.argv.includes("--i-know")) {
    console.error(
      `refusing to drive ${E2E_EMAIL}: this database is production, and the run would ` +
        `reset that account. Use an @cairn.local address, or pass --i-know.`,
    );
    process.exit(1);
  }
}

/** guard, then wipe the account's progress so the run starts from nothing */
export function prepareAccount() {
  guardAccount();
  execFileSync(
    "npx",
    ["tsx", "--env-file=.env.local", "scripts/reset-me.ts", "--email", E2E_EMAIL],
    { stdio: "inherit" },
  );
}

/** a PASS/FAIL line that also fails the process — a red run must not exit 0 */
export function reporter(width = 28) {
  return (label, pass) => {
    console.log(`${String(label).padEnd(width)} ${pass ? "PASS" : "FAIL"}`);
    if (!pass) process.exitCode = 1;
  };
}

export const loginPath = () => `/api/dev-login?email=${encodeURIComponent(E2E_EMAIL)}`;
