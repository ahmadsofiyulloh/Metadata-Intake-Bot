import { getProductDraftByShortCode, searchProductDrafts } from "../../db/productDraftsRepo.js";
import type { ProductDraftRow } from "../../types/metadata.js";

export function isShortCodeQuery(query: string): boolean {
  return /^(?:lsm-\d+|p-\d+)$/i.test(query.trim());
}

export async function resolveDraftCandidates(query: string): Promise<ProductDraftRow[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  if (isShortCodeQuery(normalizedQuery)) {
    const exact = await getProductDraftByShortCode(normalizedQuery.toUpperCase());
    return exact ? [exact] : [];
  }

  return searchProductDrafts({
    query: normalizedQuery,
    limit: 10,
    includeArchived: false
  });
}
