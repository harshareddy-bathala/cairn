import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { certificates, users } from "@/db/schema";
import { phases } from "@/content";
import { CertificateSeal } from "@/components/instrument/certificate";

export const metadata = { title: "Certificate" };

type Snapshot = {
  examScore: number;
  examTotal: number;
  dayIndex: number;
  unitsDone: number;
  unitsTotal: number;
  checkpointsPassed: number;
  problemsSolved: number;
  activeDays: number;
  name: string;
};

/**
 * The public certificate.
 *
 * No sign-in: the link is the credential. Everything shown is the snapshot
 * taken at issue time, never today's numbers — a certificate that quietly
 * restated your current state would not be a record of anything.
 */
export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [row] = await db
    .select({
      id: certificates.id,
      phaseSlug: certificates.phaseSlug,
      issuedOn: certificates.issuedOn,
      snapshot: certificates.snapshot,
      handle: users.handle,
      name: users.name,
    })
    .from(certificates)
    .innerJoin(users, eq(users.id, certificates.userId))
    .where(eq(certificates.id, id));

  if (!row) notFound();

  const phase = phases.find((p) => p.slug === row.phaseSlug);
  const s = row.snapshot as unknown as Snapshot;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <CertificateSeal
        id={row.id}
        name={row.name ?? s.name}
        handle={row.handle}
        phaseTitle={phase?.title ?? row.phaseSlug}
        identity={phase?.identity ?? ""}
        issuedOn={row.issuedOn.toISOString().slice(0, 10)}
        snapshot={s}
      />
    </main>
  );
}
