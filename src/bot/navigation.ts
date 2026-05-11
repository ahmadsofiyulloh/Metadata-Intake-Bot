import type { ProductDraftRow } from "../types/metadata.js";
import type {
  OutboundMessage,
  TelegramInlineKeyboardMarkup,
  TelegramReplyKeyboardMarkup,
  TelegramReplyMarkup
} from "../types/telegram.js";

export const MENU_LABELS = {
  new: "Input Baru",
  search: "Cari",
  review: "Review",
  ready: "Siap Pakai",
  help: "Bantuan",
  menu: "Menu Utama",
  detail: "Detail",
  shopee: "Shopee",
  tiktok: "TikTok",
  archive: "Arsipkan",
  continue: "Lanjut",
  skip: "Skip",
  skipField: "Lewati Field"
} as const;

export type MainMenuAction = "new" | "search" | "review" | "ready" | "start";

export type CallbackAction =
  | { kind: "menu"; action: MainMenuAction }
  | { kind: "draft"; action: "detail" | "shopee" | "tiktok" | "archive"; shortCode: string }
  | { kind: "wizard"; action: "continue" | "skip" | "menu" | "detail"; shortCode?: string };

function buildKeyboardRow(texts: string[]): Array<{ text: string }> {
  return texts.map((text) => ({ text }));
}

export function buildMainMenuReplyKeyboard(): TelegramReplyKeyboardMarkup {
  return {
    keyboard: [
      buildKeyboardRow([MENU_LABELS.new, MENU_LABELS.search]),
      buildKeyboardRow([MENU_LABELS.review, MENU_LABELS.ready]),
      buildKeyboardRow([MENU_LABELS.help])
    ],
    resize_keyboard: true,
    is_persistent: true,
    one_time_keyboard: false
  };
}

export function buildMenuOnlyInlineKeyboard(): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [[{ text: MENU_LABELS.menu, callback_data: "menu:start" }]]
  };
}

export function buildDraftSelectionInlineKeyboard(
  drafts: ProductDraftRow[]
): TelegramInlineKeyboardMarkup {
  const inlineKeyboard = drafts.map((draft) => [
    {
      text: `${MENU_LABELS.detail} ${draft.short_code}`,
      callback_data: `draft:detail:${draft.short_code}`
    }
  ]);
  inlineKeyboard.push([{ text: MENU_LABELS.menu, callback_data: "menu:start" }]);

  return { inline_keyboard: inlineKeyboard };
}

export function buildDraftDetailInlineKeyboard(shortCode: string): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: MENU_LABELS.shopee, callback_data: `draft:shopee:${shortCode}` },
        { text: MENU_LABELS.tiktok, callback_data: `draft:tiktok:${shortCode}` }
      ],
      [
        { text: MENU_LABELS.archive, callback_data: `draft:archive:${shortCode}` },
        { text: MENU_LABELS.menu, callback_data: "menu:start" }
      ]
    ]
  };
}

export function buildPackInlineKeyboard(
  shortCode: string,
  platform: "shopee" | "tiktok"
): TelegramInlineKeyboardMarkup {
  const otherPlatform = platform === "shopee" ? MENU_LABELS.tiktok : MENU_LABELS.shopee;
  const otherAction = platform === "shopee" ? `draft:tiktok:${shortCode}` : `draft:shopee:${shortCode}`;
  return {
    inline_keyboard: [
      [
        { text: MENU_LABELS.detail, callback_data: `draft:detail:${shortCode}` },
        { text: otherPlatform, callback_data: otherAction }
      ],
      [{ text: MENU_LABELS.menu, callback_data: "menu:start" }]
    ]
  };
}

export function buildManualFillConfirmationInlineKeyboard(
  shortCode: string
): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: MENU_LABELS.continue, callback_data: "wizard:continue" },
        { text: MENU_LABELS.skip, callback_data: "wizard:skip" }
      ],
      [
        { text: MENU_LABELS.detail, callback_data: `wizard:detail:${shortCode}` },
        { text: MENU_LABELS.menu, callback_data: "wizard:menu" }
      ]
    ]
  };
}

export function buildManualFieldPromptInlineKeyboard(
  shortCode: string
): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: MENU_LABELS.skipField, callback_data: "wizard:skip" },
        { text: MENU_LABELS.detail, callback_data: `wizard:detail:${shortCode}` }
      ],
      [{ text: MENU_LABELS.menu, callback_data: "wizard:menu" }]
    ]
  };
}

export function attachReplyMarkupToMessages(
  messages: OutboundMessage[],
  replyMarkup: TelegramReplyMarkup,
  targetIndex = messages.length - 1
): OutboundMessage[] {
  if (messages.length === 0) {
    return messages;
  }

  return messages.map((message, index) => {
    if (index !== targetIndex) {
      return message;
    }

    return {
      ...message,
      replyMarkup
    };
  });
}

export function parseMainMenuText(text: string): MainMenuAction | null {
  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  switch (normalized) {
    case MENU_LABELS.new.toLowerCase():
      return "new";
    case MENU_LABELS.search.toLowerCase():
      return "search";
    case MENU_LABELS.review.toLowerCase():
      return "review";
    case MENU_LABELS.ready.toLowerCase():
      return "ready";
    case MENU_LABELS.help.toLowerCase():
      return "start";
    default:
      return null;
  }
}

export function parseCallbackData(data: string): CallbackAction | null {
  const parts = data.split(":");
  if (parts.length < 2) {
    return null;
  }

  const [scope, action, ...rest] = parts;
  if (scope === "menu") {
    if (action === "new" || action === "search" || action === "review" || action === "ready") {
      return { kind: "menu", action };
    }
    if (action === "start" || action === "help") {
      return { kind: "menu", action: "start" };
    }
    return null;
  }

  if (scope === "draft") {
    const shortCode = rest.join(":").trim();
    if (!shortCode) {
      return null;
    }

    if (action === "detail" || action === "shopee" || action === "tiktok" || action === "archive") {
      return { kind: "draft", action, shortCode };
    }
    return null;
  }

  if (scope === "wizard") {
    if (action === "continue" || action === "skip" || action === "menu") {
      return { kind: "wizard", action };
    }

    if (action === "detail") {
      return { kind: "wizard", action, shortCode: rest.join(":").trim() || undefined };
    }
  }

  return null;
}
