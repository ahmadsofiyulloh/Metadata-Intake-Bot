import { logBotEvent } from "../db/botEventsRepo.js";
import { clearSession, getActiveSession, setAwaitingSellerTextSession } from "../db/sessionsRepo.js";
import { updateProductDraftFromManualField } from "../db/productDraftsRepo.js";
import type {
  CommandContext,
  OutboundMessage,
  TelegramCallbackQuery,
  TelegramMessage,
  TelegramPhotoSize,
  TelegramUpdate
} from "../types/telegram.js";
import type {
  SupplierIntakeSessionPayload,
  SupplierManualFieldKey,
  SupplierPhotoAttachmentInput
} from "../types/intake.js";
import { sendOutboundMessages } from "./http.js";
import { handleArchiveCommand } from "./commands/archive.js";
import { handleDetailCommand } from "./commands/detail.js";
import { handleNewCommand, handleSupplierSubmission } from "./commands/new.js";
import { handleReadyCommand } from "./commands/ready.js";
import { handleReviewCommand } from "./commands/review.js";
import { handleSearchCommand, handleSearchPromptCommand } from "./commands/search.js";
import { handleShopeeCommand } from "./commands/shopee.js";
import { handleStartCommand } from "./commands/start.js";
import { handleTiktokCommand } from "./commands/tiktok.js";
import { getManualFieldDefinition } from "../metadata/manualFields.js";
import {
  formatMissingFieldInvalidReplyMessage,
  formatMissingFieldPromptMessage,
  formatMissingFieldSavedMessage,
  formatMissingFieldSkippedMessage
} from "./manualFillMessages.js";
import { formatDetailMessage } from "./formatters/metadataMessage.js";
import { buildManualFieldQueue } from "../metadata/manualFields.js";
import {
  buildDraftDetailInlineKeyboard,
  buildManualFieldPromptInlineKeyboard,
  buildManualFillConfirmationInlineKeyboard,
  buildMenuOnlyInlineKeyboard,
  parseCallbackData,
  parseMainMenuText
} from "./navigation.js";
import { answerCallbackQuery, sendChatAction, sendTextMessage } from "./http.js";

function getMessage(update: TelegramUpdate): TelegramMessage | null {
  return update.message ?? update.edited_message ?? null;
}

function extractText(message: TelegramMessage): string {
  return message.text ?? message.caption ?? "";
}

function parseCommand(text: string): { command: string; args: string } | null {
  const match = text.trim().match(/^\/([a-z0-9_]+)(?:@[\w_]+)?(?:\s+([\s\S]+))?$/i);
  if (!match?.[1]) {
    return null;
  }

  return {
    command: match[1].toLowerCase(),
    args: (match[2] ?? "").trim()
  };
}

function buildContext(message: TelegramMessage, text: string, commandArgs: string): CommandContext {
  return {
    update: { update_id: 0, message },
    message,
    text,
    args: commandArgs,
    chatId: String(message.chat.id),
    userId: String(message.from?.id ?? message.chat.id)
  };
}

async function sendReplies(chatId: string | number, replies: OutboundMessage[]): Promise<void> {
  await sendOutboundMessages(chatId, replies);
}

function buildFallbackMessage(): OutboundMessage[] {
  return [
    {
      text: "Gunakan tombol di bawah atau /start untuk melihat bantuan.",
      parseMode: "HTML",
      disableWebPagePreview: true,
      replyMarkup: buildMenuOnlyInlineKeyboard()
    }
  ];
}

function buildPhotoPromptMessage(): OutboundMessage[] {
  return [
    {
      text: [
        "Kirim /new dulu sebelum foto supplier.",
        "Setelah itu, kirim foto supplier bersama caption deskripsi, atau kirim foto dulu lalu teks menyusul."
      ].join("\n"),
      parseMode: "HTML",
      disableWebPagePreview: true,
      replyMarkup: buildMenuOnlyInlineKeyboard()
    }
  ];
}

function getBestPhoto(message: TelegramMessage): TelegramPhotoSize | null {
  const photos = message.photo ?? [];
  if (photos.length === 0) {
    return null;
  }

  return photos[photos.length - 1] ?? null;
}

