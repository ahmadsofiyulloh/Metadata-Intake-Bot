# MVP Scope Lock

Read this before coding. Keep the project backend-only. Support supplier photo attachments for audit context, but do not add OCR or image editing.

## MVP Flow

```text
Seller text input
-> Generate metadata
-> Sanitize generated public metadata
-> Store raw + generated data in Supabase
-> Return copyable Telegram fields
-> Make data searchable later
```

## In Scope

1. Telegram backend-only bot.
2. `/new` product metadata intake.
3. Gemini structured output.
4. Heuristic extraction fallback.
5. Compliance guard.
6. Catalog sanitizer with neutral aliases.
7. Supabase persistence.
8. Local polling adapter.
9. Vercel webhook production path.
10. Search and detail commands.
11. Shopee/TikTok metadata packs.
12. `image_metadata.spec_copy_fields` for photo-editing copy.
13. Supplier photo attachment tied to `/new` drafts for audit context.

## Out of Scope

Do not build:

- frontend dashboard
- OCR
- image editing
- marketplace sync
- auto posting/listing
- scraping Seller Centre
- WhatsApp integration
- delivery tracking
- payment tracking
- cron summaries
- team/admin roles

## Non-Negotiable UX Rules

- Search must not depend on SKU.
- Do not send one giant metadata blob.
- Use copyable label/value output.
- Split long fields.
- Show compliance status and warning clearly.
- Show `Copy Spek Foto` fields when specs exist.

## Non-Negotiable AI and Sanitizer Rules

- AI must not invent facts.
- Explicit heuristic specs should win over conflicting AI specs.
- Raw seller text stays unchanged in storage.
- Public generated metadata must not copy sensitive supplier terms directly.
- Use neutral category aliases for title/name output.
- `INTERNAL_ONLY` and `BLOCKED` still return metadata with `purpose: METADATA_ONLY`.

## Non-Negotiable Infra Rules

- Use Supabase, not SQLite, for persistence.
- Use `.env` for local scripts.
- Never commit `.env` or tokens.
- Service role key is backend-only.
- Do not set webhook while polling is active on the same token.
