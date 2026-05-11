import { strict as assert } from "node:assert";
import { applyComplianceGuard } from "../src/metadata/complianceGuard.js";
import { buildHeuristicMetadataDraft } from "../src/metadata/normalizeSellerText.js";
import { buildSellingPriceBreakdown, formatPriceNumber } from "../src/metadata/priceEstimator.js";
import { isShortCodeQuery } from "../src/bot/commands/shared.js";
import type { ProductDraftRow } from "../src/types/metadata.js";
import {
  formatDetailMessage,
  formatNewDraftMessage,
  formatReviewListMessage,
  formatSearchResultsMessage,
  formatSelectionMessage,
  formatShopeePackMessage,
  formatTiktokPackMessage
} from "../src/bot/formatters/metadataMessage.js";

process.env.STORE_NAME ??= "LANDEP SMITH";
process.env.STORE_CODE ??= "LDS";
process.env.DEFAULT_LANGUAGE ??= "id";
process.env.GEMINI_MODEL ??= "gemini-2.5-flash";

const rawSellerText =
  "Sembelih badik baja per kayu jati pb 25-26 lb 35 tb 16 stok 12 pcs 120.000";
const result = applyComplianceGuard(buildHeuristicMetadataDraft(rawSellerText));
const { draft, shopee_field_pack_json, tiktok_field_pack_json } = result;
const draftRow: ProductDraftRow = {
  ...draft,
  id: "draft-1",
  short_code: "LSM-0000",
  sku_internal: "LDS-WRA-TEST-001",
  store_name: "LANDEP SMITH",
  store_code: "LDS",
  category_context: draft.category_context,
  product_type: draft.product_type,
  shopee_field_pack_json,
  tiktok_field_pack_json,
  specs_json: draft.specs,
  missing_fields_json: draft.missing_fields,
  sensitive_terms_json: draft.sensitive_terms,
  keywords_json: {
    shopee: draft.keywords_shopee,
    tiktok: draft.keywords_tiktok
  },
  image_metadata_json: draft.image_metadata,
  archived_at: null,
  searchable_text: "test searchable text",
  review_notes: draft.compliance_reason,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z"
};

const unsafePattern =
  /\b(sembelih|badik|belati|golok|parang|pisau|senjata|self\s*defense|combat|tactical|anti\s+begal|tajam|ketajaman)\b/i;
const publicText = [
  draft.normalized_store_name,
  draft.title_internal,
  draft.title_shopee,
  draft.title_tiktok,
  ...draft.keywords_shopee,
  ...draft.keywords_tiktok,
  ...draft.shopee_description_parts,
  ...draft.tiktok_description_parts
].join(" ");

assert.equal(unsafePattern.test(publicText), false, publicText);
assert.equal(
  /Perkakas Handcraft.*Perkakas Handcraft/i.test(draft.normalized_store_name),
  false,
  draft.normalized_store_name
);
assert.equal(shopee_field_pack_json.purpose, "METADATA_ONLY");
assert.equal(tiktok_field_pack_json.purpose, "METADATA_ONLY");
assert.ok(shopee_field_pack_json.description_parts.length > 0);
assert.ok(tiktok_field_pack_json.description_parts.length > 0);
assert.equal(draft.specs.material?.value, "baja per");
assert.equal(draft.specs.handle_material?.value, "kayu jati");

const tbCopy = draft.image_metadata.spec_copy_fields.find((field) => field.key === "tb");
assert.ok(tbCopy, "tb copy field should exist");
assert.equal(tbCopy.label, "Tinggi Bilah");
assert.equal(tbCopy.copy_value, "16 cm");
assert.equal(tbCopy.copy_label_value, "Tinggi Bilah 16 cm");

assert.equal(isShortCodeQuery("LSM-0000"), true);
assert.equal(isShortCodeQuery("P-1001"), true);

const estimatedBreakdown = buildSellingPriceBreakdown(draft.supplier_price);
assert.ok(estimatedBreakdown, "estimated price breakdown should exist");
assert.equal(estimatedBreakdown?.estimatedSellingPrice, 180000);

const estimatedPriceText = formatPriceNumber(estimatedBreakdown!.estimatedSellingPrice);
const newDraftText = formatNewDraftMessage(draftRow).join("\n");
assert.ok(newDraftText.includes("Estimasi Harga Jual"));
assert.ok(newDraftText.includes(estimatedPriceText));
assert.ok(newDraftText.includes("Panjang Bilah"));
assert.ok(newDraftText.includes("Nilai"));
assert.ok(newDraftText.includes("Label + Nilai"));

const detailText = formatDetailMessage(draftRow);
assert.ok(detailText.includes("Estimasi Harga Jual"));
assert.ok(detailText.includes("Fee Marketplace (25%)"));
assert.ok(detailText.includes("Keuntungan (25%)"));
assert.ok(detailText.includes("Estimasi Total"));

const searchText = formatSearchResultsMessage("kayu jati", [draftRow]);
assert.ok(searchText.includes("Estimasi Jual"));
assert.ok(searchText.includes(estimatedPriceText));

const reviewText = formatReviewListMessage("PRODUK PERLU REVIEW", [draftRow]);
assert.ok(reviewText.includes("Estimasi Jual"));
assert.ok(reviewText.includes(estimatedPriceText));

const selectionText = formatSelectionMessage("shopee", [draftRow]);
assert.ok(selectionText.includes("Estimasi Jual"));
assert.ok(selectionText.includes(estimatedPriceText));

const shopeePackText = formatShopeePackMessage(draftRow);
assert.ok(shopeePackText.includes("Estimasi Harga Jual"));
assert.ok(shopeePackText.includes("Fee Marketplace (25%)"));

const tiktokPackText = formatTiktokPackMessage(draftRow);
assert.ok(tiktokPackText.includes("Estimasi Harga Jual"));
assert.ok(tiktokPackText.includes("Fee Marketplace (25%)"));

console.log("metadata sanitizer smoke passed", {
  compliance_status: draft.compliance_status,
  title_internal: draft.title_internal,
  tb_copy: tbCopy,
  estimated_price: estimatedBreakdown
});
