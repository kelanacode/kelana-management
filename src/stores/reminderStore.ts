import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EventReminder, Division } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 9);

interface ReminderStore {
  reminders: EventReminder[];
  activeAlertReminder: EventReminder | null;
  addReminder: (data: Omit<EventReminder, 'id' | 'createdAt' | 'updatedAt'>) => EventReminder;
  updateReminder: (id: string, updates: Partial<EventReminder>) => void;
  deleteReminder: (id: string) => void;
  dismissAlert: (id: string) => void;
  snoozeAlert: (id: string, minutes?: number) => void;
  setActiveAlertReminder: (reminder: EventReminder | null) => void;
  triggerTestAlert: (reminderId?: string) => void;
}

const getTodayFormatted = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTomorrowFormatted = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const SAMPLE_REMINDERS: EventReminder[] = [];

export const useReminderStore = create<ReminderStore>()(
  persist(
    (set, get) => ({
      reminders: SAMPLE_REMINDERS,
      activeAlertReminder: null,

      addReminder: (data) => {
        const reminder: EventReminder = {
          ...data,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ reminders: [reminder, ...state.reminders] }));
        return reminder;
      },

      updateReminder: (id, updates) => {
        set((state) => ({
          reminders: state.reminders.map((r) =>
            r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
          ),
        }));
      },

      deleteReminder: (id) => {
        set((state) => ({
          reminders: state.reminders.filter((r) => r.id !== id),
          activeAlertReminder: state.activeAlertReminder?.id === id ? null : state.activeAlertReminder,
        }));
      },

      dismissAlert: (id) => {
        set((state) => ({
          activeAlertReminder: null,
          reminders: state.reminders.map((r) => (r.id === id ? { ...r, dismissed: true } : r)),
        }));
      },

      snoozeAlert: (id, minutes = 5) => {
        const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
        set((state) => ({
          activeAlertReminder: null,
          reminders: state.reminders.map((r) =>
            r.id === id ? { ...r, snoozedUntil, dismissed: false } : r
          ),
        }));
      },

      setActiveAlertReminder: (reminder) => {
        set({ activeAlertReminder: reminder });
      },

      triggerTestAlert: (reminderId) => {
        const { reminders } = get();
        const target = reminderId ? reminders.find((r) => r.id === reminderId) : reminders[0];
        if (target) {
          set({ activeAlertReminder: target });
        }
      },
    }),
    {
      name: 'ruang-kelana-reminders-clean',
    }
  )
);
