// Membuat akun Admin pertama (atau akun lain) langsung tanpa alur undangan email.
// Pemakaian:
//   node supabase/create-admin.mjs <email> "<Nama Lengkap>" [password]
// Jika password dikosongkan, password acak akan dibuat dan ditampilkan sekali.
// Butuh SUPABASE_DB_URL di .env.
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

const [email, name, passwordArg] = process.argv.slice(2);
if (!email || !name) {
  console.error('Pemakaian: node supabase/create-admin.mjs <email> "<Nama Lengkap>" [password]');
  process.exit(1);
}
const password = passwordArg || randomBytes(9).toString('base64url') + 'A1!';
const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query('begin');
  // Undangan dipakai oleh trigger untuk membuat profil Admin
  await client.query(
    `insert into public.invitations (email, name, username, nik, division, position, role, avatar, color, invited_by)
     values (lower($1), $2, 'admin', 'KEL-001', 'Operasional & HR', 'HR & Office Administrator', 'Admin', $3, '#7c3aed', 'setup')`,
    [email, name, initials]
  );
  const { rows } = await client.query(
    `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                             raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                             confirmation_token, recovery_token, email_change_token_new, email_change)
     values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
             lower($1), crypt($2, gen_salt('bf')), now(),
             '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')
     returning id`,
    [email, password]
  );
  const id = rows[0].id;
  await client.query(
    `insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
     values (gen_random_uuid(), $1::uuid, $1::text, jsonb_build_object('sub', $1::text, 'email', lower($2), 'email_verified', true),
             'email', now(), now(), now())`,
    [String(id), email]
  );
  await client.query('commit');
  console.log(`Akun Admin dibuat: ${email}`);
  if (!passwordArg) console.log(`Password: ${password}  (simpan sekarang, tidak akan ditampilkan lagi)`);
} catch (err) {
  await client.query('rollback');
  throw err;
} finally {
  await client.end();
}
