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

const SAMPLE_REMINDERS: EventReminder[] = [
  {
    id: 'rem-1',
    title: 'Sprint Planning & Review Arsitektur Sistem',
    date: getTodayFormatted(),
    isAllDay: false,
    startTime: '10:00',
    endTime: '11:30',
    location: 'Ruang Rapat Merdeka & Google Meet (meet.google.com/xyz-ruang)',
    reminderMinutes: 15,
    notes: 'Membahas roadmap fitur kolaborasi real-time dan persiapan rilis v2. Harap membawa laptop dan update ticket kanban masing-masing.',
    attachmentUrl: 'https://docs.google.com/presentation/d/sample-kelana-sprint',
    division: 'Teknologi & IT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rem-2',
    title: 'Townhall Akbar Ruang Kelana Q4',
    date: getTomorrowFormatted(),
    isAllDay: false,
    startTime: '14:00',
    endTime: '16:00',
    location: 'Auditorium Utama Lantai 3',
    reminderMinutes: 30,
    notes: 'Pemaparan pencapaian kuartal, pengumuman inisiatif baru perusahaan, sesi tanya-jawab terbuka dengan pimpinan, dan ramah tamah.',
    attachmentUrl: 'https://drive.google.com/file/d/townhall-kelana-deck',
    division: 'Semua Divisi',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rem-3',
    title: 'Workshop Design System & Accessibility (A11y)',
    date: getTomorrowFormatted(),
    isAllDay: false,
    startTime: '09:30',
    endTime: '12:00',
    location: 'Creative Studio Room & Zoom ID: 889 2314 9912',
    reminderMinutes: 10,
    notes: 'Pelatihan standarisasi komponen UI/UX, rasio kontras warna, dan navigasi keyboard agar aplikasi ramah disabilitas.',
    attachmentUrl: 'https://www.figma.com/file/sample-kelana-design-system',
    division: 'Produk & Desain',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rem-4',
    title: 'Hari Evaluasi Strategi Bisnis & Kemitraan',
    date: getTomorrowFormatted(),
    isAllDay: true,
    startTime: '00:00',
    endTime: '23:59',
    location: 'Seluruh Kantor Ruang Kelana & Hybrid',
    reminderMinutes: 60,
    notes: 'Fokus satu hari penuh untuk peninjauan kontrak kerja sama klien korporat, target penjualan kuartal penutup, dan rencana ekspansi.',
    attachmentUrl: 'https://drive.google.com/drive/folders/bisnis-strategi',
    division: 'Pemasaran & Bisnis',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

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
      name: 'ruang-kelana-reminders',
    }
  )
);
