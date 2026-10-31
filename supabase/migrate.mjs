// Menjalankan semua file di supabase/migrations ke database Supabase.
// Pemakaian: node supabase/migrate.mjs   (butuh SUPABASE_DB_URL di .env)
// Semua migrasi ditulis idempotent, jadi aman dijalankan ulang.
import 'dotenv/config';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error('SUPABASE_DB_URL belum diisi di .env (Supabase Dashboard → Connect → connection string).');
  process.exit(1);
}

const dir = join(dirname(fileURLToPath(import.meta.url)), 'migrations');
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  for (const file of files) {
    process.stdout.write(`→ ${file} ... `);
    await client.query('begin');
    try {
      await client.query(readFileSync(join(dir, file), 'utf8'));
      await client.query('commit');
      console.log('OK');
    } catch (err) {
      await client.query('rollback');
      console.log('GAGAL');
      throw err;
    }
  }
} finally {
  await client.end();
}
