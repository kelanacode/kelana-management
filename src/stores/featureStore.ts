// Fitur aplikasi yang bisa dikunci / dibuka oleh CEO & Admin (tabel app_settings).
import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface FeatureStore {
  loaded: boolean;
  attendanceEnabled: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  setAttendanceEnabled: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
}

let channel: RealtimeChannel | null = null;

const apply = (key: string, value: unknown) => {
  if (key === 'attendance_enabled') useFeatureStore.setState({ attendanceEnabled: value === true });
};

// Role yang tetap bisa melihat fitur yang sedang dikunci
export const canSeeLockedFeatures = (role?: string) => role === 'CEO' || role === 'Admin' || role === 'HR';
// Role yang boleh mengunci / membuka fitur
export const canToggleFeatures = (role?: string) => role === 'CEO' || role === 'Admin';

export const useFeatureStore = create<FeatureStore>()((set) => ({
  loaded: false,
  attendanceEnabled: false,

  start: async () => {
    const { data, error } = await supabase.from('app_settings').select('key, value');
    if (!error) {
      for (const row of data ?? []) apply(row.key, row.value);
      set({ loaded: true });
    }
    if (channel) await supabase.removeChannel(channel);
    channel = supabase
      .channel('kelana-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, (p: any) => {
        if (p.new?.key) apply(p.new.key, p.new.value);
      })
      .subscribe();
  },

  stop: async () => {
    if (channel) await supabase.removeChannel(channel);
    channel = null;
    set({ loaded: false, attendanceEnabled: false });
  },

  setAttendanceEnabled: async (enabled) => {
    const { data, error } = await supabase
      .from('app_settings')
      .update({ value: enabled })
      .eq('key', 'attendance_enabled')
      .select();
    if (error || !data?.length) {
      return { success: false, error: 'Hanya CEO dan Admin yang dapat mengubah status absensi.' };
    }
    set({ attendanceEnabled: enabled });
    return { success: true };
  },
}));
