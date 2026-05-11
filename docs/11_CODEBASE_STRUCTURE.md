# Codebase Structure

## Target Repo

```text
metadata-intake-bot/
├─ api/
│  ├─ telegram/
│  │  └─ webhook.ts
│  └─ health.ts
├─ scripts/
│  ├─ dev-polling.ts
│  ├─ set-webhook.ts
│  ├─ delete-webhook.ts
│  └─ test-gemini.ts
├─ src/
│  ├─ bot/
│  │  ├─ handleUpdate.ts
│  │  ├─ commands/
│  │  │  ├─ start.ts
│  │  │  ├─ new.ts
│  │  │  ├─ search.ts
│  │  │  ├─ detail.ts
│  │  │  ├─ shopee.ts
│  │  │  ├─ tiktok.ts
│  │  │  ├─ review.ts
│  │  │  ├─ ready.ts
│  │  │  └─ archive.ts
│  │  ├─ formatters/
│  │  │  ├─ telegramHtml.ts
│  │  │  ├─ metadataMessage.ts
│  │  │  └─ fieldChunks.ts
│  │  └─ telegramClient.ts
│  ├─ metadata/
│  │  ├─ generateMetadata.ts
│  │  ├─ metadataSchema.ts
│  │  ├─ normalizeSellerText.ts
│  │  ├─ skuGenerator.ts
│  │  ├─ complianceGuard.ts
│  │  └─ searchText.ts
│  ├─ db/
│  │  ├─ supabase.ts
│  │  ├─ productDraftsRepo.ts
│  │  ├─ versionsRepo.ts
│  │  └─ sessionsRepo.ts
│  ├─ config/
│  │  └─ env.ts
│  └─ types/
│     └─ metadata.ts
├─ supabase/
│  └─ migrations/
│     └─ 001_initial_schema.sql
├─ docs/
│  ├─ PRD.md
│  ├─ HANDOFF.md
│  ├─ LOCAL_DEV.md
│  └─ MVP_SCOPE.md
├─ package.json
├─ tsconfig.json
├─ vercel.json
├─ .env.example
└─ README.md
```

## Core Files

### `api/telegram/webhook.ts`

Vercel webhook endpoint.

Responsibilities:

- Accept POST request.
- Validate secret token if configured.
- Parse Telegram update.
- Call `handleUpdate(update)`.
- Return HTTP 200.

### `scripts/dev-polling.ts`

Local polling runner.

Responsibilities:

- Delete webhook warning or instruct user.
- Poll `getUpdates`.
- Pass each update to `handleUpdate`.
- Store offset.
- Log errors safely.

### `src/bot/handleUpdate.ts`

Main update router.

Responsibilities:

- Parse message text.
- Detect command.
- Detect active session after `/new`.
- Route to command handlers.
- Send response via Telegram client.

### `src/metadata/generateMetadata.ts`

Gemini integration.

Responsibilities:

- Build system prompt.
- Build schema.
- Call Gemini.
- Validate JSON.
- Return typed metadata draft.

### `src/metadata/complianceGuard.ts`

Final guard after Gemini output.

Responsibilities:

- Detect sensitive/risk terms.
- Adjust compliance status.
- Add review notes.
- Lock platform fields if needed.

### `src/metadata/skuGenerator.ts`

Generate SKU from store code + metadata.

### `src/metadata/searchText.ts`

Build searchable text from raw supplier text + normalized name + title + keywords + specs.

### `src/bot/formatters/metadataMessage.ts`

Format Telegram messages:

```text
Label:
<code>value</code>
```

Use HTML parse mode or MarkdownV2 with proper escaping.

Recommendation: use HTML parse mode because `<code>` is simple to escape.

## Package Scripts

```json
{
  "scripts": {
    "dev": "vercel dev",
    "dev:polling": "tsx scripts/dev-polling.ts",
    "build": "tsc --noEmit",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "set:webhook": "tsx scripts/set-webhook.ts",
    "delete:webhook": "tsx scripts/delete-webhook.ts",
    "test:gemini": "tsx scripts/test-gemini.ts"
  }
}
```

## Dependencies Suggestion

```text
@google/genai
@supabase/supabase-js
zod
dotenv
tsx
typescript
```

Telegram API can be called directly with `fetch` for MVP, or use a lightweight bot library. Direct fetch keeps Vercel/webhook simple.

## Env Validation

Use `zod` to validate env in `src/config/env.ts`.

Required:

```text
TELEGRAM_BOT_TOKEN
GEMINI_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STORE_NAME
STORE_CODE
```

Optional:

```text
TELEGRAM_WEBHOOK_SECRET
GEMINI_MODEL
DEFAULT_LANGUAGE
NODE_ENV
```
