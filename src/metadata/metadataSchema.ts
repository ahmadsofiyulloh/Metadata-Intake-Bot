import { z } from "zod";

export const fieldSourceValues = ["explicit", "inferred", "unknown", "risk"] as const;
export const complianceStatusValues = [
  "SAFE_TO_DRAFT",
  "NEED_REVIEW",
  "INTERNAL_ONLY",
  "BLOCKED"
] as const;
export const dataStatusValues = [
  "DRAFT",
  "DATA_SEBAGIAN",
  "READY",
  "ARCHIVED",
  "INPUTTED_SHOPEE",
  "INPUTTED_TIKTOK"
] as const;

export const specEntrySchema = z.object({
  value: z.union([z.string(), z.number(), z.null()]),
  source: z.enum(fieldSourceValues),
  confidence: z.number().min(0).max(1)
});

export const specCopyFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.string(),
  copy_value: z.string(),
  copy_label_value: z.string(),
  context: z.string(),
  source: z.enum(fieldSourceValues),
  confidence: z.number().min(0).max(1)
});

export const imageMetadataSchema = z.object({
  hero_headline: z.string(),
  hero_subheadline: z.string(),
  badges: z.array(z.string()),
  spec_headline: z.string(),
  benefit_points: z.array(z.string()),
  spec_copy_fields: z.array(specCopyFieldSchema)
});

export const skuBasisSchema = z.object({
  series_code: z.string(),
  category_code: z.string(),
  material_code: z.string(),
  attribute_code: z.string()
});

export const generatedMetadataSchema = z.object({
  raw_seller_text: z.string(),
  supplier_name: z.string().nullable(),
  supplier_product_name: z.string(),
  normalized_store_name: z.string(),
  generated_series: z.string(),
  category_context: z.string(),
  product_type: z.string(),
  supplier_price: z.number().nullable(),
  supplier_stock: z.number().nullable(),
  specs: z.record(specEntrySchema),
  missing_fields: z.array(z.string()),
  sensitive_terms: z.array(z.string()),
  compliance_status: z.enum(complianceStatusValues),
  compliance_reason: z.string(),
  title_internal: z.string(),
  title_shopee: z.string(),
  title_tiktok: z.string(),
  sku_basis: skuBasisSchema,
  keywords_shopee: z.array(z.string()),
  keywords_tiktok: z.array(z.string()),
  image_metadata: imageMetadataSchema,
  shopee_description_parts: z.array(z.string()),
  tiktok_description_parts: z.array(z.string()),
  data_status: z.enum(dataStatusValues),
  confidence_summary: z.string()
});

export type GeneratedMetadataInput = z.infer<typeof generatedMetadataSchema>;
export type GeneratedMetadataOutput = z.infer<typeof generatedMetadataSchema>;
export type ImageMetadataOutput = z.infer<typeof imageMetadataSchema>;
export type SpecEntryOutput = z.infer<typeof specEntrySchema>;
export type SkuBasisOutput = z.infer<typeof skuBasisSchema>;

export const geminiMetadataJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "raw_seller_text",
    "supplier_name",
    "supplier_product_name",
    "normalized_store_name",
    "generated_series",
    "category_context",
    "product_type",
    "supplier_price",
    "supplier_stock",
    "specs",
    "missing_fields",
    "sensitive_terms",
    "compliance_status",
    "compliance_reason",
    "title_internal",
    "title_shopee",
    "title_tiktok",
    "sku_basis",
    "keywords_shopee",
    "keywords_tiktok",
    "image_metadata",
    "shopee_description_parts",
    "tiktok_description_parts",
    "data_status",
    "confidence_summary"
  ],
  properties: {
    raw_seller_text: { type: "string" },
    supplier_name: { type: ["string", "null"] },
    supplier_product_name: { type: "string" },
    normalized_store_name: { type: "string" },
    generated_series: { type: "string" },
    category_context: { type: "string" },
    product_type: { type: "string" },
    supplier_price: { type: ["number", "null"] },
    supplier_stock: { type: ["number", "null"] },
    specs: {
      type: "object",
      additionalProperties: {
        type: "object",
        additionalProperties: false,
        required: ["value", "source", "confidence"],
        properties: {
          value: { type: ["string", "number", "null"] },
          source: {
            type: "string",
            enum: ["explicit", "inferred", "unknown", "risk"]
          },
          confidence: { type: "number" }
        }
      }
    },
    missing_fields: { type: "array", items: { type: "string" } },
    sensitive_terms: { type: "array", items: { type: "string" } },
    compliance_status: {
      type: "string",
      enum: ["SAFE_TO_DRAFT", "NEED_REVIEW", "INTERNAL_ONLY", "BLOCKED"]
    },
    compliance_reason: { type: "string" },
    title_internal: { type: "string" },
    title_shopee: { type: "string" },
    title_tiktok: { type: "string" },
    sku_basis: {
      type: "object",
      additionalProperties: false,
      required: ["series_code", "category_code", "material_code", "attribute_code"],
      properties: {
        series_code: { type: "string" },
        category_code: { type: "string" },
        material_code: { type: "string" },
        attribute_code: { type: "string" }
      }
    },
    keywords_shopee: { type: "array", items: { type: "string" } },
    keywords_tiktok: { type: "array", items: { type: "string" } },
    image_metadata: {
      type: "object",
      additionalProperties: false,
      required: [
        "hero_headline",
        "hero_subheadline",
        "badges",
        "spec_headline",
        "benefit_points",
        "spec_copy_fields"
      ],
      properties: {
        hero_headline: { type: "string" },
        hero_subheadline: { type: "string" },
        badges: { type: "array", items: { type: "string" } },
        spec_headline: { type: "string" },
        benefit_points: { type: "array", items: { type: "string" } },
        spec_copy_fields: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "key",
              "label",
              "value",
              "copy_value",
              "copy_label_value",
              "context",
              "source",
              "confidence"
            ],
            properties: {
              key: { type: "string" },
              label: { type: "string" },
              value: { type: "string" },
              copy_value: { type: "string" },
              copy_label_value: { type: "string" },
              context: { type: "string" },
              source: {
                type: "string",
                enum: ["explicit", "inferred", "unknown", "risk"]
              },
              confidence: { type: "number" }
            }
          }
        }
      }
    },
    shopee_description_parts: { type: "array", items: { type: "string" } },
    tiktok_description_parts: { type: "array", items: { type: "string" } },
    data_status: {
      type: "string",
      enum: ["DRAFT", "DATA_SEBAGIAN", "READY", "ARCHIVED", "INPUTTED_SHOPEE", "INPUTTED_TIKTOK"]
    },
    confidence_summary: { type: "string" }
  }
} as const;

