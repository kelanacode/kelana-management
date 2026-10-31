-- Skema database Ruang Kelana (dibuat otomatis oleh supabase/generate.mjs, jangan diedit manual).
-- Aman dijalankan ulang (idempotent).

create extension if not exists pgcrypto;

-- =====================================================================
-- Profil karyawan & undangan
-- =====================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  "name" text,
  email text,
  username text,
  nik text,
  division text,
  position text,
  role text,
  status text,
  avatar text,
  color text,
  two_factor_enabled boolean,
  last_login timestamptz,
  created_at timestamptz not null default now(),
  invited_by text,
  photo_url text,
  phone text,
  alt_email text,
  emergency_contact_name text,
  emergency_contact_relation text,
  emergency_contact_phone text,
  manager_name text,
  bio text,
  bank_name text,
  bank_account_number text,
  bank_account_holder text,
  digital_signature text,
  signature_date text,
  work_status text,
  status_custom_message text,
  google_calendar_email text,
  calendar_sync_google boolean,
  google_drive_connected boolean,
  google_drive_email text,
  google_drive_folder_url text
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

-- =====================================================================
-- Tabel data aplikasi
-- Semua karyawan aktif boleh membaca & menulis (pembatasan per modul diatur di UI).
-- =====================================================================
create table if not exists public.bank_accounts (
  id text primary key,
  bank_name text,
  account_number text,
  account_holder text,
  balance numeric,
  currency text,
  inserted_at timestamptz not null default now()
);
alter table public.bank_accounts enable row level security;
drop policy if exists "members_all" on public.bank_accounts;
create policy "members_all" on public.bank_accounts for all to authenticated
  using (public.is_active_member()) with check (public.is_active_member());

create table if not exists public.journal_entries (
  id text primary key,
  entry_number text,
  "date" text,
  description text,
  reference text,
  account_debit text,
  account_credit text,
  amount numeric,
  category text,
  status text,
  created_by text,
  inserted_at timestamptz not null default now()
);
alter table public.journal_entries enable row level security;
drop policy if exists "members_all" on public.journal_entries;
create policy "members_all" on public.journal_entries for all to authenticated
  using (public.is_active_member()) with check (public.is_active_member());

create table if not exists public.purchase_requisitions (
  id text primary key,
  pr_number text,
  requester_name text,
  department text,
  item_name text,
  category text,
  quantity numeric,
  unit text,
  estimated_price numeric,
  total_amount numeric,
  reason text,
  status text,
  "date" text,
  approved_by text,
  approval_date text,
  inserted_at timestamptz not null default now()
);
alter table public.purchase_requisitions enable row level security;
drop policy if exists "members_all" on public.purchase_requisitions;
create policy "members_all" on public.purchase_requisitions for all to authenticated
  using (public.is_active_member()) with check (public.is_active_member());

create table if not exists public.purchase_orders (
  id text primary key,
  po_number text,
  pr_number text,
  vendor_name text,
  vendor_contact text,
  item_name text,
  quantity numeric,
  unit_price numeric,
  total_amount numeric,
  status text,
  order_date text,
  expected_delivery text,
  goods_receipt_status text,
  payment_status text,
  inserted_at timestamptz not null default now()
);
alter table public.purchase_orders enable row level security;
drop policy if exists "members_all" on public.purchase_orders;
create policy "members_all" on public.purchase_orders for all to authenticated
  using (public.is_active_member()) with check (public.is_active_member());

create table if not exists public.sales_orders (
  id text primary key,
  so_number text,
  customer_name text,
  customer_company text,
  item_name text,
  quantity numeric,
  unit_price numeric,
  total_amount numeric,
  status text,
  order_date text,
  invoice_number text,
  invoice_date text,
  payment_status text,
  payment_method text,
  inserted_at timestamptz not null default now()
);
alter table public.sales_orders enable row level security;
drop policy if exists "members_all" on public.sales_orders;
create policy "members_all" on public.sales_orders for all to authenticated
  using (public.is_active_member()) with check (public.is_active_member());

