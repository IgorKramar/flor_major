-- 0029_grant_data_api
-- В Supabase Cloud Data API GRANT'ы для anon/authenticated на public-таблицы выдаются автоматически
-- через UI (Settings → Data API). Self-hosted этого делать не умеет.
-- Без этих GRANT'ов PostgREST/Storage/Auth получают "permission denied for table" ещё до RLS.
-- См. docs/superpowers/specs/2026-05-02-cheap-migration-design.md (план C cutover).

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Чтение для anon + authenticated (RLS дальше отсекает строки)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Запись только для authenticated (RLS дальше проверяет is_admin / is_owner)
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- service_role обходит RLS, доступ ко всему
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Default privileges — для таблиц/sequences, которые добавятся в будущих миграциях
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
