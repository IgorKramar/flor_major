create or replace function public.log_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record_id text;
  v_row jsonb;
begin
  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
    v_record_id := coalesce(
      v_row ->> 'id',
      v_row ->> 'user_id',
      null
    );
    insert into public.audit_log(actor, action, table_name, record_id, before, after)
    values (auth.uid(), tg_op, tg_table_name, v_record_id, v_row, null);
    return old;
  else
    v_row := to_jsonb(new);
    v_record_id := coalesce(
      v_row ->> 'id',
      v_row ->> 'user_id',
      null
    );
    insert into public.audit_log(actor, action, table_name, record_id, before, after)
    values (auth.uid(), tg_op, tg_table_name, v_record_id,
            case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
            v_row);
    return new;
  end if;
end;
$$;;
