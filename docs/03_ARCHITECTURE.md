# Architecture — Metadata Intake Bot

## High-Level Architecture

```text
Telegram Chat
   ↓
Telegram Bot Update
   ↓
Transport Adapter
   ├─ Local Dev: Polling Adapter
   └─ Production: Vercel Webhook
   ↓
Bot Update Handler
   ↓
Command Router
   ├─ /start
   ├─ /new
   ├─ /search
   ├─ /detail
   ├─ /shopee
   ├─ /tiktok
   ├─ /review
   ├─ /ready
   └─ /archive
   ↓
Metadata Service
   ├─ Gemini Structured Output
   ├─ Normalizer
   ├─ SKU Generator
   ├─ Compliance Guard
   ├─ Searchable Text Builder
   └─ Telegram Formatter
   ↓
Supabase Database
```

## Core Design Principle

Pisahkan logic utama bot dari transport Telegram.

```text
src/bot/handleUpdate.ts
```

File ini dipakai oleh:

```text
api/telegram/webhook.ts      → production Vercel webhook
scripts/dev-polling.ts       → local development polling
```

Dengan begitu local dev tidak perlu deploy ke Vercel setiap kali tes.

## Runtime Choices

| Area | Choice |
|---|---|
| Language | TypeScript |
| Runtime | Node.js 20+ |
| Production hosting | Vercel Functions |
| Local dev | Polling adapter |
| Database | Supabase Postgres |
| AI | Gemini API |
| Telegram mode production | Webhook |
| Telegram mode local | Polling |

## Why Vercel for Prototype

Vercel cocok untuk prototype karena:

- URL HTTPS bawaan `*.vercel.app` bisa dipakai webhook Telegram.
- Tidak butuh VPS.
- Tidak butuh frontend.
- Cocok untuk request/response ringan seperti Telegram update handler.

Namun Vercel tidak cocok untuk:

- Long-running worker 24/7.
- SQLite lokal sebagai database utama.
- File persistence lokal.
- Polling Telegram production.

## Webhook Flow Production

```text
Telegram → POST /api/telegram/webhook → handleUpdate → Supabase/Gemini → sendMessage
```

Endpoint webhook harus:

- Menerima `POST`.
- Validasi secret token jika dikonfigurasi.
- Tidak membocorkan token pada log.
- Return status 200 jika update diterima.

## Local Polling Flow

```text
scripts/dev-polling.ts → getUpdates → handleUpdate → Supabase/Gemini → sendMessage
```

Penting:

- Jangan gunakan bot token yang sama untuk polling dan webhook aktif bersamaan.
- Untuk local dev, gunakan bot Telegram terpisah jika memungkinkan.
- Jika memakai token yang sama, jalankan `deleteWebhook` sebelum polling.

## Data Flow Metadata Generation

```text
User sends seller description
↓
/new active session checks next message
↓
raw_seller_text saved/logged
↓
Gemini structured output generated
↓
complianceGuard validates and adjusts status
↓
skuGenerator creates internal SKU
↓
searchText builds searchable_text
↓
product_drafts insert
↓
metadata_versions insert v1
↓
Telegram formatter sends copyable fields
```

## Search Flow

```text
User: /search kayu jati
↓
Query against searchable_text + raw_seller_text + normalized_store_name + title_internal
↓
Return paginated result list
↓
User opens detail by short_code or result number
```

## Platform Field Pack Flow

```text
User: /shopee kayu jati
↓
Search product candidates
↓
If one clear match → show Shopee field pack
If multiple → ask user to pick
↓
Send copyable field blocks
```

Same pattern for `/tiktok`.
