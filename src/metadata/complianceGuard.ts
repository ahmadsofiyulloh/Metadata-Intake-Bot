import type { GeneratedMetadata, PlatformFieldPack } from "../types/metadata.js";
import { sanitizeGeneratedMetadata } from "./catalogSanitizer.js";
import { buildPlatformFieldPack } from "./normalizeSellerText.js";

const BLOCKED_PATTERNS: Array<[RegExp, string]> = [
  [/\bsenjata\s+tajam\b/i, "Istilah yang langsung mengarah ke senjata tajam."],
  [/\bself\s*defense\b/i, "Istilah yang mengarah ke self-defense."],
  [/\bbela\s+diri\b/i, "Istilah yang mengarah ke bela diri."],
  [/\btactical\b/i, "Istilah tactical tidak boleh dipromosikan sebagai senjata."],
  [/\bcombat\b/i, "Istilah combat tidak boleh dipromosikan sebagai senjata."],
  [/\banti\s+begal\b/i, "Istilah anti begal tidak boleh dipromosikan sebagai senjata."],
  [/\bsurvival\s+weapon\b/i, "Istilah survival weapon tidak boleh dipromosikan sebagai senjata."],
  [/\bmematikan\b/i, "Klaim berbahaya atau agresif."],
  [/\btebas\s+orang\b/i, "Klaim kekerasan yang tidak boleh digunakan."]
];

const AMBIGUOUS_PATTERNS: Array<[RegExp, string]> = [
  [/\bbadik\b/i, "badik"],
  [/\bbelati\b/i, "belati"],
  [/\bgolok\b/i, "golok"],
  [/\bparang\b/i, "parang"],
  [/\bpisau\b/i, "pisau"],
  [/\bsembelih\b/i, "sembelih"]
];

function hasBenignContext(text: string): boolean {
  return [
    /\bperkakas\b/i,
    /\bhandcraft\b/i,
    /\boutdoor\b/i,
    /\bkebun\b/i,
    /\bdapur\b/i,
    /\balat\b/i
  ].some((pattern) => pattern.test(text));
}

function collectPatternMatches(text: string, patterns: Array<[RegExp, string]>): string[] {
  return patterns
    .filter(([pattern]) => pattern.test(text))
    .map(([, label]) => label);
}

function refineComplianceStatus(
  draft: GeneratedMetadata
): {
  status: GeneratedMetadata["compliance_status"];
  reason: string;
} {
  const blockedMatches = collectPatternMatches(draft.raw_seller_text, BLOCKED_PATTERNS);
  if (blockedMatches.length > 0) {
    return {
      status: "BLOCKED",
      reason: `Wording berisiko terdeteksi: ${blockedMatches.join(", ")}. Draft harus diblokir dari copy promosi.`
    };
  }

  const ambiguousMatches = collectPatternMatches(draft.raw_seller_text, AMBIGUOUS_PATTERNS);
  if (ambiguousMatches.length > 0) {
    if (hasBenignContext(draft.raw_seller_text)) {
      return {
        status: "NEED_REVIEW",
        reason: `Produk mengandung istilah sensitif atau ambigu: ${ambiguousMatches.join(", ")}. Gunakan wording netral dan review kategori marketplace.`
      };
    }

    return {
      status: "INTERNAL_ONLY",
      reason: `Produk mengandung istilah sensitif: ${ambiguousMatches.join(", ")}. Simpan untuk katalog internal sebelum dipakai di marketplace.`
    };
  }

  if (draft.compliance_status === "BLOCKED") {
    return {
      status: "BLOCKED",
      reason: draft.compliance_reason
    };
  }

  if (draft.compliance_status === "INTERNAL_ONLY") {
    return {
      status: "INTERNAL_ONLY",
      reason: draft.compliance_reason
    };
  }

  return {
    status: draft.compliance_status === "SAFE_TO_DRAFT" ? "SAFE_TO_DRAFT" : "NEED_REVIEW",
    reason: draft.compliance_reason
  };
}

function deriveGuardedDataStatus(draft: GeneratedMetadata): GeneratedMetadata["data_status"] {
  if (draft.missing_fields.length > 0) {
    return "DATA_SEBAGIAN";
  }
  if (draft.compliance_status === "SAFE_TO_DRAFT") {
    return "READY";
  }
  return "DRAFT";
}

export function applyComplianceGuard(draft: GeneratedMetadata): {
  draft: GeneratedMetadata;
  shopee_field_pack_json: PlatformFieldPack;
  tiktok_field_pack_json: PlatformFieldPack;
} {
  const compliance = refineComplianceStatus(draft);
  const guardedDraft: GeneratedMetadata = {
    ...draft,
    compliance_status: compliance.status,
    compliance_reason: compliance.reason,
    data_status: deriveGuardedDataStatus({
      ...draft,
      compliance_status: compliance.status
    })
  };
  const sanitizedDraft = sanitizeGeneratedMetadata(guardedDraft);
  const shopee_field_pack_json = buildPlatformFieldPack(sanitizedDraft, "shopee");
  const tiktok_field_pack_json = buildPlatformFieldPack(sanitizedDraft, "tiktok");

  return {
    draft: sanitizedDraft,
    shopee_field_pack_json,
    tiktok_field_pack_json
  };
}
