import { getEnv } from "../config/env.js";
import type { SupplierPhotoAttachmentInput } from "../types/intake.js";
import type {
  GeneratedMetadata,
  MetadataVersionPayload,
  PlatformFieldPack,
  ProductDraftRow
} from "../types/metadata.js";
import { buildSearchableText } from "../metadata/searchText.js";
import {
  applyManualFieldToDraft,
  type SupplierManualFieldKey
} from "../metadata/manualFields.js";
import { buildSkuInternal } from "../metadata/skuGenerator.js";
import { getSupabaseAdminClient } from "./supabase.js";
import { insertMetadataVersion } from "./versionsRepo.js";
import { logBotEvent } from "./botEventsRepo.js";
import {
  insertSupplierPhotoAttachment,
  type SupplierPhotoAttachmentRow
} from "./supplierPhotosRepo.js";

function mapDraftRow(row: any): ProductDraftRow {
  return {
    ...row,
    supplier_name: row.supplier_name ?? null,
    supplier_product_name: row.supplier_product_name ?? "",
    normalized_store_name: row.normalized_store_name ?? "",
    generated_series: row.generated_series ?? "",
    category_context: row.category_context ?? "",
    product_type: row.product_type ?? "",
    supplier_price: row.supplier_price ?? null,
    supplier_stock: row.supplier_stock ?? null,
    specs: row.specs_json ?? {},
    specs_json: row.specs_json ?? {},
    missing_fields: row.missing_fields_json ?? [],
    missing_fields_json: row.missing_fields_json ?? [],
    sensitive_terms: row.sensitive_terms_json ?? [],
    sensitive_terms_json: row.sensitive_terms_json ?? [],
    keywords_shopee: row.keywords_json?.shopee ?? [],
    keywords_tiktok: row.keywords_json?.tiktok ?? [],
    keywords_json: row.keywords_json ?? { shopee: [], tiktok: [] },
    image_metadata: row.image_metadata_json ?? {},
    image_metadata_json: row.image_metadata_json ?? {},
    shopee_description_parts:
      row.shopee_field_pack_json?.description_parts ?? row.shopee_description_parts ?? [],
    tiktok_description_parts:
      row.tiktok_field_pack_json?.description_parts ?? row.tiktok_description_parts ?? [],
    shopee_field_pack_json: row.shopee_field_pack_json ?? {
      status: row.compliance_status ?? "NEED_REVIEW",
      warning: row.review_notes ?? "",
      keywords: row.keywords_json?.shopee ?? [],
      description_parts: row.shopee_description_parts ?? []
    },
    tiktok_field_pack_json: row.tiktok_field_pack_json ?? {
      status: row.compliance_status ?? "NEED_REVIEW",
      warning: row.review_notes ?? "",
      keywords: row.keywords_json?.tiktok ?? [],
      description_parts: row.tiktok_description_parts ?? []
    },
    archived_at: row.archived_at ?? null,
    searchable_text: row.searchable_text ?? null,
    review_notes: row.review_notes ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

async function getNextSkuSequence(): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("next_sku_sequence");
  if (error) {
    throw new Error(`Failed to get next SKU sequence: ${error.message}`);
  }
  return Number(data);
}

export interface CreateProductDraftResult {
  draft: ProductDraftRow;
  supplierPhotoAttachment: SupplierPhotoAttachmentRow | null;
}

export async function createProductDraftFromGeneration(params: {
  generation: {
    draft: GeneratedMetadata;
    shopee_field_pack_json: PlatformFieldPack;
    tiktok_field_pack_json: PlatformFieldPack;
    aiUsed: boolean;
    rawResponse: unknown | null;
  };
  rawSellerText: string;
  telegramUserId?: string;
  telegramChatId?: string;
  supplierPhoto?: SupplierPhotoAttachmentInput | null;
}): Promise<CreateProductDraftResult> {
  const env = getEnv();
  const supabase = getSupabaseAdminClient();
  const skuSequence = await getNextSkuSequence();
  const skuInternal = buildSkuInternal(
    env.STORE_CODE,
    params.generation.draft.sku_basis,
    skuSequence
  );
  const searchableText = buildSearchableText(params.generation.draft);

  const rowToInsert = {
    sku_internal: skuInternal,
    store_name: env.STORE_NAME,
    store_code: env.STORE_CODE,
    raw_seller_text: params.rawSellerText,
    supplier_name: params.generation.draft.supplier_name,
    supplier_product_name: params.generation.draft.supplier_product_name,
    normalized_store_name: params.generation.draft.normalized_store_name,
    generated_series: params.generation.draft.generated_series,
    category_context: params.generation.draft.category_context,
    product_type: params.generation.draft.product_type,
    title_internal: params.generation.draft.title_internal,
    title_shopee: params.generation.draft.title_shopee,
    title_tiktok: params.generation.draft.title_tiktok,
    supplier_price: params.generation.draft.supplier_price,
    supplier_stock: params.generation.draft.supplier_stock,
    specs_json: params.generation.draft.specs,
    missing_fields_json: params.generation.draft.missing_fields,
    sensitive_terms_json: params.generation.draft.sensitive_terms,
    keywords_json: {
      shopee: params.generation.draft.keywords_shopee,
      tiktok: params.generation.draft.keywords_tiktok
    },
    image_metadata_json: params.generation.draft.image_metadata,
    shopee_field_pack_json: params.generation.shopee_field_pack_json,
    tiktok_field_pack_json: params.generation.tiktok_field_pack_json,
    data_status: params.generation.draft.data_status,
    compliance_status: params.generation.draft.compliance_status,
    review_notes: params.generation.draft.compliance_reason,
    searchable_text: searchableText
  };

  const { data, error } = await supabase
    .from("product_drafts")
    .insert(rowToInsert)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create product draft: ${error?.message || "unknown error"}`);
  }

  const draft = mapDraftRow(data);
  let supplierPhotoAttachment: SupplierPhotoAttachmentRow | null = null;

  try {
    await insertMetadataVersion({
      productDraftId: draft.id,
      reason: "generated_v1",
      payload: {
        generated: params.generation.draft,
        raw_response: params.generation.rawResponse,
        ai_model: params.generation.aiUsed ? getEnv().GEMINI_MODEL : undefined,
        ai_used: params.generation.aiUsed,
        version_reason: "generated_v1"
      } as MetadataVersionPayload
    });
  } catch (error) {
    console.error("Failed to write metadata version", {
      short_code: draft.short_code,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  if (params.supplierPhoto) {
    try {
      supplierPhotoAttachment = await insertSupplierPhotoAttachment({
        productDraftId: draft.id,
        telegramChatId: params.telegramChatId ?? "",
        telegramUserId: params.telegramUserId ?? null,
        photo: params.supplierPhoto
      });

      await logBotEvent({
        eventType: "supplier_photo_attached_to_draft",
        telegramUserId: params.telegramUserId,
        telegramChatId: params.telegramChatId,
        payload: {
          short_code: draft.short_code,
          telegram_message_id: params.supplierPhoto.telegram_message_id,
          telegram_file_unique_id: params.supplierPhoto.telegram_file_unique_id
        }
      });
    } catch (error) {
      console.error("Failed to write supplier photo attachment", {
        short_code: draft.short_code,
        error: error instanceof Error ? error.message : String(error)
      });

      await logBotEvent({
        eventType: "supplier_photo_attachment_failed",
        telegramUserId: params.telegramUserId,
        telegramChatId: params.telegramChatId,
        payload: {
          short_code: draft.short_code,
          telegram_message_id: params.supplierPhoto.telegram_message_id,
          telegram_file_unique_id: params.supplierPhoto.telegram_file_unique_id,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  await logBotEvent({
    eventType: "product_draft_created",
    telegramUserId: params.telegramUserId,
    telegramChatId: params.telegramChatId,
    payload: {
      short_code: draft.short_code,
      sku_internal: draft.sku_internal,
      ai_used: params.generation.aiUsed,
      supplier_photo_attached: Boolean(supplierPhotoAttachment)
    }
  });

  return {
    draft,
    supplierPhotoAttachment
  };
}

export async function updateProductDraftFromManualField(params: {
  productDraftId: string;
  fieldKey: SupplierManualFieldKey;
  rawValue: string;
  telegramUserId?: string;
  telegramChatId?: string;
}): Promise<{
  draft: ProductDraftRow;
  fieldKey: SupplierManualFieldKey;
  fieldLabel: string;
  normalizedValue: string;
  remainingMissingFields: string[];
}> {
  const supabase = getSupabaseAdminClient();
  const { data: existingRow, error: loadError } = await supabase
    .from("product_drafts")
    .select("*")
    .eq("id", params.productDraftId)
    .maybeSingle();

  if (loadError) {
    throw new Error(`Failed to load draft for manual update: ${loadError.message}`);
  }

  if (!existingRow) {
    throw new Error(`Draft not found for manual update: ${params.productDraftId}`);
  }

  const currentDraft = mapDraftRow(existingRow);
  const updateResult = applyManualFieldToDraft(currentDraft, params.fieldKey, params.rawValue);

  const { data: savedRow, error: saveError } = await supabase
    .from("product_drafts")
    .update({
      supplier_name: updateResult.draft.supplier_name,
      specs_json: updateResult.draft.specs_json,
      missing_fields_json: updateResult.draft.missing_fields_json,
      data_status: updateResult.draft.data_status,
      searchable_text: updateResult.draft.searchable_text
    })
    .eq("id", params.productDraftId)
    .select("*")
    .single();

  if (saveError || !savedRow) {
    throw new Error(`Failed to update draft manually: ${saveError?.message || "unknown error"}`);
  }

  const savedDraft = mapDraftRow(savedRow);
  const versionReason = `manual_fill:${updateResult.field.key}`;

  try {
    await insertMetadataVersion({
      productDraftId: savedDraft.id,
      reason: versionReason,
      payload: {
        generated: updateResult.draft,
        raw_response: null,
        ai_used: false,
        version_reason: versionReason,
        manual_changes: [
          {
            field_key: updateResult.field.key,
            field_label: updateResult.field.label,
            value: updateResult.normalizedValue
          }
        ],
        remaining_missing_fields: updateResult.remainingMissingFields
      }
    });
  } catch (error) {
    console.error("Failed to write manual fill version", {
      short_code: savedDraft.short_code,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  await logBotEvent({
    eventType: "manual_field_filled",
    telegramUserId: params.telegramUserId,
    telegramChatId: params.telegramChatId,
    payload: {
      short_code: savedDraft.short_code,
      field_key: updateResult.field.key,
      field_label: updateResult.field.label,
      value: updateResult.normalizedValue,
      remaining_missing_fields: updateResult.remainingMissingFields
    }
  });

  return {
    draft: savedDraft,
    fieldKey: updateResult.field.key,
    fieldLabel: updateResult.field.label,
    normalizedValue: updateResult.normalizedValue,
    remainingMissingFields: updateResult.remainingMissingFields
  };
}

export async function getProductDraftByShortCode(
  shortCode: string
): Promise<ProductDraftRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("product_drafts")
    .select("*")
    .eq("short_code", shortCode)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load draft: ${error.message}`);
  }

  return data ? mapDraftRow(data) : null;
}

