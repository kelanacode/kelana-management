// Menghasilkan supabase/migrations/*_schema.sql dan src/lib/dbSchema.ts dari schema-spec.mjs.
// Pemakaian: node supabase/generate.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TABLES, PROFILE_FIELDS } from './schema-spec.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SQL_TYPES = { s: 'text', n: 'numeric', b: 'boolean', j: 'jsonb', ts: 'timestamptz' };

const snake = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/([A-Z])([A-Z][a-z])/g, '$1_$2').toLowerCase();
const parse = (f) => {
  const [name, type = 's'] = f.split(':');
  return { name, col: snake(name), type: SQL_TYPES[type] };
};
const q = (col) => (['order', 'type', 'date', 'timestamp', 'condition', 'name'].includes(col) ? `"${col}"` : col);

const colDefs = (fields) =>
  fields.map(parse).map(({ col, type }) => {
    const def = (col === 'created_at' || col === 'updated_at') && type === 'timestamptz' ? ' not null default now()' : '';
    return `  ${q(col)} ${type}${def}`;
  });

// ---------------- SQL ----------------
const sql = [];
sql.push(`-- Skema database Ruang Kelana (dibuat otomatis oleh supabase/generate.mjs, jangan diedit manual).
-- Aman dijalankan ulang (idempotent).

create extension if not exists pgcrypto;

-- =====================================================================
-- Profil karyawan & undangan
-- =====================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
${colDefs(PROFILE_FIELDS).join(',\n')}
);
alter table public.profiles alter column role set default 'Staff';
alter table public.profiles alter column status set default 'Active';
create unique index if not exists profiles_email_key on public.profiles (lower(email));
create unique index if not exists profiles_username_key on public.profiles (lower(username));
create unique index if not exists profiles_nik_key on public.profiles (lower(nik));

create table if not exists public.invitations (
  token text primary key default encode(gen_random_bytes(24), 'hex'),
  email text not null,
  name text not null,
  username text,
  nik text,
  division text,
  position text,
  role text not null default 'Staff',
  avatar text,
  color text,
  invited_by text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '48 hours',
  used_at timestamptz
);
create index if not exists invitations_email_idx on public.invitations (lower(email));

-- Helper: user yang sedang login adalah karyawan aktif
create or replace function public.is_active_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'Active');
$$;

-- Helper: user yang sedang login boleh mengelola akun (Admin / CEO / HR)
create or replace function public.is_people_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'Active' and role in ('Admin', 'CEO', 'HR')
  );
$$;

-- Pendaftaran hanya boleh lewat undangan yang masih berlaku; email langsung dianggap terverifikasi.
create or replace function public.before_auth_user_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.invitations
    where lower(email) = lower(new.email) and used_at is null and expires_at > now()
  ) then
    raise exception 'Pendaftaran hanya bisa melalui undangan yang masih berlaku';
  end if;
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end;
$$;

drop trigger if exists before_auth_user_insert on auth.users;
create trigger before_auth_user_insert
  before insert on auth.users
  for each row execute function public.before_auth_user_insert();

-- Setelah akun auth dibuat, buat profil dari data undangan.
create or replace function public.after_auth_user_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare inv public.invitations;
begin
  select * into inv from public.invitations
  where lower(email) = lower(new.email) and used_at is null and expires_at > now()
  order by created_at desc limit 1;

  insert into public.profiles (id, name, email, username, nik, division, position, role, status, avatar, color, invited_by, two_factor_enabled)
  values (
    new.id, inv.name, lower(new.email),
    coalesce(nullif(inv.username, ''), split_part(lower(new.email), '@', 1)),
    inv.nik, inv.division, inv.position, inv.role, 'Active',
    inv.avatar, coalesce(inv.color, '#7c3aed'), inv.invited_by,
    coalesce((new.raw_user_meta_data ->> 'two_factor_enabled')::boolean, false)
  );

  update public.invitations set used_at = now() where token = inv.token;
  return new;
end;
$$;

drop trigger if exists after_auth_user_insert on auth.users;
create trigger after_auth_user_insert
  after insert on auth.users
  for each row execute function public.after_auth_user_insert();

-- Hanya Admin/CEO/HR yang boleh mengubah role, status, atau NIK.
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and (new.role is distinct from old.role or new.status is distinct from old.status or new.nik is distinct from old.nik)
     and not public.is_people_admin() then
    raise exception 'Hanya Admin, CEO, atau HR yang boleh mengubah role, status, atau NIK';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Login dengan username / NIK: cari email-nya (dipanggil sebelum login).
create or replace function public.resolve_login_email(identifier text)
returns text language sql stable security definer set search_path = public as $$
  select email from public.profiles
  where lower(email) = lower(trim(identifier))
     or lower(username) = lower(trim(identifier))
     or lower(nik) = lower(trim(identifier))
  limit 1;
$$;

-- Data undangan untuk halaman aktivasi (tanpa login).
create or replace function public.get_invitation(p_token text)
returns table (email text, name text, nik text, division text, "position" text, role text)
language sql stable security definer set search_path = public as $$
  select email, name, nik, division, position, role from public.invitations
  where token = p_token and used_at is null and expires_at > now();
$$;

revoke all on function public.resolve_login_email(text) from public;
revoke all on function public.get_invitation(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;
grant execute on function public.get_invitation(text) to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.invitations enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated using (public.is_active_member() or id = auth.uid());
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_people_admin()) with check (id = auth.uid() or public.is_people_admin());
drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_delete" on public.profiles for delete to authenticated using (public.is_people_admin());

drop policy if exists "invitations_admin" on public.invitations;
create policy "invitations_admin" on public.invitations for all to authenticated
  using (public.is_people_admin()) with check (public.is_people_admin());
`);

