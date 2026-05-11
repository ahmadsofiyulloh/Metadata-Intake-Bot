# Gemini Structured Output Schema

## Goal

Gemini returns JSON, not free text. The live request uses the endpoint-compatible `geminiMetadataResponseSchema` in `src/metadata/metadataSchema.ts`.

Do not rely on Gemini as the final authority for title, compliance, or platform-safe wording. The final deterministic pass is in `catalogSanitizer.ts` and `complianceGuard.ts`.

## System Instruction Requirements

Gemini must be instructed to:

- Extract only facts present in seller text.
- Classify field source as `explicit`, `inferred`, `unknown`, or `risk`.
- Use neutral category aliases in store names and titles.
- Avoid copying sensitive supplier terms into public metadata fields.
- Avoid repeated category/material/dimension phrases.
- Treat `PB` and `TB` as `cm` by default, and `LB` as `mm` by default.
- Return `image_metadata.spec_copy_fields`.

## Required Image Spec Copy Shape

```json
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
```

## Gemini Response Schema Reality

The full conceptual JSON schema can include `additionalProperties` and union type arrays, but the live Gemini endpoint uses a simpler response schema:

- nullable fields use `nullable: true`.
- `specs` is constrained to known MVP keys.
- `image_metadata.spec_copy_fields` is required.
- Final sanitization runs after parsing.

## Post-Processing Required

After Gemini output:

1. Parse and validate with Zod.
2. Merge with heuristic extraction.
3. Keep explicit heuristic specs over conflicting Gemini specs.
4. Run compliance guard.
5. Run catalog sanitizer.
6. Build SKU final with DB sequence.
7. Build `searchable_text`.
8. Split long Telegram messages.

## Example Input

```text
Sembelih badik baja per kayu jati pb 25-26 lb 35 tb 16 stok 12 pcs 120.000
```

## Expected Safe Summary

```json
{
  "supplier_product_name": "badik baja per kayu jati",
  "normalized_store_name": "Perkakas Handcraft Baja Per Kayu Jati PB 25-26 cm TB 16 cm",
  "title_internal": "LANDEP SMITH | WIRA SERIES Perkakas Handcraft Baja Per Kayu Jati PB 25-26 cm TB 16 cm - Perkakas Handcraft",
  "supplier_price": 120000,
  "supplier_stock": 12,
  "sensitive_terms": ["sembelih", "badik"],
  "compliance_status": "INTERNAL_ONLY"
}
```
