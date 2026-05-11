import type { OutboundMessage } from "../../types/telegram.js";
import { getSupplierPhotoByDraftId } from "../../db/supplierPhotosRepo.js";
import { resolveDraftCandidates } from "./shared.js";
import { code, escapeHtml } from "../formatters/telegramHtml.js";
import {
  formatDetailMessage,
  formatRawSellerTextMessages
} from "../formatters/metadataMessage.js";
import {
  attachReplyMarkupToMessages,
  buildDraftDetailInlineKeyboard,
  buildDraftSelectionInlineKeyboard,
  buildMenuOnlyInlineKeyboard
} from "../navigation.js";

export async function handleDetailCommand(params: {
  query: string;
}): Promise<OutboundMessage[]> {
  if (!params.query.trim()) {
    return [
      {
        text: `Gunakan format: /detail ${code("short_code")}`,
        parseMode: "HTML",
        disableWebPagePreview: true,
        replyMarkup: buildMenuOnlyInlineKeyboard()
      }
    ];
  }

  const candidates = await resolveDraftCandidates(params.query);
  if (candidates.length === 0) {
    return [
      {
        text: `Data untuk ${escapeHtml(params.query)} tidak ditemukan.`,
        parseMode: "HTML",
        disableWebPagePreview: true,
        replyMarkup: buildMenuOnlyInlineKeyboard()
      }
    ];
  }

  if (candidates.length > 1) {
    const list = candidates
      .map(
        (draft, index) =>
          `${index + 1}. ${code(draft.short_code)} - ${code(draft.title_internal || "-")}`
      )
      .join("\n");
    return [
      {
        text: [
          "Pilih produk yang dimaksud:",
          "",
          list,
          "",
          `Gunakan /detail ${code("short_code")} untuk membuka detail`
        ].join("\n"),
        parseMode: "HTML",
        disableWebPagePreview: true,
        replyMarkup: buildDraftSelectionInlineKeyboard(candidates)
      }
    ];
  }

  const draft = candidates[0];
  const messages: OutboundMessage[] = [];
  const supplierPhoto = await getSupplierPhotoByDraftId(draft.id);

  if (supplierPhoto) {
    messages.push({
      photoFileId: supplierPhoto.telegram_file_id,
      photoCaption: `Foto supplier ${draft.short_code}`,
      photoShowCaptionAboveMedia: true
    });
  }

  messages.push({
    text: formatDetailMessage(draft),
    parseMode: "HTML" as const,
    disableWebPagePreview: true
  });

  messages.push(
    ...formatRawSellerTextMessages(draft.raw_seller_text).map((text) => ({
      text,
      parseMode: "HTML" as const,
      disableWebPagePreview: true
    }))
  );

  const detailMessageIndex = supplierPhoto ? 1 : 0;
  return attachReplyMarkupToMessages(
    messages,
    buildDraftDetailInlineKeyboard(draft.short_code),
    detailMessageIndex
  );
}