export async function getProductDraftById(id: string): Promise<ProductDraftRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("product_drafts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load draft by id: ${error.message}`);
  }

  return data ? mapDraftRow(data) : null;
}

export async function searchProductDrafts(params: {
  query: string;
  limit?: number;
  includeArchived?: boolean;
}): Promise<ProductDraftRow[]> {
  const supabase = getSupabaseAdminClient();
  const normalizedQuery = params.query.trim();
  if (!normalizedQuery) {
    return [];
  }

  const shortCodeMatch = normalizedQuery.match(/^(?:lsm-\d+|p-\d+)$/i);
  if (shortCodeMatch) {
    const exact = await getProductDraftByShortCode(normalizedQuery.toUpperCase());
    if (!exact) {
      return [];
    }
    if (!params.includeArchived && exact.archived_at) {
      return [];
    }
    return [exact];
  }

  let queryBuilder = supabase
    .from("product_drafts")
    .select("*")
    .textSearch("searchable_text", normalizedQuery, {
      type: "websearch",
      config: "simple"
    })
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 10);

  if (!params.includeArchived) {
    queryBuilder = queryBuilder.is("archived_at", null);
  }

  const { data, error } = await queryBuilder;
  if (error) {
    throw new Error(`Failed to search drafts: ${error.message}`);
  }

  return (data ?? []).map(mapDraftRow);
}

export async function listProductDrafts(params: {
  limit?: number;
  includeArchived?: boolean;
} = {}): Promise<ProductDraftRow[]> {
  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("product_drafts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 20);

  if (!params.includeArchived) {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to list drafts: ${error.message}`);
  }

  return (data ?? []).map(mapDraftRow);
}

export async function listDraftsByPredicate(
  predicate: (draft: ProductDraftRow) => boolean,
  params: { limit?: number; includeArchived?: boolean } = {}
): Promise<ProductDraftRow[]> {
  const drafts = await listProductDrafts(params);
  return drafts.filter(predicate);
}

export async function archiveProductDraft(shortCode: string): Promise<ProductDraftRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("product_drafts")
    .update({
      archived_at: new Date().toISOString(),
      data_status: "ARCHIVED"
    })
    .eq("short_code", shortCode)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to archive draft: ${error.message}`);
  }

  return data ? mapDraftRow(data) : null;
}
