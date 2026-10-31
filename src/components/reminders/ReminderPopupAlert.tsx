import React, { useEffect } from 'react';
import {
  BellRing, Clock, MapPin, Building2, Link as LinkIcon,
  X, Check, AlertTriangle, ExternalLink, Calendar
} from 'lucide-react';
import { useReminderStore } from '../../stores/reminderStore';

export const ReminderPopupAlert: React.FC = () => {
  const {
    reminders,
    activeAlertReminder,
    setActiveAlertReminder,
    dismissAlert,
    snoozeAlert
  } = useReminderStore();

  // Polling interval to check upcoming events based on reminderMinutes in WIB
  useEffect(() => {
    const checkUpcomingReminders = () => {
      if (activeAlertReminder) return; // already showing one

      const now = new Date();
      // Calculate current timestamp
      const nowTime = now.getTime();

      for (const rem of reminders) {
        if (rem.dismissed) continue;

        // Check snoozed status
        if (rem.snoozedUntil && new Date(rem.snoozedUntil).getTime() > nowTime) {
          continue;
        }

        if (rem.isAllDay) {
          // Check if today matches the date
          const [rYear, rMonth, rDay] = rem.date.split('-').map(Number);
          const remDate = new Date(rYear, rMonth - 1, rDay, 8, 0, 0); // trigger at 08:00 WIB
          const diffMin = (remDate.getTime() - nowTime) / (60 * 1000);
          if (diffMin <= rem.reminderMinutes && diffMin >= -120) {
            setActiveAlertReminder(rem);
            break;
          }
        } else if (rem.startTime) {
          const [rYear, rMonth, rDay] = rem.date.split('-').map(Number);
          const [rHour, rMin] = rem.startTime.split(':').map(Number);
          const targetEventTime = new Date(rYear, rMonth - 1, rDay, rHour, rMin, 0).getTime();

          const reminderTriggerTime = targetEventTime - rem.reminderMinutes * 60 * 1000;

          // If current time is past trigger time, but not later than 60 mins after event start
          if (nowTime >= reminderTriggerTime && nowTime <= targetEventTime + 60 * 60 * 1000) {
            setActiveAlertReminder(rem);
            break;
          }
        }
      }
    };

    const interval = setInterval(checkUpcomingReminders, 8000);
    checkUpcomingReminders();

    return () => clearInterval(interval);
  }, [reminders, activeAlertReminder, setActiveAlertReminder]);

  if (!activeAlertReminder) return null;

  const rem = activeAlertReminder;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => dismissAlert(rem.id)}
    >
      <div
        className="bg-white dark:bg-gray-900 border-2 border-primary-500 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Urgent header bar */}
        <div className="bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white animate-bounce">
              <BellRing size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded-full">
                  Pengingat Acara
                </span>
                <span className="text-xs text-primary-200 font-medium">Zona Waktu: WIB (UTC+7)</span>
              </div>
              <p className="text-sm text-primary-100 font-medium mt-0.5">
                Pengingat {rem.reminderMinutes} menit sebelum kegiatan berlangsung
              </p>
            </div>
          </div>
          <button
            onClick={() => dismissAlert(rem.id)}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* 1. Judul kegiatan/acara */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
              {rem.title}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {/* 6. Divisi */}
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                <Building2 size={13} /> Divisi: {rem.division}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Calendar size={13} /> {rem.date}
              </span>
            </div>
          </div>

          {/* 2. Waktu pelaksanaan & 3. Lokasi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 text-sm">
            <div className="flex items-start gap-2.5">
              <Clock size={16} className="text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Waktu (WIB)</p>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                  {rem.isAllDay ? 'Satu Hari Penuh' : `${rem.startTime} - ${rem.endTime} WIB`}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Lokasi</p>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5 line-clamp-2">
                  {rem.location || 'Tidak ditentukan'}
                </p>
              </div>
            </div>
          </div>

          {/* 4. Catatan mengenai acara/kegiatan */}
          {rem.notes && (
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1 uppercase tracking-wider">
                Catatan Kegiatan:
              </label>
              <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-700 whitespace-pre-wrap leading-relaxed">
                {rem.notes}
              </div>
            </div>
          )}

          {/* 5. Lampiran: Link */}
          {rem.attachmentUrl && (
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1 uppercase tracking-wider">
                Lampiran / Dokumen Terkait:
              </label>
              <a
                href={rem.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium border border-indigo-200 dark:border-indigo-800 transition-colors truncate max-w-full"
              >
                <LinkIcon size={13} className="flex-shrink-0" />
                <span className="truncate">{rem.attachmentUrl}</span>
                <ExternalLink size={12} className="flex-shrink-0 ml-auto" />
              </a>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => snoozeAlert(rem.id, 5)}
            className="btn-secondary text-xs py-2 px-3.5"
            title="Tunda dan ingatkan kembali 5 menit lagi"
          >
            <Clock size={13} /> Ingatkan 5 Menit Lagi
          </button>

          <button
            onClick={() => dismissAlert(rem.id)}
            className="btn-primary text-xs py-2 px-4 ml-auto"
          >
            <Check size={14} /> Saya Mengerti / Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
