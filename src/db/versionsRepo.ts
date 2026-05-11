import type { MetadataVersionPayload } from "../types/metadata.js";
import { getSupabaseAdminClient } from "./supabase.js";

export async function getNextVersionNumber(productDraftId: string): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("metadata_versions")
    .select("version_number")
    .eq("product_draft_id", productDraftId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load version number: ${error.message}`);
  }

  return data?.version_number ? data.version_number + 1 : 1;
}

export async function insertMetadataVersion(params: {
  productDraftId: string;
  reason: string;
  payload: MetadataVersionPayload;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const versionNumber = await getNextVersionNumber(params.productDraftId);
  const { error } = await supabase.from("metadata_versions").insert({
    product_draft_id: params.productDraftId,
    version_number: versionNumber,
    reason: params.reason,
    payload_json: params.payload
  });

  if (error) {
    throw new Error(`Failed to insert metadata version: ${error.message}`);
  }
}
