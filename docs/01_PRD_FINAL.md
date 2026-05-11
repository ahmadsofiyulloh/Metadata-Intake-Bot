# PRD Final — Metadata Intake Bot

## 1. Nama Project

**Metadata Intake Bot**

Bot Telegram backend-only untuk mengubah deskripsi pendek dari seller/supplier menjadi metadata produk siap pakai untuk input produk baru, desain foto produk, dan pencatatan data supplier.

## 2. Latar Belakang

User sering menerima katalog dari supplier lewat chat, misalnya:

```text
Sembelih badik baja per kayu jati pb 25-26 lb 35 tb 4 ml stok 12 pcs 120.000
```

Masalah utama:

- Format deskripsi supplier tidak rapi.
- Nama produk belum cocok untuk katalog toko.
- Banyak singkatan dan data tidak selalu lengkap.
- Nama produk perlu branding toko.
- SKU perlu digenerate dengan kode toko pribadi.
- Data modal dan stok supplier perlu disimpan.
- Metadata foto produk dan field seller perlu dibuat cepat.
- Output harus mudah dicopy per field langsung dari chat Telegram.

## 3. Tujuan Produk

MVP bertujuan membuat bot yang bisa:

1. Menerima teks deskripsi seller.
2. Menyimpan raw seller text apa adanya.
3. Mengekstrak data yang jelas dari deskripsi.
4. Menandai data yang belum ada atau ambigu.
5. Menormalisasi nama produk menjadi format toko.
6. Generate title produk sesuai format toko.
7. Generate SKU internal.
8. Generate metadata teks untuk desain foto produk.
9. Generate field Shopee dan TikTok Seller sebagai kandidat copy.
10. Menyediakan hasil di chat Telegram dengan format copyable per field.
11. Menyimpan hasil metadata ke database agar bisa dicari ulang.

## 4. Scope MVP

### In Scope

- Backend-only Telegram Bot.
- Deploy prototype ke Vercel.
- Local dev memakai polling adapter.
- Database Supabase.
- Gemini API untuk generate metadata terstruktur.
- Input hanya teks deskripsi seller.
- Search berdasarkan raw nama/deskripsi supplier, nama toko hasil normalisasi, keyword, series, material, dan supplier.
- Output per field dalam format monospace/inline-code.
- Field panjang dipecah menjadi beberapa bagian.
- Compliance dan wording guard.

### Out of Scope

- Frontend dashboard.
- OCR foto produk.
- Scan image/PDF.
- Edit foto produk.
- Upload otomatis ke Shopee/TikTok.
- Sync marketplace.
- Tracking delivery.
- WhatsApp automation.
- Pembayaran supplier otomatis.

## 5. Target User

User pribadi/reseller/dropshipper yang menerima katalog supplier lewat WhatsApp/Telegram dan perlu menyiapkan metadata produk secara cepat untuk marketplace.

## 6. Core User Story

### US-01 — Generate Metadata Baru

Sebagai user, saya ingin mengirim deskripsi supplier ke bot, lalu bot membuat title, SKU, spesifikasi, keyword, metadata foto, dan deskripsi marketplace agar saya bisa input produk baru lebih cepat.

### US-02 — Data Tidak Lengkap

Sebagai user, saya ingin bot tidak mengarang data yang tidak ada di deskripsi seller, tetapi menandai data yang missing agar bisa saya lengkapi nanti.

### US-03 — Copy Per Field

Sebagai user, saya ingin tiap field hasil metadata bisa dicopy langsung dari chat Telegram tanpa harus copy satu pack besar.

### US-04 — Cari Produk Lama

Sebagai user, saya ingin mencari produk berdasarkan nama supplier atau nama toko yang sudah dinormalisasi, bukan berdasarkan SKU.

### US-05 — Mode Shopee/TikTok

Sebagai user, saya ingin memanggil field pack khusus Shopee atau TikTok saat mau input produk ke platform tersebut.

## 7. Format Title Produk

Format wajib:

```text
[NAMA TOKO UPPERCASE] | [NAMA SERIES AI] [NAMA PRODUK SUPPLIER YANG DINORMALISASI] - [KEYWORD PLATFORM MARKETPLACE]
```

Contoh:

```text
LANDEP SMITH | WIRA SERIES Perkakas Handcraft Baja Per Kayu Jati PB 25-26 cm - Alat Outdoor Harian
```

## 8. Search Principle

UX search utama:

- Nama dari supplier.
- Raw deskripsi supplier.
- Nama produk yang sudah dinormalisasi.
- Title internal toko.
- Keyword/material/series.
- Supplier.

SKU tetap dibuat, tetapi **bukan patokan utama search**.

## 9. Data Classification Principle

AI wajib membedakan data:

| Status | Arti |
|---|---|
| `explicit` | Disebut langsung oleh seller |
| `inferred` | Disimpulkan dari konteks dengan confidence |
| `unknown` | Tidak tersedia, jangan ditebak |
| `risk` | Sensitif/berisiko untuk wording platform |

## 10. Success Criteria MVP

MVP dianggap valid jika:

- User bisa `/new`, kirim deskripsi seller, dan menerima metadata copyable.
- Hasil tersimpan ke Supabase.
- User bisa `/search kayu jati` dan menemukan produk dari raw text maupun nama normalisasi.
- User bisa `/shopee <kata>` dan `/tiktok <kata>` untuk field platform.
- Output copyable menggunakan label + inline code per field.
- Data missing ditampilkan jelas.
- Compliance status muncul jelas.
- Tidak ada fitur out-of-scope yang ikut dibuat.
