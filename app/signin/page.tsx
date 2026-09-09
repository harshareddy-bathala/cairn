import { redirect } from "next/navigation";
import { auth, hasProviders, signIn } from "@/auth";
import { Panel } from "@/components/instrument/panel";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/today");

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-[3px]">
          <span className="h-[3px] w-4 rounded-[1px] bg-phos" />
          <span className="h-[3px] w-6 rounded-[1px] bg-phos-dim" />
          <span className="h-[3px] w-8 rounded-[1px] bg-phos-dim" />
          <span className="h-[3px] w-10 rounded-[1px] bg-ink-700" />
        </div>

        <div className="text-center">
          <h1 className="text-xl text-hi">Cairn</h1>
          <p className="mt-1 text-2xs leading-relaxed text-lo">
            one stone per active day. invite only.
          </p>
        </div>

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
                className="w-full rounded-[3px] border border-line bg-ink-800 px-4 py-2.5 text-sm text-hi transition-colors duration-[120ms] hover:border-phos-dim hover:text-phos"
              >
                Continue with Google
              </button>
            </form>
          ) : (
            <p className="text-2xs leading-relaxed text-warn">
              No auth provider configured. Set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET in
              .env.local, then restart.
            </p>
          )}
          <p className="mt-3 text-2xs leading-relaxed text-lo">
            Your email must be on the allowlist. Ask Reddy for an invite.
          </p>
        </Panel>
      </div>
    </div>
  );
}
