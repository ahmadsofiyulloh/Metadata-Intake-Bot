# Handoff

## Architecture

The bot is split into three layers:

- Transport: Telegram webhook on Vercel and polling for local dev.
- Bot logic: command routing, session handling, and Telegram HTML formatting.
- Metadata service: heuristic extraction, Gemini generation, sanitizer, compliance guard, SKU generation, and search text building.

## Main Files

- `api/telegram/webhook.ts` - production webhook handler.
- `api/health.ts` - health check.
- `scripts/dev-polling.ts` - local polling loop.
- `scripts/set-webhook.ts` - register Telegram webhook.
- `scripts/delete-webhook.ts` - remove Telegram webhook.
- `scripts/test-gemini.ts` - Gemini smoke test.
- `scripts/test-metadata-sanitizer.ts` - deterministic metadata sanitizer smoke test.
- `src/bot/http.ts` - Telegram HTTP transport helper.
- `src/bot/handleUpdate.ts` - main update router.
- `src/metadata/generateMetadata.ts` - metadata generation entrypoint.
- `src/metadata/catalogSanitizer.ts` - neutral alias, title cleanup, and spec-copy builder.
- `src/metadata/complianceGuard.ts` - final risk/status guard.
- `src/db/*` - Supabase access and repositories.

## Runtime Rules

- Use a separate dev bot token if possible.
- Do not keep polling and webhook active on the same token.
- Keep raw seller text unchanged in storage.
- Never invent missing facts.
- Store names, titles, keywords, descriptions, and photo-copy fields must be sanitized before display.
- `INTERNAL_ONLY` and `BLOCKED` still produce metadata, but platform packs must be labeled `METADATA_ONLY`.

## Data Rules

- `product_drafts` is the main source of truth.
- `metadata_versions` stores generated snapshots.
- `bot_events` stores operational traces.
- `user_sessions` tracks `/new` capture mode.
- `image_metadata_json.spec_copy_fields` stores photo-editing copy fields; no migration is needed because this is JSONB.

## Supabase Target Rule

Use the project configured in `.env` and the Supabase CLI linked project as the source of truth. Do not assume the Supabase MCP project is the same project unless it has been verified.

## Deployment

- Local: `npm run delete:webhook`, then `npm run dev:polling`.
- Webhook: deploy to Vercel, verify `/api/health` returns `200`, then run `npm run set:webhook`.
- Current known blocker: do not set production webhook while the Vercel health URL returns `404`.
