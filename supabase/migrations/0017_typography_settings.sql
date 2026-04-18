-- 0017_typography_settings
-- Per-block типографика: каждая текстовая единица на сайте конфигурируется отдельно.

create table if not exists public.typography_settings (
  scope text not null,
  element_key text not null,
  font_family text,
  font_size text,
  font_weight text,
  line_height text,
  letter_spacing text,
  text_transform text,
  text_align text,
  color text,
  updated_at timestamptz not null default now(),
  primary key (scope, element_key)
);

alter table public.typography_settings enable row level security;

drop policy if exists "typography read all" on public.typography_settings;
create policy "typography read all"
  on public.typography_settings
  for select
  using (true);

drop policy if exists "typography admin write" on public.typography_settings;
create policy "typography admin write"
  on public.typography_settings
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists typography_settings_set_updated_at on public.typography_settings;
create trigger typography_settings_set_updated_at
  before update on public.typography_settings
  for each row execute function public.set_updated_at();

drop trigger if exists typography_settings_audit on public.typography_settings;
create trigger typography_settings_audit
  after insert or update or delete on public.typography_settings
  for each row execute function public.log_changes();

-- Сидинг дефолтов. Значения подобраны так, чтобы визуально сайт не изменился
-- (заголовки — Cormorant Garamond, тело — Montserrat, веса/размеры — как сейчас в Tailwind-классах).

insert into public.typography_settings (scope, element_key, font_family, font_size, font_weight, line_height, letter_spacing, text_transform, text_align, color) values
  ('hero', 'title',            'Cormorant Garamond', '3.5rem', '600', '1.1',  'normal',   'none',    'left',   null),
  ('hero', 'accent',            'Cormorant Garamond', '3.5rem', '600', '1.1',  'normal',   'none',    'left',   null),
  ('hero', 'subtitle',          'Montserrat',         '1.125rem', '400', '1.6','normal',   'none',    'left',   null),
  ('hero', 'cta',               'Montserrat',         '0.875rem', '600', '1.2','0.05em',   'uppercase','center',null),
  ('hero', 'secondary_cta',     'Montserrat',         '0.875rem', '600', '1.2','0.05em',   'uppercase','center',null),
  ('products', 'heading',       'Cormorant Garamond', '3rem',     '600', '1.1','normal',   'none',    'center', null),
  ('products', 'subheading',    'Montserrat',         '1.125rem', '400', '1.6','normal',   'none',    'center', null),
  ('products', 'card_title',    'Cormorant Garamond', '1.75rem',  '600', '1.2','normal',   'none',    'center', null),
  ('products', 'card_price',    'Cormorant Garamond', '1.375rem', '600', '1.2','normal',   'none',    'center', null),
  ('products', 'card_description','Montserrat',       '0.875rem', '400', '1.5','normal',   'none',    'center', null),
  ('products', 'cta',           'Montserrat',         '0.75rem',  '600', '1.2','0.05em',   'uppercase','center',null),
  ('categories', 'heading',     'Cormorant Garamond', '3rem',     '600', '1.1','normal',   'none',    'center', null),
  ('categories', 'subheading',  'Montserrat',         '1.125rem', '400', '1.6','normal',   'none',    'center', null),
  ('categories', 'card_title',  'Cormorant Garamond', '1.5rem',   '600', '1.2','normal',   'none',    'center', null),
  ('categories', 'card_description','Montserrat',     '0.875rem', '400', '1.5','normal',   'none',    'center', null),
  ('features', 'heading',       'Cormorant Garamond', '3rem',     '600', '1.1','normal',   'none',    'center', null),
  ('features', 'subheading',    'Montserrat',         '1.125rem', '400', '1.6','normal',   'none',    'center', null),
  ('features', 'card_title',    'Cormorant Garamond', '1.25rem',  '600', '1.3','normal',   'none',    'center', null),
  ('features', 'card_description','Montserrat',       '0.875rem', '400', '1.5','normal',   'none',    'center', null),
  ('contact', 'heading',        'Cormorant Garamond', '3rem',     '600', '1.1','normal',   'none',    'center', null),
  ('contact', 'subheading',     'Montserrat',         '1.125rem', '400', '1.6','normal',   'none',    'center', null),
  ('contact', 'label',          'Montserrat',         '1rem',     '500', '1.4','normal',   'none',    'left',   null),
  ('contact', 'value',          'Montserrat',         '1rem',     '400', '1.5','normal',   'none',    'left',   null),
  ('contact', 'form_label',     'Montserrat',         '0.875rem', '500', '1.4','normal',   'none',    'left',   null),
  ('footer', 'brand',           'Cormorant Garamond', '2rem',     '600', '1.2','0.1em',    'none',    'center', null),
  ('footer', 'tagline',         'Montserrat',         '1rem',     '400', '1.5','normal',   'none',    'center', null),
  ('footer', 'link',            'Montserrat',         '0.875rem', '400', '1.5','normal',   'none',    'center', null),
  ('footer', 'copyright',       'Montserrat',         '0.75rem',  '400', '1.4','normal',   'none',    'center', null),
  ('catalog_page', 'heading',   'Cormorant Garamond', '3rem',     '600', '1.1','normal',   'none',    'left',   null),
  ('catalog_page', 'subheading','Montserrat',         '1.125rem', '400', '1.6','normal',   'none',    'left',   null),
  ('catalog_page', 'filter_chip','Montserrat',        '0.875rem', '500', '1.2','normal',   'none',    'center', null),
  ('catalog_page', 'card_title','Cormorant Garamond', '1.5rem',   '600', '1.2','normal',   'none',    'left',   null),
  ('catalog_page', 'card_price','Cormorant Garamond', '1.25rem',  '600', '1.2','normal',   'none',    'left',   null),
  ('product_page', 'title',     'Cormorant Garamond', '2.5rem',   '600', '1.1','normal',   'none',    'left',   null),
  ('product_page', 'price',     'Cormorant Garamond', '1.75rem',  '600', '1.2','normal',   'none',    'left',   null),
  ('product_page', 'description','Montserrat',        '1rem',     '400', '1.6','normal',   'none',    'left',   null),
  ('product_page', 'meta',      'Montserrat',         '0.875rem', '400', '1.5','normal',   'none',    'left',   null)
on conflict (scope, element_key) do nothing;
