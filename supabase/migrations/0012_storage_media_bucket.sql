-- Public 'media' bucket for product/hero/og images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp','image/svg+xml','image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read for media bucket
drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects
  for select using (bucket_id = 'media');

-- Admin write
drop policy if exists "media_admin_insert" on storage.objects;
create policy "media_admin_insert" on storage.objects
  for insert with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "media_admin_update" on storage.objects;
create policy "media_admin_update" on storage.objects
  for update using (bucket_id = 'media' and public.is_admin()) with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "media_admin_delete" on storage.objects;
create policy "media_admin_delete" on storage.objects
  for delete using (bucket_id = 'media' and public.is_admin());
;
