-- Structured content tables (categories, nav, features, socials)

create table if not exists public.categories (
  id bigserial primary key,
  slug text not null unique,
  name text not null,
  description text,
  icon_name text,
  sort_order integer not null default 0,
  show_on_home boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.categories enable row level security;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();
create index if not exists categories_active_sort_idx on public.categories (is_active, sort_order);

create table if not exists public.nav_items (
  id bigserial primary key,
  label text not null,
  href text not null,
  sort_order integer not null default 0,
  target text not null default '_self' check (target in ('_self','_blank')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.nav_items enable row level security;
create trigger nav_items_set_updated_at
  before update on public.nav_items
  for each row execute function public.set_updated_at();
create index if not exists nav_items_active_sort_idx on public.nav_items (is_active, sort_order);

create table if not exists public.features (
  id bigserial primary key,
  icon_name text not null default 'Sparkles',
  title text not null,
  description text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.features enable row level security;
create trigger features_set_updated_at
  before update on public.features
  for each row execute function public.set_updated_at();
create index if not exists features_active_sort_idx on public.features (is_active, sort_order);

create table if not exists public.social_links (
  id bigserial primary key,
  platform text not null,
  url text not null,
  icon_name text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.social_links enable row level security;
create trigger social_links_set_updated_at
  before update on public.social_links
  for each row execute function public.set_updated_at();
create index if not exists social_links_active_sort_idx on public.social_links (is_active, sort_order);
;
