-- Fix performance warnings: wrap auth.uid() with select, split FOR ALL into write-only commands
-- to avoid multiple_permissive_policies for SELECT.

-- admin_users: use (select auth.uid()) and single role-scoped SELECT
drop policy if exists admin_users_select_self_or_admin on public.admin_users;
drop policy if exists admin_users_modify_owner on public.admin_users;
create policy admin_users_select_self_or_admin on public.admin_users
  for select
  using (
    (select auth.uid()) = user_id
    or public.is_admin()
  );
create policy admin_users_insert_owner on public.admin_users
  for insert with check (public.is_owner());
create policy admin_users_update_owner on public.admin_users
  for update using (public.is_owner()) with check (public.is_owner());
create policy admin_users_delete_owner on public.admin_users
  for delete using (public.is_owner());

-- Helper: drop FOR ALL admin_write policy and re-create as three separate ones
do $$
declare
  t text;
  tables text[] := array[
    'site_config','site_settings','contact_info','theme_settings','footer_config',
    'categories','nav_items','features','social_links','products','hero_settings'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists %I_admin_write on public.%I', t, t);
    execute format('create policy %I_admin_insert on public.%I for insert with check (public.is_admin())', t, t);
    execute format('create policy %I_admin_update on public.%I for update using (public.is_admin()) with check (public.is_admin())', t, t);
    execute format('create policy %I_admin_delete on public.%I for delete using (public.is_admin())', t, t);
  end loop;
end $$;

-- Foreign key indexes
create index if not exists audit_log_actor_idx on public.audit_log (actor);
create index if not exists leads_handled_by_idx on public.leads (handled_by);
;
