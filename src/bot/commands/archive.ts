import { archiveProductDraft } from "../../db/productDraftsRepo.js";
import type { OutboundMessage } from "../../types/telegram.js";
import { formatArchiveMessage } from "../formatters/metadataMessage.js";
import { code, escapeHtml } from "../formatters/telegramHtml.js";
import { buildMenuOnlyInlineKeyboard } from "../navigation.js";

export async function handleArchiveCommand(params: {
  shortCode: string;
}): Promise<OutboundMessage[]> {
  if (!params.shortCode.trim()) {
    return [
      {
        text: `Gunakan format: /archive ${code("short_code")}`,
        parseMode: "HTML",
        disableWebPagePreview: true,
        replyMarkup: buildMenuOnlyInlineKeyboard()
      }
    ];
  }

  const archived = await archiveProductDraft(params.shortCode.trim().toUpperCase());
  if (!archived) {
    return [
      {
        text: `Data ${escapeHtml(params.shortCode)} tidak ditemukan.`,
        parseMode: "HTML",
        disableWebPagePreview: true,
        replyMarkup: buildMenuOnlyInlineKeyboard()
      }
    ];
  }

  return [
    {
      text: formatArchiveMessage(archived.short_code),
      parseMode: "HTML",
      disableWebPagePreview: true,
      replyMarkup: buildMenuOnlyInlineKeyboard()
    }
  ];
}
