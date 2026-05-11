import { getMetadataEnv } from "../config/env.js";
import type {
  FieldSource,
  GeneratedMetadata,
  ImageMetadata,
  SpecCopyField,
  SpecEntry
} from "../types/metadata.js";

const DANGEROUS_PATTERNS = [
  /\bsenjata\s+tajam\b/gi,
  /\bself\s*defense\b/gi,
  /\bbela\s+diri\b/gi,
  /\btactical\b/gi,
  /\bcombat\b/gi,
  /\banti\s+begal\b/gi,
  /\bsurvival\s+weapon\b/gi,
  /\bmematikan\b/gi,
  /\bserang\b/gi,
  /\bsembelih\b/gi,
  /\btebas(?:\s+orang)?\b/gi,
  /\bburu\b/gi
];

const RISKY_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bbilah\s+tajam\b/gi, "finishing rapi"],
  [/\bketajaman\b/gi, "finishing"],
  [/\btajam\b/gi, "rapi"],
  [/\balat\s+potong\b/gi, "perkakas"],
  [/\bpotong\s+daging\b/gi, "kebutuhan harian"],
  [/\bpotong\b/gi, "harian"],
  [/\bdaging\b/gi, "harian"],
  [/\bmata\s+(?:perkakas\s+handcraft|produk|bilah)?\b/gi, "bagian utama "],
  [/\bmemotong\b/gi, "penggunaan harian"],
  [/\bdapatkan\s+sekarang\b/gi, "Review metadata"],
  [/\bunggul(?:an)?\b/gi, "pilihan"]
];

const CATEGORY_ALIAS_PATTERNS = [
  /\bpisau\s+survival\b/gi,
  /\bbadik\b/gi,
  /\bbelati\b/gi,
  /\bgolok\b/gi,
  /\bparang\b/gi,
  /\bpisau\b/gi
];

