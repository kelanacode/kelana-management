import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Member, Activity, AppSettings } from '../types';

interface AppStore {
  settings: AppSettings;
  members: Member[];
  activities: Activity[];
  isMobileSidebarOpen: boolean;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  addActivity: (memberId: string, action: string, target: string) => void;
}

const MEMBERS: Member[] = [
  { id: 'member-1', name: 'Andi Wirawan', email: 'andi@ruangkelana.id', role: 'Frontend Developer', avatar: 'AW', color: '#7c3aed', online: true },
  { id: 'member-2', name: 'Budi Santoso', email: 'budi@ruangkelana.id', role: 'Product Designer', avatar: 'BS', color: '#2563eb', online: true },
  { id: 'member-3', name: 'Citra Dewi', email: 'citra@ruangkelana.id', role: 'Backend Developer', avatar: 'CD', color: '#10b981', online: false },
  { id: 'member-4', name: 'Dewi Rahayu', email: 'dewi@ruangkelana.id', role: 'Project Manager', avatar: 'DR', color: '#f59e0b', online: true },
];

const SAMPLE_ACTIVITIES: Activity[] = [
  { id: 'a1', memberId: 'member-1', action: 'menambahkan kartu', target: 'Implementasi design system', timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: 'a2', memberId: 'member-2', action: 'memindahkan kartu ke', target: 'Done: Desain wireframe', timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: 'a3', memberId: 'member-3', action: 'mengedit wiki', target: 'Dokumentasi Teknis', timestamp: new Date(Date.now() - 10800000).toISOString() },
  { id: 'a4', memberId: 'member-4', action: 'membuat catatan baru', target: 'Meeting Notes - Tim Produk', timestamp: new Date(Date.now() - 18000000).toISOString() },
  { id: 'a5', memberId: 'member-1', action: 'menambahkan baris di', target: 'Database CRM Leads', timestamp: new Date(Date.now() - 86400000).toISOString() },
];

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      settings: {
        theme: 'light',
        sidebarCollapsed: false,
        currentUser: MEMBERS[0],
      },
      members: MEMBERS,
      activities: SAMPLE_ACTIVITIES,
      isMobileSidebarOpen: false,

      toggleTheme: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            theme: state.settings.theme === 'light' ? 'dark' : 'light',
          },
        })),

      toggleSidebar: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            sidebarCollapsed: !state.settings.sidebarCollapsed,
          },
        })),

      setMobileSidebarOpen: (open: boolean) =>
        set(() => ({
          isMobileSidebarOpen: open,
        })),

      addActivity: (memberId, action, target) => {
        const activity: Activity = {
          id: Math.random().toString(36).substring(2, 9),
          memberId,
          action,
          target,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          activities: [activity, ...state.activities].slice(0, 50),
        }));
      },
    }),
    { name: 'ruang-kelana-app' }
  )
);
