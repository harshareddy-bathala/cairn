import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  DEFAULT_SLOTS,
  REMINDER_LABELS,
  appUrl,
  composeReminder,
  contextForChat,
  normaliseSlots,
  type ReminderContext,
} from "@/lib/reminders";
import { streaksOf } from "@/lib/journey";
import { esc, sendMessage } from "@/lib/telegram";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The bot's inbound half.
 *
 * Scope is deliberately narrow: this links a chat to an account and answers
 * questions about the trail. It never changes the plan and never opens a day.
 * Progress is recorded in the app, where the evidence is — a chat message
 * claiming a problem was solved clean is exactly the self-reporting the redo
 * queue exists to replace.
 */

/** Constant-time compare, and closed when the secret is unset. */
function authorised(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
  if (!secret) return false;
  const a = Buffer.from(req.headers.get("x-telegram-bot-api-secret-token") ?? "");
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Update = {
  message?: {
    chat?: { id?: number };
    from?: { first_name?: string };
    text?: string;
  };
};

function ok() {
  // Always 200. A non-2xx makes Telegram redeliver, and a redelivered command
  // is worse than a dropped one.
  return new Response(null, { status: 200 });
}

const HELP = [
  "<b>Cairn</b>",
  "",
  "/plan — today's plan",
  "/status — day, streak, redo queue",
  "/mute — stop all reminders",
  "/unmute — restore the default schedule",
  "",
  "Progress is recorded in the app, not here.",
].join("\n");

export async function POST(req: Request) {
  if (!authorised(req)) return new Response("not found", { status: 404 });

  let update: Update;
  try {
    update = (await req.json()) as Update;
  } catch {
    return ok();
  }

  const chatId = update.message?.chat?.id;
  const text = update.message?.text?.trim() ?? "";
  if (!chatId || !text.startsWith("/")) return ok();

  const chat = String(chatId);
  const [command, arg] = text.split(/\s+/, 2);

  try {
    await handle(chat, command.split("@")[0].toLowerCase(), arg ?? "", update.message?.from?.first_name);
  } catch (e) {
    console.error("[telegram]", e);
    await sendMessage({ chatId: chat, text: "Something went wrong. Try again." }).catch(() => {});
  }
  return ok();
}

async function handle(chat: string, command: string, arg: string, firstName?: string) {
  if (command === "/start") return start(chat, arg, firstName);

  // Everything else needs a linked account.
  const linked = await contextForChat(chat, "morning_plan");
  if (!linked) {
    return sendMessage({
      chatId: chat,
      text: `This chat is not linked to a Cairn account.\nOpen Settings in the app and use the link button there.`,
      buttons: [{ text: "Settings", url: `${appUrl()}/settings` }],
    });
  }

  switch (command) {
    case "/plan": {
      const msg = composeReminder({ ...linked, kind: "morning_plan" });
      return sendMessage({
        chatId: chat,
        text: msg.send ? msg.text : `Day ${linked.todayIndex ?? linked.lastDayIndex} is closed. Rest.`,
        buttons: msg.send ? msg.buttons : [],
      });
    }

    case "/status":
      return sendStatus(chat, linked);

    case "/mute": {
      await db.execute(sql`
        update users set reminder_slots = (
          select jsonb_agg(jsonb_set(s, '{enabled}', 'false'::jsonb))
          from jsonb_array_elements(reminder_slots) s
        )
        where telegram_chat_id = ${chat} and jsonb_array_length(reminder_slots) > 0
      `);
      return sendMessage({
        chatId: chat,
        text: "Reminders off. Nothing else changes — the trail does not move without you.\n/unmute to restore them.",
      });
    }

    case "/unmute": {
      await db.execute(sql`
        update users set reminder_slots = ${JSON.stringify(DEFAULT_SLOTS)}::jsonb
        where telegram_chat_id = ${chat}
      `);
      const lines = DEFAULT_SLOTS.map((s) => `· ${s.at}  ${REMINDER_LABELS[s.kind].label}`);
      return sendMessage({ chatId: chat, text: ["<b>Reminders on</b>", "", ...lines].join("\n") });
    }

    default:
      return sendMessage({ chatId: chat, text: HELP });
  }
}

/** Where you are on the trail, in five numbers. */
async function sendStatus(chat: string, ctx: ReminderContext) {
  const streak = streaksOf(ctx.closedDates, ctx.localDate);
  const day = ctx.todayIndex ?? ctx.lastDayIndex + 1;
  const state = ctx.todayClosed ? "closed" : ctx.todayIndex ? "open" : "unopened";

  return sendMessage({
    chatId: chat,
    text: [
      `<b>Day ${day} · ${state}</b>`,
      `${ctx.closedDates.length} stones placed`,
      `streak ${streak.current}  ·  longest ${streak.longest}`,
      ctx.redoDue > 0 ? `${ctx.redoDue} in the redo queue` : "redo queue clear",
      ctx.tomorrowFirstTask ? `\nfirst task: <i>${esc(ctx.tomorrowFirstTask)}</i>` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    buttons: [{ text: "Open today", url: `${appUrl()}/today` }],
  });
}

/**
 * `/start <token>` completes the link begun in the app.
 *
 * The token is single-use and is cleared on redemption, so a link forwarded to
 * someone else is already spent. Cairn is invite-only; the chat inherits an
 * account that was already on the allowlist rather than creating one.
 */
async function start(chat: string, token: string, firstName?: string) {
  if (!token) {
    const existing = await contextForChat(chat, "morning_plan");
    return sendMessage({
      chatId: chat,
      text: existing
        ? HELP
        : "Open Settings in Cairn and use the link button — it opens this chat with a one-time code.",
      buttons: existing ? [] : [{ text: "Settings", url: `${appUrl()}/settings` }],
    });
  }

  const res = await db.execute<{ handle: string | null; slots: unknown }>(sql`
    update users set
      telegram_chat_id = ${chat},
      telegram_link_token = null,
      reminder_slots = case
        when jsonb_array_length(reminder_slots) = 0 then ${JSON.stringify(DEFAULT_SLOTS)}::jsonb
        else reminder_slots
      end
    where telegram_link_token = ${token}
    returning handle, reminder_slots as slots
  `);

  const row = res.rows[0];
  if (!row) {
    return sendMessage({
      chatId: chat,
      text: "That code is not valid — it may already have been used. Generate a new one in Settings.",
      buttons: [{ text: "Settings", url: `${appUrl()}/settings` }],
    });
  }

  const slots = normaliseSlots(row.slots).filter((s) => s.enabled);
  return sendMessage({
    chatId: chat,
    text: [
      `<b>Linked${firstName ? `, ${esc(firstName)}` : ""}</b>`,
      "",
      ...slots.map((s) => `· ${s.at}  ${REMINDER_LABELS[s.kind].label}`),
      "",
      "Times are your local ones. /mute stops all of it.",
    ].join("\n"),
  });
}
