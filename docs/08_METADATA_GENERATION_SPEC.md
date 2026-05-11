# Metadata Generation Spec

## Input

Input MVP hanya teks seller.

Contoh:

```text
Sembelih badik baja per kayu jati pb 25-26 lb 35 tb 4 ml stok 12 pcs 120.000
```

## Output Utama

Bot harus menghasilkan:

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
- `shopee_description_parts`
- `tiktok_description_parts`
- `data_status`
- `compliance_status`
- `compliance_reason`

## Data Extraction Rules

AI wajib mengklasifikasikan field:

```text
explicit: disebut langsung
inferred: disimpulkan dari konteks
unknown: tidak ada data
risk: sensitif/berisiko
```

Jangan mengarang field seperti berat, dimensi, isi paket, atau garansi jika tidak ada.

## Normalized Store Name

Nama produk toko harus:

- Lebih rapi dari nama supplier.
- Menghapus kata kasar/hiperbolis yang tidak perlu.
- Menjaga jenis/fungsi produk secara jujur.
- Tidak membuat klaim palsu.
- Tidak terlalu panjang.

Contoh:

Raw:

```text
Sembelih badik baja per kayu jati pb 25-26 lb 35 tb 4 ml stok 12 pcs 120.000
```

Normalized:

```text
Perkakas Handcraft Baja Per Kayu Jati PB 25-26 cm TB 4 mm
```

## Series Generator

AI generate nama series singkat dan brandable.

Contoh series:

- WIRA SERIES
- ARJUNA SERIES
- RIMBA SERIES
- DAPUR SERIES
- KARYA SERIES
- LOKA SERIES

Series harus relevan dengan konteks produk, tetapi tidak boleh membuat klaim ekstrem.

## SKU Generator

Format:

```text
[STORE_CODE]-[SERIES_CODE]-[CATEGORY_CODE]-[MATERIAL_CODE]-[ATTRIBUTE_CODE]-[SEQ]
```

Contoh:

```text
LDS-WRA-BP-JTI-PB25-TB4-001
```

Mapping awal:

```text
STORE_CODE  = LDS
WIRA SERIES = WRA
Baja Per    = BP
Kayu Jati   = JTI
PB 25       = PB25
TB 4        = TB4
```

If unknown attribute, skip or use `GEN`.

## Title Internal

Formula:

```text
[NAMA TOKO UPPERCASE] | [SERIES] [NORMALIZED STORE NAME] - [KEYWORD PLATFORM]
```

Example:

```text
LANDEP SMITH | WIRA SERIES Perkakas Handcraft Baja Per Kayu Jati PB 25-26 cm - Alat Outdoor Harian
```

## Keywords

Keyword harus SEO-friendly dan netral.

Allowed examples:

```text
alat outdoor
perkakas handcraft
gagang kayu jati
baja pilihan
perlengkapan kebun
alat dapur
alat potong masak
finishing rapi
packing aman
```

Avoid high-risk/aggressive examples:

```text
senjata tajam
self defense
tactical weapon
combat
anti begal
mematikan
tebas orang
```

## Image Metadata Text

Karena edit foto dilakukan di luar app, output berupa teks siap copy:

```json
{
  "hero_headline": "Cocok untuk Berbagai Aktivitas",
  "hero_subheadline": "Material kokoh, tampilan elegan, dan nyaman digunakan",
  "badges": ["Produk Dicek", "Packing Aman", "Siap Kirim", "Stok Terbatas"],
  "spec_headline": "Ukuran & Spesifikasi",
  "benefit_points": ["Material pilihan", "Finishing rapi", "Nyaman digunakan", "Cocok untuk kebutuhan harian"]
}
```

## Description Parts

Field panjang harus dipecah 2-4 bagian pendek.

Setiap part idealnya < 700 karakter agar mudah copy di Telegram.

## Data Status

```text
DRAFT
DATA_SEBAGIAN
READY
INPUTTED_SHOPEE
INPUTTED_TIKTOK
ARCHIVED
```

Default setelah generation biasanya:

- `DATA_SEBAGIAN` jika ada missing fields.
- `READY` jika data cukup dan compliance aman.
- `NEED_REVIEW` jika compliance ambigu.

## Example Parsed Output

```json
{
  "supplier_product_name": "badik baja per kayu jati",
  "normalized_store_name": "Perkakas Handcraft Baja Per Kayu Jati PB 25-26 cm TB 4 mm",
  "generated_series": "WIRA SERIES",
  "supplier_price": 120000,
  "supplier_stock": 12,
  "specs": {
    "material": {"value": "baja per", "source": "explicit", "confidence": 0.95},
    "handle_material": {"value": "kayu jati", "source": "explicit", "confidence": 0.95},
    "pb": {"value": "25-26 cm", "source": "explicit", "confidence": 0.85},
    "lb": {"value": "35 mm", "source": "explicit", "confidence": 0.75},
    "tb": {"value": "4 mm", "source": "explicit", "confidence": 0.75}
  },
  "missing_fields": ["berat produk", "dimensi paket", "isi paket", "supplier"],
  "sensitive_terms": ["sembelih", "badik"],
  "compliance_status": "NEED_REVIEW"
}
```
