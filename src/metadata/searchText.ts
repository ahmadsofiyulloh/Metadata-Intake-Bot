import type { GeneratedMetadata } from "../types/metadata.js";

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildSearchableText(
  draft: Pick<
    GeneratedMetadata,
    | "raw_seller_text"
    | "supplier_name"
    | "supplier_product_name"
    | "normalized_store_name"
    | "generated_series"
    | "category_context"
    | "product_type"
    | "title_internal"
    | "title_shopee"
    | "title_tiktok"
    | "keywords_shopee"
    | "keywords_tiktok"
    | "sensitive_terms"
    | "specs"
  >
): string {
  const parts: string[] = [
    draft.raw_seller_text,
    draft.supplier_name ?? "",
    draft.supplier_product_name,
    draft.normalized_store_name,
    draft.generated_series,
    draft.category_context,
    draft.product_type,
    draft.title_internal,
    draft.title_shopee,
    draft.title_tiktok,
    ...draft.keywords_shopee,
    ...draft.keywords_tiktok,
    ...draft.sensitive_terms
  ];

  Object.values(draft.specs).forEach((entry) => {
    if (entry.value !== null && entry.value !== undefined) {
      parts.push(String(entry.value));
    }
  });

  return normalizeSearchText(parts.filter(Boolean).join(" "));
}
