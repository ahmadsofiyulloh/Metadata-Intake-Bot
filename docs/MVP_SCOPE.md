# MVP Scope

## In Scope

- Telegram backend-only bot
- `/start`
- `/new`
- `/search`
- `/detail`
- `/shopee`
- `/tiktok`
- `/review`
- `/ready`
- `/archive`
- Gemini structured metadata generation
- Supabase persistence
- Local polling development
- Vercel webhook production
- Copyable Telegram output
- Neutral alias sanitizer for risky supplier wording
- Supplier photo attachment tied to drafts for audit context
- Photo-editing metadata copy fields in `image_metadata.spec_copy_fields`

## Out of Scope

- Frontend dashboard
- OCR
- image editing
- Marketplace API sync
- Delivery tracking
- WhatsApp automation
- Payment tracking
- Cron summary jobs

## Non-Negotiables

- Search should not depend on SKU.
- Long fields must be split.
- AI must not invent missing facts.
- Compliance must mark risky wording clearly.
- Risky products still produce metadata, but `INTERNAL_ONLY` and `BLOCKED` packs must be marked `METADATA_ONLY`.
- Store titles must not copy sensitive supplier terms directly.
- Use Supabase instead of SQLite on Vercel.
