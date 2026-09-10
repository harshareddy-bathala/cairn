import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Rail } from "@/components/instrument/rail";
import { MobileNav } from "@/components/instrument/tab-bar";
import { getJourneyStateCached } from "@/lib/journey";

/**
 * Two shells, one page.
 *
 * Below `sm` the navigation is a bottom tab row and `main` pads itself clear
 * of it. At `sm` and up the fixed rail returns and the padding moves to the
 * left. Nothing renders twice — each nav hides itself at the breakpoint where
 * the other takes over.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const journey = await getJourneyStateCached(session.user.id);
  const account = {
    email: session.user.email ?? "",
    name: session.user.name ?? null,
    handle: session.user.handle ?? null,
    image: session.user.image ?? null,
  };

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-[3px] focus:border focus:border-phos focus:bg-ink-900 focus:px-3 focus:py-2 focus:text-sm focus:text-phos"
      >
        Skip to content
      </a>

      <Rail stones={journey.stones} dayIndex={journey.dayIndex} account={account} />
      <MobileNav account={account} />

      <main
        id="main"
        className={
          // clears the tab row (56px) and the home indicator below it; at `sm`
          // that padding collapses and the rail takes the left instead
          "min-h-dvh pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:ml-12 sm:pb-0"
        }
      >
        {children}
      </main>
    </div>
  );
}