create table if not exists public.inventory_items (
  id text primary key,
  sku text,
  "name" text,
  category text,
  stock numeric,
  min_stock numeric,
  unit text,
  valuation_per_unit numeric,
  total_valuation numeric,
  warehouse_location text,
  last_updated text,
  inserted_at timestamptz not null default now()
);
alter table public.inventory_items enable row level security;
drop policy if exists "members_all" on public.inventory_items;
create policy "members_all" on public.inventory_items for all to authenticated
  using (public.is_active_member()) with check (public.is_active_member());

create table if not exists public.fixed_assets (
  id text primary key,
  asset_code text,
  "name" text,
  category text,
  location text,
  purchase_date text,
  acquisition_cost numeric,
  useful_life_years numeric,
  accumulated_depreciation numeric,
  book_value numeric,
  "condition" text,
  assigned_to text,
  inserted_at timestamptz not null default now()
);
alter table public.fixed_assets enable row level security;
drop policy if exists "members_all" on public.fixed_assets;
create policy "members_all" on public.fixed_assets for all to authenticated
  using (public.is_active_member()) with check (public.is_active_member());

create table if not exists public.payroll_records (
  id text primary key,
  employee_nik text,
  employee_name text,
  division text,
  position text,
  period text,
  basic_salary numeric,
  allowances numeric,
  attendance_deductions numeric,
  tax_pph21 numeric,
  net_salary numeric,
  payment_status text,
  disbursement_date text,
  payment_proof_url text,
  slip_sent_status text,
  slip_sent_at text,
  notes text,
  inserted_at timestamptz not null default now()
);
alter table public.payroll_records enable row level security;
drop policy if exists "members_all" on public.payroll_records;
create policy "members_all" on public.payroll_records for all to authenticated
  using (public.is_active_member()) with check (public.is_active_member());

create table if not exists public.department_budgets (
  id text primary key,
  department text,
  year numeric,
  allocated_budget numeric,
  spent_budget numeric,
  remaining_budget numeric,
  variance_percentage numeric,
  status text,
  inserted_at timestamptz not null default now()
);
alter table public.department_budgets enable row level security;
drop policy if exists "members_all" on public.department_budgets;
create policy "members_all" on public.department_budgets for all to authenticated
  using (public.is_active_member()) with check (public.is_active_member());

create table if not exists public.expense_claims (
  id text primary key,
  claim_number text,
  claimant_name text,
  department text,
  description text,
  category text,
  amount numeric,
  receipt_image text,
  status text,
  submission_date text,
  approved_by text,
  inserted_at timestamptz not null default now()
);
alter table public.expense_claims enable row level security;
drop policy if exists "members_all" on public.expense_claims;
create policy "members_all" on public.expense_claims for all to authenticated
  using (public.is_active_member()) with check (public.is_active_member());

create table if not exists public.budget_requisitions (
  id text primary key,
  request_number text,
  title text,
  "type" text,
  department text,
  requester_id text,
  requester_name text,
  requester_position text,
  estimated_amount numeric,
  description text,
  vendor_name text,
  purpose text,
  attachment_url text,
  attachment_name text,
  is_encumbered boolean,
  department_remaining_before numeric,
  department_remaining_after numeric,
  status text,
  hr_approval jsonb,
  finance_approval jsonb,
  ceo_approval jsonb,
  disbursed_at text,
  disbursed_by text,
  disbursement_proof_url text,
  bank_account_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  inserted_at timestamptz not null default now()
);
alter table public.budget_requisitions enable row level security;
drop policy if exists "members_all" on public.budget_requisitions;
create policy "members_all" on public.budget_requisitions for all to authenticated
  using (public.is_active_member()) with check (public.is_active_member());

