import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard,
  FileText,
  Kanban,
  Database,
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
  Settings,
  Compass,
  Plus,
  LogOut,
  UserCheck,
  Clock,
  ShieldCheck,
  DollarSign,
  CheckSquare,
  Package,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useBoardStore } from '../../stores/boardStore';
import { useNotesStore } from '../../stores/notesStore';
import { useAuthStore } from '../../stores/authStore';
import { useFeatureStore, canSeeLockedFeatures } from '../../stores/featureStore';
import { canAccessAssets } from '../../utils/assetUtils';
import { AccountManagementModal } from '../auth/AccountManagementModal';
import { ProfilePersonalizationModal } from '../profile/ProfilePersonalizationModal';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/attendance', icon: Clock, label: 'Absensi Karyawan' },
  { to: '/notes', icon: FileText, label: 'Notes' },
  { to: '/board', icon: Kanban, label: 'Kanban Board' },
  { to: '/database', icon: Database, label: 'Database' },
  { to: '/calendar', icon: Calendar, label: 'Kalender' },
  { to: '/team', icon: Users, label: 'Tim' },
];

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { settings, toggleSidebar, isMobileSidebarOpen, setMobileSidebarOpen } = useAppStore();
  const { addBoard } = useBoardStore();
  const { addNote } = useNotesStore();
  const { session, logout } = useAuthStore();
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
  const collapsed = isDesktop && (settings.sidebarCollapsed);
  // Use session user if available, fallback to default setting
  const user = session?.user || settings.currentUser;

  // Check role & division for Finance access: Admin, Finance, CEO or division Financial
  const anyUser = user as any;
  const hasFinanceAccess =
    anyUser?.role === 'Admin' ||
    anyUser?.role === 'Finance' ||
    anyUser?.role === 'CEO' ||
    anyUser?.position?.toLowerCase().includes('ceo') ||
    anyUser?.division?.toLowerCase().includes('finan');

  // Check role for Account Management access: ONLY Admin and CEO
  const hasAccountManagementAccess =
    anyUser?.role === 'Admin' ||
    anyUser?.role === 'CEO' ||
    anyUser?.position?.toLowerCase().includes('ceo');

  // Absensi sedang dikunci: hanya CEO, Admin, dan HR yang melihat menunya
  const attendanceEnabled = useFeatureStore((s) => s.attendanceEnabled);
  const showAttendance = attendanceEnabled || canSeeLockedFeatures(anyUser?.role);

  const visibleNavItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/tasks', icon: CheckSquare, label: 'Taks' },
    ...(showAttendance ? [{ to: '/attendance', icon: Clock, label: 'Absensi Karyawan' }] : []),
    ...(hasFinanceAccess ? [{ to: '/finance', icon: DollarSign, label: 'Keuangan (Finance)' }] : []),
    { to: '/notes', icon: FileText, label: 'Notes' },
    { to: '/board', icon: Kanban, label: 'Kanban Board' },
    { to: '/database', icon: Database, label: 'Database' },
    ...(canAccessAssets(anyUser) ? [{ to: '/assets', icon: Package, label: 'Manajemen Aset' }] : []),
      { to: '/calendar', icon: Calendar, label: 'Kalender' },
    { to: '/team', icon: Users, label: 'Tim' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className={`flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300
        fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] md:static md:z-auto md:max-w-none
        ${isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} md:translate-x-0 md:shadow-none
        ${collapsed ? 'md:w-16' : 'md:w-64'}`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-3.5 border-b border-gray-100 dark:border-gray-700">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 p-1 flex items-center justify-center shadow-xs border border-gray-200/80 dark:border-gray-700 overflow-hidden flex-shrink-0">
              <img
                src="/kelana-logo.png"
                alt="Kelana Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="font-extrabold text-gray-900 dark:text-white text-sm leading-none tracking-tight">Ruang Kelana</h1>
              <p className="text-[11px] font-medium text-gray-400 dark:text-gray-400 leading-none mt-1">Kelana Corporate</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 p-1 flex items-center justify-center shadow-xs border border-gray-200/80 dark:border-gray-700 mx-auto overflow-hidden">
            <img
              src="/kelana-logo.png"
              alt="Kelana Logo"
              className="w-full h-full object-contain"
            />
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors flex-shrink-0"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {visibleNavItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setMobileSidebarOpen(false)}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center' : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Quick Actions */}
      {!collapsed && (
        <div className="p-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex gap-2">
            <button
              onClick={() => {
                const newNote = addNote();
                navigate('/notes');
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50 transition-colors cursor-pointer"
              title="Buat catatan baru dan langsung buka editor Notes"
            >
              <Plus size={13} />
              Note
            </button>
            <button
              onClick={() => {
                const newBoard = addBoard('Board Baru');
                navigate('/board');
              }}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
              title="Buat board proyek baru dan langsung buka Kanban Board"
            >
              <Plus size={13} />
              Board
            </button>
          </div>
        </div>
      )}

      {/* User & Logout */}
      <div className={`p-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2.5 ${collapsed ? 'justify-center flex-col' : ''}`}>
        <div
          onClick={() => setShowProfileModal(true)}
          className="relative w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 transition-all cursor-pointer hover:ring-2 hover:ring-primary-400 group"
          style={{ backgroundColor: user.color || '#7c3aed' }}
          title="Klik untuk mengisi & mengedit profil data diri (Personalisasi)"
        >
          {anyUser.photoUrl ? (
            <img
              src={anyUser.photoUrl}
              alt={user.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            user.avatar
          )}
          {anyUser.workStatus && (
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white dark:border-gray-900 ${
                anyUser.workStatus === 'Online' ? 'bg-emerald-500' :
                anyUser.workStatus === 'Sedang Rapat' ? 'bg-amber-500' :
                anyUser.workStatus === 'Makan Siang' ? 'bg-blue-500' :
                anyUser.workStatus === 'Sedang Cuti' ? 'bg-rose-500' : 'bg-indigo-500'
              }`}
              title={`Status: ${anyUser.workStatus}`}
            />
          )}
        </div>
        {!collapsed && (
          <div
            onClick={() => setShowProfileModal(true)}
            className="flex-1 min-w-0 cursor-pointer group"
            title="Klik untuk mengisi & mengedit profil data diri (Personalisasi)"
          >
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-primary-600 transition-colors flex items-center gap-1">
              <span className="truncate">{user.name}</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
              <span>{user.role}</span>
              {(user as any).nik && <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1 rounded">{(user as any).nik}</span>}
              {anyUser.workStatus && anyUser.workStatus !== 'Online' && (
                <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold truncate">
                  • {anyUser.workStatus}
                </span>
              )}
            </p>
          </div>
        )}
        {!collapsed && (
          <div className="flex items-center gap-0.5">
            {hasAccountManagementAccess && (
              <button
                onClick={() => setShowAccountModal(true)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                title="Kelola Akun Karyawan (Khusus Admin & CEO)"
              >
                <Users size={15} />
              </button>
            )}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
              title="Keluar / Logout dari Aplikasi"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
        {collapsed && (
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-gray-400 hover:text-rose-500 transition-colors cursor-pointer mt-1"
            title="Keluar / Logout"
          >
            <LogOut size={15} />
          </button>
        )}
      </div>

      {/* Modal dirender di document.body: sidebar memakai translate (menu geser ponsel),
          sehingga elemen fixed di dalamnya akan terkurung selebar sidebar. */}
      {createPortal(
        <>
          {/* Profile Personalization Modal (Untuk semua akun & pegawai) */}
          <ProfilePersonalizationModal
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
          />

          {/* Account Management Modal */}
          <AccountManagementModal
            isOpen={showAccountModal}
            onClose={() => setShowAccountModal(false)}
          />
        </>,
        document.body
      )}
    </aside>
  );
};
