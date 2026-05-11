# Gemini Structured Output Schema

## Goal

Gemini harus menghasilkan JSON konsisten, bukan teks bebas.

Gunakan structured output JSON schema untuk metadata generation.

## System Instruction Draft

```text
You are a product metadata normalizer for an Indonesian reseller workflow.
Your job is to transform messy supplier text into structured product metadata.
Do not invent facts that are not present.
Classify each extracted field as explicit, inferred, unknown, or risk.
Normalize harsh/aggressive supplier wording into professional, neutral catalog language, but do not hide or misrepresent the product type.
Do not promote products as weapons, self-defense tools, combat items, tactical weapons, or dangerous items.
Generate platform candidate fields only when appropriate, and mark ambiguous products as NEED_REVIEW.
Return only valid JSON matching the schema.
```

## User Prompt Template

```text
Store name: {{STORE_NAME}}
Store code: {{STORE_CODE}}
Language: Indonesian

Supplier description:
{{RAW_SELLER_TEXT}}

Task:
1. Extract clear supplier data.
2. Identify missing fields.
3. Normalize product name for store catalog.
4. Generate series name.
5. Generate title using format:
   [STORE NAME UPPERCASE] | [SERIES] [NORMALIZED PRODUCT NAME] - [MARKETPLACE KEYWORD]
6. Generate SKU basis.
7. Generate Shopee candidate fields.
8. Generate TikTok candidate fields.
9. Generate image text metadata for external product photo editing.
10. Add compliance status and reason.
```

## JSON Schema Concept

```json
{
  "type": "object",
  "required": [
    "raw_seller_text",
    "supplier_product_name",
    "normalized_store_name",
    "generated_series",
    "category_context",
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
  "properties": {
    "raw_seller_text": {"type": "string"},
    "supplier_product_name": {"type": "string"},
    "normalized_store_name": {"type": "string"},
    "generated_series": {"type": "string"},
    "category_context": {"type": "string"},
    "supplier_price": {"type": ["number", "null"]},
    "supplier_stock": {"type": ["integer", "null"]},
    "specs": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "value": {"type": ["string", "number", "integer", "null"]},
          "source": {"type": "string", "enum": ["explicit", "inferred", "unknown", "risk"]},
          "confidence": {"type": "number"}
        }
      }
    },
    "missing_fields": {"type": "array", "items": {"type": "string"}},
    "sensitive_terms": {"type": "array", "items": {"type": "string"}},
    "compliance_status": {"type": "string", "enum": ["SAFE_TO_DRAFT", "NEED_REVIEW", "INTERNAL_ONLY", "BLOCKED"]},
    "compliance_reason": {"type": "string"},
    "title_internal": {"type": "string"},
    "title_shopee": {"type": "string"},
    "title_tiktok": {"type": "string"},
    "sku_basis": {
      "type": "object",
      "properties": {
        "series_code": {"type": "string"},
        "category_code": {"type": "string"},
        "material_code": {"type": "string"},
        "attribute_code": {"type": "string"}
      }
    },
    "keywords_shopee": {"type": "array", "items": {"type": "string"}},
    "keywords_tiktok": {"type": "array", "items": {"type": "string"}},
    "image_metadata": {
      "type": "object",
      "properties": {
        "hero_headline": {"type": "string"},
        "hero_subheadline": {"type": "string"},
        "badges": {"type": "array", "items": {"type": "string"}},
        "spec_headline": {"type": "string"},
        "benefit_points": {"type": "array", "items": {"type": "string"}}
      }
    },
    "shopee_description_parts": {"type": "array", "items": {"type": "string"}},
    "tiktok_description_parts": {"type": "array", "items": {"type": "string"}},
    "data_status": {"type": "string", "enum": ["DRAFT", "DATA_SEBAGIAN", "READY"]},
    "confidence_summary": {"type": "string"}
  }
}
```

## Post-Processing Required

Setelah Gemini output:

1. Jalankan compliance guard.
2. Generate SKU final dengan sequence DB.
3. Generate short_code.
4. Build `searchable_text`.
5. Split long fields for Telegram rendering.

## Example Input

```text
Sembelih badik baja per kayu jati pb 25-26 lb 35 tb 4 ml stok 12 pcs 120.000
```

## Example Output Summary

```json
{
  "supplier_product_name": "badik baja per kayu jati",
  "normalized_store_name": "Perkakas Handcraft Baja Per Kayu Jati PB 25-26 cm TB 4 mm",
  "generated_series": "WIRA SERIES",
  "supplier_price": 120000,
  "supplier_stock": 12,
  "missing_fields": ["berat produk", "dimensi paket", "isi paket", "supplier"],
  "sensitive_terms": ["sembelih", "badik"],
  "compliance_status": "NEED_REVIEW"
}
```
