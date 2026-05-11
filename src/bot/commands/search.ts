import type { OutboundMessage } from "../../types/telegram.js";
import { searchProductDrafts } from "../../db/productDraftsRepo.js";
import { formatSearchResultsMessage } from "../formatters/metadataMessage.js";
import { code, escapeHtml } from "../formatters/telegramHtml.js";
import { setUserSession } from "../../db/sessionsRepo.js";
import {
  attachReplyMarkupToMessages,
  buildDraftSelectionInlineKeyboard,
  buildMenuOnlyInlineKeyboard
} from "../navigation.js";

export async function handleSearchCommand(params: {
  query: string;
}): Promise<OutboundMessage[]> {
  if (!params.query.trim()) {
    return [
      {
        text: `Gunakan format: /search ${code("kata")}`,
        parseMode: "HTML",
        disableWebPagePreview: true,
        replyMarkup: buildMenuOnlyInlineKeyboard()
      }
    ];
  }

  const drafts = await searchProductDrafts({
    query: params.query,
    limit: 10,
    includeArchived: false
  });

  if (drafts.length === 0) {
    return [
      {
        text: `Data untuk ${escapeHtml(params.query)} tidak ditemukan.`,
        parseMode: "HTML",
        disableWebPagePreview: true,
        replyMarkup: buildMenuOnlyInlineKeyboard()
      }
    ];
  }

  return attachReplyMarkupToMessages(
    [
      {
        text: formatSearchResultsMessage(params.query, drafts),
        parseMode: "HTML",
        disableWebPagePreview: true
      }
    ],
    buildDraftSelectionInlineKeyboard(drafts)
  );
}

export async function handleSearchPromptCommand(params: {
  telegramUserId: string;
  telegramChatId: string;
}): Promise<OutboundMessage[]> {
  await setUserSession({
    telegramUserId: params.telegramUserId,
    telegramChatId: params.telegramChatId,
    mode: "awaiting_search_query",
    payload: {
      command: "/search",
      state: "waiting_for_search_query"
    }
  });

  return [
    {
      text: [
      "Kirim kata kunci yang ingin dicari.",
      "Kamu juga bisa pakai tombol menu di bawah untuk pindah alur."
    ].join("\n"),
    parseMode: "HTML",
    disableWebPagePreview: true,
    replyMarkup: buildMenuOnlyInlineKeyboard()
  }
  ];
}
