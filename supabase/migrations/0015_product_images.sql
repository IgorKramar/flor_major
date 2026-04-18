-- 0015_product_images
-- Отдельная таблица для мульти-фото товаров.
-- products.image_url остаётся как deprecated-зеркало первой картинки (поддерживается триггером).

create table if not exists public.product_images (
  id bigserial primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  url text not null,
  alt text,
  sort_order int not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_images_product_id_sort_idx
  on public.product_images (product_id, sort_order);

-- Только одна "главная" картинка у товара.
create unique index if not exists product_images_one_primary_per_product
  on public.product_images (product_id)
  where is_primary;

alter table public.product_images enable row level security;

drop policy if exists "product_images read all" on public.product_images;
create policy "product_images read all"
  on public.product_images
  for select
  using (true);

drop policy if exists "product_images admin write" on public.product_images;
create policy "product_images admin write"
  on public.product_images
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Универсальный apply-updated-at если ещё нет.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists product_images_set_updated_at on public.product_images;
create trigger product_images_set_updated_at
  before update on public.product_images
  for each row execute function public.set_updated_at();

-- Аудит.
drop trigger if exists product_images_audit on public.product_images;
create trigger product_images_audit
  after insert or update or delete on public.product_images
  for each row execute function public.log_changes();

-- Зеркалируем первую картинку обратно в products.image_url, чтобы старый код работал.
create or replace function public.sync_product_image_url()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pid bigint;
  primary_url text;
begin
  if (tg_op = 'DELETE') then
    pid := old.product_id;
  else
    pid := new.product_id;
  end if;

  select url
    into primary_url
  from public.product_images
  where product_id = pid
  order by is_primary desc, sort_order asc, id asc
  limit 1;

  update public.products
     set image_url = primary_url,
         updated_at = now()
   where id = pid
     and (image_url is distinct from primary_url);

  return coalesce(new, old);
end;
$$;

drop trigger if exists product_images_sync_url on public.product_images;
create trigger product_images_sync_url
  after insert or update or delete on public.product_images
  for each row execute function public.sync_product_image_url();

-- Бэкфилл: для каждого существующего products.image_url создаём запись-первичную картинку.
insert into public.product_images (product_id, url, sort_order, is_primary)
select p.id, p.image_url, 0, true
from public.products p
where p.image_url is not null
  and p.image_url <> ''
  and not exists (
    select 1 from public.product_images pi where pi.product_id = p.id
  );
