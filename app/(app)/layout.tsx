import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Rail } from "@/components/instrument/rail";
import { getJourneyState } from "@/lib/journey";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const journey = await getJourneyState(session.user.id);

  return (
    <div className="min-h-dvh">
      <Rail stones={journey.stones} dayIndex={journey.dayIndex} />
      <main className="ml-12 min-h-dvh">{children}</main>
    </div>
  );
}
