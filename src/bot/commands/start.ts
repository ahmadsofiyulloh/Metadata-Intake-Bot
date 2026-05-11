import type { OutboundMessage } from "../../types/telegram.js";
import { formatWelcomeMessage } from "../formatters/metadataMessage.js";
import { buildMainMenuReplyKeyboard } from "../navigation.js";

export async function handleStartCommand(): Promise<OutboundMessage[]> {
  return [
    {
      text: formatWelcomeMessage(),
      parseMode: "HTML",
      disableWebPagePreview: true,
      replyMarkup: buildMainMenuReplyKeyboard()
    }
  ];
}
