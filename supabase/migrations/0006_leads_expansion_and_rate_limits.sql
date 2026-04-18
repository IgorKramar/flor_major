-- Expand leads with workflow columns and add rate_limits table for Edge Function

alter table public.leads
  add column if not exists source text,
  add column if not exists user_agent text,
  add column if not exists ip_hash text,
  add column if not exists notes text,
  add column if not exists handled_by uuid references public.admin_users(user_id) on delete set null,
  add column if not exists handled_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- Replace text status with CHECK constraint values
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'leads_status_check'
  ) then
    alter table public.leads
      add constraint leads_status_check
      check (status in ('new','contacted','completed','cancelled'));
  end if;
end $$;

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status, created_at desc);

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

create table if not exists public.rate_limits (
  id bigserial primary key,
  bucket text not null,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limits_lookup_idx on public.rate_limits (bucket, ip_hash, created_at desc);
alter table public.rate_limits enable row level security;
;
