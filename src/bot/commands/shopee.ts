import type { OutboundMessage } from "../../types/telegram.js";
import { resolveDraftCandidates } from "./shared.js";
import {
  formatSelectionMessage,
  formatShopeePackMessage
} from "../formatters/metadataMessage.js";
import { code, escapeHtml } from "../formatters/telegramHtml.js";
import {
  attachReplyMarkupToMessages,
  buildDraftSelectionInlineKeyboard,
  buildMenuOnlyInlineKeyboard,
  buildPackInlineKeyboard
} from "../navigation.js";

export async function handleShopeeCommand(params: {
  query: string;
}): Promise<OutboundMessage[]> {
  if (!params.query.trim()) {
    return [
      {
        text: `Gunakan format: /shopee ${code("kata")}`,
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
    return [
      {
        text: formatSelectionMessage("shopee", candidates),
        parseMode: "HTML",
        disableWebPagePreview: true,
        replyMarkup: buildDraftSelectionInlineKeyboard(candidates)
      }
    ];
  }

  return attachReplyMarkupToMessages([
    {
      text: formatShopeePackMessage(candidates[0]),
      parseMode: "HTML",
      disableWebPagePreview: true
    }
  ], buildPackInlineKeyboard(candidates[0].short_code, "shopee"));
}
