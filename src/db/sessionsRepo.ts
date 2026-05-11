import { getSupabaseAdminClient } from "./supabase.js";

export interface UserSessionRow {
  id: string;
  telegram_user_id: string;
  telegram_chat_id: string;
  mode: string;
  payload_json: Record<string, unknown>;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: any): UserSessionRow {
  return {
    id: row.id,
    telegram_user_id: row.telegram_user_id,
    telegram_chat_id: row.telegram_chat_id,
    mode: row.mode,
    payload_json: row.payload_json ?? {},
    expires_at: row.expires_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export async function getActiveSession(
  telegramUserId: string,
  telegramChatId: string
): Promise<UserSessionRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_sessions")
    .select("*")
    .eq("telegram_user_id", telegramUserId)
    .eq("telegram_chat_id", telegramChatId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load session: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const session = mapRow(data);
  if (session.expires_at && new Date(session.expires_at).getTime() <= Date.now()) {
    await clearSession(telegramUserId, telegramChatId);
    return null;
  }

  return session;
}

export async function setAwaitingSellerTextSession(params: {
  telegramUserId: string;
  telegramChatId: string;
  payload?: Record<string, unknown>;
  ttlHours?: number;
}): Promise<UserSessionRow> {
  return setUserSession({
    telegramUserId: params.telegramUserId,
    telegramChatId: params.telegramChatId,
    mode: "awaiting_raw_seller_text",
    payload: params.payload,
    ttlHours: params.ttlHours
  });
}

export async function setUserSession(params: {
  telegramUserId: string;
  telegramChatId: string;
  mode: string;
  payload?: Record<string, unknown>;
  ttlHours?: number;
}): Promise<UserSessionRow> {
  const supabase = getSupabaseAdminClient();
  const expiresAt = new Date(
    Date.now() + (params.ttlHours ?? 24) * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("user_sessions")
    .upsert(
      {
        telegram_user_id: params.telegramUserId,
        telegram_chat_id: params.telegramChatId,
        mode: params.mode,
        payload_json: params.payload ?? {},
        expires_at: expiresAt
      },
      { onConflict: "telegram_user_id,telegram_chat_id" }
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to set session: ${error?.message || "unknown error"}`);
  }

  return mapRow(data);
}

export async function clearSession(
  telegramUserId: string,
  telegramChatId: string
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("user_sessions")
    .delete()
    .eq("telegram_user_id", telegramUserId)
    .eq("telegram_chat_id", telegramChatId);

  if (error) {
    throw new Error(`Failed to clear session: ${error.message}`);
  }
}