const legacySpecEntrySchema = {
  type: "object",
  required: ["value", "source", "confidence"],
  properties: {
    value: { type: "string", nullable: true },
    source: {
      type: "string",
      enum: ["explicit", "inferred", "unknown", "risk"]
    },
    confidence: { type: "number" }
  }
} as const;

export const geminiMetadataResponseSchema = {
  type: "object",
  required: geminiMetadataJsonSchema.required,
  properties: {
    raw_seller_text: { type: "string" },
    supplier_name: { type: "string", nullable: true },
    supplier_product_name: { type: "string" },
    normalized_store_name: { type: "string" },
    generated_series: { type: "string" },
    category_context: { type: "string" },
    product_type: { type: "string" },
    supplier_price: { type: "number", nullable: true },
    supplier_stock: { type: "number", nullable: true },
    specs: {
      type: "object",
      properties: {
        material: legacySpecEntrySchema,
        handle_material: legacySpecEntrySchema,
        pb: legacySpecEntrySchema,
        lb: legacySpecEntrySchema,
        tb: legacySpecEntrySchema,
        supplier_price: legacySpecEntrySchema,
        supplier_stock: legacySpecEntrySchema
      }
    },
    missing_fields: { type: "array", items: { type: "string" } },
    sensitive_terms: { type: "array", items: { type: "string" } },
    compliance_status: {
      type: "string",
      enum: ["SAFE_TO_DRAFT", "NEED_REVIEW", "INTERNAL_ONLY", "BLOCKED"]
    },
    compliance_reason: { type: "string" },
    title_internal: { type: "string" },
    title_shopee: { type: "string" },
    title_tiktok: { type: "string" },
    sku_basis: {
      type: "object",
      required: ["series_code", "category_code", "material_code", "attribute_code"],
      properties: {
        series_code: { type: "string" },
        category_code: { type: "string" },
        material_code: { type: "string" },
        attribute_code: { type: "string" }
      }
    },
    keywords_shopee: { type: "array", items: { type: "string" } },
    keywords_tiktok: { type: "array", items: { type: "string" } },
    image_metadata: {
      type: "object",
      required: [
        "hero_headline",
        "hero_subheadline",
        "badges",
        "spec_headline",
        "benefit_points",
        "spec_copy_fields"
      ],
      properties: {
        hero_headline: { type: "string" },
        hero_subheadline: { type: "string" },
        badges: { type: "array", items: { type: "string" } },
        spec_headline: { type: "string" },
        benefit_points: { type: "array", items: { type: "string" } },
        spec_copy_fields: {
          type: "array",
          items: {
            type: "object",
            required: [
              "key",
              "label",
              "value",
              "copy_value",
              "copy_label_value",
              "context",
              "source",
              "confidence"
            ],
            properties: {
              key: { type: "string" },
              label: { type: "string" },
              value: { type: "string" },
              copy_value: { type: "string" },
              copy_label_value: { type: "string" },
              context: { type: "string" },
              source: {
                type: "string",
                enum: ["explicit", "inferred", "unknown", "risk"]
              },
              confidence: { type: "number" }
            }
          }
        }
      }
    },
    shopee_description_parts: { type: "array", items: { type: "string" } },
    tiktok_description_parts: { type: "array", items: { type: "string" } },
    data_status: {
      type: "string",
      enum: ["DRAFT", "DATA_SEBAGIAN", "READY", "ARCHIVED", "INPUTTED_SHOPEE", "INPUTTED_TIKTOK"]
    },
    confidence_summary: { type: "string" }
  }
} as const;
