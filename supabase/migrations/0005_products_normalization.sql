-- Normalize products: numeric price, slug, sort_order, category_id; drop legacy submissions

alter table public.products
  add column if not exists price_amount numeric(10,2),
  add column if not exists price_currency text not null default 'RUB',
  add column if not exists slug text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists category_id bigint references public.categories(id) on delete set null;

-- Backfill price_amount from legacy text column when possible
update public.products
set price_amount = nullif(regexp_replace(price, '[^0-9\.]', '', 'g'), '')::numeric
where price_amount is null and price is not null;

-- Ensure slug uniqueness where present
create unique index if not exists products_slug_key on public.products (slug) where slug is not null;
create index if not exists products_featured_available_idx on public.products (is_featured, is_available, sort_order);
create index if not exists products_category_idx on public.products (category_id);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- submissions table is unused by application code; no rows exist. Drop safely.
drop table if exists public.submissions;
;
