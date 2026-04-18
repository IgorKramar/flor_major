-- 0026_landing_section_surface_columns
-- Структурированный фон (режим + цвета/градиент/картинка), удаление сырого CSS-поля background.

alter table public.landing_section_styles
  add column if not exists background_mode text;

update public.landing_section_styles
set background_mode = 'default'
where background_mode is null;

alter table public.landing_section_styles
  alter column background_mode set default 'default';

alter table public.landing_section_styles
  alter column background_mode set not null;

alter table public.landing_section_styles
  drop constraint if exists landing_section_styles_bg_mode_chk;

alter table public.landing_section_styles
  add constraint landing_section_styles_bg_mode_chk
  check (background_mode in ('default', 'solid', 'gradient', 'image'));

alter table public.landing_section_styles
  add column if not exists background_solid_hex text,
  add column if not exists background_gradient_from_hex text,
  add column if not exists background_gradient_to_hex text,
  add column if not exists background_gradient_angle smallint not null default 135,
  add column if not exists background_image_url text,
  add column if not exists background_image_overlay numeric(3,2) not null default 0.45;

alter table public.landing_section_styles
  drop constraint if exists landing_section_styles_bg_img_overlay_chk;

alter table public.landing_section_styles
  add constraint landing_section_styles_bg_img_overlay_chk
  check (background_image_overlay >= 0 and background_image_overlay <= 1);

alter table public.landing_section_styles
  drop constraint if exists landing_section_styles_bg_angle_chk;

alter table public.landing_section_styles
  add constraint landing_section_styles_bg_angle_chk
  check (background_gradient_angle >= 0 and background_gradient_angle <= 360);

alter table public.landing_section_styles
  drop column if exists background;
