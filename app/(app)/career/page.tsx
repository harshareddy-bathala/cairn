import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Panel } from "@/components/instrument/panel";
import { Boot, BootItem } from "@/components/instrument/boot";
import {
  ApplicationDesk,
  ContactDesk,
  MockDesk,
  StarBank,
} from "@/components/instrument/career-desk";
import { getJourneyStateCached } from "@/lib/journey";
import { getCareer } from "@/lib/sidetracks";
import {
  APPLICATIONS_FROM_WEEK,
  APPLICATIONS_PER_WEEK,
  STAR_PROMPTS,
  STAR_READY_TARGET,
} from "@/content/cadence";

export const metadata = { title: "Career" };

export default async function CareerPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const journey = await getJourneyStateCached(session.user.id);
  const c = await getCareer(session.user.id);
  const thisWeek = c.applications.filter((a) => a.journeyWeek === journey.journeyWeek).length;
  const starReady = c.stories.filter((s) => s.result.trim()).length;

  return (
    <Boot className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <BootItem>
        <header>
          <p className="legend">week {String(journey.journeyWeek).padStart(2, "0")}</p>
          <h1 className="mt-1 text-2xl text-hi">Career desk</h1>
          <p className="mt-1 max-w-xl text-2xs leading-relaxed text-lo">
            Interviews are a separate skill from the one you practise every morning, and
            they are the one you get graded on. Most people start here too late and find
            out, in the room, that they freeze.
          </p>
        </header>
      </BootItem>

      <BootItem>
        <Panel
          legend="mock cadence"
          aux={`${c.mocks.filter((m) => m.journeyWeek === journey.journeyWeek).length} this week`}
        >
          <MockDesk mocks={c.mocks} journeyWeek={journey.journeyWeek} />
        </Panel>
      </BootItem>

      <BootItem>
        <Panel
          legend="star bank"
          aux={`${Math.min(starReady, STAR_READY_TARGET)}/${STAR_READY_TARGET} ready`}
        >
          <p className="mb-2 text-2xs leading-relaxed text-lo">
            {STAR_READY_TARGET} of these {STAR_PROMPTS.length} ready is the standard — the
            list is longer so you can pick the ones you have real material for. &ldquo;Tell
            me about yourself&rdquo; is first because it sets the tone for everything after
            it.
          </p>
          <StarBank stories={c.stories} />
        </Panel>
      </BootItem>

      <BootItem>
        <Panel
          legend="applications"
          aux={
            journey.journeyWeek >= APPLICATIONS_FROM_WEEK
              ? `${thisWeek}/${APPLICATIONS_PER_WEEK} this week · ${c.applications.length} total`
              : `${c.applications.length} total · lane opens week ${APPLICATIONS_FROM_WEEK}`
          }
          active={journey.journeyWeek >= APPLICATIONS_FROM_WEEK && thisWeek === 0}
        >
          <ApplicationDesk applications={c.applications} journeyWeek={journey.journeyWeek} />
        </Panel>
      </BootItem>

      <BootItem>
        <Panel legend="contacts" aux={`${c.contacts.length}`}>
          <p className="mb-2 text-2xs leading-relaxed text-lo">
            A referral moves further than ten applications. Five conversations started
            beats fifty forms submitted.
          </p>
          <ContactDesk contacts={c.contacts} />
        </Panel>
      </BootItem>
    </Boot>
  );
}
