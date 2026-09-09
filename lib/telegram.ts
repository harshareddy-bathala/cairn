/**
 * The Telegram Bot API, in the two calls this app actually makes.
 *
 * Telegram is the delivery mechanism the dated roadmap never had. It is
 * deliberately the *only* channel: an email nudge is another unread email, and
 * a push notification needs an app. A chat you already have open at 07:00 is
 * the one place a reminder is read.
 */

const API = "https://api.telegram.org";

export function botToken() {
  return process.env.TELEGRAM_BOT_TOKEN ?? "";
}

export function telegramConfigured() {
  return botToken().length > 0;
}

type TelegramResult<T> = { ok: true; result: T } | { ok: false; description?: string; error_code?: number };

async function call<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const token = botToken();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");

  const res = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    // never let a hung Bot API call hold a cron tick open
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });

  const json = (await res.json()) as TelegramResult<T>;
  if (!json.ok) {
    throw new Error(`telegram ${method} failed: ${json.description ?? res.status}`);
  }
  return json.result;
}

export type InlineButton = { text: string; url: string };

/**
 * Link previews are disabled everywhere. A reminder is a readout, not a card —
 * the same rule the panels follow.
 */
export async function sendMessage(input: {
  chatId: string;
  text: string;
  buttons?: InlineButton[];
}) {
  return call<{ message_id: number }>("sendMessage", {
    chat_id: input.chatId,
    text: input.text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(input.buttons?.length
      ? { reply_markup: { inline_keyboard: [input.buttons.map((b) => ({ text: b.text, url: b.url }))] } }
      : {}),
  });
}

export async function getMe() {
  return call<{ id: number; username: string; first_name: string }>("getMe", {});
}

export async function setWebhook(url: string, secretToken: string) {
  return call<boolean>("setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message"],
    drop_pending_updates: true,
  });
}

export async function deleteWebhook() {
  return call<boolean>("deleteWebhook", { drop_pending_updates: true });
}

export async function getWebhookInfo() {
  return call<{ url: string; pending_update_count: number; last_error_message?: string }>(
    "getWebhookInfo",
    {},
  );
}

/** Telegram renders a small HTML subset; everything interpolated gets escaped. */
export function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
