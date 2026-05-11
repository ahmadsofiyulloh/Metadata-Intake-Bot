# MVP Scope Lock

Dokumen ini wajib dibaca sebelum coding. Tujuannya menjaga Codex tetap fokus dan tidak melebar.

## MVP Name

**Metadata Intake Bot — Text-Only MVP**

## Yang Harus Dibuat Sekarang

```text
Input teks deskripsi seller
→ Generate metadata produk
→ Simpan ke database
→ Tampilkan field copyable di Telegram
→ Bisa dicari ulang
```

## In Scope Detail

1. Telegram Bot backend-only.
2. `/new` untuk input metadata baru.
3. Pemrosesan teks seller dengan Gemini.
4. Structured JSON output dari Gemini.
5. Supabase database.
6. Vercel webhook production.
7. Local polling adapter untuk development.
8. Generate:
   - normalized store name
   - generated series
   - title internal
   - title Shopee
   - title TikTok
   - SKU internal
   - specs
   - missing fields
   - keywords
   - image metadata text
   - Shopee description parts
   - TikTok description parts
9. Search berdasarkan nama, bukan SKU.
10. Copyable chat output dengan inline code/monospace.

## Explicitly Out of Scope

Jangan membuat fitur berikut di MVP:

- Frontend React/Next dashboard.
- Upload/edit/analyze foto.
- OCR image/PDF.
- Scraping Seller Centre.
- Shopee/Tokopedia/TikTok API sync.
- Tracking delivery.
- Auto posting/upload listing.
- WhatsApp integration.
- Payment supplier tracking.
- Cron summary harian.
- Multi-user team roles.
- Admin web settings.

## Non-Negotiable UX Rules

- Jangan jadikan SKU sebagai cara utama user mencari produk.
- Jangan kirim satu pack metadata besar tanpa pemisahan field.
- Jangan pakai copy button inline keyboard sebagai mekanisme utama copy di MVP.
- Gunakan format:

```text
Label:
`value`
```

- Field panjang harus dipecah:

```text
Deskripsi Shopee 1:
`...`

Deskripsi Shopee 2:
`...`
```

## Non-Negotiable AI Rules

- AI tidak boleh mengisi field yang tidak ada sebagai fakta.
- AI wajib menandai data missing.
- AI wajib membedakan explicit, inferred, unknown, risk.
- AI boleh menormalisasi bahasa supplier menjadi bahasa katalog yang profesional dan netral.
- AI tidak boleh membuat output yang mempromosikan produk sebagai senjata, self-defense, tactical, combat, atau klaim berbahaya.

## Non-Negotiable Infra Rules

- Tidak pakai SQLite di Vercel.
- Persistensi data pakai Supabase.
- Local dev boleh pakai polling.
- Production Vercel pakai webhook.
- Jangan commit `.env.local` atau token.
- Service role key hanya untuk backend.
