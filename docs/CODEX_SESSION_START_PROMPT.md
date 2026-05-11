# Prompt Pembuka Sesi Codex CLI — Metadata Intake Bot

Buat project baru backend-only bernama `metadata-intake-bot` untuk Telegram Product Metadata Bot.

## Konteks Produk

Project ini adalah Telegram Bot backend-only untuk generate metadata produk dari deskripsi seller/supplier.

MVP hanya fokus pada **teks deskripsi seller**, bukan scan foto, bukan OCR gambar, bukan edit foto, bukan sync marketplace, bukan tracking delivery, dan bukan frontend dashboard.

Bot digunakan untuk workflow reseller/dropship:

1. User kirim deskripsi seller yang tidak rapi.
2. Bot generate metadata produk.
3. Bot simpan raw seller text dan hasil metadata ke database.
4. Bot tampilkan field per bagian di chat Telegram dalam format copyable.
5. User bisa cari ulang produk berdasarkan nama supplier atau nama toko hasil normalisasi, bukan berdasarkan SKU.

## Target Infra

- Node.js + TypeScript.
- Vercel Functions untuk production webhook.
- Local development dengan polling adapter.
- Supabase sebagai database persisten.
- Gemini API untuk structured metadata generation.
- Telegram output berupa label + inline code/monospace value per field agar user bisa copy dari teks chat.
- Tidak menggunakan inline keyboard copy button untuk MVP.
- Tidak menggunakan SQLite di Vercel.
- Tidak membuat frontend.

## Scope MVP yang Wajib Dikunci

### In Scope

- `/start`
- `/new`
- `/search <kata>`
- `/detail <short_code>`
- `/shopee <kata>`
- `/tiktok <kata>`
- `/review`
- `/ready`
- `/archive <short_code>`
- Gemini structured output.
- Supabase insert/search/detail.
- SKU generator.
- Compliance guard.
- Telegram formatter untuk output copyable per field.
- Local polling development.
- Vercel webhook production.

### Out of Scope

Jangan buat:

- Frontend.
- Dashboard React/Next.
- Scan foto/OCR gambar.
- Upload/edit/analyze image.
- Marketplace sync.
- Shopee/Tokopedia/TikTok API integration.
- Tracking delivery.
- WhatsApp automation.
- Payment supplier tracking.
- Cron summary.

## Format Title Wajib

Gunakan format:

```text
[NAMA TOKO UPPERCASE] | [NAMA SERIES AI] [NAMA PRODUK SUPPLIER YANG DINORMALISASI] - [KEYWORD PLATFORM MARKETPLACE]
```

Env default:

```env
STORE_NAME=LANDEP SMITH
STORE_CODE=LDS
```

Contoh output:

```text
LANDEP SMITH | WIRA SERIES Perkakas Handcraft Baja Per Kayu Jati PB 25-26 cm - Alat Outdoor Harian
```

## Search UX Wajib

Search utama bukan SKU.

Search harus berdasarkan:

- raw seller text
- supplier product name
- normalized store name
- generated title
- material
- keyword
- series
- supplier

SKU tetap dibuat untuk field internal/seller, tetapi user tidak diwajibkan mengingat SKU.

## Telegram Output Format Wajib

Output metadata harus memakai label + inline code.

Contoh:

```text
Nama Toko:
`LANDEP SMITH | WIRA SERIES Perkakas Handcraft Baja Per Kayu Jati PB 25-26 cm - Alat Outdoor Harian`

SKU:
`LDS-WRA-BP-JTI-PB25-TB4-001`

Modal Supplier:
`120000`
```

Jangan mengandalkan tombol copy inline keyboard untuk MVP.

Field panjang wajib dipecah:

```text
Deskripsi Shopee 1:
`...`

Deskripsi Shopee 2:
`...`
```

Gunakan HTML parse mode dengan `<code>...</code>` atau MarkdownV2 dengan escaping benar. Pastikan karakter khusus tidak merusak formatting.

## Gemini Structured Output

Implementasikan `src/metadata/generateMetadata.ts` untuk memanggil Gemini dengan structured output JSON.

Output schema harus berisi minimal:

- raw_seller_text
- supplier_product_name
- normalized_store_name
- generated_series
- category_context
- product_type
- supplier_price
- supplier_stock
- specs
- missing_fields
- sensitive_terms
- compliance_status
- compliance_reason
- title_internal
- title_shopee
- title_tiktok
- sku_basis
- keywords_shopee
- keywords_tiktok
- image_metadata
- shopee_description_parts
- tiktok_description_parts
- data_status
- confidence_summary

AI wajib membedakan field:

- explicit
- inferred
- unknown
- risk

AI tidak boleh mengisi field kosong sebagai fakta.

## Compliance Guard

Buat `src/metadata/complianceGuard.ts`.

Rules:

- Menandai kata agresif/sensitif seperti senjata, self defense, combat, tactical, sembelih, tebas, badik, belati, golok, survival weapon.
- Tidak menyamarkan produk dilarang.
- Boleh menormalisasi bahasa supplier menjadi netral jika fungsi produk jelas.
- Memberi status: `SAFE_TO_DRAFT`, `NEED_REVIEW`, `INTERNAL_ONLY`, `BLOCKED`.
- Untuk produk tajam/ambiguous default ke `NEED_REVIEW` atau `INTERNAL_ONLY`, bukan `SAFE_TO_DRAFT` otomatis.
- Tidak membuat copy promosi yang mengarah ke senjata, self-defense, tactical, combat, atau klaim berbahaya.

## SKU Generator

Generate SKU internal stabil:

