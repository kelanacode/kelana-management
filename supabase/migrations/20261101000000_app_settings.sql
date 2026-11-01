-- Pengaturan aplikasi (fitur yang bisa dikunci/dibuka).
-- Semua karyawan aktif boleh membaca; hanya CEO & Admin yang boleh mengubah.
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists "settings_select" on public.app_settings;
create policy "settings_select" on public.app_settings for select to authenticated
  using (public.is_active_member());

drop policy if exists "settings_superuser_write" on public.app_settings;
create policy "settings_superuser_write" on public.app_settings for update to authenticated
  using (public.chat_is_superuser()) with check (public.chat_is_superuser());

-- Pengubah & waktu ditentukan server
create or replace function public.app_settings_stamp()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

drop trigger if exists app_settings_stamp on public.app_settings;
create trigger app_settings_stamp
  before insert or update on public.app_settings
  for each row execute function public.app_settings_stamp();

-- Absensi karyawan: terkunci secara bawaan (belum digunakan)
insert into public.app_settings (key, value) values ('attendance_enabled', 'false'::jsonb)
on conflict (key) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'app_settings'
  ) then
    alter publication supabase_realtime add table public.app_settings;
  end if;
end $$;
