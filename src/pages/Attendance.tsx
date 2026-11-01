import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { EmployeeAttendanceTab } from './EmployeeAttendanceTab';
import { HRAttendanceDashboard } from './HRAttendanceDashboard';
import { Clock, ShieldCheck, UserCheck, Lock, Unlock } from 'lucide-react';
import { useFeatureStore, canSeeLockedFeatures, canToggleFeatures } from '../stores/featureStore';

export const AttendancePage: React.FC = () => {
  const { session } = useAuthStore();
  const user = session?.user;

  // Sistem HR hanya untuk role HR, Admin, atau CEO
  const isHRorAdmin = user?.role === 'Admin' || user?.role === 'CEO' || user?.role === 'HR';

  const [activeView, setActiveView] = useState<'employee' | 'hr'>('employee');
  const { attendanceEnabled, loaded, setAttendanceEnabled } = useFeatureStore();
  const [savingLock, setSavingLock] = useState(false);

  const toggleLock = async () => {
    const next = !attendanceEnabled;
    const ok = confirm(
      next
        ? 'Buka kunci Absensi Karyawan? Semua karyawan akan dapat melihat dan menggunakan absensi.'
        : 'Kunci Absensi Karyawan? Menu absensi akan disembunyikan dari semua karyawan selain CEO, Admin, dan HR.'
    );
    if (!ok) return;
    setSavingLock(true);
    const res = await setAttendanceEnabled(next);
    setSavingLock(false);
    if (!res.success) alert(res.error);
  };

  // Terkunci: karyawan selain CEO, Admin, dan HR tidak dapat membuka halaman ini
  if (!attendanceEnabled && !canSeeLockedFeatures(user?.role)) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50/50 dark:bg-gray-950">
        <div className="text-center max-w-md space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center">
            <Lock size={26} />
          </div>
          <h2 className="font-bold text-lg text-gray-900 dark:text-white">
            {loaded ? 'Absensi Karyawan belum dibuka' : 'Memuat...'}
          </h2>
          {loaded && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Fitur absensi belum digunakan saat ini dan akan dibuka di masa mendatang oleh CEO atau Admin.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-gray-50/50 dark:bg-gray-950">
      {/* Top Switcher for Admin / HR */}
      {isHRorAdmin && (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-2.5 flex items-center justify-between z-10 flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-gray-500 uppercase tracking-wider">
              Mode Tampilan:
            </span>
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveView('employee')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeView === 'employee'
                    ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-300 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Clock size={13} />
                <span>Absensi Saya (Karyawan)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('hr')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeView === 'hr'
                    ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-300 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <ShieldCheck size={13} />
                <span>Dashboard HR &amp; Rekap Payroll</span>
              </button>
            </div>
          </div>

          <span className="text-[11px] text-gray-400">
            Login sebagai: <strong className="text-gray-700 dark:text-gray-200">{user?.name}</strong> (Role: <span className="text-primary-600 font-bold">{user?.role}</span>)
          </span>
        </div>
      )}

      {/* Status kunci absensi */}
      {(!attendanceEnabled || canToggleFeatures(user?.role)) && (
        <div
          className={`px-6 py-2.5 border-b flex items-center justify-between gap-3 flex-wrap text-xs ${
            attendanceEnabled
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300'
              : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300'
          }`}
        >
          <span className="flex items-center gap-2 font-semibold">
            {attendanceEnabled ? <Unlock size={14} /> : <Lock size={14} />}
            {attendanceEnabled
              ? 'Absensi Karyawan terbuka untuk semua karyawan.'
              : 'Absensi Karyawan sedang dikunci. Hanya CEO, Admin, dan HR yang dapat melihat halaman ini.'}
          </span>
          {canToggleFeatures(user?.role) && (
            <button
              type="button"
              onClick={toggleLock}
              disabled={savingLock || !loaded}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-white disabled:opacity-50 ${
                attendanceEnabled ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {attendanceEnabled ? <Lock size={13} /> : <Unlock size={13} />}
              {savingLock ? 'Menyimpan...' : attendanceEnabled ? 'Kunci Absensi' : 'Buka Kunci Absensi'}
            </button>
          )}
        </div>
      )}

      {/* Render selected view */}
      <div className="flex-1">
        {isHRorAdmin && activeView === 'hr' ? (
          <HRAttendanceDashboard />
        ) : (
          <EmployeeAttendanceTab />
        )}
      </div>
    </div>
  );
};
