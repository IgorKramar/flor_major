-- Attach log_changes() trigger to customizable tables

do $$
declare
  t text;
  tables text[] := array[
    'products', 'categories', 'nav_items', 'features',
    'social_links', 'hero_settings', 'site_settings',
    'contact_info', 'theme_settings', 'footer_config',
    'admin_users'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists %I_audit on public.%I', t, t);
    execute format(
      'create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.log_changes()',
      t, t
    );
  end loop;
end $$;
;
