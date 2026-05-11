create extension if not exists "pgcrypto";

create sequence if not exists public.product_short_code_seq start with 1;
create sequence if not exists public.product_sku_seq start with 1;

create or replace function public.next_short_code()
returns text
language sql
set search_path = ''
as $$
  select 'LSM-' || lpad((nextval('public.product_short_code_seq') - 1)::text, 4, '0');
$$;

create or replace function public.next_sku_sequence()
returns integer
language sql
set search_path = ''
as $$
  select nextval('public.product_sku_seq')::int;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.product_drafts (
  id uuid primary key default gen_random_uuid(),
  short_code text unique not null default public.next_short_code(),
  sku_internal text unique,
  store_name text not null,
  store_code text not null,
  raw_seller_text text not null,
  supplier_name text,
  supplier_product_name text,
  normalized_store_name text,
  generated_series text,
  category_context text,
  product_type text,
  title_internal text,
  title_shopee text,
  title_tiktok text,
  supplier_price numeric,
  supplier_stock integer,
  specs_json jsonb not null default '{}'::jsonb,
  missing_fields_json jsonb not null default '[]'::jsonb,
  sensitive_terms_json jsonb not null default '[]'::jsonb,
  keywords_json jsonb not null default '{}'::jsonb,
  image_metadata_json jsonb not null default '{}'::jsonb,
  shopee_field_pack_json jsonb not null default '{}'::jsonb,
  tiktok_field_pack_json jsonb not null default '{}'::jsonb,
  data_status text not null default 'DRAFT',
  compliance_status text not null default 'NEED_REVIEW',
  review_notes text,
  searchable_text text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_drafts_data_status_check
    check (data_status in ('DRAFT', 'DATA_SEBAGIAN', 'READY', 'ARCHIVED', 'INPUTTED_SHOPEE', 'INPUTTED_TIKTOK')),
  constraint product_drafts_compliance_status_check
    check (compliance_status in ('SAFE_TO_DRAFT', 'NEED_REVIEW', 'INTERNAL_ONLY', 'BLOCKED'))
);

create index if not exists idx_product_drafts_searchable_text
  on public.product_drafts using gin (to_tsvector('simple', coalesce(searchable_text, '')));

create index if not exists idx_product_drafts_raw_seller_text
  on public.product_drafts using gin (to_tsvector('simple', coalesce(raw_seller_text, '')));

create index if not exists idx_product_drafts_normalized_store_name
  on public.product_drafts using gin (to_tsvector('simple', coalesce(normalized_store_name, '')));

create index if not exists idx_product_drafts_title_internal
  on public.product_drafts using gin (to_tsvector('simple', coalesce(title_internal, '')));

create index if not exists idx_product_drafts_status
  on public.product_drafts (data_status, compliance_status, archived_at);

create index if not exists idx_product_drafts_created_at
  on public.product_drafts (created_at desc);

create table if not exists public.metadata_versions (
  id uuid primary key default gen_random_uuid(),
  product_draft_id uuid not null references public.product_drafts(id) on delete cascade,
  version_number integer not null,
  reason text,
  payload_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (product_draft_id, version_number)
);

create index if not exists idx_metadata_versions_product_draft_id
  on public.metadata_versions (product_draft_id, version_number desc);

create table if not exists public.bot_events (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id text,
  telegram_chat_id text,
  event_type text not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_bot_events_created_at
  on public.bot_events (created_at desc);

create index if not exists idx_bot_events_event_type
  on public.bot_events (event_type, created_at desc);

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id text not null,
  telegram_chat_id text not null,
  mode text not null,
  payload_json jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (telegram_user_id, telegram_chat_id),
  constraint user_sessions_mode_check
    check (mode in ('idle', 'awaiting_raw_seller_text'))
);

create index if not exists idx_user_sessions_expires_at
  on public.user_sessions (expires_at);

drop trigger if exists trg_product_drafts_updated_at on public.product_drafts;
create trigger trg_product_drafts_updated_at
before update on public.product_drafts
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_sessions_updated_at on public.user_sessions;
create trigger trg_user_sessions_updated_at
before update on public.user_sessions
for each row execute function public.set_updated_at();

alter table public.product_drafts enable row level security;
alter table public.metadata_versions enable row level security;
alter table public.bot_events enable row level security;
alter table public.user_sessions enable row level security;

grant execute on function public.next_short_code() to anon, authenticated, service_role;
grant execute on function public.next_sku_sequence() to anon, authenticated, service_role;

notify pgrst, 'reload schema';
