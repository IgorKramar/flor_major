-- 0020_categories_image
-- Изображение для карточки категории на главной + параметры оверлея.

alter table public.categories
  add column if not exists image_url text,
  add column if not exists image_alt text,
  add column if not exists overlay_opacity numeric(3,2) not null default 0.55,
  add column if not exists show_icon_over_image boolean not null default false;

alter table public.categories
  drop constraint if exists categories_overlay_opacity_range_chk;

alter table public.categories
  add constraint categories_overlay_opacity_range_chk
  check (overlay_opacity >= 0 and overlay_opacity <= 1);