create table if not exists public.p2p_cases (
  id text primary key,
  case_number text,
  title text,
  "type" text,
  department text,
  requester_name text,
  requester_id text,
  requester_nik text,
  request_category text,
  item_name text,
  quantity numeric,
  unit text,
  estimated_unit_price numeric,
  total_estimated_price numeric,
  description text,
  justification text,
  urgency text,
  attachment_url text,
  attachment_file_name text,
  manager_approval jsonb,
  hr_approval jsonb,
  finance_approval jsonb,
  ceo_approval jsonb,
  stage text,
  po_number text,
  selected_vendor text,
  selected_vendor_contact text,
  agreed_price numeric,
  quotes jsonb,
  po_issued_at text,
  po_issued_by text,
  payment_terms text,
  gr_number text,
  delivery_note_number text,
  received_at text,
  received_by text,
  received_quantity numeric,
  qc_status text,
  bast_notes text,
  proof_image_url text,
  proof_image_file_name text,
  vendor_invoice_number text,
  tax_invoice_number text,
  invoice_amount numeric,
  three_way_matched boolean,
  matched_by text,
  matched_at text,
  paid_at text,
  paid_by text,
  paid_amount numeric,
  bank_account_id text,
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  inserted_at timestamptz not null default now()
);
alter table public.p2p_cases enable row level security;
drop policy if exists "members_all" on public.p2p_cases;
create policy "members_all" on public.p2p_cases for all to authenticated
  using (public.is_active_member()) with check (public.is_active_member());

create table if not exists public.company_tasks (
  id text primary key,
  title text,
  description text,
  priority text,
  status text,
  target_type text,
  target_division text,
  assigned_to_user_ids jsonb,
  assigned_to_names jsonb,
  created_by_user_id text,
  created_by_name text,
  created_by_role text,
  created_at timestamptz not null default now(),
  published_at text,
  due_date text,
  points numeric,
  attachments jsonb,
  started_at text,
  submission jsonb,
  review jsonb,
  revision_notes text,
  opened_by_user_ids jsonb,
  inserted_at timestamptz not null default now()
);
alter table public.company_tasks enable row level security;
drop policy if exists "members_all" on public.company_tasks;
create policy "members_all" on public.company_tasks for all to authenticated
  using (public.is_active_member()) with check (public.is_active_member());

create table if not exists public.attendance_records (
  id text primary key,
  user_id text,
  user_name text,
  user_nik text,
  user_division text,
  "date" text,
  clock_in_time text,
  clock_in_timestamp text,
  clock_in_location jsonb,
  clock_in_selfie_photo text,
  clock_in_notes text,
  clock_out_time text,
  clock_out_timestamp text,
  clock_out_location jsonb,
  clock_out_selfie_photo text,
  clock_out_notes text,
  work_type text,
  status text,
  has_anomaly boolean,
  anomaly_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  inserted_at timestamptz not null default now()
);
alter table public.attendance_records enable row level security;
drop policy if exists "members_all" on public.attendance_records;
create policy "members_all" on public.attendance_records for all to authenticated
  using (public.is_active_member()) with check (public.is_active_member());

create table if not exists public.attendance_corrections (
  id text primary key,
  user_id text,
  user_name text,
  user_nik text,
  user_division text,
  "date" text,
  "type" text,
  proposed_clock_in text,
  proposed_clock_out text,
  reason text,
  attachment_url text,
  status text,
  reviewed_by text,
  review_notes text,
  reviewed_at text,
  created_at timestamptz not null default now(),
  inserted_at timestamptz not null default now()
);
alter table public.attendance_corrections enable row level security;
drop policy if exists "members_all" on public.attendance_corrections;
create policy "members_all" on public.attendance_corrections for all to authenticated
  using (public.is_active_member()) with check (public.is_active_member());

create table if not exists public.event_reminders (
  id text primary key,
  title text,
  "date" text,
  is_all_day boolean,
  start_time text,
  end_time text,
  location text,
  reminder_minutes numeric,
  notes text,
  attachment_url text,
  division text,
  dismissed boolean,
  snoozed_until text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  inserted_at timestamptz not null default now()
);
alter table public.event_reminders enable row level security;
drop policy if exists "members_all" on public.event_reminders;
create policy "members_all" on public.event_reminders for all to authenticated
  using (public.is_active_member()) with check (public.is_active_member());

create table if not exists public.boards (
  id text primary key,
  title text,
  description text,
  emoji text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  inserted_at timestamptz not null default now()
);
alter table public.boards enable row level security;
drop policy if exists "members_all" on public.boards;
create policy "members_all" on public.boards for all to authenticated
  using (public.is_active_member()) with check (public.is_active_member());

