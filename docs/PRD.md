# Product Requirements

## Product

Metadata Intake Bot is a backend-only Telegram bot that turns messy seller descriptions into structured product metadata.

## MVP Goal

The MVP primarily processes text descriptions from sellers or suppliers, and it can also attach supplier photos to drafts for audit context. It does not do image OCR, photo editing, marketplace sync, WhatsApp automation, delivery tracking, or any frontend dashboard.

## Core Flow

1. User sends `/new`.
2. Bot waits for seller text or a supplier photo tied to the same draft.
3. Gemini generates structured metadata.
4. Compliance guard and catalog sanitizer adjust wording, risk status, and neutral aliases.
5. Data is stored in Supabase.
6. Bot returns copyable field-by-field output in Telegram.
7. If some fields are still empty, bot asks for confirmation and can fill them one by one in the same draft.

## Primary Navigation

- Reply keyboard utama menampilkan: `Input Baru`, `Cari`, `Review`, `Siap Pakai`, `Bantuan`
- Inline keyboard dipakai untuk aksi kontekstual seperti `Detail`, `Shopee`, `TikTok`, `Arsipkan`, `Lanjut`, `Skip`, dan `Menu Utama`

## Supported Commands

- `/start`
- `/new`
- `/search <keyword>`
- `/detail <short_code>`
- `/shopee <keyword>`
- `/tiktok <keyword>`
- `/review`
- `/ready`
- `/archive <short_code>`

## Output Rules

- Use `Label:` followed by `<code>value</code>`.
- Do not depend on inline keyboard copy buttons for copying values.
- Split long fields into numbered parts.
- Keep raw supplier text for audit, but sanitize store names, titles, keywords, descriptions, and image metadata.
- For photo editing, return spec copy fields with value-only and label+value variants.
- `INTERNAL_ONLY` and `BLOCKED` outputs are metadata-only, not publish approval.

## Success Criteria

- `/new` can capture raw seller text and create metadata.
- `/new` can continue into a manual fill step for missing fields.
- `/search` can find rows by supplier text, normalized name, title, keywords, and material context.
- `/shopee` and `/tiktok` return platform-specific field packs.
- Sensitive supplier terms do not appear in generated store titles.
- `Copy Spek Foto` includes values such as `16 cm` and `Tinggi Bilah 16 cm`.
- Data persists in Supabase.
- The bot works both in local polling mode and Vercel webhook mode.
