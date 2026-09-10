import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Panel } from "@/components/instrument/panel";
import { Boot, BootItem } from "@/components/instrument/boot";
import { SelfPlacement } from "@/components/instrument/self-placement";
import { modules } from "@/content";

export const metadata = { title: "Self-placement" };

export default async function StartPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const shaped = modules.map((m) => ({
    slug: m.slug,
    title: m.title,
    trackSlug: m.trackSlug,
    units: m.units.map((u) => ({ slug: u.slug, title: u.title, objective: u.objective })),
  }));

  return (
    <Boot className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <BootItem>
        <header>
          <p className="legend">before you start</p>
          <h1 className="mt-1 text-2xl text-hi">Where are you actually?</h1>
          <p className="mt-1 max-w-xl text-2xs leading-relaxed text-lo">
            You are not starting from zero. Tick anything you could explain to someone else
            right now — not everything you have read. Re-doing work you have already banked
            is the fastest way to abandon a roadmap for the third time.
          </p>
        </header>
      </BootItem>

      <BootItem>
        <Panel legend="competencies" active>
          <SelfPlacement modules={shaped} />
        </Panel>
      </BootItem>
    </Boot>
  );
}
