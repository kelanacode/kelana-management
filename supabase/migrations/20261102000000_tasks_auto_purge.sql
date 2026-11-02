-- Taks dihapus permanen dari database setelah 30 hari:
--  • taks selesai (Completed): 30 hari sejak disetujui (review.reviewedAt)
--  • taks lain yang lewat deadline: 30 hari sejak tenggat (due_date)

-- Konversi teks tanggal ke timestamptz tanpa error untuk format yang tidak valid
create or replace function public.try_timestamptz(p text)
returns timestamptz language plpgsql immutable as $$
begin
  if p is null or btrim(p) = '' then return null; end if;
  return p::timestamptz;
exception when others then
  return null;
end;
$$;

create or replace function public.tasks_purge_old()
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  delete from public.company_tasks t
  where (
      t.status = 'Completed'
      and coalesce(public.try_timestamptz(t.review ->> 'reviewedAt'), t.created_at) < now() - interval '30 days'
    )
    or (
      public.try_timestamptz(t.due_date) < now() - interval '30 days'
    );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.tasks_purge_old() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'tasks-auto-purge';
select cron.schedule('tasks-auto-purge', '15 0 * * *', 'select public.tasks_purge_old()');
