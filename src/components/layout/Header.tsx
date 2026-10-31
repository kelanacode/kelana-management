import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Sun, Moon, Bell, Search, Menu } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useTaskStore } from '../../stores/taskStore';
import { useNotesStore, checkNoteAccess, isNoteReadByUser } from '../../stores/notesStore';
import { useChatStore, totalUnread } from '../../stores/chatStore';
import { checkTaskAccess } from '../../utils/taskAccess';
import { useAuthStore } from '../../stores/authStore';
import { GlobalSearchModal } from './GlobalSearchModal';
import { NotificationPopover } from './NotificationPopover';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Selamat datang kembali 👋' },
  '/attendance': { title: 'Absensi Karyawan & HR', subtitle: 'Pencatatan kehadiran geofencing, verifikasi wajah & rekap HR' },
  '/notes': { title: 'Notes & Dokumen', subtitle: 'Tulis dan kelola catatan Anda' },
  '/board': { title: 'Kanban Board', subtitle: 'Kelola proyek dan tugas secara visual' },
  '/database': { title: 'Database', subtitle: 'Susun dan kelola data terstruktur' },
  '/wiki': { title: 'Wiki & Knowledge Base', subtitle: 'Bangun perpustakaan pengetahuan tim' },
  '/calendar': { title: 'Kalender & Pengingat Acara', subtitle: 'Jadwal kegiatan divisi dan tenggat waktu tugas (WIB)' },
  '/team': { title: 'Tim & Kolaborasi', subtitle: 'Kelola anggota tim dan aktivitas' },
};

interface IntegrationApp {
  id: string;
  name: string;
  desc: string;
  category: string;
  iconBg: string;
  iconText: string;
  connected: boolean;
  syncDetail: string;
}

export const Header: React.FC = () => {
  const location = useLocation();
  const { settings, toggleTheme, setMobileSidebarOpen } = useAppStore();
  const { session } = useAuthStore();
  const currentUser = session?.user;
  const currentUserId = currentUser?.id;

  const { notes } = useNotesStore();
  const { tasks } = useTaskStore();
  const chatState = useChatStore();

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Shortcut keyboard Ctrl+K atau Cmd+K untuk membuka search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cek apakah user adalah CEO / HR / Admin
  const isBossOrHR =
    currentUser?.role === 'CEO' ||
    currentUser?.role === 'Admin' ||
    currentUser?.role === 'HR' ||
    (currentUser?.position || '').toLowerCase().includes('ceo') ||
    (currentUser?.position || '').toLowerCase().includes('hr') ||
    (currentUser?.position || '').toLowerCase().includes('human resource') ||
    (currentUser?.position || '').toLowerCase().includes('direktur');

  // Hitung jumlah notifikasi belum terbaca
  const unreadNotesCount = notes.filter(
    (n) => checkNoteAccess(n, currentUser) && !isNoteReadByUser(n, currentUserId)
  ).length;

  // 1. Taks baru/ditugaskan untuk akun masing-masing (HANYA jika diberikan tugas)
  const unreadEmployeeTasksCount = tasks.filter((t) => {
    return checkTaskAccess(t, currentUser) && t.status !== 'Completed' && !t.openedByUserIds?.includes(currentUserId || '');
  }).length;

  // 2. Taks yang sudah dikerjakan karyawan (Submitted / Under Review) untuk ditinjau oleh CEO & HR
  const submittedTasksForReviewCount = isBossOrHR
    ? tasks.filter((t) => (t.status === 'Submitted' || t.status === 'Under Review') && Boolean(t.submission)).length
    : 0;

  // 3. Pesan chat baru yang belum dibaca khusus untuk akun user ini (Personal maupun Tim)
  const unreadChatCount = totalUnread(chatState);

  const totalUnreadNotifications = unreadNotesCount + unreadEmployeeTasksCount + submittedTasksForReviewCount + unreadChatCount;

  const pageInfo = pageTitles[location.pathname] ?? { title: 'Ruang Kelana', subtitle: '' };

  return (
    <>
      <header className="h-14 flex items-center justify-between px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white text-base leading-none">{pageInfo.title}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-none mt-1">{pageInfo.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Global Search Button */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-all shadow-xs border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
            title="Cari apapun di Ruang Kelana (Ctrl+K)"
          >
            <Search size={14} className="text-primary-600" />
            <span className="text-xs">Cari apa saja...</span>
            <kbd className="text-[10px] bg-white dark:bg-gray-700 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 font-mono text-gray-400 dark:text-gray-300">
              ⌘K
            </kbd>
          </button>

          {/* Notification Button */}
          <button
            onClick={() => setShowNotifications(true)}
            className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
            title="Pemberitahuan & Notifikasi"
          >
            <Bell size={18} />
            {totalUnreadNotifications > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary-600 text-[10px] font-bold text-white flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-sm animate-pulse">
                {totalUnreadNotifications}
              </span>
            )}
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors text-xs font-medium cursor-pointer"
            title={settings.theme === 'light' ? 'Beralih ke Mode Gelap (Dark Mode)' : 'Beralih ke Mode Terang (Light Mode)'}
          >
            {settings.theme === 'light' ? (
              <>
                <Moon size={15} className="text-indigo-600" />
                <span className="hidden sm:inline">Mode Gelap</span>
              </>
            ) : (
              <>
                <Sun size={15} className="text-amber-400" />
                <span className="hidden sm:inline">Mode Terang</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Modal Pencarian Global */}
      <GlobalSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
      />

      {/* Popover Notifikasi */}
      <NotificationPopover
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </>
  );
};
