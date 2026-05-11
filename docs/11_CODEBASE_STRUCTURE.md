# Codebase Structure

## Current Repo

```text
metadata-intake-bot/
|-- api/
|   |-- telegram/webhook.ts
|   `-- health.ts
|-- scripts/
|   |-- dev-polling.ts
|   |-- set-webhook.ts
|   |-- delete-webhook.ts
|   |-- test-gemini.ts
|   `-- test-metadata-sanitizer.ts
|-- src/
|   |-- bot/
|   |   |-- http.ts
|   |   |-- handleUpdate.ts
|   |   |-- commands/
|   |   `-- formatters/
|   |-- metadata/
|   |   |-- generateMetadata.ts
|   |   |-- metadataSchema.ts
|   |   |-- normalizeSellerText.ts
|   |   |-- catalogSanitizer.ts
|   |   |-- priceEstimator.ts
|   |   |-- complianceGuard.ts
|   |   |-- skuGenerator.ts
|   |   `-- searchText.ts
|   |-- db/
|   |-- config/
|   `-- types/
|-- supabase/migrations/001_initial_schema.sql
|-- docs/
|-- package.json
|-- tsconfig.json
|-- vercel.json
|-- .env.example
`-- README.md
```

## Important Files

### `src/bot/http.ts`

Telegram HTTP transport helper.

Do not rename this file to a Telegram-specific client filename without checking local security tooling. The current name is intentional.

### `src/metadata/generateMetadata.ts`

Builds the Gemini request, parses JSON, merges AI with heuristic extraction, and returns generated metadata.

### `src/metadata/catalogSanitizer.ts`

Final deterministic cleanup for generated metadata:

- Neutral category aliases.
- Sensitive title/keyword/description cleanup.
- Duplicate phrase cleanup.
- Dimension normalization.
- `image_metadata.spec_copy_fields`.

### `src/metadata/complianceGuard.ts`

Refines compliance status and builds platform packs. It does not delete metadata for `INTERNAL_ONLY` or `BLOCKED`; those packs are marked `METADATA_ONLY`.

### `src/bot/formatters/metadataMessage.ts`

Formats Telegram HTML messages and includes `Copy Spek Foto` blocks, estimated selling price output, and raw supplier-text audit chunks.

### `src/db/supplierPhotosRepo.ts`

Persists and loads the supplier photo attachment linked to a draft.

### `src/types/intake.ts`

Shared types for the `/new` intake flow and supplier photo attachment payload.

## Package Scripts

```json
{
  "scripts": {
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
}
```

## Dependencies

Runtime dependencies:

```text
@supabase/supabase-js
zod
```

Dev dependencies include `tsx`, `typescript`, `eslint`, `supabase`, and `vercel`.

Gemini is called directly with `fetch`; the repo does not currently use `@google/genai` or `dotenv`.

## Env Validation

Env validation lives in `src/config/env.ts`.

Required for runtime:

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
VERCEL_PUBLIC_URL
VERCEL_URL
```
