-- RLS: public read for active content, admin-only write; leads insert via Edge Function only

-- admin_users
drop policy if exists admin_users_select_self_or_admin on public.admin_users;
create policy admin_users_select_self_or_admin on public.admin_users
  for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists admin_users_modify_owner on public.admin_users;
create policy admin_users_modify_owner on public.admin_users
  for all using (public.is_owner()) with check (public.is_owner());

-- site_settings: public select (one row), admin write
drop policy if exists "Public can view config" on public.site_config;
drop policy if exists "Public read config" on public.site_config;
drop policy if exists "Authenticated users can insert config" on public.site_config;
drop policy if exists "Authenticated users can update config" on public.site_config;
-- Keep a minimal admin-only policy on legacy site_config for backward compatibility
create policy site_config_select_all on public.site_config for select using (true);
create policy site_config_admin_write on public.site_config
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists site_settings_select_public on public.site_settings;
create policy site_settings_select_public on public.site_settings for select using (true);
drop policy if exists site_settings_admin_write on public.site_settings;
create policy site_settings_admin_write on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists contact_info_select_public on public.contact_info;
create policy contact_info_select_public on public.contact_info for select using (true);
drop policy if exists contact_info_admin_write on public.contact_info;
create policy contact_info_admin_write on public.contact_info
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists theme_settings_select_public on public.theme_settings;
create policy theme_settings_select_public on public.theme_settings for select using (true);
drop policy if exists theme_settings_admin_write on public.theme_settings;
create policy theme_settings_admin_write on public.theme_settings
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists footer_config_select_public on public.footer_config;
create policy footer_config_select_public on public.footer_config for select using (true);
drop policy if exists footer_config_admin_write on public.footer_config;
create policy footer_config_admin_write on public.footer_config
  for all using (public.is_admin()) with check (public.is_admin());

-- categories
drop policy if exists categories_select_public on public.categories;
create policy categories_select_public on public.categories
  for select using (is_active = true or public.is_admin());
drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- nav_items
drop policy if exists nav_items_select_public on public.nav_items;
create policy nav_items_select_public on public.nav_items
  for select using (is_active = true or public.is_admin());
drop policy if exists nav_items_admin_write on public.nav_items;
create policy nav_items_admin_write on public.nav_items
  for all using (public.is_admin()) with check (public.is_admin());

-- features
drop policy if exists features_select_public on public.features;
create policy features_select_public on public.features
  for select using (is_active = true or public.is_admin());
drop policy if exists features_admin_write on public.features;
create policy features_admin_write on public.features
  for all using (public.is_admin()) with check (public.is_admin());

-- social_links
drop policy if exists social_links_select_public on public.social_links;
create policy social_links_select_public on public.social_links
  for select using (is_active = true or public.is_admin());
drop policy if exists social_links_admin_write on public.social_links;
create policy social_links_admin_write on public.social_links
  for all using (public.is_admin()) with check (public.is_admin());

-- products: tighten write to admin only
drop policy if exists "Authenticated users can delete products" on public.products;
drop policy if exists "Authenticated users can insert products" on public.products;
drop policy if exists "Authenticated users can update products" on public.products;
drop policy if exists products_select_visible_or_authenticated on public.products;
drop policy if exists products_select_public on public.products;
create policy products_select_public on public.products
  for select using (is_available = true or public.is_admin());
drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- hero_settings
drop policy if exists hero_settings_select_public on public.hero_settings;
drop policy if exists hero_settings_insert_authenticated on public.hero_settings;
drop policy if exists hero_settings_update_authenticated on public.hero_settings;
create policy hero_settings_select_public on public.hero_settings for select using (true);
drop policy if exists hero_settings_admin_write on public.hero_settings;
create policy hero_settings_admin_write on public.hero_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- leads: insert only via Edge Function (service role), admin read/update
drop policy if exists leads_insert_any on public.leads;
drop policy if exists leads_select_authenticated on public.leads;
drop policy if exists leads_update_authenticated on public.leads;
drop policy if exists leads_admin_select on public.leads;
create policy leads_admin_select on public.leads for select using (public.is_admin());
drop policy if exists leads_admin_update on public.leads;
create policy leads_admin_update on public.leads for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists leads_admin_delete on public.leads;
create policy leads_admin_delete on public.leads for delete using (public.is_admin());
-- No INSERT policy for anon/authenticated: inserts must go through Edge Function (service role bypasses RLS)

-- audit_log: admin read only
drop policy if exists audit_log_admin_read on public.audit_log;
create policy audit_log_admin_read on public.audit_log for select using (public.is_admin());
-- Writes happen via SECURITY DEFINER trigger log_changes()

-- rate_limits: no public access (function uses service role)
drop policy if exists rate_limits_admin_read on public.rate_limits;
create policy rate_limits_admin_read on public.rate_limits for select using (public.is_admin());
;
