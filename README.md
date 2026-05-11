# Metadata Intake Bot

Backend-only Telegram bot for turning messy seller descriptions into structured product metadata.

## Current Status

- Local polling flow is implemented and ready for direct Telegram testing.
- Gemini structured generation is implemented with deterministic post-processing.
- Supabase schema is applied to the project referenced by `.env` / Supabase CLI linked project.
- Supplier photo attachments can be tied to drafts for audit context through Telegram `file_id`.
- After `/new`, the bot can prompt for missing fields and let you fill them step by step with `lanjut` / `skip`.
- Vercel webhook flow exists, but production webhook must wait until `/api/health` returns `200`.
- Metadata output is not a publish approval system. Risky products still produce metadata, but `INTERNAL_ONLY` and `BLOCKED` packs are marked `METADATA_ONLY`.

## Scope

- Telegram commands: `/start`, `/new`, `/search`, `/detail`, `/shopee`, `/tiktok`, `/review`, `/ready`, `/archive`
- Gemini metadata generation with JSON response schema
- Supabase persistence
- Local polling development
- Vercel webhook production path
- Supplier photo attachment audit flow
- Sanitized product naming, neutral aliases, and photo-editing spec copy fields

## Setup

1. Copy `.env.example` to `.env`.
2. Fill `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `GEMINI_API_KEY`.
3. Verify `SUPABASE_URL` points to the intended project before running migrations.
4. Run the Supabase migrations in `supabase/migrations/` if they have not been pushed.
5. Install dependencies with `npm install`.

## Commands

- `npm run dev` - Vercel dev server
- `npm run dev:polling` - local Telegram polling loop
- `npm run set:webhook` - set Telegram webhook from `VERCEL_PUBLIC_URL`
- `npm run delete:webhook` - remove Telegram webhook
- `npm run test:metadata` - deterministic sanitizer/spec-copy smoke test
- `npm run test:gemini` - generate a sample metadata draft with Gemini
- `npm run build` / `npm run typecheck` - TypeScript checks
- `npm run lint` - ESLint

## Notes

- Local script commands load `.env` automatically.
- Do not use the same bot token for polling and webhook at the same time.
- `src/bot/http.ts` is the Telegram transport helper; do not rename it to a Telegram-specific client filename without checking local security tooling.
- No database migration is needed for metadata spec-copy additions because `image_metadata_json` and platform packs are JSONB.
