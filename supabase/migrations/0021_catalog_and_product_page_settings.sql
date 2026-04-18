-- 0021_catalog_and_product_page_settings
-- Отдельные single-row таблицы для конфигурации публичных страниц каталога и товара.

create table if not exists public.catalog_page_settings (
  id smallint primary key default 1,
  heading text not null default 'Каталог товаров',
  subheading text not null default 'Все наши композиции в одном месте',
  search_placeholder text not null default 'Поиск по названию, описанию, категории…',
  filter_label text not null default 'Категории',
  sort_label text not null default 'Сортировка',
  sort_default_label text not null default 'Без сортировки',
  sort_asc_label text not null default 'Цена: по возрастанию',
  sort_desc_label text not null default 'Цена: по убыванию',
  empty_state_text text not null default 'Ничего не найдено. Попробуйте другой запрос или сбросьте фильтры.',
  cta_card_text text not null default 'Подробнее',
  show_breadcrumbs boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint catalog_page_settings_singleton_chk check (id = 1)
);

create table if not exists public.product_page_settings (
  id smallint primary key default 1,
  show_breadcrumbs boolean not null default true,
  show_category_meta boolean not null default true,
  cta_primary_text text not null default 'Заказать',
  cta_primary_link text not null default '/#contact',
  show_phone_cta boolean not null default true,
  show_similar_products boolean not null default false,
  similar_products_heading text not null default 'Похожие товары',
  similar_products_limit smallint not null default 4,
  updated_at timestamptz not null default now(),
  constraint product_page_settings_singleton_chk check (id = 1),
  constraint product_page_settings_similar_limit_chk check (similar_products_limit between 1 and 12)
);

alter table public.catalog_page_settings enable row level security;
alter table public.product_page_settings enable row level security;

drop policy if exists "catalog_page_settings read all" on public.catalog_page_settings;
create policy "catalog_page_settings read all"
  on public.catalog_page_settings
  for select
  using (true);

drop policy if exists "catalog_page_settings admin write" on public.catalog_page_settings;
create policy "catalog_page_settings admin write"
  on public.catalog_page_settings
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "product_page_settings read all" on public.product_page_settings;
create policy "product_page_settings read all"
  on public.product_page_settings
  for select
  using (true);

drop policy if exists "product_page_settings admin write" on public.product_page_settings;
create policy "product_page_settings admin write"
  on public.product_page_settings
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists catalog_page_settings_set_updated_at on public.catalog_page_settings;
create trigger catalog_page_settings_set_updated_at
  before update on public.catalog_page_settings
  for each row execute function public.set_updated_at();

drop trigger if exists product_page_settings_set_updated_at on public.product_page_settings;
create trigger product_page_settings_set_updated_at
  before update on public.product_page_settings
  for each row execute function public.set_updated_at();

drop trigger if exists catalog_page_settings_audit on public.catalog_page_settings;
create trigger catalog_page_settings_audit
  after insert or update or delete on public.catalog_page_settings
  for each row execute function public.log_changes();

drop trigger if exists product_page_settings_audit on public.product_page_settings;
create trigger product_page_settings_audit
  after insert or update or delete on public.product_page_settings
  for each row execute function public.log_changes();

insert into public.catalog_page_settings (id) values (1) on conflict (id) do nothing;
insert into public.product_page_settings (id) values (1) on conflict (id) do nothing;
