import { listDraftsByPredicate } from "../../db/productDraftsRepo.js";
import type { OutboundMessage } from "../../types/telegram.js";
import { formatReviewListMessage } from "../formatters/metadataMessage.js";
import {
  attachReplyMarkupToMessages,
  buildDraftSelectionInlineKeyboard,
  buildMenuOnlyInlineKeyboard
} from "../navigation.js";

export async function handleReadyCommand(): Promise<OutboundMessage[]> {
  const drafts = await listDraftsByPredicate(
    (draft) => draft.data_status === "READY" && draft.compliance_status === "SAFE_TO_DRAFT",
    { limit: 20, includeArchived: false }
  );

  const messages: OutboundMessage[] = [
    {
      text: formatReviewListMessage("PRODUK SIAP PAKAI", drafts),
      parseMode: "HTML",
      disableWebPagePreview: true
    }
  ];

  return attachReplyMarkupToMessages(
    messages,
    drafts.length > 0 ? buildDraftSelectionInlineKeyboard(drafts) : buildMenuOnlyInlineKeyboard()
  );
}
