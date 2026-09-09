import {
  pgTable, text, integer, boolean, timestamp, jsonb, primaryKey,
  uniqueIndex, index, real, serial,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

/* ------------------------------------------------------------------ *
 * identity
 * ------------------------------------------------------------------ */

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),

  // cairn profile
  handle: text("handle").unique(),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  telegramChatId: text("telegram_chat_id"),
  telegramLinkToken: text("telegram_link_token"),

  // planning preferences
  budgetWeekdayMin: integer("budget_weekday_min").notNull().default(240),
  budgetWeekendMin: integer("budget_weekend_min").notNull().default(360),
  catchupMode: real("catchup_mode").notNull().default(1),
  reminderSlots: jsonb("reminder_slots").$type<ReminderSlot[]>().notNull().default([]),

  startedAt: timestamp("started_at", { mode: "date" }),
  onboardedAt: timestamp("onboarded_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export type ReminderSlot = {
  kind: "morning_plan" | "aptitude" | "evening_block" | "close_day" | "streak_risk";
  /** local time, "HH:MM" 24h, resolved against users.timezone */
  at: string;
  enabled: boolean;
};

/** the invite allowlist — checked in the Auth.js signIn callback */
export const allowedEmails = pgTable("allowed_emails", {
  email: text("email").primaryKey(),
  invitedBy: text("invited_by"),
  note: text("note"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/* Auth.js adapter tables */

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/* ------------------------------------------------------------------ *
 * curriculum — seeded from content/, never edited at runtime
 * ------------------------------------------------------------------ */

export const phases = pgTable("phases", {
  slug: text("slug").primaryKey(),
  order: integer("order").notNull(),
  title: text("title").notNull(),
  mission: text("mission").notNull(),
  identity: text("identity"),
});

export const tracks = pgTable("tracks", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").$type<TrackKind>().notNull(),
  glyph: text("glyph").notNull(),
  order: integer("order").notNull(),
});

export type TrackKind = "learn" | "drill" | "build" | "perform" | "hunt";

export const modules = pgTable(
  "modules",
  {
    slug: text("slug").primaryKey(),
    trackSlug: text("track_slug").notNull().references(() => tracks.slug),
    phaseSlug: text("phase_slug").notNull().references(() => phases.slug),
    order: integer("order").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    prereqSlugs: jsonb("prereq_slugs").$type<string[]>().notNull().default([]),
  },
  (t) => [index("modules_track_idx").on(t.trackSlug, t.order)],
);

export const units = pgTable(
  "units",
  {
    slug: text("slug").primaryKey(),
    moduleSlug: text("module_slug").notNull().references(() => modules.slug, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    title: text("title").notNull(),
    objective: text("objective").notNull(),
    estMinutes: integer("est_minutes").notNull(),
    conceptMd: text("concept_md").notNull().default(""),
  },
  (t) => [index("units_module_idx").on(t.moduleSlug, t.order)],
);

export const resources = pgTable(
  "resources",
  {
    id: serial("id").primaryKey(),
    unitSlug: text("unit_slug").notNull().references(() => units.slug, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    kind: text("kind").$type<ResourceKind>().notNull(),
    minutes: integer("minutes"),
    whyThisOne: text("why_this_one").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (t) => [uniqueIndex("resources_unit_order_idx").on(t.unitSlug, t.order)],
);

export type ResourceKind = "read" | "watch" | "do" | "lab" | "docs";

export const problems = pgTable(
  "problems",
  {
    slug: text("slug").primaryKey(),
    moduleSlug: text("module_slug").notNull().references(() => modules.slug, { onDelete: "cascade" }),
    unitSlug: text("unit_slug").references(() => units.slug, { onDelete: "set null" }),
    order: integer("order").notNull(),
    title: text("title").notNull(),
    platform: text("platform").$type<Platform>().notNull(),
    url: text("url").notNull(),
    difficulty: text("difficulty").$type<Difficulty>().notNull(),
    patternTag: text("pattern_tag").notNull(),
    triggerHint: text("trigger_hint").notNull(),
    approachHint: text("approach_hint").notNull(),
    estMinutes: integer("est_minutes").notNull().default(20),
    isMust: boolean("is_must").notNull().default(true),
  },
  (t) => [index("problems_module_idx").on(t.moduleSlug, t.order)],
);

export type Platform = "leetcode" | "gfg" | "codestudio" | "hackerrank" | "other";
export type Difficulty = "easy" | "medium" | "hard";

/* ------------------------------------------------------------------ *
 * progress
 * ------------------------------------------------------------------ */

export const unitProgress = pgTable(
  "unit_progress",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    unitSlug: text("unit_slug").notNull().references(() => units.slug, { onDelete: "cascade" }),
    state: text("state").$type<UnitState>().notNull().default("available"),
    minutesSpent: integer("minutes_spent").notNull().default(0),
    completedOnDayIndex: integer("completed_on_day_index"),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.unitSlug] })],
);

export type UnitState = "locked" | "available" | "in_progress" | "done";

export const problemAttempts = pgTable(
  "problem_attempts",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    problemSlug: text("problem_slug").notNull().references(() => problems.slug, { onDelete: "cascade" }),
    outcome: text("outcome").$type<Outcome>().notNull(),
    minutes: integer("minutes"),
    dayIndex: integer("day_index").notNull(),
    /** set when outcome = editorial|failed — resurfaces in the plan on this active day */
    redoDueDay: integer("redo_due_day"),
    redoClearedAt: timestamp("redo_cleared_at", { mode: "date" }),
    hintRevealed: boolean("hint_revealed").notNull().default(false),
    note: text("note"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("attempts_user_idx").on(t.userId, t.problemSlug),
    index("attempts_redo_idx").on(t.userId, t.redoDueDay),
  ],
);

export type Outcome = "clean" | "hinted" | "editorial" | "failed";

/** one row per day you actually showed up — the spine of the whole product */
export const journeyDays = pgTable(
  "journey_days",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    dayIndex: integer("day_index").notNull(),
    calendarDate: text("calendar_date").notNull(), // YYYY-MM-DD in user tz, for streak math only
    openedAt: timestamp("opened_at", { mode: "date" }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { mode: "date" }),
    mode: text("mode").$type<DayMode>().notNull().default("normal"),
    multiplier: real("multiplier").notNull().default(1),
    plan: jsonb("plan").$type<unknown>(),
    minutesTotal: integer("minutes_total").notNull().default(0),
    learnedMd: text("learned_md"),
    logMd: text("log_md"),
    tomorrowFirstTask: text("tomorrow_first_task"),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.dayIndex] }),
    uniqueIndex("journey_days_user_date_idx").on(t.userId, t.calendarDate),
  ],
);

