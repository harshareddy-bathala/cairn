import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import {
  composeReminder,
  dueReminders,
  recordSends,
  type ReminderKind,
} from "@/lib/reminders";
import { sendMessage, telegramConfigured } from "@/lib/telegram";
import type { ReminderStatus } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The reminder tick.
 *
 * Driven by the Cloudflare Worker in `workers/reminders`, every five minutes.
 * The schedule lives out there because Cairn has no long-running process of its
 * own; the decisions all live in here, where they share the app's types and
 * database. The worker is a clock, nothing more.
 *
 * Deliberately idempotent: a slot is keyed by (user, kind, local date), so a
 * double-fire, a worker retry, and a manual curl all collapse to one message.
 */

function authorised(req: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) return false;

  const header = req.headers.get("authorization") ?? "";
  const offered = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(offered);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Record_ = {
  userId: string;
  kind: ReminderKind;
  localDate: string;
  status: ReminderStatus;
  dayIndex: number | null;
  reason: string | null;
};

async function tick(dry: boolean) {
  const due = await dueReminders();
  const records: Record_[] = [];
  const log: { user: string; kind: string; status: string; reason?: string; text?: string }[] = [];

  for (const ctx of due) {
    const msg = composeReminder(ctx);
    const base = { userId: ctx.userId, kind: ctx.kind, localDate: ctx.localDate };

    if (!msg.send) {
      records.push({ ...base, status: "skipped", dayIndex: msg.dayIndex, reason: msg.reason });
      log.push({ user: ctx.handle ?? ctx.userId, kind: ctx.kind, status: "skipped", reason: msg.reason });
      continue;
    }

    if (dry) {
      log.push({ user: ctx.handle ?? ctx.userId, kind: ctx.kind, status: "would-send", text: msg.text });
      continue;
    }

    try {
      await sendMessage({ chatId: ctx.chatId, text: msg.text, buttons: msg.buttons });
      records.push({ ...base, status: "sent", dayIndex: msg.dayIndex, reason: null });
      log.push({ user: ctx.handle ?? ctx.userId, kind: ctx.kind, status: "sent" });
    } catch (e) {
      // No row is written, so the next tick inside the grace window retries.
      log.push({
        user: ctx.handle ?? ctx.userId,
        kind: ctx.kind,
        status: "failed",
        reason: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // One write for the whole tick, whatever the fan-out was.
  if (!dry) await recordSends(records);

  return {
    ok: true,
    due: due.length,
    sent: log.filter((l) => l.status === "sent").length,
    skipped: log.filter((l) => l.status === "skipped").length,
    failed: log.filter((l) => l.status === "failed").length,
    log,
  };
}

export async function POST(req: NextRequest) {
  if (!authorised(req)) return new Response("not found", { status: 404 });
  if (!telegramConfigured()) {
    return Response.json({ ok: false, error: "TELEGRAM_BOT_TOKEN is not set" }, { status: 503 });
  }
  return Response.json(await tick(false));
}

/** Same selection, composed but never sent — for looking at what a slot would say. */
export async function GET(req: NextRequest) {
  if (!authorised(req)) return new Response("not found", { status: 404 });
  return Response.json(await tick(true));
}
