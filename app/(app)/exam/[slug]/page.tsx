import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { Panel } from "@/components/instrument/panel";
import { Boot, BootItem } from "@/components/instrument/boot";
import { ExamRunner } from "@/components/instrument/quiz-runner";
import { examPaper, getCertificationState, shapeCertification } from "@/lib/certification";
import { CERT_CHECKPOINTS, EXAM_PASS, EXAM_UNLOCK } from "@/content/checkpoints";
import { modules, phases } from "@/content";

export const metadata = { title: "Phase exam" };

/** one minute per question, which is tight enough to matter and fair enough to pass */
const MINUTES_PER_QUESTION = 1.5;

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
            <p className="mt-2 text-2xs leading-relaxed text-lo">
              This is the only lock in the app, and it points the right way: the exam is
              gated on your progress, never the reverse. A bad result here costs you the
              certificate, not the curriculum.
            </p>
          </Panel>
        </BootItem>
      </Boot>
    );
  }

  // Deterministic per user and phase: reloading must not reroll the paper.
  const seed = hash(`${session.user.id}:${slug}`);
  const moduleSlugs = modules.filter((m) => m.phaseSlug === slug).map((m) => m.slug);
  const qs = examPaper(slug, moduleSlugs, seed);

  return (
    <Boot className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <BootItem>
        <header>
          <p className="legend">{phase.title} · phase exam</p>
          <h1 className="mt-1 text-2xl text-hi">{phase.title}</h1>
          <p className="mt-1 max-w-xl text-2xs leading-relaxed text-lo">
            {qs.length} questions drawn across every module in the phase,{" "}
            {Math.round(qs.length * MINUTES_PER_QUESTION)} minutes,{" "}
            {Math.round(EXAM_PASS * 100)}% to pass. When the clock runs out the paper
            submits itself.
          </p>
        </header>
      </BootItem>

      <BootItem>
        <Panel legend="paper" active>
          <ExamRunner
            phaseSlug={slug}
            seed={seed}
            timeLimitMin={Math.round(qs.length * MINUTES_PER_QUESTION)}
            questions={qs.map((q) => ({
              id: q.id,
              moduleSlug: q.moduleSlug,
              prompt: q.prompt,
              options: q.options,
            }))}
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

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
