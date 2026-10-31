-- Chat internal: room (channel / DM / grup), anggota, pesan, lampiran, RBAC, auto-purge.
-- Aman dijalankan ulang (idempotent).

-- =====================================================================
-- Tabel
-- =====================================================================
create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  slug text unique,                         -- untuk channel, mis. 'umum'
  name text not null,
  description text,
  type text not null check (type in ('channel', 'direct', 'group')),
  allowed_roles text[],                     -- null = semua role
  allowed_divisions text[],                 -- null = semua divisi
  posting_roles text[],                     -- null = semua yang punya akses boleh menulis
  is_archived boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz
);

create table if not exists public.chat_room_members (
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index if not exists chat_room_members_user_idx on public.chat_room_members (user_id);

create table if not exists public.chat_room_messages (
  id uuid primary key default gen_random_uuid(), -- boleh dibuat klien untuk optimistic UI
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  message_text text,
  file_url text,                             -- path di bucket storage 'chat-files'
  file_name text,
  file_size bigint,
  file_type text,
  is_pinned boolean not null default false,
  pinned_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint chat_message_not_empty check (deleted_at is not null or message_text is not null or file_url is not null)
);
create index if not exists chat_room_messages_room_created_idx on public.chat_room_messages (room_id, created_at);
create index if not exists chat_room_messages_purge_idx on public.chat_room_messages (created_at) where not is_pinned;

-- =====================================================================
-- Fungsi hak akses (RBAC)
-- =====================================================================
create or replace function public.chat_is_superuser()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'Active' and role in ('Admin', 'CEO'));
$$;

create or replace function public.chat_can_access_room(p_room uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.chat_rooms r
    join public.profiles me on me.id = auth.uid() and me.status = 'Active'
    where r.id = p_room
      and (
        (r.type in ('direct', 'group')
          and exists (select 1 from public.chat_room_members m where m.room_id = r.id and m.user_id = me.id))
        or
        (r.type = 'channel' and (
          me.role in ('Admin', 'CEO')
          or ((r.allowed_roles is null or me.role = any (r.allowed_roles))
              and (r.allowed_divisions is null or me.division = any (r.allowed_divisions)))
        ))
      )
  );
$$;

