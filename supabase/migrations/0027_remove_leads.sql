-- 0027_remove_leads
-- Удаление формы обратной связи (Сценарий B миграции в РФ-инфраструктуру).
-- См. docs/superpowers/specs/2026-05-02-cheap-migration-design.md § 3.7.

-- Снять таблицу с Realtime-публикации (если опубликована).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'leads'
     )
  then
    alter publication supabase_realtime drop table public.leads;
  end if;
end$$;

-- Удалить таблицы. CASCADE снимает RLS-политики и триггеры автоматически.
drop table if exists public.leads cascade;
drop table if exists public.rate_limits cascade;
