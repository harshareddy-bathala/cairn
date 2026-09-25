import type { Question } from "./types";

/**
 * Career checkpoints. Judgement questions, but each with one answer an
 * interviewer would actually accept — the distractors are the answers people
 * really give.
 */
export const careerQuestions: Question[] = [
  // career-story-bank
  {
    id: "star-1",
    moduleSlug: "career-story-bank",
    prompt: "In a STAR answer, which part should take up most of the time?",
    options: [
      "The Action — what you decided and did",
      "The Situation — so the interviewer understands the project",
      "The Result — the outcome is what matters",
      "All four equally",
    ],
    answer: 0,
    why: "Around 60% belongs to the Action. The situation and task are context; the interviewer is scoring your decisions and behaviour, and a long setup leaves no time for them.",
  },
  {
    id: "star-2",
    moduleSlug: "career-story-bank",
    prompt: "Your draft story says \"we migrated the database over a weekend and it went smoothly\". What is the most important fix?",
    options: [
      "Make it shorter",
      "Add more detail about the database",
      "Say what you personally did, and give a measurable result",
      "Replace it with a story from a bigger company",
    ],
    answer: 2,
    why: "\"We\" hides your part and \"smoothly\" is an opinion. \"I wrote the migration and the rollback; downtime was 4 minutes against a 30-minute window\" is evidence.",
  },
  {
    id: "star-3",
    moduleSlug: "career-story-bank",
    prompt: "An interviewer says \"walk me through your project\" with a whiteboard in the room. Which version do you give?",
    options: [
      "The 60-second summary, then stop",
      "A list of every feature",
      "Your resume bullets, read aloud",
      "The ~10-minute version: the diagram, the data model, the trade-offs and what you would change",
    ],
    answer: 3,
    why: "A whiteboard and \"walk me through\" ask for depth. The long version is a system design answer about your own system — the short one sounds like you did not build it.",
  },
  {
    id: "star-4",
    moduleSlug: "career-story-bank",
    prompt: "\"Are you comfortable being on-call?\" — which answer is strongest for an SRE role?",
    options: [
      "\"I'll do whatever it takes, any hours.\"",
      "\"Yes — and I'd like to know how pages are triaged and whether alerts have runbooks. I handled a real alert on my own project.\"",
      "\"I'd prefer a role without on-call.\"",
      "\"It depends on the salary.\"",
    ],
    answer: 1,
    why: "It accepts on-call as part of owning production, shows you know what makes a rotation healthy, and points at evidence. Unbounded enthusiasm reads as naive.",
  },
  {
    id: "star-5",
    moduleSlug: "career-story-bank",
    prompt: "What is the best use of \"Do you have any questions for us?\" in a technical round?",
    options: [
      "Ask about leave policy and salary bands",
      "Say you have none, to save their time",
      "Ask something about the work, such as what changed after their last incident",
      "Ask what the company does",
    ],
    answer: 2,
    why: "The questions are scored as interest in the job. Pay and leave belong to HR, \"none\" reads as indifference, and asking what the company does shows you did not look.",
  },

  // career-offcampus
  {
    id: "off-1",
    moduleSlug: "career-offcampus",
    prompt: "Which resume bullet is strongest?",
    options: [
      "Responsible for deployment and monitoring of the application",
      "Worked with Docker, Kubernetes, AWS, Terraform, Jenkins and Ansible",
      "Passionate DevOps enthusiast with strong problem-solving skills",
      "Built a GitHub Actions pipeline with test gates, cutting deploy time from 25 minutes to 4",
    ],
    answer: 3,
    why: "Action verb, what was built, the technology, and a measurable result. The others are a duty, a keyword list and an adjective.",
  },
  {
    id: "off-2",
    moduleSlug: "career-offcampus",
    prompt: "What is the best first message to an SRE at a company you would like to join?",
    options: [
      "A short note naming their work, yours, and asking for 15 minutes about how they do it",
      "\"Could you refer me for the open DevOps role?\"",
      "Your resume attached, with no message",
      "A long message explaining why you need a job",
    ],
    answer: 0,
    why: "A small, specific ask about their work gets answered; a referral request to a stranger usually does not. Referrals come out of the conversation, if at all.",
  },
  {
    id: "off-3",
    moduleSlug: "career-offcampus",
    prompt: "What is the main difference between your SRE resume and your backend resume?",
    options: [
      "They list different projects that you built separately",
      "Which skills and projects lead — the base content is the same",
      "The SRE one is two pages",
      "Only the objective statement changes",
    ],
    answer: 1,
    why: "One base document, reordered. The facts do not change between roles; the emphasis does, so each reads as a close fit.",
  },
  {
    id: "off-4",
    moduleSlug: "career-offcampus",
    prompt: "You sent an outreach message a week ago and heard nothing. What now?",
    options: [
      "Message again every two days until they reply",
      "Send one polite follow-up, then let it go",
      "Message their manager instead",
      "Post publicly asking them to reply",
    ],
    answer: 1,
    why: "One follow-up after a week is polite and often works; more than that burns the contact.",
  },
  {
    id: "off-5",
    moduleSlug: "career-offcampus",
    prompt: "Which section of a project write-up is most valuable to a reader who hires engineers?",
    options: [
      "The list of technologies used",
      "Thanks to everyone who helped",
      "What broke, how you found out, and what you changed",
      "Screenshots of the UI",
    ],
    answer: 2,
    why: "The failure and the fix show engineering judgement — and give the interviewer a question you are guaranteed to answer well.",
  },
];
