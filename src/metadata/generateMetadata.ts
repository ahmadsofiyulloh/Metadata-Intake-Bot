import { getGeminiApiKey, getMetadataEnv } from "../config/env.js";
import type { GeneratedMetadata, PlatformFieldPack } from "../types/metadata.js";
import { generatedMetadataSchema, geminiMetadataResponseSchema } from "./metadataSchema.js";
import { applyComplianceGuard } from "./complianceGuard.js";
import { buildHeuristicMetadataDraft, toPlatformPackDraft } from "./normalizeSellerText.js";

export interface MetadataGenerationResult {
  draft: GeneratedMetadata;
  aiUsed: boolean;
  rawResponse: unknown | null;
  shopee_field_pack_json: PlatformFieldPack;
  tiktok_field_pack_json: PlatformFieldPack;
}

async function callGemini(rawSellerText: string): Promise<GeneratedMetadata | null> {
  const env = getMetadataEnv();
  const geminiApiKey = getGeminiApiKey();
  if (!geminiApiKey) {
    return null;
  }

  const systemInstruction = [
    "You are a product metadata normalizer for an Indonesian reseller workflow.",
    "Transform messy supplier text into structured product metadata.",
    "Do not invent facts that are not present.",
    "Classify each extracted field as explicit, inferred, unknown, or risk.",
    "Normalize harsh or aggressive supplier wording into professional, neutral catalog metadata.",
    "For store names and titles, use neutral category aliases such as Perkakas Handcraft, Alat Outdoor, Alat Kebun, or Alat Dapur instead of sensitive supplier terms.",
    "Never copy sensitive supplier terms into normalized_store_name, title_internal, title_shopee, title_tiktok, keywords, or descriptions.",
    "Avoid repeated words or repeated category/material phrases in names and titles.",
    "For dimensions, PB and TB default to cm when unit is missing; LB defaults to mm when unit is missing.",
    "Do not promote products as weapons, self-defense tools, combat items, tactical weapons, or dangerous items.",
    "Return only valid JSON matching the provided schema."
  ].join(" ");

  const userPrompt = [
    `Store name: ${env.STORE_NAME}`,
    `Store code: ${env.STORE_CODE}`,
    `Language: ${env.DEFAULT_LANGUAGE}`,
    "",
    "Supplier description:",
    rawSellerText,
    "",
    "Task:",
    "1. Extract clear supplier data.",
    "2. Identify missing fields.",
    "3. Normalize product name for store catalog.",
    "4. Generate series name.",
    "5. Generate title using format: [STORE NAME UPPERCASE] | [SERIES] [NORMALIZED PRODUCT NAME] - [MARKETPLACE KEYWORD]",
    "6. Generate SKU basis.",
    "7. Generate Shopee candidate fields.",
    "8. Generate TikTok candidate fields.",
    "9. Generate image text metadata for external product photo editing.",
    "10. In image_metadata.spec_copy_fields, provide separate copy_value and copy_label_value for editing product photos.",
    "11. Add compliance status and reason."
  ].join("\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      env.GEMINI_MODEL
    )}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: geminiMetadataResponseSchema
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gemini request failed with status ${response.status}: ${errorText.slice(0, 500)}`
    );
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) {
    return null;
  }

  const cleanedText = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleanedText);
  } catch {
    return null;
  }

  const parsed = generatedMetadataSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return null;
  }

  return parsed.data as GeneratedMetadata;
}

function shouldKeepBaseSpec(baseValue: GeneratedMetadata["specs"][string] | undefined): boolean {
  return Boolean(
    baseValue &&
      baseValue.source === "explicit" &&
      baseValue.value !== null &&
      baseValue.value !== undefined &&
      String(baseValue.value).trim()
  );
}

function mergeSpecs(
  base: GeneratedMetadata["specs"],
  ai: GeneratedMetadata["specs"]
): GeneratedMetadata["specs"] {
  const merged: GeneratedMetadata["specs"] = { ...base };

  Object.entries(ai).forEach(([key, value]) => {
    if (shouldKeepBaseSpec(base[key])) {
      return;
    }
    merged[key] = value;
  });

  return merged;
}

function mergeSupplierName(base: GeneratedMetadata, ai: GeneratedMetadata): string | null {
  const storeName = getMetadataEnv().STORE_NAME.trim().toLowerCase();
  const aiSupplier = ai.supplier_name?.trim() || null;
  if (!aiSupplier) {
    return base.supplier_name;
  }
  if (aiSupplier.toLowerCase() === storeName) {
    return base.supplier_name;
  }
  return base.supplier_name ?? aiSupplier;
}

function mergeMetadata(base: GeneratedMetadata, ai: GeneratedMetadata | null): GeneratedMetadata {
  if (!ai) {
    return base;
  }

  const preferBaseCatalog = base.sensitive_terms.length > 0;
  const merged: GeneratedMetadata = {
    ...base,
    raw_seller_text: base.raw_seller_text,
    supplier_name: mergeSupplierName(base, ai),
    supplier_product_name: ai.supplier_product_name || base.supplier_product_name,
    supplier_price: ai.supplier_price ?? base.supplier_price,
    supplier_stock: ai.supplier_stock ?? base.supplier_stock,
    normalized_store_name: preferBaseCatalog
      ? base.normalized_store_name
      : ai.normalized_store_name || base.normalized_store_name,
    generated_series: preferBaseCatalog ? base.generated_series : ai.generated_series || base.generated_series,
    category_context: preferBaseCatalog ? base.category_context : ai.category_context || base.category_context,
    product_type: preferBaseCatalog ? base.product_type : ai.product_type || base.product_type,
    specs: mergeSpecs(base.specs, ai.specs),
    missing_fields: ai.missing_fields.length > 0 ? ai.missing_fields : base.missing_fields,
    sensitive_terms: Array.from(new Set([...base.sensitive_terms, ...ai.sensitive_terms])),
    compliance_status: ai.compliance_status || base.compliance_status,
    compliance_reason: ai.compliance_reason || base.compliance_reason,
    data_status: ai.data_status || base.data_status,
    title_internal: preferBaseCatalog ? base.title_internal : ai.title_internal || base.title_internal,
    title_shopee: preferBaseCatalog ? base.title_shopee : ai.title_shopee || base.title_shopee,
    title_tiktok: preferBaseCatalog ? base.title_tiktok : ai.title_tiktok || base.title_tiktok,
    sku_basis: preferBaseCatalog ? base.sku_basis : ai.sku_basis || base.sku_basis,
    keywords_shopee: ai.keywords_shopee.length > 0 ? ai.keywords_shopee : base.keywords_shopee,
    keywords_tiktok: ai.keywords_tiktok.length > 0 ? ai.keywords_tiktok : base.keywords_tiktok,
    image_metadata: ai.image_metadata ?? base.image_metadata,
    shopee_description_parts:
      ai.shopee_description_parts.length > 0
        ? ai.shopee_description_parts
        : base.shopee_description_parts,
    tiktok_description_parts:
      ai.tiktok_description_parts.length > 0
        ? ai.tiktok_description_parts
        : base.tiktok_description_parts,
    confidence_summary: preferBaseCatalog ? base.confidence_summary : ai.confidence_summary || base.confidence_summary
  };

  return merged;
}

export async function generateMetadata(
  rawSellerText: string
): Promise<MetadataGenerationResult> {
  const heuristicDraft = buildHeuristicMetadataDraft(rawSellerText);
  let aiDraft: GeneratedMetadata | null = null;
  let rawResponse: unknown | null = null;

  try {
    aiDraft = await callGemini(rawSellerText);
    rawResponse = aiDraft;
  } catch (error) {
    rawResponse = {
      error: error instanceof Error ? error.message : String(error)
    };
    aiDraft = null;
  }

  const mergedDraft = mergeMetadata(heuristicDraft, aiDraft);
  const compliantDraft = generatedMetadataSchema.parse(mergedDraft) as GeneratedMetadata;
  const guarded = applyComplianceGuard(compliantDraft);
  const platformDrafts = toPlatformPackDraft(guarded.draft);

  return {
    draft: guarded.draft,
    aiUsed: aiDraft !== null,
    rawResponse,
    shopee_field_pack_json: guarded.shopee_field_pack_json ?? platformDrafts.shopee_field_pack_json,
    tiktok_field_pack_json: guarded.tiktok_field_pack_json ?? platformDrafts.tiktok_field_pack_json
  };
}
