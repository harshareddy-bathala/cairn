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

  return (
    <Boot className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <BootItem>
        <header>
          <p className="legend">three projects · one rule</p>
          <h1 className="mt-1 text-2xl text-hi">Projects</h1>
          <p className="mt-1 max-w-xl text-2xs leading-relaxed text-lo">
            These are the only artefacts an interviewer will actually open. Cairn is not
            among them and never will be — it was built by an AI, which is exactly what
            disqualifies it as evidence.
          </p>
        </header>
      </BootItem>

      {projects.map((p) => (
        <BootItem key={p.slug}>
          <Panel legend={p.name} aux={PHASE_LABEL[p.phaseSlug] ?? p.phaseSlug}>
            <ProjectBoard project={p} />
            <div className="mt-4 border-t border-line-soft pt-3">
              <p className="legend">the line it earns</p>
              <p className="prose-cairn mt-1 text-sm leading-relaxed text-mid">{p.resumeLine}</p>
              <p className="mt-1.5 text-2xs leading-relaxed text-lo">
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
