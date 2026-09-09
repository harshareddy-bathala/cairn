import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { Panel } from "@/components/instrument/panel";
import { Boot, BootItem } from "@/components/instrument/boot";
import { HandleClaim } from "@/components/instrument/handle-claim";
import { getCertificationState, shapeCertification } from "@/lib/certification";
import { CERT_CHECKPOINTS, CHECKPOINT_PASS, EXAM_UNLOCK } from "@/content/checkpoints";
import { cn } from "@/lib/cn";

export const metadata = { title: "Certification" };

export default async function CertificationPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const raw = await getCertificationState(session.user.id);
  const { modules, standings } = shapeCertification(raw);
  const [me] = await db
    .select({ handle: users.handle })
    .from(users)
    .where(eq(users.id, session.user.id));

  return (
    <Boot className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <BootItem>
        <header>
          <p className="legend">checkpoints · exams · certificates</p>
          <h1 className="mt-1 text-2xl text-hi">Certification</h1>
          <p className="mt-1 max-w-xl text-2xs leading-relaxed text-lo">
            A checkpoint is {Math.round(CHECKPOINT_PASS * 100)}% on that module's questions.
            A phase exam opens at {Math.round(EXAM_UNLOCK * 100)}% of the phase's units.
            The certificate needs the exam, an out-loud defense recording, and{" "}
            {Math.round(CERT_CHECKPOINTS * 100)}% of the phase's checkpoints — passing a
            single quiz should not be able to certify a phase. None of it gates the
            curriculum; the arrow only points one way.
          </p>
        </header>
      </BootItem>

      {standings
        .filter((s) => s.checkpointsTotal > 0)
        .map((s) => (
          <BootItem key={s.phaseSlug}>
            <Panel
              legend={s.title}
              aux={`${s.checkpointsPassed}/${s.checkpointsTotal} checkpoints`}
              active={s.examUnlocked && !s.certificateId}
            >
              <ul className="divide-y divide-line-soft">
                {modules
                  .filter((m) => m.phaseSlug === s.phaseSlug)
                  .map((m) => (
                    <li key={m.moduleSlug} className="flex items-baseline gap-3 py-2">
                      <span
                        className={cn(
                          "w-4 shrink-0 text-center text-sm leading-none",
                          m.passed ? "text-phos" : m.attempts > 0 ? "text-warn" : "text-lo",
                        )}
                        aria-hidden
                      >
                        {m.passed ? "✓" : m.attempts > 0 ? "◐" : "▢"}
                      </span>
                      <Link
                        href={`/checkpoint/${m.moduleSlug}`}
                        className="min-w-0 flex-1 truncate text-sm text-hi transition-colors duration-[120ms] hover:text-phos"
                      >
                        {m.moduleTitle}
                      </Link>
                      <span className="legend shrink-0 tabular-nums">
                        {m.unitsDone}/{m.unitsTotal} units
                      </span>
                      <span className="legend w-12 shrink-0 text-right tabular-nums">
                        {m.bestScore != null ? `${m.bestScore}/${m.bestTotal}` : "—"}
                      </span>
                    </li>
                  ))}
              </ul>

              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line-soft pt-3">
                {s.certificateId ? (
                  <>
                    <span className="legend text-phos">◈ certificate issued</span>
                    <Link
                      href={`/c/${s.certificateId}`}
                      className="text-2xs text-info underline underline-offset-[3px]"
                    >
                      view it
                    </Link>
                  </>
                ) : s.examUnlocked ? (
                  <Link
                    href={`/exam/${s.phaseSlug}`}
                    className="rounded-[3px] border border-line px-3 py-1.5 text-2xs text-mid transition-colors duration-[120ms] hover:border-phos hover:text-phos"
                  >
                    {s.bestExam?.passed ? "defense & certificate" : "take the phase exam"}
                  </Link>
                ) : (
                  <span className="text-2xs text-lo">
                    exam opens at {Math.round(EXAM_UNLOCK * 100)}% of units — {s.unitsDone}/
                    {s.unitsTotal} so far
                  </span>
                )}
                {s.bestExam && (
                  <span className="legend tabular-nums">
                    best {s.bestExam.score}/{s.bestExam.total}
                  </span>
                )}
              </div>
            </Panel>
          </BootItem>
        ))}

      <BootItem>
        <Panel legend="public profile">
          <HandleClaim handle={me?.handle ?? null} />
        </Panel>
      </BootItem>
    </Boot>
  );
}
