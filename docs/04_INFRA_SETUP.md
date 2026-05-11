# Infra Setup Guide

## Telegram Bot

1. Open Telegram.
2. Find `@BotFather`.
3. Run `/newbot`.
4. Save the token as `TELEGRAM_BOT_TOKEN`.

Recommended setup:

```text
metadata_dev_bot  -> local development polling
metadata_prod_bot -> Vercel production webhook
```

Using two bots avoids webhook/polling conflicts on one token.

## Gemini API

1. Create an API key in Google AI Studio.
2. Save it in `.env`.

```env
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

The app uses Gemini JSON response schema plus deterministic post-processing. Gemini output is not trusted directly for final title, compliance status, or platform-ready metadata.

## Supabase

1. Create the Supabase project intended for this bot.
2. Save `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
3. Verify the project ref in `SUPABASE_URL` before pushing migrations.
4. Apply `supabase/migrations/001_initial_schema.sql` only to the intended project.

Important:

- Service role key is backend-only. Never expose it in browser code.
- This repo uses `.env`, not `.env.local`, for local scripts.
- Supabase MCP may point to a different project; verify before running SQL through MCP.

## Vercel

Set the same production env vars in Vercel:

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
VERCEL_PUBLIC_URL=https://metadata-intake-bot.vercel.app
```

Before setting Telegram webhook, verify:

```bash
curl https://metadata-intake-bot.vercel.app/api/health
```

Only continue when the response is HTTP `200`.

## Webhook Setup

After Vercel health is valid:

```bash
npm run set:webhook
```

The script reads `VERCEL_PUBLIC_URL` and uses:

```text
https://metadata-intake-bot.vercel.app/api/telegram/webhook
```

## Local Env

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Local scripts load `.env` automatically through `tsx --env-file=.env`.

## References

- Telegram Bot API: https://core.telegram.org/bots/api
- Telegram Webhooks Guide: https://core.telegram.org/bots/webhooks
- Vercel CLI: https://vercel.com/docs/cli
- Gemini structured output: https://ai.google.dev/gemini-api/docs/structured-output
- Supabase security: https://supabase.com/docs/guides/database/secure-data
