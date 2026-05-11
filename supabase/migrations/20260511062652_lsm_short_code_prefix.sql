alter sequence public.product_short_code_seq restart with 1;

create or replace function public.next_short_code()
returns text
language sql
set search_path = ''
as $$
  select 'LSM-' || lpad((nextval('public.product_short_code_seq') - 1)::text, 4, '0');
$$;
