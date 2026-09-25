import type { Module } from "@/content/types";

export const offCampus: Module = {
  slug: "career-offcampus",
  trackSlug: "career",
  phaseSlug: "depth",
  order: 2,
  title: "The off-campus lane",
  summary:
    "Three resumes from one base, five quality applications a week, conversations that turn into referrals, and a write-up per project. Your branch's campus history tops out below your target; this lane is where the rest of the market lives.",
  prereqSlugs: ["career-story-bank"],
  units: [
    {
      slug: "career-resumes",
      title: "Three resumes from one base",
      objective:
        "Produce DevOps/SRE, SDE/Backend and Core IT/Infra resumes on one page each, with every bullet in action-plus-result form.",
      estMinutes: 150,
      primer: `A recruiter spends seconds on a resume, and software (an **ATS**) often filters it before a person sees it. So a resume has one job: make the right three things obvious, fast.

The rules that matter:

- **One page**, a plain layout a machine can read — no tables, columns or photos.
- Each bullet is **action + result**: "Built X using Y, which cut Z by 40%", not "Responsible for X".
- Put the skills and keywords of the role you are applying for where they show.

Since you are aiming at DevOps/SRE, SDE/backend and core IT/infra roles, keep **one base resume** and make three versions from it, each leading with what that role cares about.

**You need already:** your project list, and your STAR stories for the numbers.`,
      conceptMd: `One base document, three orderings. The content barely changes between them; the **emphasis** does:

| resume | leads with | top projects |
|---|---|---|
| **DevOps / SRE** | Linux, Docker, AWS, Terraform, CI/CD, Prometheus, networking | atlas, sentinel |
| **SDE / Backend** | C++, Python, DSA, FastAPI, PostgreSQL, testing, system design | atlas, Meridian |
| **Core IT / Infra** | CCNA, networking, monitoring, security, ITIL | sentinel, Meridian |

**Every bullet: action verb + what you built + technology + measurable result.**

\`\`\`text
weak:   Worked on Docker and deployment.
strong: Containerised a 4-service app with Docker Compose, cutting local setup from 40 minutes to 3.
\`\`\`

The strong bullet answers the three questions a reader has — *what did you do, with what, and did it matter* — in one line. If a bullet has no result, ask what would have been worse without it.

**One page.** At this stage a second page is read as an inability to choose. Cut the objective statement, the hobbies, and any skill you could not be interviewed on for five minutes — a listed skill is an invitation to be asked about it.

**Always visible at the top:** CGPA and rank, the certifications, and team lead on Meridian. These are the facts that get the resume past the first ten seconds.

**Keep it parseable.** Many applications go through an applicant-tracking system first: a single column, standard section headings, real text rather than text in images, and the job's own words for skills you genuinely have. Export to PDF and check that you can select and copy the text.

Name the files by role — \`resume-sre.pdf\`, not \`resume-final-v3.pdf\` — and keep all three current as projects ship.`,
      interviewAngle:
        "The resume is the script for the technical interview: every line is a question you may be " +
        "asked. A tight one-pager with results in every bullet also decides whether there is an " +
        "interview at all.",
      pitfalls: [
        "Bullets that describe duties instead of results. \"Responsible for monitoring\" says nothing " +
          "about what you built or changed.",
        "Listing a skill you cannot be questioned on for five minutes. It will be the first question.",
        "Two pages, or a design-heavy template that an applicant-tracking system cannot read.",
        "One resume sent to every role. The same content, reordered, reads as a much better fit.",
      ],
      recall: [
        {
          front: "What four parts should every resume bullet have?",
          back: "An action verb, what you built, the technology, and a measurable result.",
        },
        {
          front: "What is the risk of listing a skill you only touched once?",
          back:
            "Every listed skill is an invitation to be interviewed on it — and a weak answer there " +
            "costs credibility for the rest of the resume.",
        },
        {
          front: "What actually changes between the SRE and the backend resume?",
          back:
            "Emphasis, not content: which skills lead and which projects sit on top. The facts are the " +
            "same base document reordered.",
        },
      ],
      resources: [
        {
          title: "Tech Interview Handbook — Writing software engineer resumes",
          url: "https://www.techinterviewhandbook.org/resume/",
          kind: "read",
          minutes: 40,
          whyThisOne:
            "Bullet formulas, ATS rules and worked before-and-after examples — the whole unit's checklist on one page.",
          steps: [
            "Read the page and turn its rules into a checklist.",
            "Rewrite every bullet of your current resume as action plus result.",
            "Make the three versions from one base, changing only the order and the emphasis.",
            "Check each version against your checklist.",
          ],
          isPrimary: true,
        },
      ],
    },
    {
      slug: "career-applications-outreach",
      title: "Applications and outreach that lead to referrals",
      objective:
        "Send five tracked, targeted applications a week, and write outreach that asks for a conversation rather than a job.",
      estMinutes: 90,
      primer: `Most off-campus jobs are filled through people, not job boards. A referral from someone inside the company puts your resume in front of a person instead of a filter.

You get referrals by having real conversations first. Find engineers at companies you want (LinkedIn works), and ask for **15 minutes to hear about their work** — an *informational interview* — not for a job. A small, specific request is easy to say yes to. If the conversation goes well, a referral often follows without you asking.

Alongside, send **five targeted applications a week**, each tracked (company, role, date, status) so you follow up instead of forgetting.

**You need already:** your resumes from the last unit.`,
      conceptMd: `Cold applications to a careers page convert badly for everyone, and worst for a diploma candidate that a filter may drop before a person reads. Referrals convert far better — and **referrals come out of conversations, not requests**.

**Five quality applications a week, tracked.** Quality means the resume variant fits the role, you have read what the team does, and you could say in one sentence why you applied. Track each one — company, role, date, source, status — in the applications log on Career, so follow-ups happen on time and rejections turn into data.

Target the roles where your evidence is strongest: Junior SRE, DevOps Engineer, Platform Engineer, Backend Engineer, Cloud Engineer — at product companies and funded startups. You are in Bengaluru; most of them are too.

**Outreach, five a week.** Connect with SREs and engineering managers at companies you would want. Ask for fifteen minutes about their work — not for a job, and not for a referral:

\`\`\`text
Hi Priya — I'm a final-year diploma CS student building a small production
API on AWS (Terraform, GitHub Actions, Prometheus). I read your post on
moving alerting to SLO burn rates and had a question about how you tuned
the windows. Would you have 15 minutes sometime in the next two weeks?
\`\`\`

It is short, it shows you have done real work, it names something specific about *them*, and the ask is small. Then:

- **In the conversation**, ask about their work and listen. Do not ask for a referral unless they offer — many will, once they have seen how you think.
- **Afterwards**, thank them the same day, and send one update when something ships. That is how a contact becomes a referral a month later.
- **No reply?** One polite follow-up after a week, then let it go.

The numbers are small on purpose. Five a week, every week, beats forty in one anxious weekend.`,
      interviewAngle:
        "This unit does not show up in an interview — it decides how many you get. It also shapes " +
        "their quality: an interview that arrives through a referral starts with someone already " +
        "vouching for you.",
      pitfalls: [
        "Opening with \"can you refer me?\" to a stranger. It is the fastest way to be ignored.",
        "Mass-applying with one resume. Five targeted applications beat fifty generic ones.",
        "Not tracking applications, so follow-ups are missed and nothing is learned from rejections.",
        "Following up more than once. One nudge after a week is polite; three is a reason to block you.",
      ],
      recall: [
        {
          front: "In a first outreach message, what should you ask for — and what should you not?",
          back:
            "Ask for a short conversation about their work. Do not ask for a job or a referral; a " +
            "referral comes out of the conversation, if at all.",
        },
        {
          front: "What four things make a cold outreach message work?",
          back:
            "It is short, it shows real work you have done, it names something specific about them, " +
            "and the ask is small.",
        },
        {
          front: "Why track every application, even the ones that go nowhere?",
          back:
            "So follow-ups happen on time and rejections become data about which roles and resume " +
            "variants actually get responses.",
        },
      ],
      resources: [
        {
          title: "The Muse — How to ask for an informational interview",
          url: "https://www.themuse.com/advice/how-to-ask-for-an-informational-interview-and-get-a-yes",
          kind: "read",
          minutes: 15,
          whyThisOne:
            "Why a small, specific ask gets a yes, with message examples to adapt rather than copy.",
          steps: [
            "Read the article and its example messages.",
            "Write your own short outreach message for a named engineer at one company.",
            "Read the LinkedIn guide (next link) for what to ask during the call and how to follow up.",
            "Log five applications and two outreach messages in the Desk this week.",
          ],
          isPrimary: true,
        },
        {
          title: "LinkedIn — Guide to informational interviews",
          url: "https://www.linkedin.com/business/learning/blog/career-success-tips/guide-to-informational-interviews",
          kind: "read",
          whyThisOne:
            "What to ask during the conversation and how to follow up afterwards — the part most people skip.",
        },
      ],
    },
    {
      slug: "career-writeups-gd",
      title: "Project write-ups and group discussion",
      objective:
        "Publish one short write-up per project and a README that explains it in a minute, and hold your ground in a group discussion.",
      estMinutes: 120,
      primer: `Two ways of being judged on communication.

**Project write-ups.** A good README lets a reviewer understand your project in a minute: what it does, why, how to run it, and what is interesting about how it works. A short blog post per project goes further — the problem, the design, one hard thing you solved — and gives interviewers something specific to ask about.

**Group discussion (GD).** Many campus drives include a GD round: a group discusses a topic while evaluators watch. They reward clear points backed by facts, listening and building on others' points, and summarising — not the loudest voice. Practise by preparing two points on each side of a few topics.

**You need already:** your projects, and your STAR stories.`,
      conceptMd: `**A write-up per project.** One short post for each shipped project, on LinkedIn or a blog: what you built, **what broke**, and what you learned. The breakage is the interesting part — "the health check passed while the database was down, so I split liveness from readiness" is the kind of line an engineer stops scrolling for. These get read far more than people expect, and they give interviewers something to ask about that you are guaranteed to know.

A shape that works:

1. The problem, in two sentences.
2. What you built — one diagram if it helps.
3. The thing that broke, and how you found out.
4. What you changed, with a number.
5. What you would do next.

**The README is the project's front door.** A reviewer who opens the repo should know in one minute what it is, why it exists, how to run it, and what its architecture is. Pin your best four repositories. The contribution graph is quiet evidence of the discipline these roles hire for.

**Group discussion** still appears in campus drives. It is scored on contribution, not volume:

- **Open or summarise** if you can — both are remembered. Opening means defining the topic and framing the sides; summarising means pulling the discussion together at the end.
- **Add a new point or a fact**, not a louder version of the last one.
- **Bring others in** — "I'd like to hear what you think about the cost side" is a leadership signal.
- **Disagree with the point, not the person**, and never talk over someone.

Two or three practice rounds with classmates are worth more than any amount of reading about it.`,
      interviewAngle:
        "Write-ups and READMEs are read before the interview and questioned during it — they let you " +
        "choose the ground. Group discussion is an elimination round in many campus drives, so an " +
        "unpractised one can end the process early.",
      pitfalls: [
        "A write-up that is a feature list. What broke and what you changed is the story.",
        "A README without run instructions or an architecture sketch. The reviewer gives it one minute.",
        "Treating group discussion as a debate to win. Talking over people is scored against you.",
        "Speaking only once in a GD, at length. Two or three short, new contributions score better.",
      ],
      recall: [
        {
          front: "What is the most valuable section of a project write-up, and why?",
          back:
            "What broke and how you fixed it. It is the part that shows engineering judgement, and it " +
            "gives an interviewer a question you are sure to answer well.",
        },
        {
          front: "What four questions should a README answer in its first minute?",
          back: "What the project is, why it exists, how to run it, and how it is put together.",
        },
        {
          front: "In a group discussion, which two moments are the most remembered to own?",
          back:
            "Opening (framing the topic) and summarising (pulling the discussion together at the end).",
        },
      ],
      resources: [
        {
          title: "Make a README",
          url: "https://www.makeareadme.com/",
          kind: "do",
          minutes: 20,
          whyThisOne:
            "A short, opinionated template for what a README owes its reader.",
          steps: [
            "Read the template's sections.",
            "Rewrite the README of your best project to follow it.",
            "Write a short post about that project using the freeCodeCamp structure (next link).",
            "Prepare both sides of two topics from IndiaBix (last link) and argue one aloud for three minutes.",
          ],
          isPrimary: true,
        },
        {
          title: "freeCodeCamp — How to write a great technical blog post",
          url: "https://www.freecodecamp.org/news/how-to-write-a-great-technical-blog-post-414c414b67f6/",
          kind: "read",
          whyThisOne:
            "Structure and length for a post an engineer will actually finish.",
        },
        {
          title: "IndiaBix — Group discussion topics",
          url: "https://www.indiabix.com/group-discussion/",
          kind: "do",
          whyThisOne:
            "Topics in the style campus drives use, with points on both sides.",
        },
      ],
    },
  ],
};
