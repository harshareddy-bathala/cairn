import { redirect } from "next/navigation";
import { auth, hasProviders, signIn } from "@/auth";
import { Panel } from "@/components/instrument/panel";

export const metadata = { title: "Sign in" };

/**
 * What Auth.js sends back in `?error=`, in words.
 *
 * `/signin` is also the error page (see auth.ts), so a refused sign-in lands
 * right back here. Without this, someone not on the allowlist pressed the
 * button, went to Google, came back, and saw the same page as before — no sign
 * that anything had been refused, let alone why.
 */
const ERRORS: Record<string, string> = {
  AccessDenied:
    "That Google account is not on the invite list. Sign in with the address you were invited on, or ask for an invite.",
  OAuthAccountNotLinked: "That email is already linked to a different sign-in method.",
  Verification: "That sign-in link has expired or was already used. Try again.",
  Configuration: "Sign-in is misconfigured on this deployment. It is not something you did.",
};
const FALLBACK = "Sign-in did not complete. Try again.";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/today");

  const raw = (await searchParams).error;
  const code = Array.isArray(raw) ? raw[0] : raw;
  const error = code ? (ERRORS[code] ?? FALLBACK) : null;

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-[3px]" aria-hidden>
          <span className="h-[3px] w-4 rounded-[1px] bg-phos" />
          <span className="h-[3px] w-6 rounded-[1px] bg-phos-dim" />
          <span className="h-[3px] w-8 rounded-[1px] bg-phos-dim" />
          <span className="h-[3px] w-10 rounded-[1px] bg-ink-700" />
        </div>

        <div className="text-center">
          <h1 className="text-xl text-hi">Cairn</h1>
          <p className="note mt-1 text-lo">one stone per active day. invite only.</p>
        </div>

        {error && (
          <p
            role="alert"
            className="note rounded-[3px] border border-bad/50 bg-bad/5 px-3 py-2.5 text-hi"
          >
            {error}
          </p>
        )}

        <Panel legend="access">
          {hasProviders ? (
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/today" });
              }}
            >
              <button
                type="submit"
                className="w-full rounded-[3px] border border-line bg-ink-800 px-4 py-3 text-sm text-hi transition-colors duration-[120ms] hover:border-phos-dim hover:text-phos"
              >
                Continue with Google
              </button>
            </form>
          ) : (
            <p className="note text-warn">
              No auth provider configured. Set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET in
              .env.local, then restart.
            </p>
          )}
          <p className="note mt-3 text-lo">
            Your email must be on the allowlist. Ask Reddy for an invite.
          </p>
        </Panel>
      </div>
    </main>
  );
}
