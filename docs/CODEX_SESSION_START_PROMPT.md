# Codex Session Start Prompt - Metadata Intake Bot

Use this document as the compact project briefing for future Codex sessions.

## Product Context

This repo is a backend-only Telegram bot for generating structured product metadata from messy seller/supplier text.

MVP is text-first:

- No frontend dashboard.
- No OCR or image editing.
- Supplier photo attachment is supported for audit context.
- No marketplace API sync.
- No WhatsApp automation.
- No delivery tracking.

User workflow:

1. User sends messy seller text.
2. Bot generates metadata.
3. Bot stores raw seller text and generated metadata in Supabase.
4. Bot returns copyable fields in Telegram.
5. User can search by supplier terms, normalized product name, material, keywords, or title.

## Current Runtime Shape

- Node.js + TypeScript.
- Vercel Functions for production webhook.
- Local development through Telegram polling.
- Supabase for persistence.
- Gemini API through direct `fetch`.
- Telegram output uses HTML parse mode with `<code>...</code>`.
- Telegram transport helper is `src/bot/http.ts`; do not rename it casually.

## Commands

Implemented commands:

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

## Important Scripts

```json
{
  "dev": "vercel dev",
  "dev:polling": "tsx --env-file=.env scripts/dev-polling.ts",
  "build": "tsc --noEmit",
  "typecheck": "tsc --noEmit",
  "lint": "eslint .",
  "set:webhook": "tsx --env-file=.env scripts/set-webhook.ts",
  "delete:webhook": "tsx --env-file=.env scripts/delete-webhook.ts",
  "test:gemini": "tsx --env-file=.env scripts/test-gemini.ts",
  "test:metadata": "tsx --env-file=.env scripts/test-metadata-sanitizer.ts"
}
```

## Metadata Rules

Raw supplier text must stay unchanged in storage.

Generated public-facing metadata must be sanitized:

- `normalized_store_name`
- `title_internal`
- `title_shopee`
- `title_tiktok`
- keywords
- descriptions
- image text metadata

Use neutral category aliases:

```text
Perkakas Handcraft
Alat Outdoor
Alat Kebun
Alat Dapur
```

Do not copy sensitive supplier wording such as:

```text
sembelih
tebas
senjata tajam
self defense
combat
tactical
anti begal
badik
belati
golok
parang
pisau
```

## Dimension Rules

Default units:

```text
PB -> Panjang Bilah -> cm
TB -> Tinggi Bilah  -> cm
LB -> Lebar Bilah   -> mm
```

If seller includes an explicit unit, preserve it.

`image_metadata.spec_copy_fields` must include both:

- value-only copy, for example `16 cm`
- label+value copy, for example `Tinggi Bilah 16 cm`

## Compliance Rules

Compliance statuses:

```text
SAFE_TO_DRAFT
NEED_REVIEW
INTERNAL_ONLY
BLOCKED
```

Platform pack purposes:

```text
MARKETPLACE_DRAFT
REVIEW_REQUIRED
METADATA_ONLY
```

`INTERNAL_ONLY` and `BLOCKED` must still return sanitized metadata. Do not empty platform packs unless a future product decision explicitly changes this.

## Database

Main tables:

- `product_drafts`
- `metadata_versions`
- `bot_events`
- `user_sessions`

JSONB fields allow schema extension without migration:

- `specs_json`
- `image_metadata_json`
- `shopee_field_pack_json`
- `tiktok_field_pack_json`

Before future migrations, verify the Supabase project in `.env` and Supabase CLI linked project. Do not assume Supabase MCP points to this repo's project.

## Local Development

Recommended flow:

```bash
npm run delete:webhook
npm run dev:polling
```

Do not keep webhook and polling active on the same bot token.

## Vercel Webhook

Only run `npm run set:webhook` after:

```text
https://metadata-intake-bot.vercel.app/api/health
```

returns HTTP `200`.

## Test Input

```text
Sembelih badik baja per kayu jati pb 25-26 lb 35 tb 16 stok 12 pcs 120.000
```

Expected:

- Price: `120000`
- Stock: `12`
- Material: `baja per`
- Handle material: `kayu jati`
- PB: `25-26 cm`
- LB: `35 mm`
- TB: `16 cm`
- Title uses neutral alias and does not include sensitive supplier terms.
- Compliance is `INTERNAL_ONLY` or stricter.
- Platform pack purpose is `METADATA_ONLY`.
- `Copy Spek Foto` includes `16 cm` and `Tinggi Bilah 16 cm`.

## Required Validation

Before reporting implementation complete, run:

```bash
npm run typecheck
npm run lint
npm run build
npm run test:metadata
```

Run `npm run test:gemini` when Gemini API verification is required.
