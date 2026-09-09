import { appUrl, composeReminder, contextForChat, dueReminders, REMINDER_KINDS } from "@/lib/reminders";
import {
  deleteWebhook,
  getMe,
  getWebhookInfo,
  setWebhook,
  telegramConfigured,
} from "@/lib/telegram";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Bot plumbing.
 *
 *   npm run telegram -- setup            point the bot's webhook at APP_URL
 *   npm run telegram -- info             who the bot is, and where it delivers
 *   npm run telegram -- unset            stop delivery
 *   npm run telegram -- tick             what the tick would send right now
 *   npm run telegram -- preview <kind> <email>
 *                                        compose one message without sending it
 */
async function main() {
  const [cmd, ...rest] = process.argv.slice(2);

  switch (cmd) {
    case "setup": {
      requireToken();
      const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
      if (!secret) fail("TELEGRAM_WEBHOOK_SECRET is not set — generate one with `openssl rand -hex 32`");
      const url = `${appUrl()}/api/telegram`;
      if (url.startsWith("http://")) {
        fail(`Telegram requires HTTPS; APP_URL is ${appUrl()}.\nFor local work use a tunnel and set APP_URL to it.`);
      }
      await setWebhook(url, secret!);
      const me = await getMe();
      console.log(`webhook -> ${url}`);
      console.log(`bot     -> @${me.username}`);
      console.log(`\nSet TELEGRAM_BOT_USERNAME=${me.username} so Settings can deep-link.`);
      break;
    }

    case "info": {
      requireToken();
      const [me, hook] = [await getMe(), await getWebhookInfo()];
      console.log(`bot      @${me.username} (${me.id})`);
      console.log(`webhook  ${hook.url || "(none)"}`);
      console.log(`pending  ${hook.pending_update_count}`);
      if (hook.last_error_message) console.log(`error    ${hook.last_error_message}`);
      break;
    }

    case "unset":
      requireToken();
      await deleteWebhook();
      console.log("webhook removed");
      break;

    case "tick": {
      const due = await dueReminders();
      console.log(`${due.length} slot(s) due right now\n`);
      for (const ctx of due) {
        const msg = composeReminder(ctx);
        console.log(`--- ${ctx.kind} @ ${ctx.at} ${ctx.timezone} (${ctx.handle ?? ctx.userId})`);
        console.log(msg.send ? msg.text : `(skipped — ${msg.reason})`);
        console.log();
      }
      break;
    }

    case "preview": {
      const [kind, email] = rest;
      if (!kind || !REMINDER_KINDS.includes(kind as never)) {
        fail(`kind must be one of: ${REMINDER_KINDS.join(", ")}`);
      }
      if (!email) fail("usage: npm run telegram -- preview <kind> <email>");

      const [u] = await db
        .select({ chatId: users.telegramChatId })
        .from(users)
        .where(eq(users.email, email!.toLowerCase()));
      if (!u?.chatId) fail(`${email} has no linked Telegram chat`);

      const ctx = await contextForChat(u!.chatId!, kind as never);
      if (!ctx) fail("no context");
      const msg = composeReminder(ctx!);
      console.log(msg.send ? msg.text : `(would skip — ${msg.reason})`);
      break;
    }

    default:
      console.log(
        [
          "npm run telegram -- setup",
          "npm run telegram -- info",
          "npm run telegram -- unset",
          "npm run telegram -- tick",
          "npm run telegram -- preview <kind> <email>",
        ].join("\n"),
      );
  }

  process.exit(0);
}

function requireToken() {
  if (!telegramConfigured()) fail("TELEGRAM_BOT_TOKEN is not set");
}

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
