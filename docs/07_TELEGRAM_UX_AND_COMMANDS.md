# Telegram UX and Commands

## UX Principle

Telegram is the fast work panel. Supabase remains the source of truth.

Output must be easy to copy:

```text
Label:
`value`
```

The implementation uses Telegram HTML parse mode with `<code>value</code>`.

Navigation is split into two layers:

- Reply keyboard utama hanya untuk alur inti: `Input Baru`, `Cari`, `Review`, `Siap Pakai`, `Bantuan`.
- Inline keyboard dipakai untuk aksi kontekstual di bawah pesan hasil, misalnya `Detail`, `Shopee`, `TikTok`, `Arsipkan`, `Lanjut`, `Skip`, dan `Menu Utama`.
- `Copy Spek Foto` menampilkan blok terpisah per field, termasuk `Panjang Bilah`, `Lebar Bilah`, dan `Tinggi Bilah`, supaya bisa dicopy satu per satu.
- `Estimasi Harga Jual` tampil sebagai field turunan statis dari `supplier_price` dengan rumus `modal + 25% fee + 25% profit`.

Slash command tetap didukung sebagai fallback, tetapi tidak ditonjolkan sebagai menu utama.

## Command List

```text
/start
/new
/search <kata>
/detail <short_code>
/shopee <kata_or_short_code>
/tiktok <kata_or_short_code>
/review
/ready
/archive <short_code>
```

## Loading Fallback

Untuk alur yang butuh waktu, bot wajib memberi sinyal yang jelas ke user:

- kirim chat action `typing`
- kirim pesan singkat seperti `Sedang memproses metadata supplier...`

Ini dipakai saat generate metadata, search, detail lookup, dan action kontekstual yang bisa memakan waktu.

## `/new`

Flow:

1. User sends `/new`.
2. Bot asks for seller description or supplier photo.
3. User sends supplier photo with caption, or photo first then raw seller text in the same session.
4. Bot generates metadata and stores it in Supabase.
5. Bot returns a copyable metadata summary and keeps the photo attached for audit context.
6. If `Data Kurang` masih ada, bot langsung minta konfirmasi `lanjut` atau `skip`.
7. Kalau user memilih `lanjut`, bot menanyakan field kosong satu per satu sampai selesai.
8. Inline keyboard pada hasil `/new` hanya menampilkan aksi yang relevan untuk draft tersebut, bukan command duplikat.
9. Output ringkas menampilkan `Estimasi Harga Jual`; output detail dan pack menampilkan rincian modal, fee marketplace, dan profit.

Field yang bisa diisi ulang pada v1:

- nama supplier
- berat produk
- dimensi paket
- isi paket

Saat semua field kosong terisi, draft bisa naik ke status `READY` bila compliance aman.

Example output fields:

```text
METADATA PRODUK BARU

Short Code:
`LSM-0000`

Status Data:
`DATA_SEBAGIAN`

Compliance:
`INTERNAL_ONLY`

Nama Produk Supplier:
`badik baja per kayu jati`

Nama Toko:
`LANDEP SMITH | WIRA SERIES Perkakas Handcraft Baja Per Kayu Jati PB 25-26 cm TB 16 cm - Perkakas Handcraft`

SKU:
`LDS-WRA-BP-JTI-PB25-TB16-001`

Estimasi Harga Jual:
`180.000`

Spesifikasi:
`material: baja per | handle_material: kayu jati | pb: 25-26 cm | lb: 35 mm | tb: 16 cm`

Copy Spek Foto:
`Material`
`Nilai: baja per`
`Label + Nilai: Material baja per`

`Gagang`
`Nilai: kayu jati`
`Label + Nilai: Gagang kayu jati`

`Panjang Bilah`
`Nilai: 25-26 cm`
`Label + Nilai: Panjang Bilah 25-26 cm`

`Lebar Bilah`
`Nilai: 35 mm`
`Label + Nilai: Lebar Bilah 35 mm`

`Tinggi Bilah`
`Nilai: 16 cm`
`Label + Nilai: Tinggi Bilah 16 cm`
```

## `/search <kata>`

Search should work by raw seller text, normalized title, material, keyword, and spec values. SKU is not the primary search path.

Jika `/search` dipanggil tanpa kata kunci, bot menampilkan prompt isi query dan tombol `Menu Utama`.

Hasil pencarian memakai inline keyboard per draft:

- `Detail <short_code>`
- `Menu Utama`

Setiap hasil juga menampilkan `Estimasi Jual` sebagai ringkasan statis dari `supplier_price`.

Example:

```text
Hasil Pencarian: kayu jati

1. `LSM-0000`
`LANDEP SMITH | WIRA SERIES Perkakas Handcraft Baja Per Kayu Jati PB 25-26 cm TB 16 cm - Perkakas Handcraft`
Nama Produk Supplier: `badik baja per kayu jati`
Status: `INTERNAL_ONLY`
Estimasi Jual: `180.000`

Buka detail: /detail `short_code`
```

## `/detail <short_code>`

Detail must show:

- short code
- supplier photo attachment if available
- supplier name/product name
- raw seller text
- sanitized store title
- SKU
- price and stock
- estimated selling price with breakdown of modal, marketplace fee, and profit
- compliance and data status
- keywords
- specs
- `Copy Spek Foto`
- missing fields
- review notes

Pada detail draft, inline keyboard harus mengarah ke aksi turunan yang benar-benar dipakai:

- `Shopee`
- `TikTok`
- `Arsipkan`
- `Menu Utama`

If the draft has been completed through the manual-fill wizard, `Data Kurang` should become `-` and the latest values should be reflected in the detail output.

## `/shopee` and `/tiktok`

Platform packs must show:

- `Purpose`
- `Nama Produk`
- `SKU Seller`
- estimated selling price
- platform keywords
- specs
- `Copy Spek Foto`
- compliance
- review warning
- split description parts

Purpose values:

```text
MARKETPLACE_DRAFT
REVIEW_REQUIRED
METADATA_ONLY
```

For `INTERNAL_ONLY` and `BLOCKED`, platform packs are not locked empty. They return sanitized metadata with `purpose: METADATA_ONLY`.

## `/review`

Shows drafts that need review or have partial data.

Setiap item hasil review harus punya tombol `Detail` agar user tidak perlu mengetik ulang short code.

## `/ready`

Shows drafts with `data_status = READY`.

Setiap item hasil ready juga harus punya tombol `Detail`.

## `/archive <short_code>`

Sets `archived_at` and `data_status = ARCHIVED`.

## Field Chunking Rule

If output is too long for Telegram, split it into chunks. Description fields should stay in short numbered parts so the user can copy each part independently.
