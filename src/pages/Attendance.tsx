import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { EmployeeAttendanceTab } from './EmployeeAttendanceTab';
import { HRAttendanceDashboard } from './HRAttendanceDashboard';
import { Clock, ShieldCheck, UserCheck } from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const { session } = useAuthStore();
  const user = session?.user;

  // Sistem HR hanya untuk role HR, Admin, atau CEO
  const isHRorAdmin = user?.role === 'Admin' || user?.role === 'CEO' || user?.role === 'HR';

  const [activeView, setActiveView] = useState<'employee' | 'hr'>('employee');

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
