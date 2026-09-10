"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import QRCode from "qrcode";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  DEFAULT_SLOTS,
  REMINDER_KINDS,
  composeReminder,
  contextForChat,
  isValidTime,
  normaliseSlots,
} from "@/lib/reminders";
import { sendMessage, telegramConfigured } from "@/lib/telegram";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("not signed in");
  return session.user.id;
}

const slotsSchema = z.array(
  z.object({
    kind: z.enum(REMINDER_KINDS as [string, ...string[]]),
    at: z.string().refine(isValidTime, "expected HH:MM"),
    enabled: z.boolean(),
  }),
);

/** IANA zone names change; validate against the runtime rather than a list. */
function validTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function saveReminderSchedule(input: {
  slots: { kind: string; at: string; enabled: boolean }[];
  timezone?: string;
}) {
  const userId = await requireUser();
  const slots = normaliseSlots(slotsSchema.parse(input.slots));
  const tz = input.timezone?.trim();

  if (tz && !validTimezone(tz)) throw new Error(`unknown timezone: ${tz}`);

  await db
    .update(users)
    .set({ reminderSlots: slots, ...(tz ? { timezone: tz } : {}) })
    .where(eq(users.id, userId));

  revalidatePath("/settings");
  return { ok: true, slots };
}

/**
 * Mints the one-time code behind the "Link Telegram" button.
 *
 * The token is the whole handshake: it proves the person holding the chat is
 * the person holding the session. It is cleared the moment it is redeemed, so
 * a forwarded link is a spent one.
 */
export async function startTelegramLink() {
  const userId = await requireUser();
  const token = crypto.randomUUID().replace(/-/g, "");

  await db.update(users).set({ telegramLinkToken: token }).where(eq(users.id, userId));

  const bot = process.env.TELEGRAM_BOT_USERNAME;
  const url = bot ? `https://t.me/${bot}?start=${token}` : null;

  // The QR encodes the same deep link the button uses, so scanning it opens
  // the bot with the token already attached — no code to read across to a
  // phone and retype. Rendered here rather than in the browser so the qrcode
  // library never reaches the client bundle.
  const qr = url
    ? await QRCode.toDataURL(url, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 320,
        color: { dark: "#0a0e0d", light: "#e8efe9" },
      })
    : null;

  revalidatePath("/settings");
  return { token, url, qr };
}

export async function unlinkTelegram() {
  const userId = await requireUser();
  await db
    .update(users)
    .set({ telegramChatId: null, telegramLinkToken: null })
    .where(eq(users.id, userId));
  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Sends one reminder now, composed from the real state of today rather than
 * from a fixture — so the test tells you what the 07:00 message will actually
 * say, not what an example looks like.
 */
export async function sendTestReminder(kind: string) {
  const userId = await requireUser();
  const k = z.enum(REMINDER_KINDS as [string, ...string[]]).parse(kind) as (typeof REMINDER_KINDS)[number];

  if (!telegramConfigured()) return { ok: false as const, error: "the bot token is not configured" };

  const [row] = await db
    .select({ chatId: users.telegramChatId })
    .from(users)
    .where(eq(users.id, userId));
  if (!row?.chatId) return { ok: false as const, error: "no Telegram chat is linked" };

  const ctx = await contextForChat(row.chatId, k);
  if (!ctx) return { ok: false as const, error: "no Telegram chat is linked" };

  const msg = composeReminder(ctx);
  if (!msg.send) return { ok: false as const, error: `nothing to send — ${msg.reason}` };

  await sendMessage({ chatId: ctx.chatId, text: msg.text, buttons: msg.buttons });
  return { ok: true as const };
}

/** Puts the default schedule on an account that has never had one. */
export async function useDefaultSchedule() {
  const userId = await requireUser();
  await db.execute(sql`
    update users set reminder_slots = ${JSON.stringify(DEFAULT_SLOTS)}::jsonb where id = ${userId}
  `);
  revalidatePath("/settings");
  return { ok: true, slots: DEFAULT_SLOTS };
}
