-- 0025_landing_section_styles
-- Фон и цвета для секций главной страницы (hero, товары, категории, преимущества, контакты).

create table if not exists public.landing_section_styles (
  section_key text primary key,
  background_mode text not null default 'default',
  background_solid_hex text,
  background_gradient_from_hex text,
  background_gradient_to_hex text,
  background_gradient_angle smallint not null default 135,
  background_image_url text,
  background_image_overlay numeric(3,2) not null default 0.45,
  foreground text,
  muted_foreground text,
  card text,
  primary_color text,
  primary_foreground text,
  updated_at timestamptz not null default now(),
  constraint landing_section_styles_key_chk check (
    section_key in ('hero', 'products', 'categories', 'features', 'contact')
  ),
  constraint landing_section_styles_bg_mode_chk check (
    background_mode in ('default', 'solid', 'gradient', 'image')
  ),
  constraint landing_section_styles_bg_img_overlay_chk check (
    background_image_overlay >= 0 and background_image_overlay <= 1
  ),
  constraint landing_section_styles_bg_angle_chk check (
    background_gradient_angle >= 0 and background_gradient_angle <= 360
  )
);

alter table public.landing_section_styles enable row level security;

drop policy if exists "landing_section_styles read all" on public.landing_section_styles;
create policy "landing_section_styles read all"
  on public.landing_section_styles
  for select
  using (true);

drop policy if exists "landing_section_styles admin write" on public.landing_section_styles;
create policy "landing_section_styles admin write"
  on public.landing_section_styles
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists landing_section_styles_set_updated_at on public.landing_section_styles;
create trigger landing_section_styles_set_updated_at
  before update on public.landing_section_styles
  for each row execute function public.set_updated_at();

drop trigger if exists landing_section_styles_audit on public.landing_section_styles;
create trigger landing_section_styles_audit
  after insert or update or delete on public.landing_section_styles
  for each row execute function public.log_changes();

insert into public.landing_section_styles (section_key) values
  ('hero'),
  ('products'),
  ('categories'),
  ('features'),
  ('contact')
on conflict (section_key) do nothing;
