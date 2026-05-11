# PRD Final - Metadata Intake Bot

## Product

Metadata Intake Bot is a backend-only Telegram bot that turns messy seller/supplier text into structured product metadata for internal cataloging, photo-editing copy, and marketplace draft preparation.

## Problem

Supplier text is often short, vulgar, incomplete, and inconsistent:

```text
Sembelih badik baja per kayu jati pb 25-26 lb 35 tb 16 stok 12 pcs 120.000
```

The user needs:

- clean store product names
- generated SKU
- supplier price and stock stored
- copyable spec fields
- neutral photo-editing metadata
- searchable history
- clear risk/compliance status

## MVP Goal

The MVP must:

1. Accept seller text through Telegram.
2. Store raw seller text unchanged.
3. Extract explicit data and mark missing data.
4. Generate sanitized store metadata.
5. Use neutral aliases for sensitive supplier terms.
6. Generate SKU.
7. Generate image metadata with `spec_copy_fields`.
8. Generate Shopee/TikTok metadata packs with `purpose`.
9. Persist everything in Supabase.
10. Return copyable fields in Telegram.

## Scope

In scope:

- Telegram backend-only bot.
- Local polling.
- Vercel webhook path.
- Supabase persistence.
- Gemini structured metadata generation.
- Compliance guard and catalog sanitizer.
- Supplier photo attachment for audit context.
- Search by seller text, normalized title, material, keyword, series, and supplier.

Out of scope:

- frontend dashboard
- OCR
- image editing
- marketplace sync
- WhatsApp automation
- delivery tracking
- supplier payment automation

## Title Rule

Format:

```text
[STORE NAME UPPERCASE] | [SERIES] [SANITIZED STORE NAME] - [NEUTRAL KEYWORD]
```

Example:

```text
LANDEP SMITH | WIRA SERIES Perkakas Handcraft Baja Per Kayu Jati PB 25-26 cm TB 16 cm - Perkakas Handcraft
```

Sensitive supplier terms must not appear in generated store titles.

## Photo Metadata Rule

Specs used for image editing must include value-only and label+value fields.

Example:

```text
16 cm
Tinggi Bilah 16 cm
```

## Success Criteria

- `/new` creates a stored draft.
- `/search kayu jati` can find the row.
- `/detail <short_code>` shows sanitized metadata and `Copy Spek Foto`.
- `/shopee` and `/tiktok` return platform packs.
- `INTERNAL_ONLY` and `BLOCKED` still return sanitized metadata with `purpose: METADATA_ONLY`.
- Typecheck, lint, build, and metadata smoke test pass.
