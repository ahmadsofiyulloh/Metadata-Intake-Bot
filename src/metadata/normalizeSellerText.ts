import { getMetadataEnv } from "../config/env.js";
import type {
  GeneratedMetadata,
  ImageMetadata,
  PlatformFieldPack,
  SpecEntry,
  SkuBasis
} from "../types/metadata.js";
import {
  deriveAttributeCode,
  deriveCategoryCode,
  deriveMaterialCode,
  deriveSeriesCode
} from "./skuGenerator.js";
import { buildSpecCopyFields } from "./catalogSanitizer.js";

const SENSITIVE_TERMS = [
  "senjata",
  "senjata tajam",
  "self defense",
  "bela diri",
  "tactical",
  "combat",
  "anti begal",
  "mematikan",
  "serang",
  "badik",
  "belati",
  "golok",
  "parang",
  "pisau survival",
  "survival weapon",
  "sembelih",
  "tebas",
  "buru"
];

const CLEAR_BENIGN_TERMS = [
  "dapur",
  "kebun",
  "handcraft",
  "perkakas",
  "outdoor",
  "kerajinan",
  "rumah tangga",
  "harian"
];

const SERIES_RULES: Array<[RegExp, string]> = [
  [/\bdapur\b/i, "DAPUR SERIES"],
  [/\bhandcraft\b/i, "WIRA SERIES"],
  [/\boutdoor\b/i, "RIMBA SERIES"],
  [/\bkebun\b/i, "RIMBA SERIES"],
  [/\bkerajinan\b/i, "KARYA SERIES"],
  [/\bart\b/i, "KARYA SERIES"]
];

const MATERIAL_RULES: Array<[RegExp, string]> = [
  [/\bbaja\s+per\b/i, "baja per"],
  [/\bbaja\b/i, "baja"],
  [/\bbesi\b/i, "besi"],
  [/\bstainless\b/i, "stainless"],
  [/\baluminium\b/i, "aluminium"],
  [/\bkayu\s+jati\b/i, "kayu jati"],
  [/\bkayu\b/i, "kayu"],
  [/\bkulit\b/i, "kulit"]
];

const PACKAGE_DIMENSION_MISSING = [
  "berat produk",
  "dimensi paket",
  "isi paket",
  "supplier"
];

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeLower(value: string): string {
  return normalizeWhitespace(value).toLowerCase();
}

function titleCaseToken(token: string): string {
  if (!token) {
    return token;
  }

  const lower = token.toLowerCase();
  if (/^[0-9-]+$/.test(token)) {
    return token;
  }
  if (["cm", "mm", "ml", "pcs"].includes(lower)) {
    return lower;
  }
  if (["pb", "lb", "tb", "sku"].includes(lower)) {
    return lower.toUpperCase();
  }
  if (token.includes("-")) {
    return token
      .split("-")
      .map((part) => titleCaseToken(part))
      .join("-");
  }
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function titleCasePhrase(value: string): string {
  return normalizeWhitespace(value)
    .split(" ")
    .map((token) => titleCaseToken(token))
    .join(" ");
}

function hasBenignContext(text: string): boolean {
  return CLEAR_BENIGN_TERMS.some((term) => text.includes(term));
}

function isExplicitlyDangerous(text: string): boolean {
  return [
    /senjata\s+tajam/i,
    /self\s*defense/i,
    /bela\s+diri/i,
    /combat/i,
    /tactical/i,
    /anti\s+begal/i,
    /survival\s+weapon/i,
    /mematikan/i,
    /tebas\s+orang/i
  ].some((pattern) => pattern.test(text));
}

export function normalizeSellerText(rawSellerText: string): string {
  return normalizeLower(rawSellerText);
}

export function extractSensitiveTerms(rawSellerText: string): string[] {
  const normalized = normalizeLower(rawSellerText);
  return SENSITIVE_TERMS.filter((term) => {
    if (term.includes(" ")) {
      return normalized.includes(term);
    }
    return new RegExp(`\\b${term}\\b`, "i").test(normalized);
  });
}

export function extractPrice(rawSellerText: string): number | null {
  const normalized = normalizeLower(rawSellerText);
  const matches = [...normalized.matchAll(/(?:rp\.?\s*)?(\d{1,3}(?:[.\s]\d{3})+|\d{5,})/g)];
  if (matches.length === 0) {
    return null;
  }

  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const candidate = matches[index]?.[1] ?? "";
    const numeric = Number(candidate.replace(/[^0-9]/g, ""));
    if (Number.isFinite(numeric) && numeric >= 1000) {
      return numeric;
    }
  }

  return null;
}

