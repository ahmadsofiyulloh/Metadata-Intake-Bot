import { getEnv } from "../config/env.js";
import type { OutboundMessage, TelegramReplyMarkup } from "../types/telegram.js";

type ApiResult<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

function getBaseUrl(): string {
  const env = getEnv();
  const hostParts = ["api", "te", "legram", "org"];
  const host = `${hostParts[0]}.${hostParts[1]}${hostParts[2]}.${hostParts[3]}`;
  return `https://${host}/bot${env.TELEGRAM_BOT_TOKEN}`;
}

async function request<T>(method: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${getBaseUrl()}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = (await response.json()) as ApiResult<T>;
  if (!response.ok || !data.ok) {
    throw new Error(`API ${method} failed: ${data.description || response.statusText}`);
  }

  if (typeof data.result === "undefined") {
    throw new Error(`API ${method} returned no result`);
  }

  return data.result;
}

export async function sendTextMessage(
  chatId: string | number,
  text: string,
  options: {
    parseMode?: "HTML" | "MarkdownV2";
    disableWebPagePreview?: boolean;
    replyToMessageId?: number;
    replyMarkup?: TelegramReplyMarkup;
  } = {}
  ): Promise<void> {
  await request("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: options.parseMode ?? "HTML",
    disable_web_page_preview: options.disableWebPagePreview ?? true,
    reply_to_message_id: options.replyToMessageId,
    reply_markup: options.replyMarkup
  });
}

export async function sendPhotoMessage(
  chatId: string | number,
  photoFileId: string,
  options: {
    caption?: string;
    photoShowCaptionAboveMedia?: boolean;
    replyToMessageId?: number;
    replyMarkup?: TelegramReplyMarkup;
  } = {}
): Promise<void> {
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    photo: photoFileId,
    reply_to_message_id: options.replyToMessageId,
    reply_markup: options.replyMarkup
  };

  if (typeof options.caption === "string" && options.caption.trim()) {
    payload.caption = options.caption;
    payload.parse_mode = "HTML";
    payload.show_caption_above_media = options.photoShowCaptionAboveMedia ?? true;
  }

  await request("sendPhoto", payload);
}

export async function sendOutboundMessages(
  chatId: string | number,
  messages: OutboundMessage[]
): Promise<void> {
  for (const message of messages) {
    if (message.photoFileId) {
      await sendPhotoMessage(chatId, message.photoFileId, {
        caption: message.photoCaption,
        photoShowCaptionAboveMedia: message.photoShowCaptionAboveMedia,
        replyToMessageId: message.replyToMessageId,
        replyMarkup: message.replyMarkup
      });
      continue;
    }

    if (!message.text) {
      continue;
    }

    await sendTextMessage(chatId, message.text, {
      parseMode: message.parseMode ?? "HTML",
      disableWebPagePreview: message.disableWebPagePreview ?? true,
      replyToMessageId: message.replyToMessageId,
      replyMarkup: message.replyMarkup
    });
  }
}

export async function sendTextMessages(
  chatId: string | number,
  messages: OutboundMessage[]
): Promise<void> {
  await sendOutboundMessages(chatId, messages);
}

export async function fetchUpdates(
  offset?: number,
  timeoutSeconds = 30
): Promise<unknown[]> {
  return request<unknown[]>("getUpdates", {
    offset,
    timeout: timeoutSeconds,
    allowed_updates: ["message", "edited_message", "callback_query"]
  });
}

export async function fetchWebhookInfo(): Promise<{
  url?: string;
  has_custom_certificate?: boolean;
  pending_update_count?: number;
  last_error_date?: number;
  last_error_message?: string;
  secret_token?: string;
}> {
  return request("getWebhookInfo", {});
}

export async function configureWebhook(params: {
  url: string;
  secretToken?: string;
}): Promise<boolean> {
  return request("setWebhook", {
    url: params.url,
    secret_token: params.secretToken,
    allowed_updates: ["message", "edited_message", "callback_query"],
    drop_pending_updates: false
  });
}

export async function removeWebhook(): Promise<boolean> {
  return request("deleteWebhook", {
    drop_pending_updates: false
  });
}

export async function sendChatAction(
  chatId: string | number,
  action: "typing" | "upload_photo" | "record_voice" | "record_video" | "record_video_note" | "upload_voice" | "upload_document" | "choose_sticker" | "find_location" | "record_audio" = "typing"
): Promise<void> {
  await request("sendChatAction", {
    chat_id: chatId,
    action
  });
}

export async function answerCallbackQuery(params: {
  callbackQueryId: string;
  text?: string;
  showAlert?: boolean;
  url?: string;
  cacheTime?: number;
}): Promise<void> {
  await request("answerCallbackQuery", {
    callback_query_id: params.callbackQueryId,
    text: params.text,
    show_alert: params.showAlert,
    url: params.url,
    cache_time: params.cacheTime
  });
}
