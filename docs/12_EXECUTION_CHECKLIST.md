# Execution Checklist

## Phase 0 — Repo Bootstrap

- [ ] Create Node.js + TypeScript project.
- [ ] Add package scripts.
- [ ] Add `.env.example`.
- [ ] Add Vercel API route.
- [ ] Add local polling script.
- [ ] Add docs in `docs/`.

## Phase 1 — Supabase

- [ ] Create Supabase project.
- [ ] Run migration SQL.
- [ ] Add `SUPABASE_URL` to env.
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` to env.
- [ ] Test insert into `bot_events`.

## Phase 2 — Telegram Basics

- [ ] Create dev bot via BotFather.
- [ ] Add `TELEGRAM_BOT_TOKEN` local.
- [ ] Implement Telegram sendMessage.
- [ ] Implement `/start`.
- [ ] Run `npm run dev:polling`.
- [ ] Confirm bot replies to `/start`.

## Phase 3 — Metadata Generation

- [ ] Add Gemini API key.
- [ ] Implement structured output schema.
- [ ] Implement `test:gemini`.
- [ ] Test sample seller description.
- [ ] Validate output JSON.
- [ ] Add compliance guard.
- [ ] Add SKU generator.

## Phase 4 — `/new` Flow

- [ ] `/new` sets user session.
- [ ] Next text is processed as raw seller text.
- [ ] Metadata saved to `product_drafts`.
- [ ] Metadata version v1 saved.
- [ ] Bot returns copyable per-field output.

## Phase 5 — Search and Detail

- [ ] Build `searchable_text`.
- [ ] `/search <kata>` returns result list.
- [ ] `/detail <short_code>` returns detail.
- [ ] Search works with raw supplier terms.
- [ ] Search works with normalized store name.

## Phase 6 — Platform Field Packs

- [ ] `/shopee <kata>` search + show field pack.
- [ ] `/tiktok <kata>` search + show field pack.
- [ ] Field long text split into parts.
- [ ] Risk/warning shown clearly.

## Phase 7 — Vercel Deploy

- [ ] Push repo to GitHub.
- [ ] Import to Vercel.
- [ ] Set env vars.
- [ ] Deploy.
- [ ] Test `/api/health`.
- [ ] Run `npm run set:webhook` with Vercel URL.
- [ ] Test Telegram production bot.

## Phase 8 — Validation

Use input:

```text
Sembelih badik baja per kayu jati pb 25-26 lb 35 tb 4 ml stok 12 pcs 120.000
```

Expected:

- [ ] Bot parses modal `120000`.
- [ ] Bot parses stock `12`.
- [ ] Bot extracts material `baja per`.
- [ ] Bot extracts handle `kayu jati`.
- [ ] Bot extracts PB/LB/TB.
- [ ] Bot creates normalized name.
- [ ] Bot creates SKU.
- [ ] Bot sets compliance to `NEED_REVIEW` or stricter.
- [ ] Bot lists missing fields.
- [ ] Bot saves row in Supabase.
- [ ] `/search kayu jati` finds it.
- [ ] `/shopee kayu jati` shows field pack.

## Final Report Required from Codex

Codex must report:

1. Files created/changed.
2. Commands run.
3. Typecheck/lint results.
4. Local dev instructions.
5. Vercel deploy instructions.
6. Env variables needed.
7. SQL migration path.
8. Known limitations.
9. Next recommended task.
