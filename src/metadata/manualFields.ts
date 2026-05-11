import { buildSearchableText } from "./searchText.js";
import type { GeneratedMetadata, ProductDraftRow, SpecEntry } from "../types/metadata.js";

export type SupplierManualFieldKey =
  | "supplier_name"
  | "package_weight"
  | "package_dimensions"
  | "package_contents";

export interface ManualFieldDefinition {
  key: SupplierManualFieldKey;
  sourceLabel: string;
  label: string;
  prompt: string;
  example: string;
}

const MANUAL_FIELD_DEFINITIONS: Record<SupplierManualFieldKey, ManualFieldDefinition> = {
  supplier_name: {
    key: "supplier_name",
    sourceLabel: "supplier",
    label: "Nama Supplier",
    prompt: "Isi nama supplier yang sebenarnya.",
    example: "PT Maju Jaya"
  },
  package_weight: {
    key: "package_weight",
    sourceLabel: "berat produk",
    label: "Berat Produk",
    prompt: "Isi berat produk.",
    example: "250 g"
  },
  package_dimensions: {
    key: "package_dimensions",
    sourceLabel: "dimensi paket",
    label: "Dimensi Paket",
    prompt: "Isi dimensi paket.",
    example: "20 x 10 x 5 cm"
  },
  package_contents: {
    key: "package_contents",
    sourceLabel: "isi paket",
    label: "Isi Paket",
    prompt: "Isi isi paket.",
    example: "1 pcs produk + aksesori"
  }
};

export function getManualFieldDefinition(
  key: SupplierManualFieldKey
): ManualFieldDefinition {
  return MANUAL_FIELD_DEFINITIONS[key];
}

const MANUAL_FIELD_LABEL_LOOKUP: Record<string, SupplierManualFieldKey> = {
  supplier: "supplier_name",
  "nama supplier": "supplier_name",
  "berat produk": "package_weight",
  "dimensi paket": "package_dimensions",
  "isi paket": "package_contents"
};

function normalizeLookupLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeSpecText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeWeightText(value: string): string {
  const normalized = normalizeLookupLabel(value).replace(/,/g, ".");
  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*(kg|g|gram|grams|kilogram|kilograms|gr)?$/i);
  if (!match?.[1]) {
    return normalizeSpecText(value);
  }

  const unit = match[2]?.toLowerCase();
  const canonicalUnit =
    unit && ["kg", "kilogram", "kilograms"].includes(unit) ? "kg" : unit ? "g" : "";
  return `${match[1]} ${canonicalUnit}`.trim();
}

function normalizeDimensionText(value: string): string {
  const normalized = normalizeSpecText(value)
    .replace(/[\u00d7\u2715]/g, "x")
    .replace(/\s*x\s*/gi, " x ")
    .replace(/\s+(cm|mm)\b/gi, " $1");

  return normalized;
}

function buildSpecEntry(value: string): SpecEntry {
  return {
    value,
    source: "explicit",
    confidence: 1
  };
}

function deriveDataStatus(
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

function buildConfidenceSummaryFromDraft(draft: ProductDraftRow): string {
  const explicitFields = [
    draft.supplier_price !== null ? "price" : "",
    draft.supplier_stock !== null ? "stock" : "",
    draft.specs.package_weight?.value ? "package_weight" : "",
    draft.specs.package_dimensions?.value ? "package_dimensions" : "",
    draft.specs.package_contents?.value ? "package_contents" : "",
    draft.specs.material?.value ? "material" : "",
    draft.specs.handle_material?.value ? "handle_material" : "",
    draft.specs.pb?.value ? "pb" : "",
    draft.specs.lb?.value ? "lb" : "",
    draft.specs.tb?.value ? "tb" : ""
  ].filter(Boolean);

  return [
    `explicit: ${explicitFields.join(", ") || "none"}`,
    `inferred: title, series, keywords`,
    `unknown: ${draft.missing_fields_json.join(", ") || "none"}`,
    `risk: ${draft.sensitive_terms_json.join(", ") || "none"}`
  ].join(" | ");
}

export function resolveManualFieldKey(label: string): SupplierManualFieldKey | null {
  return MANUAL_FIELD_LABEL_LOOKUP[normalizeLookupLabel(label)] ?? null;
}

export function buildManualFieldQueue(missingFields: string[]): ManualFieldDefinition[] {
  const queue: ManualFieldDefinition[] = [];
  const seen = new Set<SupplierManualFieldKey>();

  for (const label of missingFields) {
    const key = resolveManualFieldKey(label);
    if (!key || seen.has(key)) {
      continue;
    }

    queue.push(MANUAL_FIELD_DEFINITIONS[key]);
    seen.add(key);
  }

  return queue;
}

export function normalizeManualFieldValue(
  key: SupplierManualFieldKey,
  value: string
): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return "";
  }

  if (key === "package_weight") {
    return normalizeWeightText(trimmed);
  }

  if (key === "package_dimensions") {
    return normalizeDimensionText(trimmed);
  }

  return normalizeSpecText(trimmed);
}

export interface ManualFieldUpdateResult {
  draft: ProductDraftRow;
  normalizedValue: string;
  remainingMissingFields: string[];
  field: ManualFieldDefinition;
}

export function applyManualFieldToDraft(
  draft: ProductDraftRow,
  key: SupplierManualFieldKey,
  rawValue: string
): ManualFieldUpdateResult {
  const field = MANUAL_FIELD_DEFINITIONS[key];
  const normalizedValue = normalizeManualFieldValue(key, rawValue);
  if (!normalizedValue) {
    throw new Error(`Manual field ${key} cannot be empty`);
  }

  const nextDraft: ProductDraftRow = {
    ...draft,
    specs: { ...draft.specs },
    specs_json: { ...draft.specs_json },
    missing_fields: [...draft.missing_fields],
    missing_fields_json: [...draft.missing_fields_json]
  };

  if (key === "supplier_name") {
    nextDraft.supplier_name = normalizedValue;
  } else {
    nextDraft.specs[key] = buildSpecEntry(normalizedValue);
    nextDraft.specs_json[key] = buildSpecEntry(normalizedValue);
  }

  nextDraft.missing_fields_json = nextDraft.missing_fields_json.filter((label) => {
    const resolvedKey = resolveManualFieldKey(label);
    return resolvedKey !== key;
  });
  nextDraft.missing_fields = nextDraft.missing_fields_json;
  nextDraft.data_status = deriveDataStatus(
    nextDraft.compliance_status,
    nextDraft.missing_fields_json
  );
  nextDraft.confidence_summary = buildConfidenceSummaryFromDraft(nextDraft);
  nextDraft.searchable_text = buildSearchableText({
    ...nextDraft,
    specs: nextDraft.specs
  });

  return {
    draft: nextDraft,
    normalizedValue,
    remainingMissingFields: nextDraft.missing_fields_json,
    field
  };
}
