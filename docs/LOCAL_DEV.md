# Local Dev

## Recommended Mode

Use polling during daily development.

## Commands

```bash
npm install
npm run test:metadata
npm run test:gemini
npm run dev:polling
```

The local script commands load `.env` automatically via `tsx --env-file=.env`.

## Important Rule

Telegram does not allow the same bot token to use polling and webhook at the same time.

If you reuse the same token, delete the webhook first:

```bash
npm run delete:webhook
```

## Polling Flow

```text
Telegram getUpdates -> scripts/dev-polling.ts -> src/bot/handleUpdate.ts -> Supabase/Gemini -> sendMessage
```

## Sample Test Input

```text
Sembelih badik baja per kayu jati pb 25-26 lb 35 tb 16 stok 12 pcs 120.000
```

## Expected Result

- Modal supplier parsed as `120000`
- Stok parsed as `12`
- PB/TB default to `cm`; LB defaults to `mm`
- Store title uses a neutral alias and excludes sensitive supplier terms
- `Copy Spek Foto` includes `16 cm` and `Tinggi Bilah 16 cm`
- Compliance should not be `SAFE_TO_DRAFT`
- Platform pack purpose should be `METADATA_ONLY` for `INTERNAL_ONLY` or `BLOCKED`
- Search by `kayu jati` should find the row
- Shopee field pack should be copyable
