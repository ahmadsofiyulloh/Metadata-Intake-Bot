# Infra Setup Guide

## 1. Telegram Bot

### Buat Bot

1. Buka Telegram.
2. Cari `@BotFather`.
3. Jalankan `/newbot`.
4. Buat nama dan username bot.
5. Simpan token sebagai:

```env
TELEGRAM_BOT_TOKEN=...
```

### Rekomendasi

Buat 2 bot:

```text
metadata_dev_bot   → untuk local development polling
metadata_prod_bot  → untuk Vercel production webhook
```

Ini menghindari konflik webhook/polling.

## 2. Google AI Studio / Gemini API

1. Buka Google AI Studio.
2. Buat API key.
3. Simpan:

```env
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

Gunakan structured output JSON untuk hasil metadata yang konsisten.

## 3. Supabase

1. Buat project Supabase.
2. Ambil Project URL.
3. Ambil service role key.
4. Jalankan migration `supabase/migrations/001_initial_schema.sql`.
5. Simpan env:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Catatan keamanan:

- Service role key hanya untuk backend.
- Jangan expose ke browser.
- Project ini tidak punya frontend, jadi key hanya berada di Vercel env dan `.env.local`.

## 4. Vercel

### Buat Project

1. Push repo ke GitHub.
2. Import ke Vercel.
3. Set environment variables.
4. Deploy.
5. Catat URL project:

```text
https://metadata-intake-bot.vercel.app
```

### Environment Variables Vercel

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
NODE_ENV=production
```

## 5. Webhook Setup

Setelah deploy ke Vercel:

```bash
npm run set:webhook -- --url https://metadata-intake-bot.vercel.app/api/telegram/webhook
```

Atau script `scripts/set-webhook.ts` membaca env:

```env
VERCEL_PUBLIC_URL=https://metadata-intake-bot.vercel.app
```

Webhook URL:

```text
https://metadata-intake-bot.vercel.app/api/telegram/webhook
```

## 6. Local Env

Buat `.env.local` dari `.env.example`:

```bash
cp .env.example .env.local
```

Isi:

```env
TELEGRAM_BOT_TOKEN=token_dev_bot
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
STORE_NAME=LANDEP SMITH
STORE_CODE=LDS
DEFAULT_LANGUAGE=id
NODE_ENV=development
```

## 7. No Domain Required

Untuk MVP:

- Tidak perlu domain custom.
- URL `*.vercel.app` sudah HTTPS dan cukup untuk webhook Telegram.
- Domain custom bisa ditambahkan nanti jika diperlukan.

## 8. Official References

- Telegram Bot API: https://core.telegram.org/bots/api
- Telegram Webhooks Guide: https://core.telegram.org/bots/webhooks
- Vercel CLI: https://vercel.com/docs/cli
- Vercel dev: https://vercel.com/docs/cli/dev
- Vercel deploy: https://vercel.com/docs/cli/deploy
- Vercel Functions runtime/filesystem: https://vercel.com/docs/functions/runtimes
- Gemini structured output: https://ai.google.dev/gemini-api/docs/structured-output
- Supabase secure data/API keys: https://supabase.com/docs/guides/database/secure-data
