import type { SkuBasis } from "../types/metadata.js";

const SERIES_CODE_MAP: Record<string, string> = {
  "WIRA SERIES": "WRA",
  "ARJUNA SERIES": "ARJ",
  "RIMBA SERIES": "RMB",
  "DAPUR SERIES": "DPR",
  "KARYA SERIES": "KRY",
  "LOKA SERIES": "LKA"
};

const CATEGORY_CODE_MAP: Array<[RegExp, string]> = [
  [/\bbaja\s+per\b/i, "BP"],
  [/\bpisau\b/i, "PIS"],
  [/\bbadik\b/i, "BDK"],
  [/\bgolok\b/i, "GLK"],
  [/\bparang\b/i, "PRG"],
  [/\bdapur\b/i, "DPR"],
  [/\bhandcraft\b/i, "HCR"],
  [/\boutdoor\b/i, "OUT"],
  [/\bperkakas\b/i, "PKK"]
];

const MATERIAL_CODE_MAP: Array<[RegExp, string]> = [
  [/\bkayu\s+jati\b/i, "JTI"],
  [/\bkayu\b/i, "KYU"],
  [/\bbaja\s+per\b/i, "BPR"],
  [/\bbaja\b/i, "BJA"],
  [/\bbesi\b/i, "BSI"],
  [/\bstainless\b/i, "SUS"],
  [/\bkulit\b/i, "KLT"],
  [/\baluminium\b/i, "ALU"]
];

function normalizeCode(value: string): string {
  return value
    .trim()
    .replace(/[^a-z0-9]+/gi, "")
    .toUpperCase();
}

function codeFromMap(value: string, map: Array<[RegExp, string]>, fallback = "GEN"): string {
  for (const [pattern, code] of map) {
    if (pattern.test(value)) {
      return code;
    }
  }
  const normalized = normalizeCode(value);
  if (!normalized) {
    return fallback;
  }
  return normalized.slice(0, 3).padEnd(3, "X");
}

export function deriveSeriesCode(seriesName: string): string {
  return SERIES_CODE_MAP[seriesName.toUpperCase()] ?? normalizeCode(seriesName).slice(0, 3).padEnd(3, "X");
}

export function deriveCategoryCode(value: string): string {
  return codeFromMap(value, CATEGORY_CODE_MAP);
}

export function deriveMaterialCode(value: string): string {
  return codeFromMap(value, MATERIAL_CODE_MAP);
}

export function deriveAttributeCode(attributes: Array<string | null | undefined>): string {
  const filtered = attributes
    .map((attribute) => {
      if (!attribute) {
        return "";
      }
      return attribute
        .trim()
        .replace(/\s+/g, "")
        .replace(/\./g, "")
        .replace(/cm$/i, "")
        .replace(/mm$/i, "")
        .toUpperCase();
    })
    .filter(Boolean);

  if (filtered.length === 0) {
    return "GEN";
  }

  return filtered.join("-").slice(0, 16);
}

export function buildSkuInternal(
  storeCode: string,
  skuBasis: SkuBasis,
  sequence: number
): string {
  const suffix = sequence.toString().padStart(3, "0");
  const parts = [
    normalizeCode(storeCode),
    normalizeCode(skuBasis.series_code),
    normalizeCode(skuBasis.category_code) || "GEN",
    normalizeCode(skuBasis.material_code) || "GEN",
    normalizeCode(skuBasis.attribute_code) || "GEN",
    suffix
  ];
  return parts.join("-");
}