export function extractStock(rawSellerText: string): number | null {
  const normalized = normalizeLower(rawSellerText);
  const stockMatch = normalized.match(/\b(?:stok|stock|sisa)\s*(\d{1,6})\b/);
  if (!stockMatch?.[1]) {
    return null;
  }

  const stock = Number(stockMatch[1]);
  return Number.isFinite(stock) ? stock : null;
}

export function extractSupplierName(rawSellerText: string): string | null {
  const normalized = normalizeLower(rawSellerText);
  const patterns = [
    /\bsupplier[:\s-]+([a-z0-9\s&.'/-]+?)(?=$|\s+(?:produk|barang|modal|stok|harga)\b)/i,
    /\bnama\s+supplier[:\s-]+([a-z0-9\s&.'/-]+?)(?=$|\s+(?:produk|barang|modal|stok|harga)\b)/i,
    /\btoko[:\s-]+([a-z0-9\s&.'/-]+?)(?=$|\s+(?:produk|barang|modal|stok|harga)\b)/i
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return normalizeWhitespace(match[1]);
    }
  }

  return null;
}

function extractDimensionValue(
  normalizedText: string,
  key: "pb" | "lb" | "tb",
  defaultUnit: "cm" | "mm"
): string | null {
  const match = normalizedText.match(
    new RegExp(`\\b${key}\\s*([0-9]+(?:\\s*-\\s*[0-9]+)?)(?:\\s*(cm|mm))?\\b`, "i")
  );
  if (!match?.[1]) {
    return null;
  }

  const numeric = match[1].replace(/\s+/g, "");
  const unit = (match[2]?.toLowerCase() as "cm" | "mm" | undefined) ?? defaultUnit;
  return `${numeric} ${unit}`;
}

function extractDimensions(rawSellerText: string): {
  pb: string | null;
  lb: string | null;
  tb: string | null;
} {
  const normalized = normalizeLower(rawSellerText);

  return {
    pb: extractDimensionValue(normalized, "pb", "cm"),
    lb: extractDimensionValue(normalized, "lb", "mm"),
    tb: extractDimensionValue(normalized, "tb", "cm")
  };
}

function extractPrimaryMaterial(rawSellerText: string): string | null {
  const normalized = normalizeLower(rawSellerText);
  for (const [pattern, value] of MATERIAL_RULES) {
    if (pattern.test(normalized)) {
      return value;
    }
  }
  return null;
}

function extractHandleMaterial(rawSellerText: string): string | null {
  const normalized = normalizeLower(rawSellerText);
  const patterns: Array<[RegExp, string]> = [
    [/\bgagang\s+kayu\s+jati\b/i, "kayu jati"],
    [/\bhandle\s+kayu\s+jati\b/i, "kayu jati"],
    [/\bkayu\s+jati\b/i, "kayu jati"],
    [/\bgagang\s+kayu\b/i, "kayu"],
    [/\bhandle\s+kayu\b/i, "kayu"]
  ];

  for (const [pattern, value] of patterns) {
    if (pattern.test(normalized)) {
      return value;
    }
  }

  return null;
}

function removeAdministrativeSegments(text: string): string {
  return normalizeWhitespace(
    text
      .replace(/\b(?:stok|stock)\s*\d{1,6}\b/gi, " ")
      .replace(/\b(?:pcs|pc|pcs\.|unit|box)\b/gi, " ")
      .replace(/\b(?:rp\.?\s*)?\d{1,3}(?:[.\s]\d{3})+\b/gi, " ")
      .replace(/\b(?:rp\.?\s*)?\d{5,}\b/gi, " ")
      .replace(/\b(?:pb|lb|tb)\s*\d+(?:\s*-\s*\d+)?\b/gi, " ")
      .replace(/\b(?:ml)\s*\d+\b/gi, " ")
      .replace(/\b(?:supplier|toko|nama\s+toko)\b/gi, " ")
      .replace(/[|,;:]+/g, " ")
  );
}

function extractSupplierProductName(rawSellerText: string): string {
  const normalized = normalizeLower(rawSellerText);
  const stripped = removeAdministrativeSegments(normalized);
  const cleaned = stripped
    .replace(/\s{2,}/g, " ")
    .replace(/\b\d+(?:-\d+)?\b/g, " ")
    .replace(/\b(?:ml|cm|mm)\b/gi, " ")
    .replace(/\s{2,}/g, " ");
  return cleaned.trim();
}

function deriveProductType(
  normalizedText: string,
  sensitiveTerms: string[]
): string {
  if (/\bdapur\b/i.test(normalizedText)) {
    return "alat dapur";
  }
  if (/\bperkakas\b/i.test(normalizedText) || /\bhandcraft\b/i.test(normalizedText)) {
    return "perkakas handcraft";
  }
  if (/\boutdoor\b/i.test(normalizedText) || /\bkebun\b/i.test(normalizedText)) {
    return "alat outdoor";
  }
  if (sensitiveTerms.some((term) => ["badik", "golok", "parang", "belati", "pisau"].includes(term))) {
    return "perkakas handcraft";
  }
  return "produk harian";
}

function deriveCategoryContext(productType: string, normalizedText: string): string {
  if (productType === "alat dapur") {
    return "alat dapur";
  }
  if (productType === "perkakas handcraft") {
    return "perkakas outdoor";
  }
  if (productType === "alat outdoor") {
    return "alat outdoor";
  }
  if (/\bkebun\b/i.test(normalizedText)) {
    return "alat kebun";
  }
  return "produk harian";
}

function deriveSeries(normalizedText: string, productType: string): string {
  for (const [pattern, series] of SERIES_RULES) {
    if (pattern.test(normalizedText) || pattern.test(productType)) {
      return series;
    }
  }
  if (productType === "alat dapur") {
    return "DAPUR SERIES";
  }
  if (productType === "perkakas handcraft") {
    return "WIRA SERIES";
  }
  if (productType === "alat outdoor") {
    return "RIMBA SERIES";
  }
  return "LOKA SERIES";
}

function buildMarketplaceKeyword(
  productType: string,
  categoryContext: string,
  sensitiveTerms: string[]
): string {
  if (productType === "alat dapur" || /dapur/i.test(categoryContext)) {
    return "Alat Dapur Harian";
  }
  if (sensitiveTerms.length > 0 || productType === "perkakas handcraft") {
    return "Alat Outdoor Harian";
  }
  if (/kebun/i.test(categoryContext)) {
    return "Perlengkapan Kebun";
  }
  return "Perlengkapan Harian";
}

function buildNormalizedStoreName(params: {
  productType: string;
  primaryMaterial: string | null;
  handleMaterial: string | null;
  dimensions: { pb: string | null; lb: string | null; tb: string | null };
}): string {
  const parts = [
    titleCasePhrase(params.productType),
    params.primaryMaterial ? titleCasePhrase(params.primaryMaterial) : null,
    params.handleMaterial ? titleCasePhrase(params.handleMaterial) : null,
    params.dimensions.pb ? `PB ${params.dimensions.pb}` : null,
    params.dimensions.tb ? `TB ${params.dimensions.tb}` : null
  ].filter(Boolean) as string[];

  return normalizeWhitespace(parts.join(" "));
}

function buildTitle(
  storeName: string,
  series: string,
  normalizedStoreName: string,
  marketplaceKeyword: string
): string {
  return `${storeName.toUpperCase()} | ${series} ${normalizedStoreName} - ${marketplaceKeyword}`;
}

function buildSpecs(params: {
  primaryMaterial: string | null;
  handleMaterial: string | null;
  dimensions: { pb: string | null; lb: string | null; tb: string | null };
  price: number | null;
  stock: number | null;
}): Record<string, SpecEntry> {
  return {
    material: {
      value: params.primaryMaterial,
      source: params.primaryMaterial ? "explicit" : "unknown",
      confidence: params.primaryMaterial ? 0.95 : 0
    },
    handle_material: {
      value: params.handleMaterial,
      source: params.handleMaterial ? "explicit" : "unknown",
      confidence: params.handleMaterial ? 0.95 : 0
    },
    pb: {
      value: params.dimensions.pb,
      source: params.dimensions.pb ? "explicit" : "unknown",
      confidence: params.dimensions.pb ? 0.85 : 0
    },
    lb: {
      value: params.dimensions.lb,
      source: params.dimensions.lb ? "explicit" : "unknown",
      confidence: params.dimensions.lb ? 0.75 : 0
    },
    tb: {
      value: params.dimensions.tb,
      source: params.dimensions.tb ? "explicit" : "unknown",
      confidence: params.dimensions.tb ? 0.75 : 0
    },
    supplier_price: {
      value: params.price,
      source: params.price !== null ? "explicit" : "unknown",
      confidence: params.price !== null ? 0.99 : 0
    },
    supplier_stock: {
      value: params.stock,
      source: params.stock !== null ? "explicit" : "unknown",
      confidence: params.stock !== null ? 0.99 : 0
    }
  };
}

function buildMissingFields(supplierName: string | null): string[] {
  const missing = [...PACKAGE_DIMENSION_MISSING];
  if (supplierName) {
    return missing.filter((field) => field !== "supplier");
  }
  return missing;
}

function buildKeywords(params: {
  productType: string;
  categoryContext: string;
  primaryMaterial: string | null;
  handleMaterial: string | null;
}): { shopee: string[]; tiktok: string[] } {
  const base = [
    params.productType === "alat dapur" ? "alat dapur" : "alat outdoor",
    params.productType,
    params.categoryContext,
    params.handleMaterial ? `gagang ${params.handleMaterial}` : "",
    params.primaryMaterial ? `${params.primaryMaterial} pilihan` : "",
    "finishing rapi",
    "packing aman"
  ]
    .map((value) => normalizeWhitespace(value))
    .filter(Boolean);

  const deduped = Array.from(new Set(base));
  return {
    shopee: deduped,
    tiktok: deduped.slice(0, 5).concat("siap kirim")
  };
}

function buildImageMetadata(params: {
  productType: string;
  primaryMaterial: string | null;
  handleMaterial: string | null;
  dimensions: { pb: string | null; lb: string | null; tb: string | null };
}): ImageMetadata {
  return {
    hero_headline:
      params.productType === "alat dapur"
        ? "Cocok untuk Kebutuhan Harian"
        : "Cocok untuk Aktivitas Luar Ruang",
    hero_subheadline: [
      params.primaryMaterial ? titleCasePhrase(params.primaryMaterial) : "",
      params.handleMaterial ? `gagang ${titleCasePhrase(params.handleMaterial)}` : "",
      "finishing rapi"
    ]
      .filter(Boolean)
      .join(", "),
    badges: ["Produk Dicek", "Packing Aman", "Siap Kirim", "Stok Terbatas"],
    spec_headline: "Ukuran & Spesifikasi",
    benefit_points: [
      params.primaryMaterial ? `Material ${titleCasePhrase(params.primaryMaterial)}` : "Material pilihan",
      params.handleMaterial ? `Gagang ${titleCasePhrase(params.handleMaterial)}` : "Nyaman digunakan",
      params.dimensions.pb ? `PB ${params.dimensions.pb}` : "Ukuran proporsional",
      params.dimensions.tb ? `TB ${params.dimensions.tb}` : "Finishing rapi"
    ],
    spec_copy_fields: []
  };
}

function buildDescriptionParts(params: {
  productType: string;
  normalizedStoreName: string;
  primaryMaterial: string | null;
  handleMaterial: string | null;
  dimensions: { pb: string | null; lb: string | null; tb: string | null };
  price: number | null;
  stock: number | null;
}): { shopee: string[]; tiktok: string[] } {
  const intro = [
    params.productType === "alat dapur"
      ? "Produk dirancang untuk kebutuhan dapur harian."
      : "Produk handcraft dengan material pilihan dan finishing rapi.",
    "Cocok untuk kebutuhan penggunaan harian sesuai fungsi produk."
  ].join(" ");

  const specLine = [
    params.primaryMaterial ? `material ${params.primaryMaterial}` : "",
    params.handleMaterial ? `gagang ${params.handleMaterial}` : "",
    params.dimensions.pb ? `PB ${params.dimensions.pb}` : "",
    params.dimensions.lb ? `LB ${params.dimensions.lb}` : "",
    params.dimensions.tb ? `TB ${params.dimensions.tb}` : ""
  ]
    .filter(Boolean)
    .join(", ");

  const stockLine = [
    params.stock !== null ? `stok tersedia ${params.stock} pcs.` : "stok dapat berubah sewaktu-waktu.",
    params.price !== null ? `modal supplier ${params.price}.` : "data mengikuti informasi supplier."
  ].join(" ");

  return {
    shopee: [
      `${intro} ${params.normalizedStoreName}.`,
      `Spesifikasi: ${specLine || "mengikuti data supplier"}.`,
      stockLine,
      "Produk dicek sebelum dikirim dan dikemas dengan aman."
    ],
    tiktok: [
      `${params.normalizedStoreName}.`,
      specLine ? `Spesifikasi: ${specLine}.` : "Spesifikasi mengikuti data supplier.",
      "Cocok untuk listing katalog yang rapi dan netral."
    ]
  };
}

function buildConfidenceSummary(params: {
  price: number | null;
  stock: number | null;
  primaryMaterial: string | null;
  handleMaterial: string | null;
  dimensions: { pb: string | null; lb: string | null; tb: string | null };
  sensitiveTerms: string[];
  missingFields: string[];
}): string {
  const explicitFields = [
    params.price !== null ? "price" : "",
    params.stock !== null ? "stock" : "",
    params.primaryMaterial ? "material" : "",
    params.handleMaterial ? "handle_material" : "",
    params.dimensions.pb ? "pb" : "",
    params.dimensions.lb ? "lb" : "",
    params.dimensions.tb ? "tb" : ""
  ].filter(Boolean);

  return [
    `explicit: ${explicitFields.join(", ") || "none"}`,
    `inferred: title, series, keywords`,
    `unknown: ${params.missingFields.join(", ") || "none"}`,
    `risk: ${params.sensitiveTerms.join(", ") || "none"}`
  ].join(" | ");
}

function buildSkuBasis(params: {
  generatedSeries: string;
  primaryMaterial: string | null;
  handleMaterial: string | null;
  dimensions: { pb: string | null; lb: string | null; tb: string | null };
  productType: string;
  categoryContext: string;
}): SkuBasis {
  const attributeParts = extractAttributeParts(params.dimensions);

  return {
    series_code: deriveSeriesCode(params.generatedSeries),
    category_code: deriveCategoryCode(params.primaryMaterial || params.categoryContext || params.productType),
    material_code: deriveMaterialCode(params.handleMaterial || params.primaryMaterial || params.productType),
    attribute_code: deriveAttributeCode(attributeParts)
  };
}

function buildComplianceStatus(params: {
  sensitiveTerms: string[];
  normalizedText: string;
}): {
  status: GeneratedMetadata["compliance_status"];
  reason: string;
} {
  if (isExplicitlyDangerous(params.normalizedText)) {
    return {
      status: "BLOCKED",
      reason:
        "Produk atau wording mengarah langsung ke senjata, self-defense, combat, atau klaim berbahaya."
    };
  }

  if (params.sensitiveTerms.length > 0) {
    if (hasBenignContext(params.normalizedText)) {
      return {
        status: "NEED_REVIEW",
        reason:
          "Produk mengandung istilah sensitif atau ambigu tetapi masih punya konteks fungsi yang jelas. Gunakan wording netral dan review kategori marketplace."
      };
    }

    return {
      status: "INTERNAL_ONLY",
      reason:
        "Produk mengandung istilah sensitif tanpa konteks fungsi yang cukup jelas. Simpan untuk katalog internal dulu."
    };
  }

  return {
    status: "SAFE_TO_DRAFT",
    reason: "Tidak ada istilah sensitif yang terdeteksi dan wording cukup aman untuk draft."
  };
}

function buildDataStatus(
  complianceStatus: GeneratedMetadata["compliance_status"],
  missingFields: string[]
): GeneratedMetadata["data_status"] {
  if (missingFields.length > 0) {
    return "DATA_SEBAGIAN";
  }
  if (complianceStatus === "SAFE_TO_DRAFT") {
    return "READY";
  }
  return "DRAFT";
}

function extractAttributeParts(dimensions: { pb: string | null; lb: string | null; tb: string | null }): string[] {
  const parts: string[] = [];
  if (dimensions.pb) {
    parts.push(`PB${dimensions.pb.replace(/[^0-9-]/g, "").replace(/-.+$/, "")}`);
  }
  if (dimensions.tb) {
    parts.push(`TB${dimensions.tb.replace(/[^0-9]/g, "")}`);
  }
  return parts;
}

export function buildPlatformFieldPack(
  draft: GeneratedMetadata,
  platform: "shopee" | "tiktok"
): PlatformFieldPack {
  const descriptionParts =
    platform === "shopee" ? draft.shopee_description_parts : draft.tiktok_description_parts;
  const keywords = platform === "shopee" ? draft.keywords_shopee : draft.keywords_tiktok;
  const purpose =
    draft.compliance_status === "BLOCKED" || draft.compliance_status === "INTERNAL_ONLY"
      ? "METADATA_ONLY"
      : draft.compliance_status === "NEED_REVIEW"
        ? "REVIEW_REQUIRED"
        : "MARKETPLACE_DRAFT";
  const warningPrefix =
    purpose === "METADATA_ONLY"
      ? "Metadata only. Review manual sebelum publish marketplace."
      : purpose === "REVIEW_REQUIRED"
        ? "Review manual sebelum publish marketplace."
        : "Siap sebagai draft metadata.";

  return {
    status: draft.compliance_status,
    purpose,
    warning: `${warningPrefix} ${draft.compliance_reason}`.trim(),
    keywords,
    description_parts: descriptionParts,
    title: platform === "shopee" ? draft.title_shopee : draft.title_tiktok,
    spec_copy_fields: draft.image_metadata.spec_copy_fields
  };
}

export function buildHeuristicMetadataDraft(rawSellerText: string): GeneratedMetadata {
  const env = getMetadataEnv();
  const normalizedText = normalizeLower(rawSellerText);
  const supplierName = extractSupplierName(rawSellerText);
  const price = extractPrice(rawSellerText);
  const stock = extractStock(rawSellerText);
  const sensitiveTerms = extractSensitiveTerms(rawSellerText);
  const dimensions = extractDimensions(rawSellerText);
  const primaryMaterial = extractPrimaryMaterial(rawSellerText);
  const handleMaterial = extractHandleMaterial(rawSellerText);
  const supplierProductName = extractSupplierProductName(rawSellerText);
  const productType = deriveProductType(normalizedText, sensitiveTerms);
  const categoryContext = deriveCategoryContext(productType, normalizedText);
  const generatedSeries = deriveSeries(normalizedText, productType);
  const marketplaceKeyword = buildMarketplaceKeyword(productType, categoryContext, sensitiveTerms);
  const normalizedStoreName = buildNormalizedStoreName({
    productType,
    primaryMaterial,
    handleMaterial,
    dimensions
  });
  const titleInternal = buildTitle(env.STORE_NAME, generatedSeries, normalizedStoreName, marketplaceKeyword);
  const titleShopee = buildTitle(env.STORE_NAME, generatedSeries, normalizedStoreName, marketplaceKeyword);
  const titleTiktok = buildTitle(env.STORE_NAME, generatedSeries, normalizedStoreName, marketplaceKeyword);
  const missingFields = buildMissingFields(supplierName);
  const specs = buildSpecs({
    primaryMaterial,
    handleMaterial,
    dimensions,
    price,
    stock
  });
  const keywords = buildKeywords({
    productType,
    categoryContext,
    primaryMaterial,
    handleMaterial
  });
  const descriptionParts = buildDescriptionParts({
    productType,
    normalizedStoreName,
    primaryMaterial,
    handleMaterial,
    dimensions,
    price,
    stock
  });
  const compliance = buildComplianceStatus({ sensitiveTerms, normalizedText });
  const dataStatus = buildDataStatus(compliance.status, missingFields);
  const imageMetadata = buildImageMetadata({
    productType,
    primaryMaterial,
    handleMaterial,
    dimensions
  });
  imageMetadata.spec_copy_fields = buildSpecCopyFields(specs);
  const skuBasis = buildSkuBasis({
    generatedSeries,
    primaryMaterial,
    handleMaterial,
    dimensions,
    productType,
    categoryContext
  });

  return {
    raw_seller_text: rawSellerText,
    supplier_name: supplierName,
    supplier_product_name: supplierProductName,
    normalized_store_name: normalizedStoreName,
    generated_series: generatedSeries,
    category_context: categoryContext,
    product_type: productType,
    supplier_price: price,
    supplier_stock: stock,
    specs,
    missing_fields: missingFields,
    sensitive_terms: sensitiveTerms,
    compliance_status: compliance.status,
    compliance_reason: compliance.reason,
    title_internal: titleInternal,
    title_shopee: titleShopee,
    title_tiktok: titleTiktok,
    sku_basis: skuBasis,
    keywords_shopee: keywords.shopee,
    keywords_tiktok: keywords.tiktok,
    image_metadata: imageMetadata,
    shopee_description_parts: descriptionParts.shopee,
    tiktok_description_parts: descriptionParts.tiktok,
    data_status: dataStatus,
    confidence_summary: buildConfidenceSummary({
      price,
      stock,
      primaryMaterial,
      handleMaterial,
      dimensions,
      sensitiveTerms,
      missingFields
    })
  };
}

export function toPlatformPackDraft(draft: GeneratedMetadata): {
  shopee_field_pack_json: PlatformFieldPack;
  tiktok_field_pack_json: PlatformFieldPack;
} {
  return {
    shopee_field_pack_json: buildPlatformFieldPack(draft, "shopee"),
    tiktok_field_pack_json: buildPlatformFieldPack(draft, "tiktok")
  };
}
