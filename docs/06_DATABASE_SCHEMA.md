# Database Schema — Supabase MVP

## Migration File

Path target:

```text
supabase/migrations/001_initial_schema.sql
```

## SQL Schema

```sql
create extension if not exists "pgcrypto";

create table if not exists product_drafts (
  id uuid primary key default gen_random_uuid(),
  short_code text unique not null,
  sku_internal text unique,
  store_name text not null,
  store_code text not null,

  raw_seller_text text not null,
  supplier_name text,
  supplier_product_name text,
  normalized_store_name text,
  generated_series text,
  title_internal text,
  title_shopee text,
  title_tiktok text,

  supplier_price numeric,
  supplier_stock integer,

  specs_json jsonb default '{}'::jsonb,
  missing_fields_json jsonb default '[]'::jsonb,
  sensitive_terms_json jsonb default '[]'::jsonb,
  keywords_json jsonb default '{}'::jsonb,

  image_metadata_json jsonb default '{}'::jsonb,
  shopee_field_pack_json jsonb default '{}'::jsonb,
  tiktok_field_pack_json jsonb default '{}'::jsonb,

  data_status text not null default 'DRAFT',
  compliance_status text not null default 'NEED_REVIEW',
  review_notes text,

  searchable_text text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_product_drafts_searchable_text
on product_drafts using gin (to_tsvector('simple', coalesce(searchable_text, '')));

create index if not exists idx_product_drafts_raw_seller_text
on product_drafts using gin (to_tsvector('simple', coalesce(raw_seller_text, '')));

create index if not exists idx_product_drafts_normalized_store_name
on product_drafts using gin (to_tsvector('simple', coalesce(normalized_store_name, '')));

create index if not exists idx_product_drafts_status
on product_drafts (data_status, compliance_status, archived_at);

create table if not exists metadata_versions (
  id uuid primary key default gen_random_uuid(),
  product_draft_id uuid not null references product_drafts(id) on delete cascade,
  version_number integer not null,
  reason text,
  payload_json jsonb not null,
  created_at timestamptz not null default now(),
  unique(product_draft_id, version_number)
);

create table if not exists bot_events (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id text,
  telegram_chat_id text,
  event_type text not null,
  payload_json jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists user_sessions (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id text not null,
  telegram_chat_id text not null,
  mode text not null,
  payload_json jsonb default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(telegram_user_id, telegram_chat_id)
);
```

## Table Notes

### `product_drafts`

Main source of truth untuk metadata produk.

Key fields:

- `raw_seller_text`: teks asli dari seller.
- `supplier_product_name`: nama produk versi supplier yang dibaca AI.
- `normalized_store_name`: nama produk versi toko.
- `title_internal`: title utama toko.
- `title_shopee`: candidate title Shopee.
- `title_tiktok`: candidate title TikTok.
- `searchable_text`: gabungan text untuk search.
- `data_status`: DRAFT, DATA_SEBAGIAN, READY, INPUTTED, ARCHIVED.
- `compliance_status`: SAFE_TO_DRAFT, NEED_REVIEW, INTERNAL_ONLY, BLOCKED.

### `metadata_versions`

Simpan versi hasil generation agar revisi tidak menghilangkan jejak.

### `bot_events`

Log event bot untuk debug.

### `user_sessions`

State sederhana untuk flow `/new`.

## Search Strategy

Search tidak berbasis SKU. Query harus memeriksa:

- `raw_seller_text`
- `supplier_product_name`
- `normalized_store_name`
- `title_internal`
- `searchable_text`

Implementasi awal bisa memakai `ilike` sederhana untuk MVP, lalu ditingkatkan ke full-text search.

## Short Code Strategy

Gunakan `short_code` seperti:

```text
P-1001
P-1002
P-1003
```

Short code dipakai untuk detail dan callback, bukan sebagai search utama.

## SKU Strategy

SKU tetap disimpan untuk field seller dan internal identity.

Format:

```text
[STORE_CODE]-[SERIES_CODE]-[CATEGORY_CODE]-[MATERIAL_CODE]-[ATTRIBUTE_CODE]-[SEQ]
```

Contoh:

```text
LDS-WRA-BP-JTI-PB25-TB4-001
```
