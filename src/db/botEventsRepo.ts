import { getSupabaseAdminClient } from "./supabase.js";

export async function logBotEvent(params: {
  eventType: string;
  telegramUserId?: string;
  telegramChatId?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("bot_events").insert({
    event_type: params.eventType,
    telegram_user_id: params.telegramUserId ?? null,
    telegram_chat_id: params.telegramChatId ?? null,
    payload_json: params.payload ?? {}
  });

  if (error) {
    console.error("Failed to log bot event", {
      eventType: params.eventType,
      error: error.message
    });
  }
}
