-- Fix mutable search_path warning
alter function public.set_updated_at() set search_path = public;
;
