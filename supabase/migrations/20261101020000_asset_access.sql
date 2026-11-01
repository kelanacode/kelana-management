-- Manajemen Aset hanya untuk CEO, Admin, dan role HR dengan jabatan General Affair.
-- Menggantikan policy umum "members_all" pada tabel-tabel aset.

create or replace function public.can_access_assets()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and status = 'Active'
      and (
        role in ('Admin', 'CEO')
        or (role = 'HR' and (position ~* 'general\s*affairs?' or position ~ '\mGA\M'))
      )
  );
$$;

do $$
declare t text;
begin
  foreach t in array array['assets', 'asset_loans', 'asset_maintenance', 'asset_requests', 'asset_audits', 'supplies', 'supply_movements']
  loop
    execute format('drop policy if exists "members_all" on public.%I', t);
    execute format('drop policy if exists "asset_access" on public.%I', t);
    execute format(
      'create policy "asset_access" on public.%I for all to authenticated using (public.can_access_assets()) with check (public.can_access_assets())',
      t
    );
  end loop;
end $$;
