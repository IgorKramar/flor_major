-- Admin users table + is_admin() helper + shared triggers + audit_log

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('owner','admin','editor')),
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists(
    select 1 from public.admin_users au
    where au.user_id = auth.uid()
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists(
    select 1 from public.admin_users au
    where au.user_id = auth.uid() and au.role = 'owner'
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.audit_log (
  id bigserial primary key,
  actor uuid references auth.users(id) on delete set null,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  table_name text not null,
  record_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
create index if not exists audit_log_table_idx on public.audit_log (table_name, created_at desc);
alter table public.audit_log enable row level security;

create or replace function public.log_changes()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_record_id text;
begin
  if tg_op = 'DELETE' then
    v_record_id := coalesce((old.id)::text, null);
    insert into public.audit_log(actor, action, table_name, record_id, before, after)
    values (auth.uid(), tg_op, tg_table_name, v_record_id, to_jsonb(old), null);
    return old;
  else
    v_record_id := coalesce((new.id)::text, null);
    insert into public.audit_log(actor, action, table_name, record_id, before, after)
    values (auth.uid(), tg_op, tg_table_name, v_record_id,
            case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
            to_jsonb(new));
    return new;
  end if;
end;
$$;
;
