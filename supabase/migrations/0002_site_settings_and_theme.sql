-- Singleton tables for global site configuration

create table if not exists public.site_settings (
  id smallint primary key default 1 check (id = 1),
  site_name text not null default 'ФЛОРМАЖОР',
  site_description text not null default '',
  meta_keywords text[] not null default '{}',
  og_image_url text,
  canonical_url text not null default 'https://flormajor-omsk.ru',
  theme_color text not null default '#c89f9f',
  enable_analytics boolean not null default true,
  maintenance_mode boolean not null default false,
  json_ld_override jsonb,
  rating_value numeric(3,2),
  review_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

create table if not exists public.contact_info (
  id smallint primary key default 1 check (id = 1),
  phone_primary text not null default '',
  phone_secondary text,
  email text,
  address text not null default '',
  working_hours text not null default 'Круглосуточно',
  whatsapp text,
  telegram text,
  geo_lat numeric(10,6),
  geo_lng numeric(10,6),
  postal_code text,
  address_region text,
  address_locality text,
  address_country text default 'RU',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.contact_info enable row level security;
create trigger contact_info_set_updated_at
  before update on public.contact_info
  for each row execute function public.set_updated_at();

create table if not exists public.theme_settings (
  id smallint primary key default 1 check (id = 1),
  primary_color text not null default '#c89f9f',
  primary_dark text not null default '#a87f7f',
  accent_color text not null default '#f5e6e0',
  background_color text not null default '#ffffff',
  foreground_color text not null default '#1e1e1e',
  font_heading text not null default 'Cormorant Garamond',
  font_body text not null default 'Montserrat',
  border_radius text not null default '0.75rem',
  custom_css text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.theme_settings enable row level security;
create trigger theme_settings_set_updated_at
  before update on public.theme_settings
  for each row execute function public.set_updated_at();

create table if not exists public.footer_config (
  id smallint primary key default 1 check (id = 1),
  brand_display text not null default 'ФЛОРМАЖОР',
  tagline text not null default '',
  copyright_template text not null default '© {year} ФЛОРМАЖОР. Все права защищены.',
  background_color text not null default '#1e1e1e',
  text_color text not null default '#f5f5f5',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.footer_config enable row level security;
create trigger footer_config_set_updated_at
  before update on public.footer_config
  for each row execute function public.set_updated_at();

-- Ensure singleton rows exist
insert into public.site_settings (id) values (1) on conflict (id) do nothing;
insert into public.contact_info (id) values (1) on conflict (id) do nothing;
insert into public.theme_settings (id) values (1) on conflict (id) do nothing;
insert into public.footer_config (id) values (1) on conflict (id) do nothing;
;
