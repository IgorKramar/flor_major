-- Expand hero_settings with additional fields

alter table public.hero_settings
  add column if not exists headline_accent text,
  add column if not exists alt_text text,
  add column if not exists secondary_cta_text text,
  add column if not exists secondary_cta_link text,
  add column if not exists overlay_opacity numeric(3,2) not null default 0.4 check (overlay_opacity >= 0 and overlay_opacity <= 1);

drop trigger if exists hero_settings_set_updated_at on public.hero_settings;
create trigger hero_settings_set_updated_at
  before update on public.hero_settings
  for each row execute function public.set_updated_at();
;
