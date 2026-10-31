-- Foto selfie absensi dihapus otomatis setelah 7 hari (data kehadiran tetap disimpan).
-- Berjalan setiap hari 02:15 WIB.
create extension if not exists pg_cron;

create or replace function public.attendance_purge_old_photos()
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  update public.attendance_records
  set clock_in_selfie_photo = null,
      clock_out_selfie_photo = null
  where created_at < now() - interval '7 days'
    and (clock_in_selfie_photo is not null or clock_out_selfie_photo is not null);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.attendance_purge_old_photos() from public, anon, authenticated;

-- Klien tidak boleh mengembalikan foto yang sudah dihapus (mis. dari cache browser lama)
create or replace function public.attendance_block_old_photos()
returns trigger language plpgsql as $$
begin
  if new.created_at < now() - interval '7 days' then
    new.clock_in_selfie_photo := null;
    new.clock_out_selfie_photo := null;
  end if;
  return new;
end;
$$;

drop trigger if exists attendance_block_old_photos on public.attendance_records;
create trigger attendance_block_old_photos
  before insert or update on public.attendance_records
  for each row execute function public.attendance_block_old_photos();

select cron.unschedule(jobid) from cron.job where jobname = 'attendance-photo-purge';
select cron.schedule('attendance-photo-purge', '15 19 * * *', 'select public.attendance_purge_old_photos()');

-- Bersihkan sekarang juga
select public.attendance_purge_old_photos();