create table if not exists public.board_columns (
  id text primary key,
  title text,
  board_id text,
  color text,
  "order" numeric,
  inserted_at timestamptz not null default now()
);
alter table public.board_columns enable row level security;
drop policy if exists "members_all" on public.board_columns;
create policy "members_all" on public.board_columns for all to authenticated
  using (public.is_active_member()) with check (public.is_active_member());

create table if not exists public.board_cards (
  id text primary key,
  title text,
  description text,
  column_id text,
  board_id text,
  assignees jsonb,
  labels jsonb,
  deadline text,
  priority text,
  comments jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  "order" numeric,
  inserted_at timestamptz not null default now()
);
alter table public.board_cards enable row level security;
drop policy if exists "members_all" on public.board_cards;
create policy "members_all" on public.board_cards for all to authenticated
  using (public.is_active_member()) with check (public.is_active_member());

create table if not exists public.notes (
  id text primary key,
  title text,
  content text,
  tags jsonb,
  comments jsonb,
  paper_size text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  emoji text,
  author_id text,
  author_name text,
  author_division text,
  share_scope text,
  target_divisions jsonb,
  target_user_ids jsonb,
  target_user_names jsonb,
  read_records jsonb,
  color text,
  is_pinned boolean,
  inserted_at timestamptz not null default now()
);
alter table public.notes enable row level security;
drop policy if exists "members_all" on public.notes;
create policy "members_all" on public.notes for all to authenticated
  using (public.is_active_member()) with check (public.is_active_member());

create table if not exists public.workspace_tables (
  id text primary key,
  "name" text,
  emoji text,
  category text,
  description text,
  fields jsonb,
  rows jsonb,
  spreadsheet_url text,
  gdocs_url text,
  last_synced_at text,
  created_at timestamptz not null default now(),
  inserted_at timestamptz not null default now()
);
alter table public.workspace_tables enable row level security;
drop policy if exists "members_all" on public.workspace_tables;
create policy "members_all" on public.workspace_tables for all to authenticated
  using (public.is_active_member()) with check (public.is_active_member());

create table if not exists public.workspace_documents (
  id text primary key,
  title text,
  emoji text,
  category text,
  description text,
  content text,
  author text,
  department text,
  version text,
  status text,
  paper_size text,
  comments jsonb,
  gdocs_url text,
  last_synced_at text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  inserted_at timestamptz not null default now()
);
alter table public.workspace_documents enable row level security;
drop policy if exists "members_all" on public.workspace_documents;
create policy "members_all" on public.workspace_documents for all to authenticated
  using (public.is_active_member()) with check (public.is_active_member());

create table if not exists public.drive_items (
  id text primary key,
  "name" text,
  "type" text,
  mime_type text,
  size text,
  updated_at text,
  url text,
  author text,
  division text,
  tags jsonb,
  is_starred boolean,
  inserted_at timestamptz not null default now()
);
alter table public.drive_items enable row level security;
drop policy if exists "members_all" on public.drive_items;
create policy "members_all" on public.drive_items for all to authenticated
  using (public.is_active_member()) with check (public.is_active_member());

create table if not exists public.activities (
  id text primary key,
  member_id text,
  action text,
  target text,
  "timestamp" timestamptz,
  inserted_at timestamptz not null default now()
);
alter table public.activities enable row level security;
drop policy if exists "members_all" on public.activities;
create policy "members_all" on public.activities for all to authenticated
  using (public.is_active_member()) with check (public.is_active_member());

-- Realtime: perubahan langsung terlihat oleh pengguna lain
do $$
declare t text;
begin
  foreach t in array array['profiles', 'bank_accounts', 'journal_entries', 'purchase_requisitions', 'purchase_orders', 'sales_orders', 'inventory_items', 'fixed_assets', 'payroll_records', 'department_budgets', 'expense_claims', 'budget_requisitions', 'p2p_cases', 'company_tasks', 'attendance_records', 'attendance_corrections', 'event_reminders', 'boards', 'board_columns', 'board_cards', 'notes', 'workspace_tables', 'workspace_documents', 'drive_items', 'activities'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
