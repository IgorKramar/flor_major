-- 0028_remove_thanks_page
-- Удаление страницы «Спасибо» — она существовала только для редиректа после
-- формы обратной связи, которая удаляется в 0027.
-- См. docs/superpowers/specs/2026-05-02-cheap-migration-design.md § 3.7.

-- Удалить таблицу настроек. CASCADE снимает RLS-политики и триггеры.
drop table if exists public.thanks_page_settings cascade;

-- Удалить seed'ы типографики для scope 'thanks_page' (см. 0024_typography_seed_extensions).
delete from public.typography_settings where scope = 'thanks_page';
