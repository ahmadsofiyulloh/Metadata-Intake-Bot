# Execution Checklist

## Phase 0 - Repo Bootstrap

- [x] Create Node.js + TypeScript project.
- [x] Add package scripts.
- [x] Add `.env.example`.
- [x] Add Vercel API route.
- [x] Add local polling script.
- [x] Add docs in `docs/`.

## Phase 1 - Supabase

- [x] Create Supabase project.
- [x] Add `SUPABASE_URL` to env.
- [x] Add `SUPABASE_SERVICE_ROLE_KEY` to env.
- [x] Apply initial migration to the intended project.
- [x] Verify bot tables and `next_sku_sequence` RPC on the intended project.
- [x] Run Supabase advisors with no current issues.

Note: verify `.env` project ref before any future migration. Do not assume Supabase MCP points to the same project.

## Phase 2 - Telegram Basics

- [x] Add `TELEGRAM_BOT_TOKEN` local.
- [x] Implement Telegram sendMessage through `src/bot/http.ts`.
- [x] Implement `/start`.
- [x] Implement local polling runner.
- [x] Start polling after deleting webhook.
- [ ] Confirm full manual Telegram command run after latest sanitizer changes, including supplier photo attachment.

## Phase 3 - Metadata Generation

- [x] Add Gemini API key support.
- [x] Implement structured output schema.
- [x] Implement `test:gemini`.
- [x] Add compliance guard.
- [x] Add catalog sanitizer.
- [x] Add SKU generator.
- [x] Add deterministic `test:metadata`.
- [x] Add `image_metadata.spec_copy_fields`.

## Phase 4 - `/new` Flow

- [x] `/new` sets user session.
- [x] Next text is processed as raw seller text.
- [x] Metadata saved to `product_drafts`.
- [x] Metadata version v1 saved.
- [x] Bot returns copyable per-field output.
- [x] Bot returns `Copy Spek Foto` values.

## Phase 5 - Search and Detail

- [x] Build `searchable_text`.
- [x] `/search <kata>` returns result list.
- [x] `/detail <short_code>` returns detail.
- [x] Search includes raw supplier terms, normalized store name, title, keywords, and specs.
- [ ] Add fallback search if full-text search returns zero results.

## Phase 6 - Platform Field Packs

- [x] `/shopee <kata>` search + show field pack.
- [x] `/tiktok <kata>` search + show field pack.
- [x] Field long text split into parts.
- [x] Risk/warning shown clearly.
- [x] `INTERNAL_ONLY` and `BLOCKED` produce metadata with `purpose: METADATA_ONLY`.

## Phase 7 - Vercel Deploy

- [ ] Confirm Vercel deployment is active.
- [ ] Set Vercel env vars.
- [ ] Test `/api/health` returns `200`.
- [ ] Run `npm run set:webhook` with production `VERCEL_PUBLIC_URL`.
- [ ] Test Telegram production bot.

Current blocker: do not set production webhook while `/api/health` returns `404`.

## Phase 8 - Validation

Use input:

```text
Sembelih badik baja per kayu jati pb 25-26 lb 35 tb 16 stok 12 pcs 120.000
```

Expected:

- [x] Deterministic smoke parses modal `120000`.
- [x] Deterministic smoke parses stock `12`.
- [x] Deterministic smoke extracts material `baja per`.
- [x] Deterministic smoke extracts handle `kayu jati`.
- [x] Deterministic smoke extracts PB/LB/TB with PB/TB `cm` and LB `mm`.
- [x] Store title uses neutral alias and excludes sensitive supplier terms.
- [x] `Copy Spek Foto` includes value-only and label+value fields.
- [x] Compliance is `INTERNAL_ONLY` or stricter for risky wording.
- [ ] Manual Telegram `/new` saves row in Supabase after latest sanitizer changes.
- [ ] Manual Telegram `/new` with missing fields asks for `lanjut` or `skip`, then saves manual values into the same draft.
- [ ] Manual Telegram `/new` with supplier photo and caption saves the photo attachment row.
- [ ] Manual Telegram `/detail` shows the attached supplier photo.
- [ ] Manual Telegram `/search kayu jati` finds it.
- [ ] Manual Telegram `/shopee kayu jati` shows metadata pack.

## Final Report Required from Codex

Codex should report:

1. Files created/changed.
2. Commands run.
3. Typecheck/lint/build results.
4. Metadata sanitizer smoke result.
5. Local dev instructions.
6. Webhook/Vercel blocker status.
7. Env variables needed.
8. Known limitations.
9. Next recommended task.
