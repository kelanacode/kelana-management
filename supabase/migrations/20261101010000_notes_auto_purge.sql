-- Sticky note: hilang 1x24 jam setelah dibuka, lalu dihapus permanen dari database
-- setelah SEMUA penerimanya membukanya dan masing-masing sudah lewat 24 jam.

-- Waktu "dibuka" memakai jam server (jam perangkat bisa meleset)
create or replace function public.notes_read_server_time()
returns trigger language plpgsql as $$
declare
  old_ids text[];
begin
  if new.read_records is null or jsonb_typeof(new.read_records) <> 'array' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.read_records is not null and jsonb_typeof(old.read_records) = 'array' then
    select coalesce(array_agg(r ->> 'userId'), '{}') into old_ids from jsonb_array_elements(old.read_records) r;
  else
    old_ids := '{}';
  end if;

  -- Catatan baca yang sudah ada dipertahankan; yang baru diberi waktu server
  select coalesce(jsonb_agg(
    case
      when (r ->> 'userId') = any (old_ids) then
        coalesce(
          (select o from jsonb_array_elements(old.read_records) o where o ->> 'userId' = r ->> 'userId' limit 1),
          r
        )
      else jsonb_set(r, '{readAt}', to_jsonb(to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
    end
  ), '[]'::jsonb)
  into new.read_records
  from jsonb_array_elements(new.read_records) r;

  return new;
end;
$$;

drop trigger if exists notes_read_server_time on public.notes;
create trigger notes_read_server_time
  before insert or update of read_records on public.notes
  for each row execute function public.notes_read_server_time();

-- Hapus catatan yang sudah dibuka semua penerimanya > 24 jam lalu
create or replace function public.notes_purge_read()
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  with recipients as (
    select n.id as note_id, p.id::text as user_id
    from public.notes n
    join public.profiles p on p.status = 'Active'
    where p.id::text is distinct from n.author_id
      and (
        (coalesce(n.share_scope, 'all') = 'all')
        or (n.share_scope = 'division'
            and p.division in (select jsonb_array_elements_text(coalesce(n.target_divisions, '[]'::jsonb))))
        or (n.share_scope = 'specific_users'
            and p.id::text in (select jsonb_array_elements_text(coalesce(n.target_user_ids, '[]'::jsonb))))
      )
  ),
  status as (
    select r.note_id,
           bool_and(exists (
             select 1 from public.notes n2, jsonb_array_elements(coalesce(n2.read_records, '[]'::jsonb)) rr
             where n2.id = r.note_id
               and rr ->> 'userId' = r.user_id
               and (rr ->> 'readAt')::timestamptz <= now() - interval '24 hours'
           )) as all_expired
    from recipients r
    group by r.note_id
  )
  delete from public.notes n
  using status s
  where n.id = s.note_id and s.all_expired;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.notes_purge_read() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'notes-auto-purge';
select cron.schedule('notes-auto-purge', '5 * * * *', 'select public.notes_purge_read()');
