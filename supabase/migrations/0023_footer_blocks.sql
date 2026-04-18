-- 0023_footer_blocks
-- Футер поглощает соцсети: блоки-тогглы + порядок блоков.

alter table public.footer_config
  add column if not exists show_brand boolean not null default true,
  add column if not exists show_contacts boolean not null default true,
  add column if not exists show_socials boolean not null default true,
  add column if not exists block_order text[] not null default array['brand','contacts','socials']::text[];