export type DayMode = "normal" | "catchup" | "bad_day";

export const weekReviews = pgTable(
  "week_reviews",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    journeyWeek: integer("journey_week").notNull(),
    answers: jsonb("answers").$type<Record<string, string>>().notNull(),
    threePriorities: jsonb("three_priorities").$type<string[]>().notNull().default([]),
    submittedAt: timestamp("submitted_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.journeyWeek] })],
);

/** auto-generated from completed modules — this is patterns.md, maintained for you */
export const flashcards = pgTable(
  "flashcards",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    unitSlug: text("unit_slug").references(() => units.slug, { onDelete: "cascade" }),
    front: text("front").notNull(),
    back: text("back").notNull(),
    ease: real("ease").notNull().default(2.5),
    intervalDays: integer("interval_days").notNull().default(1),
    dueDayIndex: integer("due_day_index").notNull(),
    lapses: integer("lapses").notNull().default(0),
  },
  (t) => [index("flashcards_due_idx").on(t.userId, t.dueDayIndex)],
);

/* ------------------------------------------------------------------ *
 * side tracks
 * ------------------------------------------------------------------ */

export const aptitudeScores = pgTable("aptitude_scores", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dayIndex: integer("day_index").notNull(),
  topic: text("topic").notNull(),
  correct: integer("correct").notNull(),
  total: integer("total").notNull(),
  minutes: integer("minutes"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const mockSessions = pgTable("mock_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").$type<MockKind>().notNull(),
  journeyWeek: integer("journey_week").notNull(),
  dayIndex: integer("day_index").notNull(),
  score: text("score"),
  notes: text("notes"),
  recordingUrl: text("recording_url"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export type MockKind = "dsa_pair" | "tech_mcq" | "coding_round" | "full_mock" | "hr" | "system_design";

export const starStories = pgTable("star_stories", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  situation: text("situation").notNull().default(""),
  task: text("task").notNull().default(""),
  action: text("action").notNull().default(""),
  result: text("result").notNull().default(""),
  rehearsedCount: integer("rehearsed_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  phaseSlug: text("phase_slug").notNull().references(() => phases.slug),
  order: integer("order").notNull(),
  summary: text("summary").notNull(),
  resumeLine: text("resume_line").notNull(),
  pledgeNoAi: boolean("pledge_no_ai").notNull().default(true),
});

export const deliverables = pgTable(
  "deliverables",
  {
    slug: text("slug").primaryKey(),
    projectSlug: text("project_slug").notNull().references(() => projects.slug, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    title: text("title").notNull(),
    definitionOfDone: text("definition_of_done").notNull(),
    estMinutes: integer("est_minutes").notNull().default(120),
  },
  (t) => [index("deliverables_project_idx").on(t.projectSlug, t.order)],
);

export const deliverableDone = pgTable(
  "deliverable_done",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    deliverableSlug: text("deliverable_slug").notNull().references(() => deliverables.slug, { onDelete: "cascade" }),
    dayIndex: integer("day_index").notNull(),
    evidenceUrl: text("evidence_url"),
    completedAt: timestamp("completed_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.deliverableSlug] })],
);

export const userProjects = pgTable(
  "user_projects",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    projectSlug: text("project_slug").notNull().references(() => projects.slug, { onDelete: "cascade" }),
    repoUrl: text("repo_url"),
    pledgeAcceptedAt: timestamp("pledge_accepted_at", { mode: "date" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.projectSlug] })],
);

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  company: text("company").notNull(),
  role: text("role").notNull(),
  source: text("source").notNull().default("direct"),
  status: text("status").$type<AppStatus>().notNull().default("applied"),
  journeyWeek: integer("journey_week").notNull(),
  link: text("link"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export type AppStatus = "applied" | "responded" | "screening" | "interviewing" | "offer" | "rejected" | "ghosted";

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  company: text("company"),
  channel: text("channel").notNull().default("linkedin"),
  lastTouchWeek: integer("last_touch_week"),
  outcome: text("outcome"),
  notes: text("notes"),
});

/* ------------------------------------------------------------------ *
 * certification
 * ------------------------------------------------------------------ */

export const examAttempts = pgTable("exam_attempts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  phaseSlug: text("phase_slug").notNull().references(() => phases.slug),
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  passed: boolean("passed").notNull(),
  defenseRecordingUrl: text("defense_recording_url"),
  dayIndex: integer("day_index").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const certificates = pgTable("certificates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  phaseSlug: text("phase_slug").notNull().references(() => phases.slug),
  issuedOn: timestamp("issued_on", { mode: "date" }).notNull().defaultNow(),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
});

/* ------------------------------------------------------------------ *
 * reminders
 * ------------------------------------------------------------------ */

/**
 * One row per reminder slot per local day — the idempotency key for the tick.
 *
 * The cron fires every few minutes and each slot has a grace window, so the
 * same slot is evaluated several times. This table is what makes the second
 * evaluation a no-op. `skipped` is recorded as deliberately as `sent`: a
 * streak-risk nudge that found nothing at risk must not be reconsidered at the
 * next tick. Failures write nothing, so they retry on their own.
 */
export const reminderSends = pgTable(
  "reminder_sends",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").$type<ReminderSlot["kind"]>().notNull(),
    /** the user's local date the slot belonged to, YYYY-MM-DD */
    localDate: text("local_date").notNull(),
    status: text("status").$type<ReminderStatus>().notNull(),
    /** the day_index the message described, or null when the day was never opened */
    dayIndex: integer("day_index"),
    reason: text("reason"),
    sentAt: timestamp("sent_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.kind, t.localDate] })],
);

export type ReminderStatus = "sent" | "skipped";

/* ------------------------------------------------------------------ *
 * checkpoints
 * ------------------------------------------------------------------ */

/**
 * One row per checkpoint attempt.
 *
 * Attempts are kept rather than overwritten: passing on the fourth try is a
 * different fact from passing on the first, and the certificate snapshot should
 * be able to say which it was.
 */
export const checkpointAttempts = pgTable(
  "checkpoint_attempts",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    moduleSlug: text("module_slug").notNull().references(() => modules.slug, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    total: integer("total").notNull(),
    passed: boolean("passed").notNull(),
    /** question id -> chosen option index, so a review page can show the misses */
    answers: jsonb("answers").$type<Record<string, number>>().notNull().default({}),
    dayIndex: integer("day_index").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("checkpoint_attempts_user_idx").on(t.userId, t.moduleSlug)],
);
