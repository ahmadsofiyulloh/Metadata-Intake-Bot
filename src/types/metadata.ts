export type FieldSource = "explicit" | "inferred" | "unknown" | "risk";

export type ComplianceStatus =
  | "SAFE_TO_DRAFT"
  | "NEED_REVIEW"
  | "INTERNAL_ONLY"
  | "BLOCKED";

export type DataStatus =
  | "DRAFT"
  | "DATA_SEBAGIAN"
  | "READY"
  | "ARCHIVED"
  | "INPUTTED_SHOPEE"
  | "INPUTTED_TIKTOK";

export interface SpecEntry {
  value: string | number | null;
  source: FieldSource;
  confidence: number;
}

export interface SpecCopyField {
  key: string;
  label: string;
  value: string;
  copy_value: string;
  copy_label_value: string;
  context: string;
  source: FieldSource;
  confidence: number;
}

export interface ImageMetadata {
  hero_headline: string;
  hero_subheadline: string;
  badges: string[];
  spec_headline: string;
  benefit_points: string[];
  spec_copy_fields: SpecCopyField[];
}

export interface PlatformFieldPack {
  status: ComplianceStatus;
  purpose?: "MARKETPLACE_DRAFT" | "REVIEW_REQUIRED" | "METADATA_ONLY";
  warning: string;
  keywords: string[];
  description_parts: string[];
  title?: string;
  spec_copy_fields?: SpecCopyField[];
}

export interface SkuBasis {
  series_code: string;
  category_code: string;
  material_code: string;
  attribute_code: string;
}

export interface GeneratedMetadata {
  raw_seller_text: string;
  supplier_name: string | null;
  supplier_product_name: string;
  normalized_store_name: string;
  generated_series: string;
  category_context: string;
  product_type: string;
  supplier_price: number | null;
  supplier_stock: number | null;
  specs: Record<string, SpecEntry>;
  missing_fields: string[];
  sensitive_terms: string[];
  compliance_status: ComplianceStatus;
  compliance_reason: string;
  title_internal: string;
  title_shopee: string;
  title_tiktok: string;
  sku_basis: SkuBasis;
  keywords_shopee: string[];
  keywords_tiktok: string[];
  image_metadata: ImageMetadata;
  shopee_description_parts: string[];
  tiktok_description_parts: string[];
  data_status: DataStatus;
  confidence_summary: string;
}

export interface ProductDraftRow extends GeneratedMetadata {
  id: string;
  short_code: string;
  sku_internal: string | null;
  store_name: string;
  store_code: string;
  category_context: string;
  product_type: string;
  shopee_field_pack_json: PlatformFieldPack;
  tiktok_field_pack_json: PlatformFieldPack;
  specs_json: Record<string, SpecEntry>;
  missing_fields_json: string[];
  sensitive_terms_json: string[];
  keywords_json: {
    shopee: string[];
    tiktok: string[];
  };
  image_metadata_json: ImageMetadata;
  archived_at: string | null;
  searchable_text: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetadataVersionPayload {
  generated: GeneratedMetadata;
  raw_response?: unknown;
  ai_model?: string;
  ai_used: boolean;
  version_reason: string;
  manual_changes?: Array<{
    field_key: string;
    field_label: string;
    value: string;
  }>;
  remaining_missing_fields?: string[];
}
