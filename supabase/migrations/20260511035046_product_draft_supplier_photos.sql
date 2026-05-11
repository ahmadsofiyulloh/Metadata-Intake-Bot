create table if not exists public.product_draft_supplier_photos (
  id uuid primary key default gen_random_uuid(),
  product_draft_id uuid not null unique references public.product_drafts(id) on delete cascade,
  telegram_chat_id text not null,
  telegram_user_id text,
  telegram_message_id bigint not null,
  telegram_file_id text not null,
  telegram_file_unique_id text not null,
  telegram_file_size integer,
  telegram_width integer,
  telegram_height integer,
  telegram_caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_product_draft_supplier_photos_created_at
  on public.product_draft_supplier_photos (created_at desc);

drop trigger if exists trg_product_draft_supplier_photos_updated_at on public.product_draft_supplier_photos;
create trigger trg_product_draft_supplier_photos_updated_at
before update on public.product_draft_supplier_photos
for each row execute function public.set_updated_at();

alter table public.product_draft_supplier_photos enable row level security;

notify pgrst, 'reload schema';
