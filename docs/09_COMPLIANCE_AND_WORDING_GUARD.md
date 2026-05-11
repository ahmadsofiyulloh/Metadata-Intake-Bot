# Compliance and Wording Guard

## Purpose

Compliance guard bukan untuk mengakali platform. Tujuannya:

- Mengubah bahasa supplier yang kasar/berisiko menjadi bahasa katalog yang profesional dan netral.
- Menjaga deskripsi tetap jujur sesuai fungsi produk.
- Menandai produk yang butuh review sebelum input marketplace.
- Mencegah bot membuat copy promosi yang mengarah ke senjata, self-defense, combat, atau klaim berbahaya.

## Product Context Levels

```text
TOOL_ALLOWED
NEED_REVIEW
INTERNAL_ONLY
BLOCKED
```

### TOOL_ALLOWED

Produk tajam atau perkakas dengan fungsi umum yang jelas, seperti:

- pisau dapur
- alat masak
- gunting
- cutter umum
- alat kebun
- alat kerajinan
- perkakas outdoor non-senjata

### NEED_REVIEW

Produk yang fungsi praktisnya ada tetapi wording/kategorinya ambigu:

- badik handcraft
- pisau outdoor
- parang/golok kebun
- alat tempa tradisional
- survival tool
- koleksi tradisional

### INTERNAL_ONLY

Produk yang terlalu berisiko untuk langsung dibuatkan field marketplace, tetapi tetap boleh disimpan sebagai katalog internal.

### BLOCKED

Produk atau wording yang jelas mengarah ke bahaya/senjata/self-defense/combat.

## Sensitive Terms Initial List

```text
senjata
senjata tajam
self defense
bela diri
tactical
combat
anti begal
mematikan
serang
badik
belati
golok
parang
pisau survival
survival weapon
sembelih
tebas
buru
```

Catatan: kata seperti `badik`, `golok`, atau `pisau` tidak otomatis berarti blocked. Context classifier harus melihat fungsi, kategori, dan wording.

## Neutral Wording Examples

Kata supplier:

```text
sembelih
tebas
senjata tajam
tactical
combat
anti begal
```

Diganti/hapus menjadi wording netral jika fungsi produk memang alat/perkakas:

```text
alat outdoor
perkakas
alat kebun
alat potong
handcraft
tempa tradisional
gagang kayu
baja pilihan
finishing rapi
untuk aktivitas luar ruang
untuk kebutuhan harian
```

## Do Not Do This

Jangan membuat copy seperti:

```text
Senjata tajam kuat untuk self defense
Pisau tactical combat anti begal
Tebas kuat mematikan
```

Jangan juga menyamarkan produk dilarang sebagai kategori palsu.

## Shopee/TikTok Output Differences

MVP harus menyimpan status per platform:

```json
{
  "shopee": "NEED_REVIEW",
  "tiktok": "INTERNAL_ONLY"
}
```

Jika produk mengandung alat tajam/ambigu, TikTok field pack boleh dikunci atau diberi warning lebih ketat.

## Example Output for Ambiguous Outdoor Tool

```text
Compliance:
`NEED_REVIEW`

Reason:
`Produk termasuk alat tajam/perkakas outdoor. Gunakan wording netral sesuai fungsi produk dan review kategori marketplace sebelum input.`
```

## Implementation Rule

`complianceGuard.ts` harus menerima output Gemini lalu melakukan final pass:

1. Normalisasi sensitive terms.
2. Set `compliance_status` final.
3. Tambahkan `review_notes`.
4. Lock/empty platform fields jika terlalu berisiko.
5. Jangan hilangkan raw seller text.

## Audit Log

Jika compliance guard mengubah status, simpan di `metadata_versions` atau `bot_events`.
