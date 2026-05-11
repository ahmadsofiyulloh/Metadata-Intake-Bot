import { createProductDraftFromGeneration } from "../../db/productDraftsRepo.js";
import { setAwaitingSellerTextSession } from "../../db/sessionsRepo.js";
import type {
  SupplierIntakeSessionPayload,
  SupplierPhotoAttachmentInput
} from "../../types/intake.js";
import type { OutboundMessage } from "../../types/telegram.js";
import { buildManualFieldQueue } from "../../metadata/manualFields.js";
import { formatNewDraftMessage } from "../formatters/metadataMessage.js";
import { code } from "../formatters/telegramHtml.js";
import { formatMissingFieldConfirmationMessage } from "../manualFillMessages.js";
import { generateMetadata } from "../../metadata/generateMetadata.js";
import {
  buildDraftDetailInlineKeyboard,
  buildManualFillConfirmationInlineKeyboard,
  buildMenuOnlyInlineKeyboard
} from "../navigation.js";

export async function handleNewCommand(params: {
  telegramUserId: string;
  telegramChatId: string;
}): Promise<OutboundMessage[]> {
  await setAwaitingSellerTextSession({
    telegramUserId: params.telegramUserId,
    telegramChatId: params.telegramChatId,
    payload: {
      command: "/new",
      state: "waiting_for_photo_or_text"
    }
  });

  return [
    {
      text: [
        "Kirim foto supplier bersama caption deskripsi, atau kirim foto dulu lalu deskripsi mentahnya menyusul.",
        "Kalau caption terlalu panjang, kirim fotonya dulu lalu teks terpisah.",
        "Ketik /new lagi kalau mau mulai input baru."
      ].join("\n"),
      parseMode: "HTML",
      disableWebPagePreview: true,
      replyMarkup: buildMenuOnlyInlineKeyboard()
    }
  ];
}

export async function handleSupplierSubmission(params: {
  telegramUserId: string;
  telegramChatId: string;
  rawSellerText: string;
  supplierPhoto?: SupplierPhotoAttachmentInput | null;
}): Promise<{
  messages: OutboundMessage[];
  followUpSession: SupplierIntakeSessionPayload | null;
}> {
  const generation = await generateMetadata(params.rawSellerText);
  const { draft, supplierPhotoAttachment } = await createProductDraftFromGeneration({
    generation,
    rawSellerText: params.rawSellerText,
    telegramUserId: params.telegramUserId,
    telegramChatId: params.telegramChatId,
    supplierPhoto: params.supplierPhoto ?? null
  });

  const messageParts: OutboundMessage[] = formatNewDraftMessage(draft).map((text) => ({
    text,
    parseMode: "HTML" as const,
    disableWebPagePreview: true
  }));

  const manualFieldQueue = buildManualFieldQueue(draft.missing_fields);
  const followUpSession: SupplierIntakeSessionPayload | null =
    manualFieldQueue.length > 0
      ? {
          command: "/new",
          state: "waiting_for_missing_field_confirmation",
          draft_id: draft.id,
          short_code: draft.short_code,
          pending_fields: manualFieldQueue.map((field) => field.key)
        }
      : null;

  if (params.supplierPhoto) {
    messageParts.push({
      text: supplierPhotoAttachment
        ? `Foto supplier berhasil ditautkan ke draft ini. Gunakan /detail ${code(draft.short_code)} untuk melihat foto audit.`
        : "Foto supplier belum berhasil disimpan. Draft tetap dibuat, tetapi audit foto belum lengkap.",
      parseMode: "HTML" as const,
      disableWebPagePreview: true
    });
  }

  if (followUpSession) {
    messageParts.push({
      text: formatMissingFieldConfirmationMessage(draft.short_code, manualFieldQueue),
      parseMode: "HTML" as const,
      disableWebPagePreview: true,
      replyMarkup: buildManualFillConfirmationInlineKeyboard(draft.short_code)
    });
  }

  if (messageParts.length > 0 && !followUpSession) {
    const summaryIndex = messageParts.length - 1;
    messageParts[summaryIndex] = {
      ...messageParts[summaryIndex],
      replyMarkup: buildDraftDetailInlineKeyboard(draft.short_code)
    };
  }

  return {
    messages: messageParts,
    followUpSession
  };
}

export const handleSellerTextSubmission = handleSupplierSubmission;
