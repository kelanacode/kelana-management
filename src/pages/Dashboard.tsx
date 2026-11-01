import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Kanban, Database,
  Plus, TrendingUp, Clock, AlertCircle,
  ArrowRight, Users, BellRing, MapPin, Building2,
  PieChart, DollarSign, ShieldAlert
} from 'lucide-react';
import {
  useNotesStore,
  checkNoteAccess,
  isNoteReadByUser,
  isNoteExpiredForUser,
  getNoteRemainingHours
} from '../stores/notesStore';
import { useBoardStore } from '../stores/boardStore';
import { useDatabaseStore } from '../stores/databaseStore';
import { useAppStore } from '../stores/appStore';
import { useReminderStore } from '../stores/reminderStore';
import { useFinanceStore } from '../stores/financeStore';
import { useAuthStore } from '../stores/authStore';
import { BudgetRequisitionModal } from '../components/budget/BudgetRequisitionModal';
import { ProcureToPayModal } from '../components/procurement/ProcureToPayModal';
import { useBudgetRequisitionStore } from '../stores/budgetRequisitionStore';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { ShoppingCart } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { notes, addNote, markNoteAsRead, selectNote } = useNotesStore();
  const { boards, cards, columns } = useBoardStore();

  // Kolom "selesai" tiap board: kolom bernama Done / Selesai, atau kolom paling kanan bila tidak ada
  const doneColumnIds = new Set(
    boards
      .map((b) => {
        const boardCols = columns.filter((c) => c.boardId === b.id).sort((x, y) => x.order - y.order);
        const named = boardCols.find((c) => /\b(done|selesai|completed?)\b/i.test(c.title));
        return (named ?? boardCols[boardCols.length - 1])?.id;
      })
      .filter((id): id is string => !!id)
  );
  const { tables } = useDatabaseStore();
  const { reminders } = useReminderStore();
  const { settings, members, activities } = useAppStore();
  const { departmentBudgets } = useFinanceStore();
  const { requisitions } = useBudgetRequisitionStore();
  const { session } = useAuthStore();
  const [showBudgetReqModal, setShowBudgetReqModal] = React.useState(false);
  const [showProcurementModal, setShowProcurementModal] = React.useState(false);
  const user = settings.currentUser ?? { name: session?.user.name ?? '' };

  // Format currency rupiah
  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Cek role user saat ini (Finance, CEO, Admin, atau Divisi Spesifik)
  const currentRole = session?.user.role;
  const currentPosition = (session?.user.position || '').toLowerCase();
  const isExecutiveOrFinance =
    currentRole === 'Finance' ||
    currentRole === 'Admin' ||
    currentRole === 'CEO' ||
    session?.user.division === 'All Role' ||
    currentPosition.includes('ceo') ||
    currentPosition.includes('direktur') ||
    currentPosition.includes('chief');

  const userDivision = session?.user.division || 'Teknologi & IT';

  // Filter anggaran:
  // Role Finance / CEO / Admin dapat memantau seluruh anggaran divisi.
  // Karyawan / staff divisi lain HANYA dapat melihat anggaran divisinya masing-masing.
  const visibleBudgets = departmentBudgets.filter((b) => {
    if (isExecutiveOrFinance) return true;
    return b.department.toLowerCase().includes(userDivision.toLowerCase()) ||
           userDivision.toLowerCase().includes(b.department.toLowerCase());
  });

  const now = new Date();
  const upcomingCards = cards
    .filter((c) => c.deadline && isAfter(parseISO(c.deadline), now) && isBefore(parseISO(c.deadline), addDays(now, 7)))
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 5);

  const overdueCards = cards.filter(
    (c) => c.deadline && isBefore(parseISO(c.deadline), now) && !doneColumnIds.has(c.columnId)
  );

  // Saring catatan: HANYA yang ditargetkan untuk pengguna & BELUM kedaluwarsa (otomatis terhapus setelah 2x24 jam sejak dibaca)
  const currentUserId = session?.user?.id;
  const recentNotes = [...notes]
    .filter((n) => checkNoteAccess(n, session?.user) && !isNoteExpiredForUser(n, currentUserId))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const getHourGreeting = () => {
    const h = now.getHours();
    if (h < 12) return 'Selamat pagi';
    if (h < 17) return 'Selamat siang';
    if (h < 20) return 'Selamat sore';
    return 'Selamat malam';
  };

  const stats = [
    { label: 'Total Catatan', value: notes.length, icon: FileText, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', onClick: () => navigate('/notes') },
    { label: 'Proyek Aktif', value: boards.length, icon: Kanban, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', onClick: () => navigate('/board') },
    { label: 'Kalender & Acara', value: reminders.length, icon: BellRing, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', onClick: () => navigate('/calendar') },
    { label: 'Database', value: tables.length, icon: Database, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', onClick: () => navigate('/database') },
  ];

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Greeting */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-blue-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-8 -right-8 w-48 h-48 bg-white rounded-full" />
          <div className="absolute -bottom-12 -left-8 w-64 h-64 bg-white rounded-full" />
        </div>
        <div className="relative">
          <p className="text-primary-200 text-sm font-medium">
            {format(now, "EEEE, d MMMM yyyy", { locale: idLocale })} • Waktu Indonesia Barat (WIB)
          </p>
          <h2 className="text-2xl font-bold mt-1">{getHourGreeting()}, {user.name.split(' ')[0]}! 👋</h2>
          <p className="text-primary-200 mt-1 text-sm">
            {overdueCards.length > 0
              ? `Anda memiliki ${overdueCards.length} tugas terlambat dan ${reminders.length} agenda kegiatan aktif.`
              : `Semua tugas berjalan lancar. Ada ${reminders.length} agenda kegiatan tercatat dalam sistem.`}
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <button onClick={() => { addNote(); navigate('/notes'); }} className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm cursor-pointer">
              <Plus size={15} /> Catatan Baru
            </button>
            <button onClick={() => setShowProcurementModal(true)} className="flex items-center gap-2 px-4 py-2 bg-white/25 hover:bg-white/35 rounded-lg text-sm font-bold transition-colors backdrop-blur-sm shadow-sm cursor-pointer border border-white/20">
              <ShoppingCart size={15} /> Pengadaan Barang (P2P)
            </button>
            <button onClick={() => navigate('/calendar')} className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm cursor-pointer">
              <BellRing size={15} /> Kalender &amp; Acara
            </button>
            <button onClick={() => navigate('/board')} className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm cursor-pointer">
              <Kanban size={15} /> Lihat Board
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg, onClick }) => (
          <button key={label} onClick={onClick} className="card p-4 text-left hover:shadow-md transition-shadow group">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <Icon size={20} className={color} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      {/* Agenda & Pengingat Terdekat (WIB) */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
              <BellRing size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                Agenda & Pengingat Kegiatan Divisi (WIB)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Notifikasi pop-up otomatis disetel sebelum acara dimulai
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/calendar')}
            className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium"
          >
            Buka Kalender <ArrowRight size={12} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {reminders.slice(0, 3).map((rem) => (
            <div
              key={rem.id}
              onClick={() => navigate('/calendar')}
              className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-sm cursor-pointer transition-all bg-gray-50/50 dark:bg-gray-800/40"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center gap-1">
                  <Building2 size={11} /> {rem.division}
                </span>
                <span className="text-[11px] text-amber-600 font-medium">
                  Pop-up: {rem.reminderMinutes}m sblm
                </span>
              </div>
              <p className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">{rem.title}</p>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 mt-2">
                <Clock size={12} className="text-primary-600 flex-shrink-0" />
                <span>
                  {rem.date} • {rem.isAllDay ? 'Satu Hari Penuh (WIB)' : `${rem.startTime} - ${rem.endTime} WIB`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                <MapPin size={12} className="text-red-500 flex-shrink-0" />
                <span className="truncate">{rem.location || 'Lokasi belum ditentukan'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Widget Pemantauan Anggaran Divisi (Sesuai Hak Akses Divisi Masing-Masing / Finance / CEO) */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
              <PieChart size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                {isExecutiveOrFinance
                  ? 'Alokasi & Pemantauan Anggaran Perusahaan (Semua Divisi)'
                  : `Alokasi Anggaran Divisi Anda (${userDivision})`}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isExecutiveOrFinance
                  ? 'Akses Khusus Finance & CEO: Kelola dan pantau seluruh pagu anggaran divisi'
                  : 'Sistem membatasi tampilan hanya untuk alokasi anggaran divisi Anda'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowProcurementModal(true)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Permintaan pengadaan barang atau langganan software atas nama divisi atau perorangan"
            >
              <ShoppingCart size={14} /> Pengadaan Barang (P2P)
            </button>
            <button
              onClick={() => setShowBudgetReqModal(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Ajukan permohonan penggunaan anggaran divisi Anda ke HR, Finance, dan CEO"
            >
              <Plus size={14} /> Ajukan Anggaran (PR)
            </button>
            {isExecutiveOrFinance && (
              <button
                onClick={() => navigate('/finance')}
                className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-semibold ml-1 cursor-pointer"
              >
                Modul Finance <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>

        {visibleBudgets.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            Belum ada data alokasi anggaran aktif yang dialokasikan untuk divisi Anda.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {visibleBudgets.map((b) => (
              <div
                key={b.id}
                className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-gray-900 dark:text-white truncate" title={b.department}>
                    {b.department}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      b.status === 'Aman'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                    }`}
                  >
                    {b.variancePercentage}%
                  </span>
                </div>

                <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      b.variancePercentage > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, b.variancePercentage)}%` }}
                  />
                </div>

                <div className="space-y-1 text-[11px] text-gray-500 pt-0.5">
                  <div className="flex justify-between">
                    <span>Terealisasi:</span>
                    <strong className="text-gray-800 dark:text-gray-200">{formatIDR(b.spentBudget)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Sisa Pagu:</span>
                    <strong className="text-emerald-600 font-semibold">{formatIDR(b.remainingBudget)}</strong>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 dark:border-gray-700 pt-1">
                    <span>Pagu Anggaran:</span>
                    <strong className="text-gray-800 dark:text-gray-200">{formatIDR(b.allocatedBudget)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Notes */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText size={16} className="text-primary-600" /> Catatan Masuk (Notes)
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                🔴 Merah: Belum dibaca • 🟢 Hijau: Sudah dibaca (terhapus otomatis dlm 2x24 jam)
              </p>
            </div>
            <button onClick={() => navigate('/notes')} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium cursor-pointer">
              Lihat semua <ArrowRight size={12} />
            </button>
          </div>
          <div className="space-y-2.5">
            {recentNotes.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                Tidak ada catatan baru yang ditujukan untuk Anda atau semua catatan telah terhapus otomatis setelah 2x24 jam.
              </div>
            ) : (
              recentNotes.map((note) => {
                const isRead = isNoteReadByUser(note, currentUserId);
                const remainingHours = isRead ? getNoteRemainingHours(note, currentUserId) : null;

                return (
                  <button
                    key={note.id}
                    onClick={() => {
                      if (currentUserId) {
                        markNoteAsRead(note.id, currentUserId);
                      }
                      selectNote(note.id);
                      navigate('/notes');
                    }}
                    className={`w-full text-left p-3.5 rounded-xl transition-all group border cursor-pointer ${
                      isRead
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-300 dark:border-emerald-800/60 hover:border-emerald-500 hover:shadow-sm'
                        : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/70 hover:border-rose-500 hover:shadow-md ring-1 ring-rose-200 dark:ring-rose-900/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl mt-0.5">{note.emoji || '📄'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {/* Indikator Status Warna Merah / Hijau */}
                          {isRead ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              SUDAH DIBACA
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/70 dark:text-rose-200 border border-rose-300 dark:border-rose-700">
                              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                              BELUM DIBACA
                            </span>
                          )}

                          {/* Informasi Kedaluwarsa 2x24 Jam jika sudah dibaca */}
                          {isRead && remainingHours !== null && (
                            <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/50">
                              ⏳ Terhapus dlm {remainingHours} jam lagi (2x24 jam)
                            </span>
                          )}

                          {/* Target Penerima */}
                          {note.shareScope === 'specific_users' && (
                            <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800/40">
                              👤 Pribadi
                            </span>
                          )}
                          {note.shareScope === 'division' && (
                            <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800/40">
                              🏢 Divisi
                            </span>
                          )}
                        </div>

                        <p className={`font-semibold text-sm truncate ${
                          isRead ? 'text-emerald-950 dark:text-emerald-100' : 'text-rose-950 dark:text-rose-100'
                        }`}>
                          {note.title}
                        </p>

                        <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500 dark:text-gray-400 flex-wrap">
                          <span>Oleh: <strong className="text-gray-700 dark:text-gray-300">{note.authorName || 'Admin'}</strong></span>
                          <span>•</span>
                          <span>{format(parseISO(note.updatedAt), "d MMM yyyy, HH:mm", { locale: idLocale })} WIB</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <div className="flex gap-1">
                          {note.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="text-[10px] px-2 py-0.5 bg-white/80 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-md border border-gray-200 dark:border-gray-700">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Upcoming Deadlines + Activity */}
        <div className="space-y-4">
          {/* Upcoming */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <Clock size={16} className="text-amber-500" /> Deadline Mendatang
            </h3>
            {upcomingCards.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Tidak ada deadline minggu ini 🎉</p>
            ) : (
              <div className="space-y-2">
                {upcomingCards.map((card) => {
                  const daysLeft = Math.ceil((new Date(card.deadline!).getTime() - now.getTime()) / 86400000);
                  return (
                    <div key={card.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${card.priority === 'high' ? 'bg-red-500' : card.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{card.title}</p>
                        <p className={`text-xs ${daysLeft <= 2 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                          {daysLeft === 0 ? 'Hari ini' : `${daysLeft} hari lagi`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {overdueCards.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle size={14} />
                  <span className="text-xs font-medium">{overdueCards.length} tugas terlambat</span>
                </div>
              </div>
            )}
          </div>

          {/* Activity */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-emerald-500" /> Aktivitas Terbaru
            </h3>
            <div className="space-y-3">
              {activities.slice(0, 4).map((activity) => {
                const member = memberMap[activity.memberId];
                return (
                  <div key={activity.id} className="flex items-start gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: member?.color ?? '#6b7280' }}
                    >
                      {member?.avatar ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-snug">
                        <span className="font-medium">{member?.name.split(' ')[0]}</span>{' '}
                        {activity.action}{' '}
                        <span className="text-primary-600 dark:text-primary-400 font-medium">{activity.target}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {format(parseISO(activity.timestamp), "HH:mm, d MMM", { locale: idLocale })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Board Overview */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Kanban size={16} className="text-blue-600" /> Overview Board
          </h3>
          <button onClick={() => navigate('/board')} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
            Buka Board <ArrowRight size={12} />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {boards.slice(0, 4).map((board) => {
            const boardCards = cards.filter((c) => c.boardId === board.id);
            const done = boardCards.filter((c) => doneColumnIds.has(c.columnId)).length;
            const progress = boardCards.length > 0 ? Math.round((done / boardCards.length) * 100) : 0;
            return (
              <button key={board.id} onClick={() => navigate('/board')} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all text-left">
                <div className="text-2xl mb-2">{board.emoji}</div>
                <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{board.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{boardCards.length} kartu</p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span><span>{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal Pengajuan & Approval Anggaran Divisi */}
      <BudgetRequisitionModal
        isOpen={showBudgetReqModal}
        onClose={() => setShowBudgetReqModal(false)}
      />

      {/* Modal Pengadaan Barang / Jasa (P2P) Divisi & Perorangan */}
      <ProcureToPayModal
        isOpen={showProcurementModal}
        onClose={() => setShowProcurementModal(false)}
      />
    </div>
  );
};
