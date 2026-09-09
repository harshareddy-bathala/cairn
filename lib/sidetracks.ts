import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { AppStatus, MockKind } from "@/db/schema";

/**
 * The lanes that are not the curriculum: aptitude, mocks, projects, applications.
 *
 * These are the lanes that die quietly. There is no repo to show for a week of
 * aptitude drills and no commit for five applications sent, so they vanish
 * first and you only notice in November. Counting them is the whole point.
 */

export type Metrics = {
  dsaSolved: number;
  dsaClean: number;
  redoOpen: number;
  aptitude: { dayIndex: number; topic: string; correct: number; total: number }[];
  minutesTotal: number;
  minutesByDay: { dayIndex: number; minutes: number }[];
  applications: number;
  applicationsThisWeek: number;
  appsByStatus: { status: AppStatus; n: number }[];
  mocksThisWeek: { kind: MockKind; n: number }[];
  starReady: number;
  deliverablesDone: number;
  deliverablesTotal: number;
  contacts: number;
};

export async function getMetrics(userId: string, journeyWeek: number): Promise<Metrics> {
  const res = await db.execute<{ data: Metrics }>(sql`
    select json_build_object(
      'dsaSolved', (
        select count(distinct problem_slug)::int from problem_attempts
        where user_id = ${userId} and outcome in ('clean', 'hinted')
      ),
      'dsaClean', (
        select count(distinct problem_slug)::int from problem_attempts
        where user_id = ${userId} and outcome = 'clean'
      ),
      'redoOpen', (
        select count(*)::int from problem_attempts
        where user_id = ${userId} and redo_cleared_at is null and redo_due_day is not null
      ),
      'aptitude', coalesce((
        select json_agg(json_build_object(
          'dayIndex', day_index, 'topic', topic, 'correct', correct, 'total', total
        ) order by day_index)
        from (
          select * from aptitude_scores where user_id = ${userId}
          order by day_index desc, id desc limit 14
        ) a
      ), '[]'::json),
      'minutesTotal', (
        select coalesce(sum(minutes_total), 0)::int from journey_days where user_id = ${userId}
      ),
      'minutesByDay', coalesce((
        select json_agg(json_build_object('dayIndex', day_index, 'minutes', minutes_total)
          order by day_index)
        from (
          select day_index, minutes_total from journey_days
          where user_id = ${userId} and closed_at is not null
          order by day_index desc limit 14
        ) d
      ), '[]'::json),
      'applications', (select count(*)::int from applications where user_id = ${userId}),
      'applicationsThisWeek', (
        select count(*)::int from applications
        where user_id = ${userId} and journey_week = ${journeyWeek}
      ),
      'appsByStatus', coalesce((
        select json_agg(json_build_object('status', status, 'n', n))
        from (
          select status, count(*)::int as n from applications
          where user_id = ${userId} group by status
        ) s
      ), '[]'::json),
      'mocksThisWeek', coalesce((
        select json_agg(json_build_object('kind', kind, 'n', n))
        from (
          select kind, count(*)::int as n from mock_sessions
          where user_id = ${userId} and journey_week = ${journeyWeek} group by kind
        ) m
      ), '[]'::json),
      'starReady', (
        select count(*)::int from star_stories
        where user_id = ${userId} and btrim(result) <> ''
      ),
      'deliverablesDone', (select count(*)::int from deliverable_done where user_id = ${userId}),
      'deliverablesTotal', (select count(*)::int from deliverables),
      'contacts', (select count(*)::int from contacts where user_id = ${userId})
    ) as data
  `);
  return res.rows[0]!.data;
}

/** the rolling accuracy of the aptitude drill, oldest first, as percentages */
export function aptitudeTrend(scores: Metrics["aptitude"]) {
  return scores.filter((s) => s.total > 0).map((s) => Math.round((s.correct / s.total) * 100));
}

export type ProjectView = {
  slug: string;
  name: string;
  summary: string;
  resumeLine: string;
  phaseSlug: string;
  pledgeNoAi: boolean;
  repoUrl: string | null;
  pledgeAcceptedAt: string | null;
  deliverables: {
    slug: string;
    title: string;
    definitionOfDone: string;
    estMinutes: number;
    doneOnDay: number | null;
    evidenceUrl: string | null;
  }[];
};

export async function getProjects(userId: string): Promise<ProjectView[]> {
  const res = await db.execute<{ data: ProjectView[] }>(sql`
    select coalesce(json_agg(t.x order by t."order"), '[]'::json) as data from (
      select p."order", json_build_object(
        'slug', p.slug, 'name', p.name, 'summary', p.summary, 'resumeLine', p.resume_line,
        'phaseSlug', p.phase_slug, 'pledgeNoAi', p.pledge_no_ai,
        'repoUrl', up.repo_url,
        'pledgeAcceptedAt', up.pledge_accepted_at,
        'deliverables', coalesce((
          select json_agg(json_build_object(
            'slug', d.slug, 'title', d.title, 'definitionOfDone', d.definition_of_done,
            'estMinutes', d.est_minutes, 'doneOnDay', dd.day_index, 'evidenceUrl', dd.evidence_url
          ) order by d."order")
          from deliverables d
          left join deliverable_done dd
            on dd.deliverable_slug = d.slug and dd.user_id = ${userId}
          where d.project_slug = p.slug
        ), '[]'::json)
      ) as x
      from projects p
      left join user_projects up on up.project_slug = p.slug and up.user_id = ${userId}
    ) t
  `);
  return res.rows[0]!.data;
}

export type CareerView = {
  applications: {
    id: number;
    company: string;
    role: string;
    source: string;
    status: AppStatus;
    journeyWeek: number;
    link: string | null;
  }[];
  contacts: { id: number; name: string; company: string | null; channel: string; lastTouchWeek: number | null }[];
  mocks: { id: number; kind: MockKind; journeyWeek: number; dayIndex: number; score: string | null; notes: string | null }[];
  stories: { id: number; prompt: string; situation: string; task: string; action: string; result: string; rehearsedCount: number }[];
};

export async function getCareer(userId: string): Promise<CareerView> {
  const res = await db.execute<{ data: CareerView }>(sql`
    select json_build_object(
      'applications', coalesce((
        select json_agg(json_build_object(
          'id', id, 'company', company, 'role', role, 'source', source,
          'status', status, 'journeyWeek', journey_week, 'link', link
        ) order by id desc)
        from applications where user_id = ${userId}
      ), '[]'::json),
      'contacts', coalesce((
        select json_agg(json_build_object(
          'id', id, 'name', name, 'company', company, 'channel', channel,
          'lastTouchWeek', last_touch_week
        ) order by id desc)
        from contacts where user_id = ${userId}
      ), '[]'::json),
      'mocks', coalesce((
        select json_agg(json_build_object(
          'id', id, 'kind', kind, 'journeyWeek', journey_week, 'dayIndex', day_index,
          'score', score, 'notes', notes
        ) order by id desc)
        from (select * from mock_sessions where user_id = ${userId} order by id desc limit 30) m
      ), '[]'::json),
      'stories', coalesce((
        select json_agg(json_build_object(
          'id', id, 'prompt', prompt, 'situation', situation, 'task', task,
          'action', action, 'result', result, 'rehearsedCount', rehearsed_count
        ) order by id)
        from star_stories where user_id = ${userId}
      ), '[]'::json)
    ) as data
  `);
  return res.rows[0]!.data;
}
