-- 0018_realtime_product_images_typography
-- Опционально: подписка realtime на новые таблицы.
-- Если не нужно — миграция идемпотентна и не упадёт.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.product_images;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.typography_settings;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
