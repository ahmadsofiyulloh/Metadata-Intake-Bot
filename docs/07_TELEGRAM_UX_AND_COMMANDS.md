# Telegram UX and Commands

## UX Principle

Telegram adalah panel kerja cepat, bukan gudang data utama. Database tetap menjadi source of truth.

Output wajib mudah dicopy dari teks chat:

```text
Label:
`value`
```

Jangan pakai tombol copy inline keyboard untuk MVP.

## Command List

```text
/start
/new
/search <kata>
/detail <short_code>
/shopee <kata>
/tiktok <kata>
/review
/ready
/archive <short_code>
```

## `/start`

Output:

```text
Halo, ini Metadata Intake Bot.

Gunakan:
/new - input deskripsi seller baru
/search <kata> - cari produk lama
/shopee <kata> - field pack Shopee
/tiktok <kata> - field pack TikTok
/review - produk perlu review
/ready - produk siap pakai
```

## `/new`

User:

```text
/new
```

Bot:

```text
Kirim deskripsi seller untuk dibuat metadata produk baru.
```

User mengirim teks seller.

Bot generate metadata dan menyimpan ke DB.

## Output Metadata Baru

```text
📦 Metadata Produk Baru

Short Code:
`P-1001`

Status Data:
`DATA_SEBAGIAN`

Compliance:
`NEED_REVIEW`

Nama Supplier:
`badik baja per kayu jati pb 25-26`

Nama Toko:
`LANDEP SMITH | WIRA SERIES Perkakas Handcraft Baja Per Kayu Jati PB 25-26 cm - Alat Outdoor Harian`

SKU:
`LDS-WRA-BP-JTI-PB25-TB4-001`

Modal Supplier:
`120000`

Stok Supplier:
`12`

Spesifikasi:
`Material: baja per | Gagang: kayu jati | PB: 25-26 cm | LB: 35 mm | TB: 4 mm`

Data Kurang:
`Berat produk, dimensi paket, isi paket, supplier`

Catatan Review:
`Produk termasuk alat tajam/perkakas outdoor. Review kategori dan wording sebelum input marketplace.`
```

## `/search <kata>`

User:

```text
/search kayu jati
```

Bot:

```text
🔎 Hasil Pencarian: kayu jati

1. P-1001
`LANDEP SMITH | WIRA SERIES Perkakas Handcraft Baja Per Kayu Jati PB 25-26 cm`
Supplier text: `badik baja per kayu jati`
Status: `NEED_REVIEW`

2. P-1002
`LANDEP SMITH | DAPUR SERIES Pisau Dapur Gagang Kayu Jati`
Supplier text: `pisau dapur jati`
Status: `READY`

Buka detail:
/detail P-1001
```

## `/detail <short_code>`

User:

```text
/detail P-1001
```

Bot:

```text
📦 Detail Produk

Short Code:
`P-1001`

Nama Supplier:
`badik baja per kayu jati pb 25-26`

Nama Toko:
`LANDEP SMITH | WIRA SERIES Perkakas Handcraft Baja Per Kayu Jati PB 25-26 cm - Alat Outdoor Harian`

SKU:
`LDS-WRA-BP-JTI-PB25-TB4-001`

Keyword:
`alat outdoor, perkakas handcraft, gagang kayu jati, baja pilihan, perlengkapan kebun`
```

## `/shopee <kata>`

User:

```text
/shopee kayu jati
```

Bot jika multiple results:

```text
Pilih produk untuk Shopee Field Pack:

1. P-1001 — Perkakas Handcraft Baja Per Kayu Jati
2. P-1002 — Pisau Dapur Gagang Kayu Jati

Ketik /detail P-1001 atau /shopee P-1001
```

Bot jika match jelas:

```text
🟠 Shopee Field Pack

Nama Produk:
`LANDEP SMITH | WIRA SERIES Perkakas Handcraft Baja Per Kayu Jati PB 25-26 cm - Alat Outdoor Harian`

SKU Seller:
`LDS-WRA-BP-JTI-PB25-TB4-001`

Keyword Shopee:
`alat outdoor, perkakas handcraft, gagang kayu jati, baja pilihan, perlengkapan kebun`

Deskripsi Shopee 1:
`Produk handcraft dengan material pilihan dan finishing rapi. Cocok untuk kebutuhan aktivitas luar ruang, kebun, dan penggunaan harian sesuai fungsi produk.`

Deskripsi Shopee 2:
`Spesifikasi: material baja per, gagang kayu jati, PB 25-26 cm, LB 35 mm, TB 4 mm. Data mengikuti informasi supplier.`

Deskripsi Shopee 3:
`Stok dapat berubah sewaktu-waktu. Produk dicek sebelum dikirim dan dikemas dengan aman.`

Catatan Review:
`Review kategori marketplace sebelum input karena produk termasuk alat tajam/perkakas outdoor.`
```

## `/tiktok <kata>`

Mirip `/shopee`, tetapi wording lebih ketat. Jika produk berisiko, tampilkan:

```text
⚠️ TikTok Field Pack Locked

Status:
`NEED_REVIEW`

Alasan:
`Produk termasuk alat tajam/perkakas outdoor. Review kebijakan kategori sebelum input TikTok Seller.`
```

## `/review`

Menampilkan produk dengan compliance `NEED_REVIEW` atau data_status `DATA_SEBAGIAN`.

## `/ready`

Menampilkan produk yang data dan wording-nya siap dipakai.

## `/archive <short_code>`

Set `archived_at = now()`.

## Field Chunking Rule

Jika value lebih dari ±450-700 karakter, pecah menjadi part:

```text
Deskripsi Shopee 1:
`...`

Deskripsi Shopee 2:
`...`
```

Tujuannya agar user mudah copy per bagian.