function buildSupplierPhotoAttachment(
  message: TelegramMessage,
  photo: TelegramPhotoSize
): SupplierPhotoAttachmentInput {
  return {
    telegram_file_id: photo.file_id,
    telegram_file_unique_id: photo.file_unique_id,
    telegram_message_id: message.message_id,
    telegram_caption: message.caption?.trim() ? message.caption.trim() : null,
    telegram_width: photo.width ?? null,
    telegram_height: photo.height ?? null,
    telegram_file_size: photo.file_size ?? null
  };
}

function getSessionPayload(session: Awaited<ReturnType<typeof getActiveSession>>): SupplierIntakeSessionPayload | null {
  if (!session) {
    return null;
  }

  return session.payload_json as unknown as SupplierIntakeSessionPayload;
}

async function storePendingSupplierPhoto(params: {
  userId: string;
  chatId: string;
  photo: SupplierPhotoAttachmentInput;
}): Promise<void> {
  await setAwaitingSellerTextSession({
    telegramUserId: params.userId,
    telegramChatId: params.chatId,
    payload: {
      command: "/new",
      state: "waiting_for_text_after_photo",
      pending_supplier_photo: params.photo
    }
  });
}

function getPendingManualFieldDefinitions(
  pendingFields: SupplierManualFieldKey[]
): ReturnType<typeof getManualFieldDefinition>[] {
  return pendingFields.map((fieldKey) => getManualFieldDefinition(fieldKey));
}

function isSupplierIntakeSessionMode(mode: string | undefined): boolean {
  return (
    mode === "waiting_for_photo_or_text" ||
    mode === "waiting_for_text_after_photo" ||
    mode === "awaiting_raw_seller_text"
  );
}

function isSearchPromptSessionMode(mode: string | undefined): boolean {
  return mode === "awaiting_search_query";
}

async function sendLoadingNotice(params: {
  chatId: string | number;
  replyToMessageId?: number;
  text: string;
}): Promise<void> {
  await sendChatAction(params.chatId, "typing");
  await sendTextMessage(params.chatId, params.text, {
    parseMode: "HTML",
    disableWebPagePreview: true,
    replyToMessageId: params.replyToMessageId
  });
}

async function runWithLoading<T>(params: {
  chatId: string | number;
  replyToMessageId?: number;
  text: string;
  task: () => Promise<T>;
}): Promise<T> {
  await sendLoadingNotice({
    chatId: params.chatId,
    replyToMessageId: params.replyToMessageId,
    text: params.text
  });
  return params.task();
}

function parseManualFillReply(text: string): "continue" | "skip" | "unknown" {
  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  if (!normalized) {
    return "unknown";
  }

  if (["lanjut", "ya", "iya", "ok", "oke", "isi", "mulai"].includes(normalized)) {
    return "continue";
  }

  if (["skip", "lewati", "batal", "stop"].includes(normalized)) {
    return "skip";
  }

  return "unknown";
}

