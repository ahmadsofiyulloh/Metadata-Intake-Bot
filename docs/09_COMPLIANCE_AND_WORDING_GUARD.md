# Compliance and Wording Guard

## Purpose

Compliance guard is a metadata safety layer, not a platform bypass.

It must:

- Keep raw seller text unchanged for audit.
- Convert risky supplier wording into neutral catalog metadata.
- Prevent raw sensitive terms from entering store names, titles, keywords, descriptions, and image text.
- Mark risk clearly before marketplace publishing.
- Still produce internal metadata for `INTERNAL_ONLY` and `BLOCKED`.

## Compliance Status

```text
SAFE_TO_DRAFT
NEED_REVIEW
INTERNAL_ONLY
BLOCKED
```

## Platform Pack Purpose

```text
MARKETPLACE_DRAFT -> safe enough as draft metadata
REVIEW_REQUIRED   -> metadata exists but must be reviewed before publish
METADATA_ONLY     -> internal/photo-editing metadata only
```

`INTERNAL_ONLY` and `BLOCKED` must not be emptied automatically. They should return sanitized metadata with `purpose: METADATA_ONLY`.

## Sensitive Terms

Initial sensitive terms:

```text
senjata
senjata tajam
self defense
bela diri
tactical
combat
anti begal
mematikan
serang
badik
belati
golok
parang
pisau
pisau survival
survival weapon
sembelih
tebas
buru
```

Terms like `badik`, `golok`, `parang`, and `pisau` are not automatically deleted from raw supplier data, but they must be aliased in title/store metadata.

## Alias Strategy

Use category-neutral aliases:

```text
badik/belati/terms tradisional -> Perkakas Handcraft
parang/golok/outdoor context   -> Alat Outdoor
kebun context                  -> Alat Kebun
dapur/masak context            -> Alat Dapur
```

Remove action/aggressive terms:

```text
sembelih
tebas
senjata tajam
self defense
tactical
combat
anti begal
mematikan
```

## Implementation Rule

Final pass order:

1. Merge heuristic and Gemini output.
2. Preserve explicit heuristic specs when Gemini returns weaker or risky values.
3. Refine compliance status from raw seller text.
4. Sanitize generated metadata through `catalogSanitizer.ts`.
5. Build platform packs with `purpose`, `warning`, sanitized keywords, sanitized descriptions, title, and `spec_copy_fields`.
6. Store raw seller text unchanged.

## Do Not Do This

Do not output public metadata like:

```text
Senjata tajam untuk self defense
Pisau tactical combat anti begal
Sembelih kuat dan mematikan
```

Do not hide raw seller text from storage. The sanitized layer is for generated metadata only.
