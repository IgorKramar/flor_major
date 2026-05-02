-- Init для self-hosted: таблицы которые в Supabase Cloud были созданы вне миграций
-- (через UI / начальный state). Без них 0004/0005/0006/0009 падают.

CREATE TABLE IF NOT EXISTS public.products (
  id bigserial PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  price text,
  description text,
  image_url text,
  badge text,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_featured boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT true,
  category text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hero_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  cta_text text NOT NULL DEFAULT '',
  cta_link text NOT NULL DEFAULT '',
  background_image text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leads (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL,
  message text,
  interest text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_config (
  id bigserial PRIMARY KEY,
  config_key text NOT NULL UNIQUE,
  config_value text
);