async function handleManualFillSession(params: {
  sessionPayload: SupplierIntakeSessionPayload;
  text: string;
  userId: string;
  chatId: string;
}): Promise<{
  handled: boolean;
  replies: OutboundMessage[];
  nextSession: SupplierIntakeSessionPayload | null;
}> {
  if (!params.sessionPayload.draft_id || !params.sessionPayload.pending_fields?.length) {
    return {
      handled: false,
      replies: [],
      nextSession: params.sessionPayload
    };
  }

  const pendingFieldDefinitions = getPendingManualFieldDefinitions(params.sessionPayload.pending_fields);
  const shortCode = params.sessionPayload.short_code ?? params.sessionPayload.draft_id;
  const currentDefinition = pendingFieldDefinitions[0];
  if (!currentDefinition) {
    return {
      handled: false,
      replies: [],
      nextSession: null
    };
  }

  if (params.sessionPayload.state === "waiting_for_missing_field_confirmation") {
    const decision = parseManualFillReply(params.text);

    await logBotEvent({
      eventType: "manual_fill_confirmation_received",
      telegramUserId: params.userId,
      telegramChatId: params.chatId,
      payload: {
        short_code: shortCode,
        response: decision,
        pending_fields: pendingFieldDefinitions.map((field) => field.label)
      }
    });

    if (decision === "skip") {
      return {
        handled: true,
        replies: [
          {
            text: formatMissingFieldSkippedMessage(shortCode),
            parseMode: "HTML",
            disableWebPagePreview: true,
            replyMarkup: buildMenuOnlyInlineKeyboard()
          }
        ],
        nextSession: null
      };
    }

    if (decision === "continue") {
      return {
        handled: true,
        replies: [
          {
            text: formatMissingFieldPromptMessage(
              currentDefinition,
              pendingFieldDefinitions.length
            ),
            parseMode: "HTML",
            disableWebPagePreview: true,
            replyMarkup: buildManualFieldPromptInlineKeyboard(shortCode)
          }
        ],
        nextSession: {
          ...params.sessionPayload,
          state: "waiting_for_missing_field_value"
        }
      };
    }

    return {
      handled: true,
      replies: [
        {
          text: formatMissingFieldInvalidReplyMessage(shortCode, pendingFieldDefinitions),
          parseMode: "HTML",
          disableWebPagePreview: true,
          replyMarkup: buildManualFillConfirmationInlineKeyboard(shortCode)
        }
      ],
      nextSession: params.sessionPayload
    };
  }

  if (!params.text.trim()) {
    return {
      handled: true,
      replies: [
        {
          text: formatMissingFieldPromptMessage(currentDefinition, pendingFieldDefinitions.length),
          parseMode: "HTML",
          disableWebPagePreview: true,
          replyMarkup: buildManualFieldPromptInlineKeyboard(shortCode)
        }
      ],
      nextSession: params.sessionPayload
    };
  }

  const decision = parseManualFillReply(params.text);
  if (decision === "skip") {
    await logBotEvent({
      eventType: "manual_fill_skipped",
      telegramUserId: params.userId,
      telegramChatId: params.chatId,
      payload: {
        short_code: shortCode,
        pending_fields: pendingFieldDefinitions.map((field) => field.label)
      }
    });

    return {
      handled: true,
      replies: [
        {
          text: formatMissingFieldSkippedMessage(shortCode),
          parseMode: "HTML",
          disableWebPagePreview: true,
          replyMarkup: buildMenuOnlyInlineKeyboard()
        }
      ],
      nextSession: null
    };
  }

  const fieldKey = currentDefinition.key;
  const updateResult = await updateProductDraftFromManualField({
    productDraftId: params.sessionPayload.draft_id,
    fieldKey,
    rawValue: params.text,
    telegramUserId: params.userId,
    telegramChatId: params.chatId
  });

  const remainingDefinitions = buildManualFieldQueue(updateResult.remainingMissingFields);

  const replies: OutboundMessage[] = [
    {
      text: formatMissingFieldSavedMessage(
        currentDefinition,
        remainingDefinitions,
        shortCode
      ),
      parseMode: "HTML",
      disableWebPagePreview: true
    }
  ];

  if (remainingDefinitions.length > 0) {
    replies.push({
      text: formatMissingFieldPromptMessage(remainingDefinitions[0], remainingDefinitions.length),
      parseMode: "HTML",
      disableWebPagePreview: true,
      replyMarkup: buildManualFieldPromptInlineKeyboard(shortCode)
    });

    return {
      handled: true,
      replies,
      nextSession: {
        ...params.sessionPayload,
        state: "waiting_for_missing_field_value",
        pending_fields: remainingDefinitions.map((field) => field.key)
      }
    };
  }

  replies.push({
    text: formatDetailMessage(updateResult.draft),
    parseMode: "HTML",
    disableWebPagePreview: true,
    replyMarkup: buildDraftDetailInlineKeyboard(updateResult.draft.short_code)
  });

  await logBotEvent({
    eventType: "manual_fill_completed",
    telegramUserId: params.userId,
    telegramChatId: params.chatId,
    payload: {
      short_code: shortCode
    }
  });

  return {
    handled: true,
    replies,
    nextSession: null
  };
}

