-- 0022_thanks_page_settings
-- Страница "Спасибо" после отправки лид-формы.

create table if not exists public.thanks_page_settings (
  id smallint primary key default 1,
  is_active boolean not null default true,
  heading text not null default 'Спасибо за заявку!',
  subheading text not null default 'Мы свяжемся с вами в ближайшее время',
  body_text text not null default 'Наш флорист уже изучает ваш заказ и скоро перезвонит, чтобы уточнить детали и помочь с выбором.',
  image_url text,
  image_alt text not null default 'Благодарность',
  show_phone boolean not null default true,
  button_text text not null default 'Вернуться на главную',
  button_link text not null default '/',
  updated_at timestamptz not null default now(),
  constraint thanks_page_settings_singleton_chk check (id = 1)
);

alter table public.thanks_page_settings enable row level security;

drop policy if exists "thanks_page_settings read all" on public.thanks_page_settings;
create policy "thanks_page_settings read all"
  on public.thanks_page_settings
  for select
  using (true);

drop policy if exists "thanks_page_settings admin write" on public.thanks_page_settings;
create policy "thanks_page_settings admin write"
  on public.thanks_page_settings
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists thanks_page_settings_set_updated_at on public.thanks_page_settings;
create trigger thanks_page_settings_set_updated_at
  before update on public.thanks_page_settings
  for each row execute function public.set_updated_at();

drop trigger if exists thanks_page_settings_audit on public.thanks_page_settings;
create trigger thanks_page_settings_audit
  after insert or update or delete on public.thanks_page_settings
  for each row execute function public.log_changes();

insert into public.thanks_page_settings (id) values (1) on conflict (id) do nothing;
