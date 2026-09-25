import type { Module } from "@/content/types";

export const storyBank: Module = {
  slug: "career-story-bank",
  trackSlug: "career",
  phaseSlug: "depth",
  order: 1,
  title: "The story bank",
  summary:
    "Six STAR stories, a self-introduction that does not sound memorised, a project walk in three lengths, and the questions you ask them. Companies at this band reject for communication far more often than for DSA — and this is the only part of the interview you can fully write in advance.",
  units: [
    {
      slug: "career-stories-star",
      title: "Six STAR stories",
      objective:
        "Write six behavioural stories in STAR form, each with a number in the result, and map every common prompt onto one of them.",
      estMinutes: 120,
      conceptMd: `A behavioural question is not a request for a story. It is a request for **evidence of a behaviour**, and STAR is the shape that makes the evidence checkable:

| | what it answers | share of the answer |
|---|---|---|
| **Situation** | where, when, what was at stake | ~15% |
| **Task** | what *you* were responsible for | ~10% |
| **Action** | what *you* decided and did, in order | ~60% |
| **Result** | what changed — with a number — and what you learned | ~15% |

The action is the answer. Most first drafts are 60% situation: the interviewer learns everything about the project and nothing about you.

**Six stories cover almost every prompt.** You do not need a story per question; you need six strong ones you can bend:

1. **Leading** — Meridian's team of three. A decision you made that someone disagreed with.
2. **A technical failure you fixed** — something broke, you found out why, and you changed the system so it could not happen the same way again.
3. **A conflict** — a real disagreement, how it actually resolved, and what you would do differently.
4. **A deadline crunch** — what you cut, and how you decided what to cut.
5. **Teaching someone** — a classmate, a junior, a teammate onboarding to your code.
6. **Shipping alone** — sentinel or atlas: something you took from a blank repo to running.

"Tell me about a time you failed", "a time you disagreed with your lead", "a time you had to learn fast" — each is one of these six told from a different angle. Write the six first; the mapping is then a lookup.

**Say "I", not "we".** "We migrated the database" tells the interviewer nothing about your part. "I wrote the migration and the rollback, and ran it in a maintenance window" does.

**The result needs a number**, even a small one. "It was faster" is an opinion; "setup went from 40 minutes to 3" is evidence. If you did not measure it at the time, say how you would know — and measure the next one.

Write them in the **star bank on Career**. It is the same six prompts, and a story with a written result is the only kind that counts there.`,
      interviewAngle:
        "Every interview at this band has a behavioural round, and it is pass/fail on whether you can " +
        "describe your own actions concretely. Six rehearsed stories turn the round from improvisation " +
        "into retrieval.",
      pitfalls: [
        "Spending most of the answer on the situation. The action is the answer; the context is only " +
          "there so the action makes sense.",
        "Saying \"we\" throughout. The interviewer is hiring you, not the team — name what you did.",
        "A result with no number and no lesson. \"It went well\" is not a result.",
        "Writing twelve thin stories instead of six deep ones. Six you can bend beat twelve you half " +
          "remember.",
      ],
      recall: [
        {
          front: "In a STAR answer, which part should take most of the time, and roughly how much?",
          back:
            "The Action — around 60%. The situation and task are context; the interviewer is scoring " +
            "what you decided and did.",
        },
        {
          front: "Why write six stories rather than one per behavioural question?",
          back:
            "Most prompts — failure, conflict, learning fast, leading — are the same few stories told " +
            "from a different angle. Six deep ones you can bend cover almost everything.",
        },
        {
          front: "What turns a STAR result from an opinion into evidence?",
          back:
            "A number: a time, a count, a percentage, a before and after. If you did not measure it, " +
            "say how you would know.",
        },
      ],
      resources: [
        {
          title: "Tech Interview Handbook — Behavioral interviews",
          url: "https://www.techinterviewhandbook.org/behavioral-interview/",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "Written for software engineers specifically, with how to prepare a story bank rather than a list of generic answers.",
          isPrimary: true,
        },
        {
          title: "MIT CAPD — The STAR method, with worksheet",
          url: "https://capd.mit.edu/resources/the-star-method-for-behavioral-interviews/",
          kind: "do",
          minutes: 30,
          whyThisOne: "The worksheet is the useful part: fill it once per story before you write the prose.",
        },
        {
          title: "Amazon — Leadership Principles",
          url: "https://www.amazon.jobs/content/en/our-workplace/leadership-principles",
          kind: "read",
          minutes: 15,
          whyThisOne:
            "The most widely copied behavioural rubric in the industry. Checking which principle each story shows exposes the gaps.",
        },
      ],
    },
    {
      slug: "career-intro-walkthrough",
      title: "\"Tell me about yourself\" and the project in three lengths",
      objective:
        "Deliver a 90-second introduction without notes, and walk your best project at 60 seconds, 3 minutes and 10 minutes.",
      estMinutes: 90,
      conceptMd: `"Tell me about yourself" is the first question and it sets the tone for the whole interview. It is not a biography. It is a **90-second pitch** with four beats:

1. **Who you are** — one line. Diploma CS, first in branch, the one thing you are building toward.
2. **What you have built** — two projects, one sentence each, each with a number.
3. **What you want** — the role, stated plainly: reliability, backend, infrastructure.
4. **Why here** — one specific reason about *this* company. Generic praise is worse than nothing.

Rewrite it five times. Then say it out loud, recorded, until it stops sounding written. Memorised word-for-word sounds memorised; memorised *beats* sound like you.

**The project walk comes in three lengths**, because you do not choose which one you are asked for:

| length | when | what it contains |
|---|---|---|
| **60 seconds** | HR round, "briefly" | the problem, what you built, one number |
| **3 minutes** | most technical rounds | + the architecture in one breath, the hardest decision, what broke |
| **10 minutes** | "walk me through it", with a whiteboard | + the diagram, the data model, the trade-offs you rejected, what you would change |

The 10-minute version is a **system design answer about your own system**, not a feature list. Draw the boxes, name the failure modes, say what you would change at ten times the users.

**Meridian and atlas are presented differently.** Meridian is *a system you architected and a team you led* — scope, protocol, decisions. Atlas is *something you built end to end with your own hands* — every line, every deploy. Interviewers will probe either from any direction, so the defense drill matters: if you cannot rebuild a component from a blank file, you do not own it yet.`,
      interviewAngle:
        "The introduction is the one answer you are certain to be asked, and the project walk is where " +
        "the technical round usually goes next. Both are fully preparable, which is exactly why a weak " +
        "one is read as a lack of preparation.",
      pitfalls: [
        "Reciting the resume in order. The interviewer has it; the introduction is the argument, not the list.",
        "One project length. A 10-minute answer to \"briefly\" loses the room; a 60-second answer to " +
          "\"walk me through it\" sounds like you did not build it.",
        "A \"why this company\" that would fit any company. Name something specific — the product, a " +
          "talk, an engineering post.",
        "Presenting Meridian as if you wrote every line. You led it; say what you decided and what the " +
          "team built.",
      ],
      recall: [
        {
          front: "What are the four beats of a 90-second \"tell me about yourself\"?",
          back:
            "Who you are, what you have built (with numbers), what you want, and why this company " +
            "specifically.",
        },
        {
          front: "What does the 10-minute project walk add over the 3-minute one?",
          back:
            "The diagram, the data model, the trade-offs you rejected and what you would change at " +
            "scale — it becomes a system design answer about your own system.",
        },
        {
          front: "Meridian and atlas are presented differently. How?",
          back:
            "Meridian as a system you architected and a team you led; atlas as something you built end " +
            "to end yourself.",
        },
      ],
      resources: [
        {
          title: "Tech Interview Handbook — Crafting the self introduction",
          url: "https://www.techinterviewhandbook.org/self-introduction/",
          kind: "read",
          minutes: 15,
          whyThisOne: "A concrete structure and a worked example for engineers, not generic interview advice.",
          isPrimary: true,
        },
        {
          title: "Tech Interview Handbook — the 30 most common behavioural questions",
          url: "https://www.techinterviewhandbook.org/behavioral-interview-questions/",
          kind: "do",
          minutes: 30,
          whyThisOne:
            "Run the list against your six stories and your introduction: any question you cannot map is a gap to close now.",
        },
      ],
    },
    {
      slug: "career-oncall-questions",
      title: "The on-call answer and the questions you ask",
      objective:
        "Give a mature, honest answer about on-call and shifts, and have three questions ready that show you understand the role.",
      estMinutes: 60,
      conceptMd: `Two short answers that are scored far more than people expect.

**"Are you comfortable with on-call?"** SRE and DevOps roles involve it, and both extremes lose. "I'll do anything" sounds naive; "I'd rather not" ends the conversation. The mature answer shows you know what on-call *is*:

- yes, and you understand it is part of owning production;
- you would want to know how it works there — rotation size, how pages are triaged, whether there is a runbook, whether alerts are actionable;
- you have a small version already: the alert you wrote for atlas, the incident you responded to, the postmortem you wrote.

That last point turns a policy question into evidence. Asking about alert quality also signals you know the difference between a healthy rotation and a burnout machine.

**"Do you have any questions for us?"** Always yes, and always three, prepared. This is scored — it is the interviewer's best read on whether you have thought about the job rather than just the offer. Good questions are about the work:

1. *"What does a new engineer own in their first three months?"*
2. *"What was the last incident, and what changed afterwards?"*
3. *"How do you decide what gets automated versus what stays manual?"*

Avoid questions the website answers, and do not open with salary or leave in a technical round. Pick questions whose answers you actually want — you are also deciding whether you want to work there.

**Also in this unit:** relocation and shifts. Say what is true. If you can relocate, say so plainly; if there is a constraint, name it once without apology.`,
      interviewAngle:
        "The on-call question separates candidates who have read about SRE from candidates who have " +
        "operated something, and the final questions are the last impression you leave. Both are " +
        "short, and both are easy to get wrong unprepared.",
      pitfalls: [
        "Answering on-call with enthusiasm and nothing else. Show you know what makes a rotation " +
          "healthy — actionable alerts, runbooks, a reasonable rotation size.",
        "\"No, I think you covered everything.\" It reads as no interest in the job.",
        "Asking about salary or leave in a technical round. That conversation belongs to HR.",
        "Asking questions the careers page already answers.",
      ],
      recall: [
        {
          front: "What turns the on-call question from a policy answer into evidence?",
          back:
            "Pointing at a small version you have already done — an alert you wrote, an incident you " +
            "handled, a postmortem you published.",
        },
        {
          front: "Why is \"no questions\" at the end of an interview a mistake?",
          back:
            "The questions are scored as a read on whether you have thought about the work. \"No\" reads " +
            "as interest in the offer, not the job.",
        },
      ],
      resources: [
        {
          title: "Tech Interview Handbook — Questions to ask at the end",
          url: "https://www.techinterviewhandbook.org/final-questions/",
          kind: "read",
          minutes: 15,
          whyThisOne: "A long list sorted by who you are talking to. Pick three whose answers you actually want.",
          isPrimary: true,
        },
        {
          title: "Google SRE Book — ch. 11, Being On-Call",
          url: "https://sre.google/sre-book/being-on-call/",
          kind: "read",
          minutes: 25,
          whyThisOne:
            "What a healthy rotation looks like from the inside — the vocabulary that makes your on-call answer sound informed.",
        },
        {
          title: "IndiaBix — HR interview questions",
          url: "https://www.indiabix.com/hr-interview/questions-and-answers/",
          kind: "do",
          minutes: 20,
          whyThisOne: "The HR-round questions campus recruiters in India actually ask, relocation and shifts included.",
        },
      ],
    },
  ],
};
