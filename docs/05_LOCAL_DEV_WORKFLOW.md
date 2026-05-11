# Local Development Workflow

## Goal

Use polling for daily development and webhook only after Vercel is reachable.

## Recommended Mode: Polling

```text
Telegram dev bot
  -> getUpdates polling
scripts/dev-polling.ts
  -> src/bot/handleUpdate.ts
  -> Gemini + Supabase
  -> Telegram sendMessage
```

Run:

```bash
npm install
npm run delete:webhook
npm run dev:polling
```

Why polling first:

- No tunnel required.
- No deploy required.
- Fastest path for testing `/new`, `/search`, `/detail`, `/shopee`, `/tiktok`, `/review`, `/ready`, and `/archive`.

## Local Checks

Run before Telegram manual QA:

```bash
npm run typecheck
npm run lint
npm run build
npm run test:metadata
npm run test:gemini
```

`test:metadata` does not call Gemini or Supabase. It verifies neutral aliases, sensitive title cleanup, metadata-only pack behavior, and `spec_copy_fields`.

`test:gemini` calls Gemini and should show `aiUsed=true` when the API key is valid.

## Manual Telegram QA

Test commands:

```text
/start
/new
/search kayu jati
/detail <short_code>
/shopee <short_code>
/tiktok <short_code>
/review
/ready
/archive <short_code>
```

Test input:

```text
Sembelih badik baja per kayu jati pb 25-26 lb 35 tb 16 stok 12 pcs 120.000
```

Expected:

- Modal parsed as `120000`.
- Stock parsed as `12`.
- Material parsed as `baja per`.
- Handle parsed as `kayu jati`.
- `PB` and `TB` default to `cm`; `LB` defaults to `mm`.
- Store title does not contain sensitive supplier terms.
- Platform pack purpose is `METADATA_ONLY` if compliance is `INTERNAL_ONLY` or `BLOCKED`.
- `Copy Spek Foto` includes both value-only and label+value text, for example `16 cm` and `Tinggi Bilah 16 cm`.

## Webhook Mode

Use webhook only when `/api/health` is valid on the target Vercel URL.

```bash
npm run set:webhook
```

Do not keep webhook and polling active on the same bot token.
