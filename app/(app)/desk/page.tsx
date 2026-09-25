import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Panel } from "@/components/instrument/panel";
import { Boot, BootItem } from "@/components/instrument/boot";
import { ProjectBoard } from "@/components/instrument/project-board";
import { getProjects } from "@/lib/sidetracks";

export const metadata = { title: "Projects" };

const PHASE_LABEL: Record<string, string> = {
  foundations: "foundations",
  depth: "depth & automation",
  orchestration: "orchestration",
};

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const projects = await getProjects(session.user.id);
  // nothing pledged and nothing built: say where to begin, rather than leaving
  // three identical untouched boards to choose between
  const untouched = projects.every(
    (p) => !p.pledgeAcceptedAt && p.deliverables.every((d) => d.doneOnDay == null),
  );
  const first = projects[0];

  return (
    <Boot className="mx-auto max-w-3xl space-y-6 px-4 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-10">
      <BootItem>
        <header>
          <p className="legend">three projects · one rule</p>
          <h1 className="mt-1 text-2xl text-hi">Projects</h1>
          <p className="mt-1 max-w-xl note text-lo">
            These are the artefacts an interviewer will actually open, so each deliverable
            has a definition of done and asks for a link to the evidence.
          </p>
        </header>
      </BootItem>

      {untouched && first && (
        <BootItem>
          <p className="rounded-panel border border-line-soft p-4 note text-mid">
            Nothing started yet. Begin with <span className="text-hi">{first.name}</span>: accept
            its pledge, add the repo, and the weekend plan starts offering its first
            deliverable. The other two open as their phases arrive.
          </p>
        </BootItem>
      )}

      {projects.map((p) => (
        <BootItem key={p.slug}>
          <Panel legend={p.name} aux={PHASE_LABEL[p.phaseSlug] ?? p.phaseSlug}>
            <ProjectBoard project={p} />
            <div className="mt-4 border-t border-line-soft pt-3">
              <p className="legend">the line it earns</p>
              <p className="prose-cairn mt-1 text-sm leading-relaxed text-mid">{p.resumeLine}</p>
              <p className="mt-1.5 note text-lo">
                Written before the thing is built, so you can tell whether what you are
                building will support the claim.
              </p>
            </div>
          </Panel>
        </BootItem>
      ))}
    </Boot>
  );
}
