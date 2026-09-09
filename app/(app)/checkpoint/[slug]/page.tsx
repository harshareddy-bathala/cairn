import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { Panel } from "@/components/instrument/panel";
import { Boot, BootItem } from "@/components/instrument/boot";
import { CheckpointRunner } from "@/components/instrument/quiz-runner";
import { questionsForModule, CHECKPOINT_PASS } from "@/content/checkpoints";
import { modules } from "@/content";

export const metadata = { title: "Checkpoint" };

export default async function CheckpointPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const { slug } = await params;
  const mod = modules.find((m) => m.slug === slug);
  const qs = questionsForModule(slug);
  if (!mod || qs.length === 0) notFound();

  // the answer key never reaches the browser
  const stripped = qs.map((q) => ({
    id: q.id,
    moduleSlug: q.moduleSlug,
    prompt: q.prompt,
    options: q.options,
  }));

  return (
    <Boot className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <BootItem>
        <header>
          <p className="legend">
            <Link href={`/module/${slug}`} className="transition-colors duration-[120ms] hover:text-mid">
              {mod.title}
            </Link>{" "}
            · checkpoint
          </p>
          <h1 className="mt-1 text-2xl text-hi">{mod.title}</h1>
          <p className="mt-1 max-w-xl text-2xs leading-relaxed text-lo">
            {qs.length} questions, {Math.round(CHECKPOINT_PASS * 100)}% to pass. Nothing is
            locked by the result — this only decides whether the module counts toward the
            phase certificate, and every question explains itself afterwards.
          </p>
        </header>
      </BootItem>

      <BootItem>
        <Panel legend="paper" active>
          <CheckpointRunner moduleSlug={slug} questions={stripped} />
        </Panel>
      </BootItem>
    </Boot>
  );
}