async function persistManualFillOutcome(params: {
  userId: string;
  chatId: string;
  outcome: Awaited<ReturnType<typeof handleManualFillSession>>;
}): Promise<boolean> {
  if (!params.outcome.handled) {
    return false;
  }

  if (params.outcome.nextSession) {
    await setAwaitingSellerTextSession({
      telegramUserId: params.userId,
      telegramChatId: params.chatId,
      payload: params.outcome.nextSession as unknown as Record<string, unknown>
    });
  } else {
    await clearSession(params.userId, params.chatId);
  }

  await sendReplies(params.chatId, params.outcome.replies);
  return true;
}

async function handleCallbackQuery(callbackQuery: TelegramCallbackQuery): Promise<void> {
  const chatId = String(callbackQuery.message?.chat.id ?? callbackQuery.from.id);
  const replyToMessageId = callbackQuery.message?.message_id;
  const userId = String(callbackQuery.from.id);
  const parsed = callbackQuery.data ? parseCallbackData(callbackQuery.data) : null;

  await answerCallbackQuery({
    callbackQueryId: callbackQuery.id
  });

  if (!parsed) {
    await sendReplies(chatId, [
      {
        text: "Aksi tombol tidak dikenali. Gunakan /start atau menu utama.",
        parseMode: "HTML",
        disableWebPagePreview: true,
        replyMarkup: buildMenuOnlyInlineKeyboard()
      }
    ]);
    return;
  }

  const session = await getActiveSession(userId, chatId);
  const sessionPayload = getSessionPayload(session);

  try {
    if (parsed.kind === "menu") {
      if (session) {
        await clearSession(userId, chatId);
      }

      switch (parsed.action) {
        case "new":
          await sendReplies(chatId, await handleNewCommand({ telegramUserId: userId, telegramChatId: chatId }));
          return;
        case "search":
          await sendReplies(chatId, await handleSearchPromptCommand({ telegramUserId: userId, telegramChatId: chatId }));
          return;
        case "review":
          await sendReplies(
            chatId,
            await runWithLoading({
              chatId,
              replyToMessageId,
              text: "Sedang menyiapkan daftar review...",
              task: () => handleReviewCommand()
            })
          );
          return;
        case "ready":
          await sendReplies(
            chatId,
            await runWithLoading({
              chatId,
              replyToMessageId,
              text: "Sedang menyiapkan daftar siap pakai...",
              task: () => handleReadyCommand()
            })
          );
          return;
        case "start":
        default:
          await sendReplies(chatId, await handleStartCommand());
          return;
      }
    }

    if (parsed.kind === "draft") {
      if (parsed.action === "archive") {
        if (session) {
          await clearSession(userId, chatId);
        }

        await sendReplies(
          chatId,
          await runWithLoading({
            chatId,
            replyToMessageId,
            text: `Sedang mengarsipkan ${parsed.shortCode}...`,
            task: () => handleArchiveCommand({ shortCode: parsed.shortCode })
          })
        );
        return;
      }

      const actionText =
        parsed.action === "detail"
          ? "Sedang membuka detail produk..."
          : parsed.action === "shopee"
            ? "Sedang menyiapkan field pack Shopee..."
            : "Sedang menyiapkan field pack TikTok...";
      const replies =
        parsed.action === "detail"
          ? await runWithLoading({
              chatId,
              replyToMessageId,
              text: actionText,
              task: () => handleDetailCommand({ query: parsed.shortCode })
            })
          : parsed.action === "shopee"
            ? await runWithLoading({
                chatId,
                replyToMessageId,
                text: actionText,
                task: () => handleShopeeCommand({ query: parsed.shortCode })
              })
            : await runWithLoading({
                chatId,
                replyToMessageId,
                text: actionText,
                task: () => handleTiktokCommand({ query: parsed.shortCode })
              });

      await sendReplies(chatId, replies);
      return;
    }

    if (parsed.kind === "wizard") {
      if (parsed.action === "menu") {
        if (session) {
          await clearSession(userId, chatId);
        }
        await sendReplies(chatId, await handleStartCommand());
        return;
      }

      if (parsed.action === "detail") {
        const shortCode = parsed.shortCode ?? sessionPayload?.short_code ?? "";
        if (!shortCode.trim()) {
          await sendReplies(chatId, [
            {
              text: "Draft aktif tidak ditemukan. Gunakan /start untuk kembali ke menu utama.",
              parseMode: "HTML",
              disableWebPagePreview: true,
              replyMarkup: buildMenuOnlyInlineKeyboard()
            }
          ]);
          return;
        }

        await sendReplies(
          chatId,
          await runWithLoading({
            chatId,
            replyToMessageId,
            text: "Sedang membuka detail draft...",
            task: () => handleDetailCommand({ query: shortCode })
          })
        );
        return;
      }

      if (!sessionPayload?.draft_id || !sessionPayload.pending_fields?.length) {
        await sendReplies(chatId, [
          {
            text: "Sesi pengisian sudah selesai atau belum aktif. Gunakan /new untuk mulai lagi.",
            parseMode: "HTML",
            disableWebPagePreview: true,
            replyMarkup: buildMenuOnlyInlineKeyboard()
          }
        ]);
        return;
      }

      const syntheticText = parsed.action === "continue" ? "lanjut" : "skip";
      const outcome = await handleManualFillSession({
        sessionPayload,
        text: syntheticText,
        userId,
        chatId
      });

      if (!(await persistManualFillOutcome({ userId, chatId, outcome }))) {
        await sendReplies(chatId, [
          {
            text: "Sesi pengisian sudah tidak aktif. Gunakan /new untuk memulai lagi.",
            parseMode: "HTML",
            disableWebPagePreview: true,
            replyMarkup: buildMenuOnlyInlineKeyboard()
          }
        ]);
      }
    }
  } catch (error) {
    console.error("handleCallbackQuery failed", {
      chatId,
      userId,
      error: error instanceof Error ? error.message : String(error)
    });
    await sendReplies(chatId, [
      {
        text: "Terjadi kesalahan saat memproses tombol. Coba lagi dari menu utama.",
        parseMode: "HTML",
        disableWebPagePreview: true,
        replyMarkup: buildMenuOnlyInlineKeyboard()
      }
    ]);
  }
}

