import { getSupabaseAdminClient } from "./supabase.js";
import type { SupplierPhotoAttachmentInput } from "../types/intake.js";

export interface SupplierPhotoAttachmentRow {
  id: string;
  product_draft_id: string;
  telegram_chat_id: string;
  telegram_user_id: string | null;
  telegram_message_id: number;
  telegram_file_id: string;
  telegram_file_unique_id: string;
  telegram_file_size: number | null;
  telegram_width: number | null;
  telegram_height: number | null;
  telegram_caption: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: any): SupplierPhotoAttachmentRow {
  return {
    id: row.id,
    product_draft_id: row.product_draft_id,
    telegram_chat_id: row.telegram_chat_id,
    telegram_user_id: row.telegram_user_id ?? null,
    telegram_message_id: Number(row.telegram_message_id),
    telegram_file_id: row.telegram_file_id,
    telegram_file_unique_id: row.telegram_file_unique_id,
    telegram_file_size: row.telegram_file_size ?? null,
    telegram_width: row.telegram_width ?? null,
    telegram_height: row.telegram_height ?? null,
    telegram_caption: row.telegram_caption ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export async function insertSupplierPhotoAttachment(params: {
  productDraftId: string;
  telegramChatId: string;
  telegramUserId?: string | null;
  photo: SupplierPhotoAttachmentInput;
}): Promise<SupplierPhotoAttachmentRow> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("product_draft_supplier_photos")
    .upsert(
      {
        product_draft_id: params.productDraftId,
        telegram_chat_id: params.telegramChatId,
        telegram_user_id: params.telegramUserId ?? null,
        telegram_message_id: params.photo.telegram_message_id,
        telegram_file_id: params.photo.telegram_file_id,
        telegram_file_unique_id: params.photo.telegram_file_unique_id,
        telegram_file_size: params.photo.telegram_file_size,
        telegram_width: params.photo.telegram_width,
        telegram_height: params.photo.telegram_height,
        telegram_caption: params.photo.telegram_caption
      },
      { onConflict: "product_draft_id" }
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to insert supplier photo attachment: ${error?.message || "unknown error"}`);
  }

  return mapRow(data);
}

export async function getSupplierPhotoByDraftId(
  productDraftId: string
): Promise<SupplierPhotoAttachmentRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("product_draft_supplier_photos")
    .select("*")
    .eq("product_draft_id", productDraftId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load supplier photo attachment: ${error.message}`);
  }

  return data ? mapRow(data) : null;
}