sql.push(`-- =====================================================================
-- Tabel data aplikasi
-- Semua karyawan aktif boleh membaca & menulis (pembatasan per modul diatur di UI).
-- =====================================================================`);

for (const t of TABLES) {
  sql.push(`create table if not exists public.${t.table} (
  id text primary key,
${colDefs(t.fields).join(',\n')},
  inserted_at timestamptz not null default now()
);
${t.fields
    .map(parse)
    .map(({ col, type }) => `alter table public.${t.table} add column if not exists ${q(col)} ${type};`)
    .join('\n')}
alter table public.${t.table} enable row level security;
drop policy if exists "members_all" on public.${t.table};
create policy "members_all" on public.${t.table} for all to authenticated
  using (public.is_active_member()) with check (public.is_active_member());
`);
}

const realtimeTables = ['profiles', ...TABLES.map((t) => t.table)];
sql.push(`-- Realtime: perubahan langsung terlihat oleh pengguna lain
do $$
declare t text;
begin
  foreach t in array array[${realtimeTables.map((t) => `'${t}'`).join(', ')}] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
`);

const migDir = join(root, 'supabase', 'migrations');
mkdirSync(migDir, { recursive: true });
writeFileSync(join(migDir, '20261031000000_schema.sql'), sql.join('\n'));

// ---------------- TS ----------------
const tsMap = (fields) =>
  '{ ' + fields.map(parse).map(({ name, col, type }) => `${name}: ['${col}', '${type}']`).join(', ') + ' }';
const ts = `// Dibuat otomatis oleh supabase/generate.mjs dari supabase/schema-spec.mjs — jangan diedit manual.
export type ColumnType = 'text' | 'numeric' | 'boolean' | 'jsonb' | 'timestamptz';
export type ColumnMap = Record<string, [column: string, type: ColumnType]>;

export interface TableSpec {
  table: string;
  store: string;
  key: string;
  columns: ColumnMap;
}

export const TABLES: TableSpec[] = [
${TABLES.map((t) => `  { table: '${t.table}', store: '${t.store}', key: '${t.key}', columns: ${tsMap(t.fields)} },`).join('\n')}
];

export const PROFILE_COLUMNS: ColumnMap = ${tsMap(PROFILE_FIELDS)};
`;
writeFileSync(join(root, 'src', 'lib', 'dbSchema.ts'), ts);
console.log('OK:', TABLES.length, 'tabel data + profiles + invitations');
