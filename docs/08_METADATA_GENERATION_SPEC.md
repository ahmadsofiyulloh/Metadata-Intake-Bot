# Metadata Generation Spec

## Input

MVP input is seller text first. Supplier photos can be attached to the same draft for audit context, but OCR is not used.

Example:

```text
Sembelih badik baja per kayu jati pb 25-26 lb 35 tb 16 stok 12 pcs 120.000
```

## Output

The bot generates:

- `supplier_product_name`
- `normalized_store_name`
- `generated_series`
- `title_internal`
- `title_shopee`
- `title_tiktok`
- `sku_internal`
- `supplier_price`
- `supplier_stock`
- `specs`
- `missing_fields`
- `sensitive_terms`
- `keywords_shopee`
- `keywords_tiktok`
- `image_metadata`
- `image_metadata.spec_copy_fields`
- `shopee_description_parts`
- `tiktok_description_parts`
- `data_status`
- `compliance_status`
- `compliance_reason`

Telegram juga merender field turunan `Estimasi Harga Jual` dari `supplier_price` dengan rumus statis:

```text
estimasi = supplier_price + (supplier_price x 25%) + (supplier_price x 25%)
```

Rumus ini dipakai sebagai output UI, bukan field yang disimpan ke schema metadata.

## Extraction Rules

Each extracted field has a source:

```text
explicit -> stated directly by seller
inferred -> inferred from context
unknown  -> not present
risk     -> sensitive or risky
```

Do not invent facts such as package weight, package dimensions, warranty, or bundle contents.

## Store Name and Title Rules

`supplier_product_name` may keep supplier wording for internal audit.

`normalized_store_name`, titles, keywords, descriptions, and image text must be sanitized:

- Do not copy vulgar or sensitive supplier wording into public-facing metadata.
- Use neutral category aliases by default: `Perkakas Handcraft`, `Alat Outdoor`, `Alat Kebun`, or `Alat Dapur`.
- Remove action/aggressive terms such as `sembelih`, `tebas`, `senjata tajam`, `self defense`, `combat`, `tactical`, and `anti begal`.
- Avoid repeated category, material, or dimension phrases.

Example normalized store name:

```text
Perkakas Handcraft Baja Per Kayu Jati PB 25-26 cm TB 16 cm
```

Title format:

```text
[STORE NAME UPPERCASE] | [SERIES] [NORMALIZED STORE NAME] - [NEUTRAL KEYWORD]
```

Example:

```text
LANDEP SMITH | WIRA SERIES Perkakas Handcraft Baja Per Kayu Jati PB 25-26 cm TB 16 cm - Perkakas Handcraft
```

## Dimension Rules

Default units when seller does not provide a unit:

```text
PB -> Panjang Bilah -> cm
TB -> Tinggi Bilah  -> cm
LB -> Lebar Bilah   -> mm
```

If seller provides an explicit `cm` or `mm`, preserve that unit.

## Image Metadata

Photo editing is done outside the app, so `image_metadata` includes copy-ready text.

`spec_copy_fields` must include both value-only and label+value variants:

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

`spec_copy_fields` ditampilkan sebagai blok terpisah per field di Telegram, supaya `Panjang Bilah`, `Lebar Bilah`, dan `Tinggi Bilah` bisa dicopy satu per satu tanpa menghapus ringkasan spek gabungan.

## Compliance and Platform Packs

Compliance does not delete metadata.

- `SAFE_TO_DRAFT`: platform pack purpose is `MARKETPLACE_DRAFT`.
- `NEED_REVIEW`: platform pack purpose is `REVIEW_REQUIRED`.
- `INTERNAL_ONLY` or `BLOCKED`: platform pack purpose is `METADATA_ONLY`.

`METADATA_ONLY` means the data can be used for internal cataloging and photo-editing metadata, but requires manual review before marketplace publishing.

## Example Parsed Output

```json
{
  "supplier_product_name": "badik baja per kayu jati",
  "normalized_store_name": "Perkakas Handcraft Baja Per Kayu Jati PB 25-26 cm TB 16 cm",
  "generated_series": "WIRA SERIES",
  "supplier_price": 120000,
  "supplier_stock": 12,
  "specs": {
    "material": {"value": "baja per", "source": "explicit", "confidence": 0.95},
    "handle_material": {"value": "kayu jati", "source": "explicit", "confidence": 0.95},
    "pb": {"value": "25-26 cm", "source": "explicit", "confidence": 0.85},
    "lb": {"value": "35 mm", "source": "explicit", "confidence": 0.75},
    "tb": {"value": "16 cm", "source": "explicit", "confidence": 0.75}
  },
  "sensitive_terms": ["sembelih", "badik"],
  "compliance_status": "INTERNAL_ONLY"
}
```