const SPEC_LABELS: Record<string, { label: string; context: string; defaultUnit?: string }> = {
  material: { label: "Material", context: "material produk" },
  handle_material: { label: "Gagang", context: "material gagang" },
  pb: { label: "Panjang Bilah", context: "ukuran bilah", defaultUnit: "cm" },
  lb: { label: "Lebar Bilah", context: "ukuran bilah", defaultUnit: "mm" },
  tb: { label: "Tinggi Bilah", context: "ukuran bilah", defaultUnit: "cm" }
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function titleCaseToken(token: string): string {
  const lower = token.toLowerCase();
  if (/^[0-9]+(?:-[0-9]+)?$/.test(token)) {
    return token;
  }
  if (["cm", "mm"].includes(lower)) {
    return lower;
  }
  if (["pb", "lb", "tb", "sku"].includes(lower)) {
    return lower.toUpperCase();
  }
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function titleCasePhrase(value: string): string {
  return normalizeWhitespace(value)
    .split(" ")
    .map(titleCaseToken)
    .join(" ");
}

function removeDangerousTerms(value: string): string {
  let result = value;
  RISKY_REPLACEMENTS.forEach(([pattern, replacement]) => {
    result = result.replace(pattern, replacement);
  });
  DANGEROUS_PATTERNS.forEach((pattern) => {
    result = result.replace(pattern, " ");
  });
  return result;
}

function replaceSensitiveCategories(value: string, alias: string): string {
  let result = value;
  CATEGORY_ALIAS_PATTERNS.forEach((pattern) => {
    result = result.replace(pattern, ` ${alias} `);
  });
  return result;
}

function collapseDuplicateWords(value: string): string {
  const tokens = normalizeWhitespace(value).split(" ");
  const collapsed: string[] = [];

  tokens.forEach((token) => {
    const previous = collapsed.at(-1);
    if (!previous || previous.toLowerCase() !== token.toLowerCase()) {
      collapsed.push(token);
    }
  });

  return collapsed.join(" ");
}

function collapseRepeatedPhrase(value: string, phrase: string): string {
  const escaped = escapeRegExp(phrase);
  const repeatedPattern = new RegExp(`(?:\\b${escaped}\\b\\s*){2,}`, "gi");
  return value.replace(repeatedPattern, `${phrase} `);
}

function dedupeKnownPhrases(value: string, alias: string): string {
  let result = value;
  [
    alias,
    "Perkakas Handcraft",
    "Alat Outdoor",
    "Alat Dapur",
    "Alat Kebun",
    "Baja Per",
    "Kayu Jati"
  ].forEach((phrase) => {
    result = collapseRepeatedPhrase(result, phrase);
  });
  return normalizeWhitespace(result);
}

function stripTitleParts(value: string, storeName: string): string {
  return value
    .replace(new RegExp(`\\b${escapeRegExp(storeName)}\\b\\s*\\|?`, "gi"), " ")
    .replace(/\b[A-Z0-9]+\s+SERIES\b/gi, " ")
    .replace(/[|]+/g, " ");
}

function deriveNeutralAlias(draft: GeneratedMetadata): string {
  const haystack = [
    draft.raw_seller_text,
    draft.supplier_product_name,
    draft.normalized_store_name,
    draft.product_type,
    draft.category_context,
    ...draft.sensitive_terms
  ]
    .join(" ")
    .toLowerCase();

  if (/\bdapur\b|\bmasak\b/.test(haystack)) {
    return "Alat Dapur";
  }
  if (/\bkebun\b/.test(haystack)) {
    return "Alat Kebun";
  }
  if (/\bhandcraft\b|\bkerajinan\b|\btempa\b|\btradisional\b|\bbadik\b|\bbelati\b/.test(haystack)) {
    return "Perkakas Handcraft";
  }
  if (/\boutdoor\b|\bsurvival\b|\bparang\b|\bgolok\b/.test(haystack)) {
    return "Alat Outdoor";
  }
  return "Produk Harian";
}

function sanitizeCatalogPhrase(value: string, alias: string): string {
  const stripped = removeDangerousTerms(value);
  const replaced = replaceSensitiveCategories(stripped, alias);
  const cleaned = replaced.replace(/[^\w\s./&+-]/g, " ");
  return dedupeKnownPhrases(collapseDuplicateWords(cleaned), alias);
}

function sanitizeStoreName(value: string, alias: string, storeName: string): string {
  const stripped = stripTitleParts(value, storeName);
  const sanitized = sanitizeCatalogPhrase(stripped, alias);
  return titleCasePhrase(sanitized || alias);
}

function sanitizeSeries(value: string): string {
  const sanitized = removeDangerousTerms(value)
    .replace(/[^\w\s-]/g, " ")
    .replace(/\b(?:BADIK|BELATI|GOLOK|PARANG|PISAU)\b/gi, "WIRA")
    .trim();
  const normalized = normalizeWhitespace(sanitized || "LOKA SERIES").toUpperCase();
  return /\bSERIES\b/i.test(normalized) ? normalized : `${normalized} SERIES`;
}

function deriveMarketplaceKeyword(draft: GeneratedMetadata, alias: string): string {
  const haystack = `${draft.product_type} ${draft.category_context} ${alias}`.toLowerCase();
  if (haystack.includes("dapur")) {
    return "Alat Dapur Harian";
  }
  if (haystack.includes("kebun")) {
    return "Perlengkapan Kebun";
  }
  if (haystack.includes("handcraft")) {
    return "Perkakas Handcraft";
  }
  if (haystack.includes("outdoor")) {
    return "Alat Outdoor Harian";
  }
  return "Perlengkapan Harian";
}

function sanitizeKeyword(value: string, alias: string): string {
  return sanitizeCatalogPhrase(value, alias).toLowerCase();
}

function sanitizeKeywordList(values: string[], alias: string, fallback: string): string[] {
  const sanitized = values
    .map((value) => sanitizeKeyword(value, alias))
    .filter(Boolean);
  sanitized.unshift(fallback.toLowerCase());
  return Array.from(new Set(sanitized)).slice(0, 8);
}

function sanitizeDescriptionPart(value: string, alias: string): string {
  const sanitized = sanitizeCatalogPhrase(value, alias);
  return sanitized.endsWith(".") ? sanitized : `${sanitized}.`;
}

function sanitizeDescriptionParts(values: string[], alias: string): string[] {
  const sanitized = values
    .map((value) => sanitizeDescriptionPart(value, alias))
    .filter((value) => value !== ".");

  if (sanitized.length > 0) {
    return sanitized;
  }

  return [
    `${alias} dengan data supplier yang sudah dinormalisasi untuk kebutuhan metadata.`,
    "Review manual tetap diperlukan sebelum publish marketplace."
  ];
}

function getSpecCopyValue(fields: SpecCopyField[], key: string): string | null {
  return fields.find((field) => field.key === key)?.copy_value ?? null;
}

function buildMetadataOnlyKeywords(alias: string, specs: GeneratedMetadata["specs"]): string[] {
  const fields = buildSpecCopyFields(specs);
  const material = getSpecCopyValue(fields, "material");
  const handleMaterial = getSpecCopyValue(fields, "handle_material");
  const keywords = [
    alias.toLowerCase(),
    material ? `${alias} ${material}`.toLowerCase() : "",
    handleMaterial ? `gagang ${handleMaterial}`.toLowerCase() : "",
    "metadata internal",
    "review manual"
  ].filter(Boolean);

  return Array.from(new Set(keywords)).slice(0, 8);
}

function buildMetadataOnlyDescriptionParts(alias: string, specs: GeneratedMetadata["specs"]): string[] {
  const specCopyFields = buildSpecCopyFields(specs);
  const specLine = specCopyFields.map((field) => field.copy_label_value).join(", ");

  return [
    `${alias} dengan data supplier yang sudah dinormalisasi untuk kebutuhan metadata internal.`,
    specLine ? `Spesifikasi: ${specLine}.` : "Spesifikasi mengikuti data supplier.",
    "Review manual diperlukan sebelum publish marketplace."
  ];
}

function normalizeDimensionValue(key: string, value: string): string {
  const specMeta = SPEC_LABELS[key];
  const normalized = normalizeWhitespace(value.toLowerCase().replace(",", "."));
  const match = normalized.match(/([0-9]+(?:\.[0-9]+)?(?:\s*-\s*[0-9]+(?:\.[0-9]+)?)?)\s*(cm|mm)?\b/i);

  if (!match?.[1]) {
    return value;
  }

  const numeric = match[1].replace(/\s*-\s*/g, "-");
  const unit = match[2]?.toLowerCase() ?? specMeta?.defaultUnit;
  return unit ? `${numeric} ${unit}` : numeric;
}

function normalizeSpecValue(key: string, entry: SpecEntry): SpecEntry {
  if (entry.value === null || entry.value === undefined) {
    return entry;
  }

  if (!["pb", "lb", "tb"].includes(key)) {
    return {
      ...entry,
      value: typeof entry.value === "string" ? normalizeWhitespace(entry.value) : entry.value
    };
  }

  return {
    ...entry,
    value: normalizeDimensionValue(key, String(entry.value))
  };
}

function normalizeSpecs(specs: GeneratedMetadata["specs"]): GeneratedMetadata["specs"] {
  return Object.fromEntries(
    Object.entries(specs).map(([key, entry]) => [key, normalizeSpecValue(key, entry)])
  );
}

export function buildSpecCopyFields(specs: GeneratedMetadata["specs"]): SpecCopyField[] {
  return Object.entries(specs)
    .filter(([key, entry]) => {
      return Boolean(SPEC_LABELS[key] && entry.value !== null && entry.value !== undefined && String(entry.value).trim());
    })
    .map(([key, entry]) => {
      const meta = SPEC_LABELS[key];
      const value = normalizeSpecValue(key, entry).value;
      const copyValue = normalizeWhitespace(String(value));

      return {
        key,
        label: meta.label,
        value: copyValue,
        copy_value: copyValue,
        copy_label_value: `${meta.label} ${copyValue}`,
        context: meta.context,
        source: entry.source as FieldSource,
        confidence: entry.confidence
      };
    });
}

function sanitizeImageText(value: string, alias: string): string {
  return titleCasePhrase(sanitizeCatalogPhrase(value, alias));
}

function sanitizeImageMetadata(
  imageMetadata: ImageMetadata,
  specs: GeneratedMetadata["specs"],
  alias: string,
  metadataOnly: boolean
): ImageMetadata {
  const specCopyFields = buildSpecCopyFields(specs);
  if (metadataOnly) {
    const material = getSpecCopyValue(specCopyFields, "material");
    const handleMaterial = getSpecCopyValue(specCopyFields, "handle_material");
    const benefitPoints = specCopyFields
      .filter((field) => ["material", "handle_material", "pb", "lb", "tb"].includes(field.key))
      .map((field) => field.copy_label_value);

    return {
      hero_headline: alias,
      hero_subheadline: [material, handleMaterial].filter(Boolean).join(", "),
      badges: ["Metadata Internal", "Review Manual", "Data Supplier"],
      spec_headline: "Ukuran & Spesifikasi",
      benefit_points: benefitPoints,
      spec_copy_fields: specCopyFields
    };
  }

  return {
    hero_headline: sanitizeImageText(imageMetadata.hero_headline, alias),
    hero_subheadline: sanitizeCatalogPhrase(imageMetadata.hero_subheadline, alias),
    badges: imageMetadata.badges.map((badge) => sanitizeImageText(badge, alias)).filter(Boolean),
    spec_headline: sanitizeImageText(imageMetadata.spec_headline, alias) || "Ukuran & Spesifikasi",
    benefit_points: imageMetadata.benefit_points
      .map((point) => sanitizeCatalogPhrase(point, alias))
      .filter(Boolean),
    spec_copy_fields: specCopyFields
  };
}

export function sanitizeGeneratedMetadata(draft: GeneratedMetadata): GeneratedMetadata {
  const env = getMetadataEnv();
  const alias = deriveNeutralAlias(draft);
  const specs = normalizeSpecs(draft.specs);
  const metadataOnly =
    draft.compliance_status === "INTERNAL_ONLY" || draft.compliance_status === "BLOCKED";
  const normalizedStoreName = sanitizeStoreName(
    draft.normalized_store_name || draft.supplier_product_name || alias,
    alias,
    env.STORE_NAME
  );
  const generatedSeries = sanitizeSeries(draft.generated_series);
  const marketplaceKeyword = deriveMarketplaceKeyword(draft, alias);
  const title = `${env.STORE_NAME.toUpperCase()} | ${generatedSeries} ${normalizedStoreName} - ${marketplaceKeyword}`;

  return {
    ...draft,
    normalized_store_name: normalizedStoreName,
    generated_series: generatedSeries,
    category_context: sanitizeKeyword(draft.category_context || alias, alias),
    product_type: sanitizeKeyword(draft.product_type || alias, alias),
    specs,
    sensitive_terms: Array.from(new Set(draft.sensitive_terms.map((term) => term.toLowerCase()))),
    title_internal: title,
    title_shopee: title,
    title_tiktok: title,
    keywords_shopee: metadataOnly
      ? buildMetadataOnlyKeywords(alias, specs)
      : sanitizeKeywordList(draft.keywords_shopee, alias, marketplaceKeyword),
    keywords_tiktok: metadataOnly
      ? buildMetadataOnlyKeywords(alias, specs)
      : sanitizeKeywordList(draft.keywords_tiktok, alias, marketplaceKeyword),
    image_metadata: sanitizeImageMetadata(draft.image_metadata, specs, alias, metadataOnly),
    shopee_description_parts: metadataOnly
      ? buildMetadataOnlyDescriptionParts(alias, specs)
      : sanitizeDescriptionParts(draft.shopee_description_parts, alias),
    tiktok_description_parts: metadataOnly
      ? buildMetadataOnlyDescriptionParts(alias, specs)
      : sanitizeDescriptionParts(draft.tiktok_description_parts, alias)
  };
}