export async function handleUpdate(update: TelegramUpdate): Promise<void> {
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
    return;
  }

  const message = getMessage(update);
  if (!message) {
    return;
  }

  const text = extractText(message).trim();
  const hasPhoto = Boolean(message.photo?.length);
  if (!text && !hasPhoto) {
    return;
  }

  const context = buildContext(message, text, "");
  const session = await getActiveSession(context.userId, context.chatId);
  const sessionPayload = getSessionPayload(session);
  const command = text ? parseCommand(text) : null;
  const menuAction = text ? parseMainMenuText(text) : null;

  try {
    if (command) {
      if (session) {
        await clearSession(context.userId, context.chatId);
      }

      let replies: OutboundMessage[] = [];
      switch (command.command) {
        case "start":
          replies = await handleStartCommand();
          break;
        case "new":
          replies = await handleNewCommand({
            telegramUserId: context.userId,
            telegramChatId: context.chatId
          });
          break;
        case "search":
          replies = command.args.trim()
            ? await runWithLoading({
                chatId: context.chatId,
                replyToMessageId: message.message_id,
                text: "Sedang mencari data...",
                task: () => handleSearchCommand({ query: command.args })
              })
            : await handleSearchCommand({ query: command.args });
          break;
        case "detail":
          replies = command.args.trim()
            ? await runWithLoading({
                chatId: context.chatId,
                replyToMessageId: message.message_id,
                text: "Sedang membuka detail produk...",
                task: () => handleDetailCommand({ query: command.args })
              })
            : await handleDetailCommand({ query: command.args });
          break;
        case "shopee":
          replies = command.args.trim()
            ? await runWithLoading({
                chatId: context.chatId,
                replyToMessageId: message.message_id,
                text: "Sedang menyiapkan field pack Shopee...",
                task: () => handleShopeeCommand({ query: command.args })
              })
            : await handleShopeeCommand({ query: command.args });
          break;
        case "tiktok":
          replies = command.args.trim()
            ? await runWithLoading({
                chatId: context.chatId,
                replyToMessageId: message.message_id,
                text: "Sedang menyiapkan field pack TikTok...",
                task: () => handleTiktokCommand({ query: command.args })
              })
            : await handleTiktokCommand({ query: command.args });
          break;
        case "review":
          replies = await runWithLoading({
            chatId: context.chatId,
            replyToMessageId: message.message_id,
            text: "Sedang menyiapkan daftar review...",
            task: () => handleReviewCommand()
          });
          break;
        case "ready":
          replies = await runWithLoading({
            chatId: context.chatId,
            replyToMessageId: message.message_id,
            text: "Sedang menyiapkan daftar siap pakai...",
            task: () => handleReadyCommand()
          });
          break;
        case "archive":
          replies = command.args.trim()
            ? await runWithLoading({
                chatId: context.chatId,
                replyToMessageId: message.message_id,
                text: `Sedang mengarsipkan ${command.args.trim()}...`,
                task: () => handleArchiveCommand({ shortCode: command.args })
              })
            : await handleArchiveCommand({ shortCode: command.args });
          break;
        default:
          replies = buildFallbackMessage();
          break;
      }

      await sendReplies(context.chatId, replies);
      return;
    }

    if (menuAction) {
      if (session) {
        await clearSession(context.userId, context.chatId);
      }

      let replies: OutboundMessage[] = [];
      switch (menuAction) {
        case "new":
          replies = await handleNewCommand({
            telegramUserId: context.userId,
            telegramChatId: context.chatId
          });
          break;
        case "search":
          replies = await handleSearchPromptCommand({
            telegramUserId: context.userId,
            telegramChatId: context.chatId
          });
          break;
        case "review":
          replies = await runWithLoading({
            chatId: context.chatId,
            replyToMessageId: message.message_id,
            text: "Sedang menyiapkan daftar review...",
            task: () => handleReviewCommand()
          });
          break;
        case "ready":
          replies = await runWithLoading({
            chatId: context.chatId,
            replyToMessageId: message.message_id,
            text: "Sedang menyiapkan daftar siap pakai...",
            task: () => handleReadyCommand()
          });
          break;
        case "start":
        default:
          replies = await handleStartCommand();
          break;
      }

      await sendReplies(context.chatId, replies);
      return;
    }

    if (isSearchPromptSessionMode(session?.mode)) {
      if (!text) {
        await sendReplies(context.chatId, await handleSearchPromptCommand({
          telegramUserId: context.userId,
          telegramChatId: context.chatId
        }));
        return;
      }

      const replies = await runWithLoading({
        chatId: context.chatId,
        replyToMessageId: message.message_id,
        text: "Sedang mencari data...",
        task: () => handleSearchCommand({ query: text })
      });

      await clearSession(context.userId, context.chatId);
      await sendReplies(context.chatId, replies);
      return;
    }

    const activeManualFillSession =
      Boolean(sessionPayload?.draft_id && Array.isArray(sessionPayload.pending_fields) && sessionPayload.pending_fields.length > 0);

    if (activeManualFillSession && sessionPayload) {
      const manualFillResult = await handleManualFillSession({
        sessionPayload,
        text,
        userId: context.userId,
        chatId: context.chatId
      });

      if (await persistManualFillOutcome({
        userId: context.userId,
        chatId: context.chatId,
        outcome: manualFillResult
      })) {
        return;
      }
    }

    const photo = hasPhoto ? getBestPhoto(message) : null;
    const supplierPhoto = photo ? buildSupplierPhotoAttachment(message, photo) : null;

    if (supplierPhoto) {
      await logBotEvent({
        eventType: "supplier_photo_received",
        telegramUserId: context.userId,
        telegramChatId: context.chatId,
        payload: {
          telegram_message_id: supplierPhoto.telegram_message_id,
          telegram_file_unique_id: supplierPhoto.telegram_file_unique_id,
          telegram_file_id: supplierPhoto.telegram_file_id,
          has_caption: Boolean(supplierPhoto.telegram_caption),
          has_session: Boolean(session),
          session_mode: session?.mode ?? null
        }
      });
    }

    if (!session || !isSupplierIntakeSessionMode(session.mode)) {
      if (supplierPhoto) {
        await sendReplies(context.chatId, buildPhotoPromptMessage());
        return;
      }

      await sendReplies(context.chatId, buildFallbackMessage());
      return;
    }

    if (supplierPhoto && !text) {
      await storePendingSupplierPhoto({
        userId: context.userId,
        chatId: context.chatId,
        photo: supplierPhoto
      });

      await logBotEvent({
        eventType: "supplier_photo_staged_for_raw_text",
        telegramUserId: context.userId,
        telegramChatId: context.chatId,
        payload: {
          telegram_message_id: supplierPhoto.telegram_message_id,
          telegram_file_unique_id: supplierPhoto.telegram_file_unique_id
        }
      });

      await sendReplies(context.chatId, [
        {
          text: "Foto supplier sudah diterima. Kirim deskripsi mentah supplier berikutnya agar saya bisa buat metadata dan audit konteksnya.",
          parseMode: "HTML",
          disableWebPagePreview: true
        }
      ]);
      return;
    }

    const pendingPhoto = sessionPayload?.pending_supplier_photo ?? null;

    if (text && supplierPhoto) {
      const result = await runWithLoading({
        chatId: context.chatId,
        replyToMessageId: message.message_id,
        text: "Sedang memproses metadata supplier...",
        task: () =>
          handleSupplierSubmission({
            telegramUserId: context.userId,
            telegramChatId: context.chatId,
            rawSellerText: text,
            supplierPhoto
          })
      });
      if (result.followUpSession) {
        await setAwaitingSellerTextSession({
          telegramUserId: context.userId,
          telegramChatId: context.chatId,
          payload: result.followUpSession as unknown as Record<string, unknown>
        });
      } else {
        await clearSession(context.userId, context.chatId);
      }
      await sendReplies(context.chatId, result.messages);
      return;
    }

    if (text && pendingPhoto) {
      const result = await runWithLoading({
        chatId: context.chatId,
        replyToMessageId: message.message_id,
        text: "Sedang memproses metadata supplier...",
        task: () =>
          handleSupplierSubmission({
            telegramUserId: context.userId,
            telegramChatId: context.chatId,
            rawSellerText: text,
            supplierPhoto: pendingPhoto
          })
      });
      if (result.followUpSession) {
        await setAwaitingSellerTextSession({
          telegramUserId: context.userId,
          telegramChatId: context.chatId,
          payload: result.followUpSession as unknown as Record<string, unknown>
        });
      } else {
        await clearSession(context.userId, context.chatId);
      }
      await sendReplies(context.chatId, result.messages);
      return;
    }

    if (text) {
      const result = await runWithLoading({
        chatId: context.chatId,
        replyToMessageId: message.message_id,
        text: "Sedang memproses metadata supplier...",
        task: () =>
          handleSupplierSubmission({
            telegramUserId: context.userId,
            telegramChatId: context.chatId,
            rawSellerText: text
          })
      });
      if (result.followUpSession) {
        await setAwaitingSellerTextSession({
          telegramUserId: context.userId,
          telegramChatId: context.chatId,
          payload: result.followUpSession as unknown as Record<string, unknown>
        });
      } else {
        await clearSession(context.userId, context.chatId);
      }
      await sendReplies(context.chatId, result.messages);
      return;
    }

    await sendReplies(context.chatId, buildFallbackMessage());
  } catch (error) {
    console.error("handleUpdate failed", {
      chatId: context.chatId,
      userId: context.userId,
      error: error instanceof Error ? error.message : String(error)
    });
    await sendReplies(context.chatId, [
      {
        text: "Terjadi kesalahan internal. Coba lagi atau cek log server.",
        parseMode: "HTML",
        disableWebPagePreview: true
      }
    ]);
  }
}