```text
[STORE_CODE]-[SERIES_CODE]-[CATEGORY_CODE]-[MATERIAL_CODE]-[ATTRIBUTE_CODE]-[SEQ]
```

Contoh:

```text
LDS-WRA-BP-JTI-PB25-TB4-001
```

Jika attribute unknown, gunakan kode aman seperti `GEN` atau skip komponen yang tidak tersedia.

## Database

Buat migration:

- `product_drafts`
- `metadata_versions`
- `bot_events`
- `user_sessions`

`product_drafts` minimal menyimpan:

- id
- short_code
- sku_internal
- store_name
- store_code
- raw_seller_text
- supplier_name
- supplier_product_name
- normalized_store_name
- generated_series
- title_internal
- title_shopee
- title_tiktok
- supplier_price
- supplier_stock
- specs_json
- missing_fields_json
- sensitive_terms_json
- keywords_json
- image_metadata_json
- shopee_field_pack_json
- tiktok_field_pack_json
- data_status
- compliance_status
- review_notes
- searchable_text
- archived_at
- created_at
- updated_at

## Repo Structure Target

Buat struktur:

```text
metadata-intake-bot/
├─ api/
│  ├─ telegram/
│  │  └─ webhook.ts
│  └─ health.ts
├─ scripts/
│  ├─ dev-polling.ts
│  ├─ set-webhook.ts
│  ├─ delete-webhook.ts
│  └─ test-gemini.ts
├─ src/
│  ├─ bot/
│  │  ├─ handleUpdate.ts
│  │  ├─ commands/
│  │  ├─ formatters/
│  │  └─ telegramClient.ts
│  ├─ metadata/
│  │  ├─ generateMetadata.ts
│  │  ├─ metadataSchema.ts
│  │  ├─ normalizeSellerText.ts
│  │  ├─ skuGenerator.ts
│  │  ├─ complianceGuard.ts
│  │  └─ searchText.ts
│  ├─ db/
│  │  ├─ supabase.ts
│  │  ├─ productDraftsRepo.ts
│  │  ├─ versionsRepo.ts
│  │  └─ sessionsRepo.ts
│  ├─ config/
│  │  └─ env.ts
│  └─ types/
│     └─ metadata.ts
├─ supabase/
│  └─ migrations/
│     └─ 001_initial_schema.sql
├─ docs/
│  ├─ PRD.md
│  ├─ HANDOFF.md
│  ├─ LOCAL_DEV.md
│  └─ MVP_SCOPE.md
├─ package.json
├─ tsconfig.json
├─ vercel.json
├─ .env.example
└─ README.md
```

## Scripts yang Harus Ada

```json
{
  "scripts": {
    "dev": "vercel dev",
    "dev:polling": "tsx scripts/dev-polling.ts",
    "build": "tsc --noEmit",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "set:webhook": "tsx scripts/set-webhook.ts",
    "delete:webhook": "tsx scripts/delete-webhook.ts",
    "test:gemini": "tsx scripts/test-gemini.ts"
  }
}
```

## Environment Variables

Buat `.env.example`:

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
STORE_NAME=LANDEP SMITH
STORE_CODE=LDS
DEFAULT_LANGUAGE=id
NODE_ENV=development
```

`src/config/env.ts` harus validate env required.

## Local Dev Requirements

Implementasikan `scripts/dev-polling.ts` agar local development tidak perlu webhook/tunnel.

Implementasikan:

- `scripts/set-webhook.ts`
- `scripts/delete-webhook.ts`

Dokumentasikan bahwa satu bot token tidak boleh aktif webhook dan polling bersamaan. Gunakan dev bot terpisah jika memungkinkan.

## Vercel Webhook Requirements

`api/telegram/webhook.ts` harus:

- menerima POST Telegram update
- validasi `TELEGRAM_WEBHOOK_SECRET` jika tersedia
- memanggil `handleUpdate()`
- return 200
- logging error aman tanpa membocorkan token

## Documentation Required

Buat docs:

- `docs/PRD.md`
- `docs/HANDOFF.md`
- `docs/LOCAL_DEV.md`
- `docs/MVP_SCOPE.md`

Isi docs harus menjelaskan:

- scope MVP
- local dev polling
- Vercel webhook
- Supabase setup
- Gemini setup
- command bot
- output format
- batasan out-of-scope

## Example Test Input

Gunakan input ini untuk test:

```text
Sembelih badik baja per kayu jati pb 25-26 lb 35 tb 4 ml stok 12 pcs 120.000
```

Expected:

- Modal supplier: 120000
- Stok supplier: 12
- Material: baja per
- Handle/material: kayu jati
- PB: 25-26 cm
- LB: 35 mm
- TB: 4 mm
- Missing fields: berat, dimensi paket, isi paket, supplier
- Compliance: NEED_REVIEW atau INTERNAL_ONLY
- Search `/search kayu jati` menemukan produk
- `/shopee kayu jati` menampilkan field pack copyable

## Success Criteria

Setelah selesai, laporkan:

1. Struktur file yang dibuat.
2. Cara menjalankan local dev.
3. Cara set webhook Vercel.
4. Env yang harus diisi.
5. SQL migration yang harus dijalankan.
6. Contoh input seller dan contoh output Telegram.
7. Batasan MVP yang tetap dikunci.
8. Commands yang sudah tersedia.
9. Hasil typecheck/lint/build.

Jangan membuat frontend.
Jangan menambahkan scan foto/OCR gambar.
Jangan menambahkan marketplace sync.
Jangan menambahkan tracking delivery.
Jangan menambahkan WhatsApp automation.
```
