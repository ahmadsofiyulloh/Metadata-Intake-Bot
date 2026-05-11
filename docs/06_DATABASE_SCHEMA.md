# Database Schema - Supabase MVP

## Migration File

```text
supabase/migrations/001_initial_schema.sql
```

## Current Notes

- The migration is the source of truth for exact SQL.
- Bot tables live in `public`: `product_drafts`, `metadata_versions`, `product_draft_supplier_photos`, `bot_events`, and `user_sessions`.
- `product_drafts.image_metadata_json`, `shopee_field_pack_json`, and `tiktok_field_pack_json` are JSONB and can store new metadata shapes without a migration.
- `image_metadata_json.spec_copy_fields` is used for photo-editing copy values.
- `product_draft_supplier_photos` stores the Telegram `file_id` and `file_unique_id` for the supplier photo tied to a draft.
- `short_code` and SKU sequence helpers are created by the migration.
- RLS is enabled and service-role access is used by the backend.

## `product_drafts`

Main source of truth for generated product metadata.

Important fields:

- `raw_seller_text` - unchanged seller text for audit.
- `supplier_product_name` - supplier-facing name extracted from raw text.
- `normalized_store_name` - sanitized store name with neutral alias.
- `title_internal`, `title_shopee`, `title_tiktok` - sanitized titles.
- `category_context`, `product_type` - normalized category metadata.
- `specs_json` - extracted specs with source/confidence.
- `image_metadata_json` - photo-editing copy metadata, including `spec_copy_fields`.
- `shopee_field_pack_json`, `tiktok_field_pack_json` - platform metadata packs with `purpose`.
- `keywords_json` - sanitized platform keyword arrays.
- `missing_fields_json`, `sensitive_terms_json` - audit and review support.
- `searchable_text` - combined search text for full-text search.
- `data_status` - `DRAFT`, `DATA_SEBAGIAN`, `READY`, `INPUTTED_SHOPEE`, `INPUTTED_TIKTOK`, `ARCHIVED`.
- `compliance_status` - `SAFE_TO_DRAFT`, `NEED_REVIEW`, `INTERNAL_ONLY`, `BLOCKED`.

## `product_draft_supplier_photos`

One primary supplier photo per draft for audit context.

Important fields:

- `product_draft_id` - foreign key to `product_drafts`.
- `telegram_file_id` - Telegram server-side photo reference used to replay the photo in `/detail`.
- `telegram_file_unique_id` - stable Telegram unique id for audit trace.
- `telegram_caption` - original caption if the photo was sent together with text.
- `telegram_message_id` - original supplier message id.

## JSONB Shapes

`image_metadata_json.spec_copy_fields` example:

```json
[
  {
    "key": "tb",
    "label": "Tinggi Bilah",
    "value": "16 cm",
    "copy_value": "16 cm",
    "copy_label_value": "Tinggi Bilah 16 cm",
    "context": "ukuran bilah",
    "source": "explicit",
    "confidence": 0.75
  }
]
```

Platform pack example:

```json
{
  "status": "INTERNAL_ONLY",
  "purpose": "METADATA_ONLY",
  "warning": "Metadata only. Review manual sebelum publish marketplace.",
  "keywords": ["perkakas handcraft"],
  "description_parts": ["Perkakas Handcraft dengan data supplier yang sudah dinormalisasi."],
  "title": "LANDEP SMITH | WIRA SERIES Perkakas Handcraft Baja Per Kayu Jati PB 25-26 cm TB 16 cm - Perkakas Handcraft",
  "spec_copy_fields": []
}
```

## Search Strategy

Current implementation searches `searchable_text` with PostgREST full-text search.

`searchable_text` is built from:

- raw seller text
- supplier name
- supplier product name
- normalized store name
- series
- category/product type
- titles
- keywords
- sensitive terms
- spec values

Next planned improvement: fallback search when full-text search returns zero results.

## Supabase Target Safety

Before applying future migrations, verify:

```bash
npx supabase projects list
```

Then compare the linked project with `SUPABASE_URL` in `.env`. Do not rely on MCP project selection unless it has been verified.