create or replace function public.chat_can_post_room(p_room uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.chat_can_access_room(p_room) and exists (
    select 1
    from public.chat_rooms r
    join public.profiles me on me.id = auth.uid()
    where r.id = p_room
      and not r.is_archived
      and (r.posting_roles is null or me.role = any (r.posting_roles) or me.role in ('Admin', 'CEO'))
  );
$$;

-- Untuk path storage '<room_id>/<file>': kembalikan room_id atau null bila bukan uuid
create or replace function public.chat_room_from_path(p_name text)
returns uuid language plpgsql immutable as $$
begin
  return split_part(p_name, '/', 1)::uuid;
exception when others then
  return null;
end;
$$;

-- =====================================================================
-- Trigger pesan: waktu & pengirim ditentukan server
-- =====================================================================
create or replace function public.chat_message_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.created_at := now();
  if auth.uid() is not null then
    new.sender_id := auth.uid();
  end if;
  new.is_pinned := false;
  new.pinned_by := null;
  new.deleted_at := null;
  return new;
end;
$$;

drop trigger if exists chat_message_before_insert on public.chat_room_messages;
create trigger chat_message_before_insert
  before insert on public.chat_room_messages
  for each row execute function public.chat_message_before_insert();

create or replace function public.chat_message_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.chat_rooms set last_message_at = new.created_at where id = new.room_id;
  -- Pengirim otomatis dianggap sudah membaca room ini
  insert into public.chat_room_members (room_id, user_id, last_read_at)
  values (new.room_id, new.sender_id, new.created_at)
  on conflict (room_id, user_id) do update set last_read_at = greatest(chat_room_members.last_read_at, excluded.last_read_at);
  return new;
end;
$$;

drop trigger if exists chat_message_after_insert on public.chat_room_messages;
create trigger chat_message_after_insert
  after insert on public.chat_room_messages
  for each row execute function public.chat_message_after_insert();

-- =====================================================================
-- RPC (logika server)
-- =====================================================================

-- Buka / buat DM antara user yang login dan rekan kerja
create or replace function public.chat_get_or_create_dm(p_other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := auth.uid();
  v_room uuid;
begin
  if not public.is_active_member() then
    raise exception 'Akun tidak aktif';
  end if;
  if p_other = v_me then
    raise exception 'Tidak bisa mengirim DM ke diri sendiri';
  end if;
  if not exists (select 1 from public.profiles where id = p_other and status = 'Active') then
    raise exception 'Rekan kerja tidak ditemukan atau tidak aktif';
  end if;

  select r.id into v_room
  from public.chat_rooms r
  where r.type = 'direct'
    and exists (select 1 from public.chat_room_members where room_id = r.id and user_id = v_me)
    and exists (select 1 from public.chat_room_members where room_id = r.id and user_id = p_other)
  limit 1;

  if v_room is null then
    insert into public.chat_rooms (name, type, created_by) values ('DM', 'direct', v_me) returning id into v_room;
    insert into public.chat_room_members (room_id, user_id) values (v_room, v_me), (v_room, p_other);
  end if;
  return v_room;
end;
$$;

-- Buat channel baru (Admin / CEO / HR)
create or replace function public.chat_create_channel(
  p_name text,
  p_description text default null,
  p_allowed_roles text[] default null,
  p_allowed_divisions text[] default null,
  p_posting_roles text[] default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_room uuid; v_slug text;
begin
  if not public.is_people_admin() then
    raise exception 'Hanya Admin, CEO, atau HR yang dapat membuat channel';
  end if;
  v_slug := trim(both '-' from regexp_replace(lower(p_name), '[^a-z0-9]+', '-', 'g'));
  if v_slug = '' then raise exception 'Nama channel tidak valid'; end if;
  insert into public.chat_rooms (slug, name, description, type, allowed_roles, allowed_divisions, posting_roles, created_by)
  values (v_slug, v_slug, p_description, 'channel',
          nullif(p_allowed_roles, '{}'), nullif(p_allowed_divisions, '{}'), nullif(p_posting_roles, '{}'), auth.uid())
  returning id into v_room;
  return v_room;
end;
$$;

-- Tandai room sudah dibaca (pakai waktu server)
create or replace function public.chat_mark_read(p_room uuid)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_now timestamptz := now();
begin
  if not public.chat_can_access_room(p_room) then
    raise exception 'Tidak punya akses ke room ini';
  end if;
  insert into public.chat_room_members (room_id, user_id, last_read_at)
  values (p_room, auth.uid(), v_now)
  on conflict (room_id, user_id) do update set last_read_at = v_now;
  return v_now;
end;
$$;

-- Pin / unpin pesan (yang boleh menulis di room)
create or replace function public.chat_toggle_pin(p_message uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_room uuid; v_pinned boolean;
begin
  select room_id, is_pinned into v_room, v_pinned from public.chat_room_messages where id = p_message and deleted_at is null;
  if v_room is null or not public.chat_can_post_room(v_room) then
    raise exception 'Tidak punya izin untuk pin pesan ini';
  end if;
  update public.chat_room_messages
  set is_pinned = not v_pinned, pinned_by = case when v_pinned then null else auth.uid() end
  where id = p_message;
  return not v_pinned;
end;
$$;

-- Hapus pesan (pengirim, atau Admin/CEO)
create or replace function public.chat_delete_message(p_message uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_sender uuid;
begin
  select sender_id into v_sender from public.chat_room_messages where id = p_message;
  if v_sender is null then raise exception 'Pesan tidak ditemukan'; end if;
  if v_sender <> auth.uid() and not public.chat_is_superuser() then
    raise exception 'Hanya pengirim atau Admin/CEO yang dapat menghapus pesan';
  end if;
  update public.chat_room_messages
  set deleted_at = now(), message_text = null, file_url = null, file_name = null, file_size = null, file_type = null, is_pinned = false
  where id = p_message;
end;
$$;

revoke all on function public.chat_get_or_create_dm(uuid) from public, anon;
revoke all on function public.chat_create_channel(text, text, text[], text[], text[]) from public, anon;
revoke all on function public.chat_mark_read(uuid) from public, anon;
revoke all on function public.chat_toggle_pin(uuid) from public, anon;
revoke all on function public.chat_delete_message(uuid) from public, anon;
grant execute on function public.chat_get_or_create_dm(uuid) to authenticated;
grant execute on function public.chat_create_channel(text, text, text[], text[], text[]) to authenticated;
grant execute on function public.chat_mark_read(uuid) to authenticated;
grant execute on function public.chat_toggle_pin(uuid) to authenticated;
grant execute on function public.chat_delete_message(uuid) to authenticated;

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.chat_rooms enable row level security;
alter table public.chat_room_members enable row level security;
alter table public.chat_room_messages enable row level security;

drop policy if exists "rooms_select" on public.chat_rooms;
create policy "rooms_select" on public.chat_rooms for select to authenticated using (public.chat_can_access_room(id));
drop policy if exists "rooms_admin_update" on public.chat_rooms;
create policy "rooms_admin_update" on public.chat_rooms for update to authenticated
  using (type = 'channel' and public.is_people_admin()) with check (type = 'channel' and public.is_people_admin());
drop policy if exists "rooms_admin_delete" on public.chat_rooms;
create policy "rooms_admin_delete" on public.chat_rooms for delete to authenticated
  using (type = 'channel' and public.is_people_admin());

drop policy if exists "members_select" on public.chat_room_members;
create policy "members_select" on public.chat_room_members for select to authenticated using (public.chat_can_access_room(room_id));

drop policy if exists "messages_select" on public.chat_room_messages;
create policy "messages_select" on public.chat_room_messages for select to authenticated using (public.chat_can_access_room(room_id));
drop policy if exists "messages_insert" on public.chat_room_messages;
create policy "messages_insert" on public.chat_room_messages for insert to authenticated
  with check (sender_id = auth.uid() and public.chat_can_post_room(room_id));

-- =====================================================================
-- Storage lampiran (private, maks 10 MB)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-files', 'chat-files', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = 10485760;

drop policy if exists "chat_files_insert" on storage.objects;
create policy "chat_files_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-files' and public.chat_can_post_room(public.chat_room_from_path(name)));
drop policy if exists "chat_files_select" on storage.objects;
create policy "chat_files_select" on storage.objects for select to authenticated
  using (bucket_id = 'chat-files' and public.chat_can_access_room(public.chat_room_from_path(name)));

-- =====================================================================
-- Channel bawaan
-- =====================================================================
insert into public.chat_rooms (slug, name, description, type, allowed_roles, allowed_divisions, posting_roles) values
  ('umum', 'umum', 'Obrolan umum seluruh karyawan', 'channel', null, null, null),
  ('pengumuman', 'pengumuman', 'Pengumuman resmi perusahaan. Hanya Admin, CEO, dan HR yang dapat menulis.', 'channel', null, null, array['Admin', 'CEO', 'HR']),
  ('direksi', 'direksi', 'Ruang diskusi jajaran direksi (C-Level)', 'channel', array['CEO', 'Admin'], null, null),
  ('tim-teknologi-it', 'tim-teknologi-it', 'Divisi Teknologi & IT', 'channel', null, array['Teknologi & IT'], null),
  ('tim-produk-desain', 'tim-produk-desain', 'Divisi Produk & Desain', 'channel', null, array['Produk & Desain'], null),
  ('tim-pemasaran-bisnis', 'tim-pemasaran-bisnis', 'Divisi Pemasaran & Bisnis', 'channel', null, array['Pemasaran & Bisnis', 'Marketing'], null),
  ('tim-operasional-hr', 'tim-operasional-hr', 'Divisi Operasional & HR', 'channel', null, array['Operasional & HR'], null),
  ('tim-keuangan', 'tim-keuangan', 'Divisi Keuangan', 'channel', null, array['Financial', 'Keuangan & Legal'], null)
on conflict (slug) do nothing;

-- =====================================================================
-- Pindahkan pesan dari chat lama (chat_messages) lalu hapus tabel lama
-- =====================================================================
do $$
declare
  rec record;
  v_room uuid;
  v_umum uuid;
begin
  if to_regclass('public.chat_messages') is null then
    return;
  end if;
  select id into v_umum from public.chat_rooms where slug = 'umum';

  alter table public.chat_room_messages disable trigger chat_message_before_insert;

  for rec in
    select m.*, s.id as sender_uuid
    from public.chat_messages m
    join public.profiles s on s.id::text = m.sender_id
    where m.content is not null
    order by m."timestamp"
  loop
    if rec.recipient_id is null or rec.recipient_id = 'all' then
      v_room := v_umum;
    elsif exists (select 1 from public.profiles where id::text = rec.recipient_id) then
      select r.id into v_room from public.chat_rooms r
      where r.type = 'direct'
        and exists (select 1 from public.chat_room_members where room_id = r.id and user_id = rec.sender_uuid)
        and exists (select 1 from public.chat_room_members where room_id = r.id and user_id::text = rec.recipient_id)
      limit 1;
      if v_room is null then
        insert into public.chat_rooms (name, type, created_by) values ('DM', 'direct', rec.sender_uuid) returning id into v_room;
        insert into public.chat_room_members (room_id, user_id) values (v_room, rec.sender_uuid), (v_room, rec.recipient_id::uuid);
      end if;
    else
      continue;
    end if;

    insert into public.chat_room_messages (room_id, sender_id, message_text, created_at)
    values (v_room, rec.sender_uuid, rec.content, coalesce(rec."timestamp", rec.inserted_at));
  end loop;

  alter table public.chat_room_messages enable trigger chat_message_before_insert;

  drop table public.chat_messages;
end $$;

drop function if exists public.chat_messages_server_time();

-- =====================================================================
-- Realtime
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array['chat_rooms', 'chat_room_members', 'chat_room_messages'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- =====================================================================
-- Auto-purge: hapus pesan > 30 hari, kecuali yang di-pin (setiap hari 02:00 WIB)
-- =====================================================================
create extension if not exists pg_cron;

create or replace function public.chat_purge_old_messages()
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  delete from public.chat_room_messages
  where created_at < now() - interval '30 days' and not is_pinned;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.chat_purge_old_messages() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'chat-auto-purge';
select cron.schedule('chat-auto-purge', '0 19 * * *', 'select public.chat_purge_old_messages()');
