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

const MEMBERS: Member[] = [];

const SAMPLE_ACTIVITIES: Activity[] = [];

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
    { name: 'ruang-kelana-app-clean' }
  )
);
