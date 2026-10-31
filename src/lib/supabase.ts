import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !key) {
  // Tanpa konfigurasi ini aplikasi tidak bisa login maupun menyimpan data.
  console.error('VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY belum diisi di .env');
}

export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true },
});
