import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { Panel } from "@/components/instrument/panel";
import { Boot, BootItem } from "@/components/instrument/boot";
import { ExamRunner } from "@/components/instrument/quiz-runner";
import { getCertificationState, shapeCertification } from "@/lib/certification";
import { examMinutes } from "@/lib/quiz-paper";
import {
  CERT_CHECKPOINTS,
  EXAM_PASS,
  EXAM_SIZE,
  EXAM_UNLOCK,
  questions,
} from "@/content/checkpoints";
import { modules, phases } from "@/content";

export const metadata = { title: "Phase exam" };

export default async function ExamPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const { slug } = await params;
  const phase = phases.find((p) => p.slug === slug);
  if (!phase) notFound();

  const raw = await getCertificationState(session.user.id);
  const { standings } = shapeCertification(raw);
  const standing = standings.find((s) => s.phaseSlug === slug)!;

  if (!standing.examUnlocked) {
    return (
      <Boot className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        <BootItem>
          <header>
            <p className="legend">{phase.title} · exam</p>
            <h1 className="mt-1 text-2xl text-hi">Not yet</h1>
          </header>
        </BootItem>
        <BootItem>
          <Panel legend="locked">
            <p className="prose-cairn text-sm leading-relaxed text-mid">
              The exam opens at {Math.round(EXAM_UNLOCK * 100)}% of this phase's units. You
              are at {standing.unitsDone} of {standing.unitsTotal}.
            </p>
            <p className="mt-2 note text-lo">
              This is the only lock in the app, and it points the right way: the exam is
              gated on your progress, never the reverse. A bad result here costs you the
              certificate, not the curriculum.
            </p>
          </Panel>
        </BootItem>
      </Boot>
    );
  }

  // Only the size is known here. The paper itself is drawn when you begin, with
  // a fresh seed per sitting — rendering this page writes nothing.
  const moduleSlugs = new Set(modules.filter((m) => m.phaseSlug === slug).map((m) => m.slug));
  const count = Math.min(EXAM_SIZE, questions.filter((q) => moduleSlugs.has(q.moduleSlug)).length);
  const minutes = examMinutes(count);

  return (
    <Boot className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <BootItem>
        <header>
          <p className="legend">{phase.title} · phase exam</p>
          <h1 className="mt-1 text-2xl text-hi">{phase.title}</h1>
          <p className="mt-1 max-w-xl note text-lo">
            {count} questions drawn across every module in the phase, {minutes} minutes,{" "}
            {Math.round(EXAM_PASS * 100)}% to pass. When the clock runs out the paper
            submits itself. Every sitting is a new paper.
          </p>
        </header>
      </BootItem>

      <BootItem>
        <Panel legend="paper" active>
          <ExamRunner
            phaseSlug={slug}
            questionCount={count}
            timeLimitMin={minutes}
            alreadyPassed={Boolean(standing.bestExam?.passed)}
            hasDefense={standing.hasDefense}
            certificateId={standing.certificateId}
            checkpointsPassed={standing.checkpointsPassed}
            checkpointsNeeded={Math.ceil(standing.checkpointsTotal * CERT_CHECKPOINTS)}
          />
        </Panel>
      </BootItem>
    </Boot>
  );
}
