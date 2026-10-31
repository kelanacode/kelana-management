import React, { useState } from 'react';
import {
  ChevronLeft, ChevronRight, Clock, MapPin, Building2,
  Calendar as CalIcon, Plus, BellRing, Sparkles, Edit3, Trash2,
  ExternalLink, Link as LinkIcon, X, Check, Filter, AlertCircle
} from 'lucide-react';
import { useBoardStore } from '../stores/boardStore';
import { useReminderStore } from '../stores/reminderStore';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, parseISO, isToday, addMonths, subMonths
} from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Priority, EventReminder, Division } from '../types';
import { useAuthStore } from '../stores/authStore';

const DIVISIONS: Division[] = [
  'Semua Divisi',
  'Teknologi & IT',
  'Produk & Desain',
  'Pemasaran & Bisnis',
  'Marketing',
  'Operasional & HR',
  'Keuangan & Legal',
];

const TIMER_OPTIONS = [5, 10, 15, 30, 45, 60];

const divisionColorMap: Record<Division, { bg: string; text: string; border: string; dot: string }> = {
  'Semua Divisi': { bg: 'bg-indigo-50 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800', dot: 'bg-indigo-500' },
  'Teknologi & IT': { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500' },
  'Produk & Desain': { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800', dot: 'bg-purple-500' },
  'Pemasaran & Bisnis': { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' },
  'Marketing': { bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800', dot: 'bg-orange-500' },
  'Operasional & HR': { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' },
  'Keuangan & Legal': { bg: 'bg-rose-50 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800', dot: 'bg-rose-500' },
};

const priorityColor: Record<Priority, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-green-500',
};

const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState<string>('Semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { cards, boards } = useBoardStore();
  const { session } = useAuthStore();
  const currentUser = session?.user;
  const userGCalEmail = currentUser?.googleCalendarEmail || currentUser?.email || '';
  const {
    reminders,
    addReminder,
    updateReminder,
    deleteReminder,
    triggerTestAlert
  } = useReminderStore();

  const boardMap = Object.fromEntries(boards.map((b) => [b.id, b]));

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    isAllDay: false,
    startTime: '09:00',
    endTime: '10:30',
    location: '',
    reminderMinutes: 15,
    customMinutes: '',
    notes: '',
    attachmentUrl: '',
    division: 'Semua Divisi' as Division,
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start
  const startPad = monthStart.getDay();
  const paddedDays = [...Array(startPad).fill(null), ...days];

  // Filter helpers
  const getRemindersForDay = (day: Date) => {
    const formatted = format(day, 'yyyy-MM-dd');
    return reminders.filter((r) => {
      const matchDate = r.date === formatted;
      const matchDiv =
        selectedDivisionFilter === 'Semua' || r.division === selectedDivisionFilter;
      return matchDate && matchDiv;
    });
  };

  const getCardsForDay = (day: Date) =>
    cards.filter((c) => c.deadline && isSameDay(parseISO(c.deadline), day));

  const selectedDayReminders = selectedDay ? getRemindersForDay(selectedDay) : [];
  const selectedDayCards = selectedDay ? getCardsForDay(selectedDay) : [];

  const openCreateModal = (targetDate?: Date) => {
    const dateStr = targetDate ? format(targetDate, 'yyyy-MM-dd') : (selectedDay ? format(selectedDay, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    setEditingId(null);
    setFormData({
      title: '',
      date: dateStr,
      isAllDay: false,
      startTime: '09:00',
      endTime: '10:30',
      location: '',
      reminderMinutes: 15,
      customMinutes: '',
      notes: '',
      attachmentUrl: '',
      division: 'Semua Divisi',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (rem: EventReminder) => {
    setEditingId(rem.id);
    const isCustom = !TIMER_OPTIONS.includes(rem.reminderMinutes);
    setFormData({
      title: rem.title,
      date: rem.date,
      isAllDay: rem.isAllDay,
      startTime: rem.startTime || '09:00',
      endTime: rem.endTime || '10:30',
      location: rem.location,
      reminderMinutes: isCustom ? 0 : rem.reminderMinutes,
      customMinutes: isCustom ? String(rem.reminderMinutes) : '',
      notes: rem.notes,
      attachmentUrl: rem.attachmentUrl || '',
      division: rem.division,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const finalMinutes =
      formData.reminderMinutes === 0 && formData.customMinutes
        ? Math.max(1, parseInt(formData.customMinutes) || 15)
        : formData.reminderMinutes || 15;

    const payload = {
      title: formData.title.trim(),
      date: formData.date,
      isAllDay: formData.isAllDay,
      startTime: formData.isAllDay ? '00:00' : formData.startTime,
      endTime: formData.isAllDay ? '23:59' : formData.endTime,
      location: formData.location.trim(),
      reminderMinutes: finalMinutes,
      notes: formData.notes.trim(),
      attachmentUrl: formData.attachmentUrl.trim() || undefined,
      division: formData.division,
      dismissed: false,
    };

    if (editingId) {
      updateReminder(editingId, payload);
    } else {
      addReminder(payload);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Calendar View */}
      <div className="flex-1 flex flex-col overflow-hidden p-6">
        {/* Top Header & Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                {format(currentDate, "MMMM yyyy", { locale: idLocale })}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-semibold">
                Zona Waktu: WIB (UTC+7)
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Kalender terintegrasi: jadwal kegiatan divisi, pengingat pop-up otomatis, dan tenggat waktu proyek.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`https://calendar.google.com/calendar/u/${userGCalEmail}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              title="Buka Google Calendar Akun Pribadi Pegawai"
            >
              <CalIcon size={13} className="text-blue-600" />
              Google Calendar Pribadi
            </a>

            <button
              onClick={() => triggerTestAlert()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-semibold transition-colors"
              title="Uji coba pop-up notifikasi sebelum acara berlangsung"
            >
              <Sparkles size={13} className="text-amber-500" />
              Uji Pop-up Pengingat
            </button>

            <button
              onClick={() => openCreateModal()}
              className="btn-primary text-xs py-1.5 px-3.5"
            >
              <Plus size={14} /> Tambah Acara (WIB)
            </button>

            <div className="flex items-center gap-1 border-l border-gray-200 dark:border-gray-700 pl-2">
              <button onClick={() => setCurrentDate(new Date())} className="btn-secondary text-xs px-2.5 py-1.5">
                Hari Ini
              </button>
              <button
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Division Filter Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 text-xs">
          <span className="text-gray-400 flex items-center gap-1 text-[11px] font-medium mr-1">
            <Filter size={12} /> Filter:
          </span>
          <button
            onClick={() => setSelectedDivisionFilter('Semua')}
            className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedDivisionFilter === 'Semua'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            Semua Acara ({reminders.length})
          </button>
          {DIVISIONS.map((div) => {
            const count = reminders.filter((r) => r.division === div).length;
            return (
              <button
                key={div}
                onClick={() => setSelectedDivisionFilter(div)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedDivisionFilter === div
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {div} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-1.5">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 flex-1 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-gray-900">
          {paddedDays.map((day, idx) => {
            if (!day) {
              return (
                <div
                  key={`pad-${idx}`}
                  className="calendar-day other-month bg-gray-50/40 dark:bg-gray-800/20"
                />
              );
            }

            const dayReminders = getRemindersForDay(day);
            const dayCards = getCardsForDay(day);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const todayClass = isToday(day) ? 'today' : '';
            const otherMonthClass = !isSameMonth(day, currentDate) ? 'other-month' : '';

            return (
              <div
                key={day.toISOString()}
                className={`calendar-day ${todayClass} ${otherMonthClass} ${
                  isSelected ? 'ring-2 ring-primary-500 ring-inset z-10' : ''
                } flex flex-col justify-between`}
                onClick={() => setSelectedDay(day)}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday(day)
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {(dayReminders.length > 0 || dayCards.length > 0) && (
                      <span className="text-[10px] text-gray-400 font-medium">
                        {dayReminders.length + dayCards.length} agenda
                      </span>
                    )}
                  </div>

                  {/* Badges preview */}
                  <div className="space-y-1">
                    {/* Event Reminders (with division dot & time) */}
                    {dayReminders.slice(0, 2).map((rem) => {
                      const divStyle = divisionColorMap[rem.division] || divisionColorMap['Semua Divisi'];
                      return (
                        <div
                          key={rem.id}
                          className={`text-[11px] px-1.5 py-0.5 rounded-md truncate font-medium flex items-center gap-1 border ${divStyle.bg} ${divStyle.text} ${divStyle.border}`}
                          title={`${rem.title} (${rem.isAllDay ? 'Satu Hari Penuh' : rem.startTime + ' WIB'}) - Divisi ${rem.division}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${divStyle.dot}`} />
                          <span className="truncate">{rem.title}</span>
                        </div>
                      );
                    })}

                    {/* Task cards deadline */}
                    {dayCards.slice(0, 1).map((card) => (
                      <div
                        key={card.id}
                        className={`text-[11px] px-1.5 py-0.5 rounded-md truncate text-white ${priorityColor[card.priority]}`}
                        title={`Tugas Board: ${card.title}`}
                      >
                        {card.title}
                      </div>
                    ))}

                    {dayReminders.length + dayCards.length > 3 && (
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 px-1 font-medium">
                        +{dayReminders.length + dayCards.length - 3} lagi...
                      </div>
                    )}
                  </div>
                </div>

                {/* Hover button to add reminder for this day */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openCreateModal(day);
                  }}
                  className="opacity-0 hover:opacity-100 text-[10px] text-primary-600 dark:text-primary-400 font-medium text-left pt-1"
                >
                  + Acara
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Sidebar: Selected Day Agenda & Reminders */}
      <div className="w-88 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col overflow-hidden">
        {/* Panel Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
              <CalIcon size={15} className="text-primary-600" />
              {selectedDay ? format(selectedDay, "EEEE, d MMMM yyyy", { locale: idLocale }) : 'Pilih Tanggal'}
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              {selectedDayReminders.length} Pengingat Acara • {selectedDayCards.length} Tugas Board (WIB)
            </p>
          </div>
          <button
            onClick={() => openCreateModal(selectedDay || new Date())}
            className="p-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            title="Tambah acara pada tanggal ini"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* SECTION 1: Pengingat Acara / Events */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <BellRing size={13} className="text-amber-500" />
                Pengingat Acara & Kegiatan ({selectedDayReminders.length})
              </h4>
            </div>

            {selectedDayReminders.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-center">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Tidak ada pengingat acara pada tanggal ini
                </p>
                <button
                  onClick={() => openCreateModal(selectedDay || new Date())}
                  className="text-xs text-primary-600 hover:text-primary-700 font-semibold mt-1 inline-flex items-center gap-1"
                >
                  <Plus size={12} /> Buat Acara Baru
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayReminders.map((rem) => {
                  const divStyle = divisionColorMap[rem.division] || divisionColorMap['Semua Divisi'];

                  return (
                    <div
                      key={rem.id}
                      className="card p-3.5 hover:shadow-sm transition-all border border-gray-200 dark:border-gray-700 space-y-2 relative group"
                    >
                      {/* Top bar: division badge & action buttons */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${divStyle.bg} ${divStyle.text} ${divStyle.border}`}
                        >
                          <Building2 size={11} /> {rem.division}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => triggerTestAlert(rem.id)}
                            className="p-1 rounded text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            title="Tes pop-up notifikasi acara ini"
                          >
                            <BellRing size={13} />
                          </button>
                          <button
                            onClick={() => openEditModal(rem)}
                            className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100"
                            title="Edit acara"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => deleteReminder(rem.id)}
                            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Hapus acara"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* 1. Judul */}
                      <h5 className="font-bold text-sm text-gray-900 dark:text-white leading-snug">
                        {rem.title}
                      </h5>

                      {/* 2. Waktu pelaksanaan (WIB) & 3. Lokasi */}
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-medium">
                          <Clock size={13} className="text-primary-600 flex-shrink-0" />
                          <span>
                            {rem.isAllDay ? 'Satu Hari Penuh (WIB)' : `${rem.startTime} - ${rem.endTime} WIB`}
                          </span>
                        </div>

                        {rem.location && (
                          <div className="flex items-start gap-1.5 text-gray-600 dark:text-gray-400">
                            <MapPin size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-1">{rem.location}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 text-[11px]">
                          <Sparkles size={11} className="flex-shrink-0" />
                          <span>Timer pop-up: <strong>{rem.reminderMinutes} menit</strong> sebelum mulai</span>
                        </div>
                      </div>

                      {/* 4. Catatan mengenai acara */}
                      {rem.notes && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg leading-relaxed whitespace-pre-wrap">
                          {rem.notes}
                        </p>
                      )}

                      {/* 5. Lampiran link */}
                      {rem.attachmentUrl && (
                        <div className="pt-1.5 border-t border-gray-100 dark:border-gray-700">
                          <a
                            href={rem.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium truncate max-w-full"
                          >
                            <LinkIcon size={11} className="flex-shrink-0" />
                            <span className="truncate">{rem.attachmentUrl}</span>
                            <ExternalLink size={10} className="flex-shrink-0" />
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: Tugas Kanban Board */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CalIcon size={13} className="text-blue-500" />
              Tenggat Waktu Kanban ({selectedDayCards.length})
            </h4>

            {selectedDayCards.length === 0 ? (
              <p className="text-xs text-gray-400">Tidak ada kartu tugas dengan deadline pada hari ini</p>
            ) : (
              <div className="space-y-2">
                {selectedDayCards.map((card) => {
                  const board = boardMap[card.boardId];
                  return (
                    <div key={card.id} className="card p-2.5 hover:shadow-xs text-xs">
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-white leading-snug">{card.title}</span>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${priorityColor[card.priority]}`} />
                      </div>
                      {board && (
                        <p className="text-[11px] text-gray-400">
                          {board.emoji} {board.title}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Tambah / Edit Acara */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                  <CalIcon size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    {editingId ? 'Edit Pengingat Acara' : 'Tambah Pengingat Acara ke Kalender'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Format lengkap kegiatan, lokasi, divisi, lampiran, dan timer pop-up (WIB)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4" style={{ maxHeight: 'calc(92vh - 130px)' }}>
              {/* 1. Judul kegiatan/acara */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  1. Judul Kegiatan / Acara <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rapat Koordinasi Strategi Q4 / Townhall Perusahaan"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input text-sm"
                />
              </div>

              {/* 2. Tanggal & Waktu (WIB) */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Clock size={14} className="text-primary-600" /> 2. Waktu Pelaksanaan (Zona Waktu: WIB / UTC+7)
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-600 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.isAllDay}
                      onChange={(e) => setFormData({ ...formData, isAllDay: e.target.checked })}
                      className="rounded accent-primary-600 w-4 h-4 cursor-pointer"
                    />
                    Satu Hari Penuh
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block mb-1">Tanggal Acara</span>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="input text-xs"
                    />
                  </div>

                  {!formData.isAllDay && (
                    <>
                      <div>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 block mb-1">Dari Jam (WIB)</span>
                        <input
                          type="time"
                          required={!formData.isAllDay}
                          value={formData.startTime}
                          onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                          className="input text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 block mb-1">Sampai Jam (WIB)</span>
                        <input
                          type="time"
                          required={!formData.isAllDay}
                          value={formData.endTime}
                          onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                          className="input text-xs"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 3. Lokasi */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  3. Lokasi Acara / Tautan Rapat Virtual
                </label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Contoh: Ruang Rapat Merdeka Lantai 2 / Google Meet: meet.google.com/abc-xyz"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="input pl-9 text-sm"
                  />
                </div>
              </div>

              {/* Pengingat pop-up timer */}
              <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800/60 space-y-2">
                <label className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <BellRing size={14} className="text-amber-600" />
                  Pengingat Pop-up Sebelum Kegiatan Acara Berlangsung
                </label>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Timer notifikasi pop-up (pilih 5, 10, 15, hingga 60 menit, atau atur menit sendiri):
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {TIMER_OPTIONS.map((min) => (
                    <button
                      type="button"
                      key={min}
                      onClick={() => setFormData({ ...formData, reminderMinutes: min, customMinutes: '' })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        formData.reminderMinutes === min
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100/50'
                      }`}
                    >
                      {min} Menit
                    </button>
                  ))}

                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      placeholder="Kustom (menit)"
                      value={formData.customMinutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reminderMinutes: 0,
                          customMinutes: e.target.value,
                        })
                      }
                      className="input text-xs w-32 py-1.5"
                    />
                    <span className="text-xs text-gray-500">menit</span>
                  </div>
                </div>
              </div>

              {/* 6. Divisi */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  6. Untuk Divisi Mana Kegiatannya
                </label>
                <div className="relative">
                  <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={formData.division}
                    onChange={(e) => setFormData({ ...formData, division: e.target.value as Division })}
                    className="input pl-9 text-sm"
                  >
                    {DIVISIONS.map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4. Catatan mengenai acara */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  4. Catatan Mengenai Acara / Kegiatan
                </label>
                <textarea
                  rows={3}
                  placeholder="Tuliskan agenda ringkas, perlengkapan yang wajib disiapkan, instruksi penting..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input text-sm resize-none"
                />
              </div>

              {/* 5. Lampiran: link */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  5. Lampiran (Link Dokumen / Presentasi / Google Drive)
                </label>
                <div className="relative">
                  <LinkIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="url"
                    placeholder="https://drive.google.com/... atau https://docs.google.com/..."
                    value={formData.attachmentUrl}
                    onChange={(e) => setFormData({ ...formData, attachmentUrl: e.target.value })}
                    className="input pl-9 text-sm"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary text-xs py-2 px-5">
                  <Check size={14} /> {editingId ? 'Simpan Perubahan' : 'Tambahkan ke Kalender'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
