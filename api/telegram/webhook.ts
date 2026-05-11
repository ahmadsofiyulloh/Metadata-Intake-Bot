import { getEnv } from "../../src/config/env.js";
import { handleUpdate } from "../../src/bot/handleUpdate.js";
import type { TelegramUpdate } from "../../src/types/telegram.js";

function isSecretValid(req: any): boolean {
  const env = getEnv();
  if (!env.TELEGRAM_WEBHOOK_SECRET) {
    return true;
  }

  const header = req.headers["x-telegram-bot-api-secret-token"];
  if (Array.isArray(header)) {
    return header[0] === env.TELEGRAM_WEBHOOK_SECRET;
  }
  return header === env.TELEGRAM_WEBHOOK_SECRET;
}

function parseBody(body: unknown): TelegramUpdate {
  if (typeof body === "string") {
    return JSON.parse(body) as TelegramUpdate;
  }
  return body as TelegramUpdate;
}

export default async function handler(req: any, res: any): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  if (!isSecretValid(req)) {
    res.status(401).json({ ok: false, error: "invalid_secret" });
    return;
  }

  try {
    await handleUpdate(parseBody(req.body));
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error", {
      error: error instanceof Error ? error.message : String(error)
    });
    res.status(200).json({ ok: true });
  }
}
