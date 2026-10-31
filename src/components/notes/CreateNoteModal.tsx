import React, { useState } from 'react';
import { NoteShareScope } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import {
  Globe,
  Building,
  UserCheck,
  Search,
  Check,
  X,
  FileText,
  Send,
  Users
} from 'lucide-react';

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateNote: (data: {
    title: string;
    emoji?: string;
    shareScope: NoteShareScope;
    targetDivisions: string[];
    targetUserIds: string[];
    targetUserNames: string[];
  }) => void;
}

const AVAILABLE_DIVISIONS = [
  'Teknologi & IT',
  'Operasional & HR',
  'Pemasaran & Bisnis',
  'Keuangan & Akuntansi',
  'Kreatif & Desain',
  'Legal & Kepatuhan'
];

export const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  isOpen,
  onClose,
  onCreateNote
}) => {
  const { session, users } = useAuthStore();
  const currentUser = session?.user;

  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('📄');
  // Default: Pengguna diminta memilih (misal default ke Personal atau Divisi bukan otomatis Semua)
  const [shareScope, setShareScope] = useState<NoteShareScope>('specific_users');
  const [targetDivisions, setTargetDivisions] = useState<string[]>(
    currentUser?.division ? [currentUser.division] : ['Teknologi & IT']
  );
  const [targetUserIds, setTargetUserIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState('');

  if (!isOpen) return null;

  const allEmployees = users.map((u) => ({
    id: u.id,
    name: u.name,
    nik: u.nik,
    division: u.division,
    role: u.role,
    avatar: u.avatar || u.name.substring(0, 2).toUpperCase(),
    color: u.color || '#6366f1',
  }));

  const filteredEmployees = allEmployees.filter(
    (emp) =>
      emp.id !== currentUser?.id && // Sembunyikan diri sendiri dari list target penerima
      (emp.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        emp.nik.toLowerCase().includes(userSearch.toLowerCase()) ||
        emp.division.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const toggleDivision = (dept: string) => {
    if (targetDivisions.includes(dept)) {
      setTargetDivisions(targetDivisions.filter((d) => d !== dept));
    } else {
      setTargetDivisions([...targetDivisions, dept]);
    }
  };

  const toggleUser = (userId: string) => {
    if (targetUserIds.includes(userId)) {
      setTargetUserIds(targetUserIds.filter((id) => id !== userId));
    } else {
      setTargetUserIds([...targetUserIds, userId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (shareScope === 'specific_users' && targetUserIds.length === 0) {
      alert('Mohon pilih minimal 1 orang karyawan penerima catatan (personal).');
      return;
    }

    if (shareScope === 'division' && targetDivisions.length === 0) {
      alert('Mohon pilih minimal 1 divisi tujuan catatan.');
      return;
    }

    const selectedUsers = allEmployees.filter((emp) => targetUserIds.includes(emp.id));
    const targetUserNames = selectedUsers.map((u) => u.name);

    onCreateNote({
      title: title.trim() || 'Dokumen Baru',
      emoji,
      shareScope,
      targetDivisions,
      targetUserIds,
      targetUserNames,
    });

    // Reset & close
    setTitle('');
    setTargetUserIds([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col animate-scaleUp max-h-[90vh]">
        {/* Header Modal */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-sm">
              <Send size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">
                Buat Catatan &amp; Pilih Tujuan Kirim
              </h3>
              <p className="text-xs text-primary-100 mt-0.5">
                Tentukan siapa yang dapat menerima &amp; membaca catatan ini
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs flex-1">
          {/* Judul Catatan & Emoji */}
          <div>
            <label className="font-bold text-gray-800 dark:text-gray-200 block mb-1">
              Judul Catatan / Dokumen *
            </label>
            <div className="flex items-center gap-2">
              <select
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="input w-16 text-base p-1 text-center"
                title="Pilih Ikon Catatan"
              >
                <option value="📄">📄</option>
                <option value="📝">📝</option>
                <option value="📋">📋</option>
                <option value="💡">💡</option>
                <option value="📌">📌</option>
                <option value="🔒">🔒</option>
                <option value="🎯">🎯</option>
                <option value="🚀">🚀</option>
                <option value="🔥">🔥</option>
                <option value="💻">💻</option>
              </select>
              <input
                type="text"
                required
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Laporan Evaluasi Kinerja Tim / Rencana Q4"
                className="input flex-1 text-xs font-semibold py-2"
              />
            </div>
          </div>

          {/* Pilihan 3 Tujuan Pengiriman Catatan */}
          <div className="space-y-2 pt-1">
            <label className="font-bold text-gray-800 dark:text-gray-200 block text-xs">
              Kemana Catatan Ini Ingin Dikirimkan? *
            </label>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Opsi 1: Ke Personal */}
              <div
                onClick={() => setShareScope('specific_users')}
                className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  shareScope === 'specific_users'
                    ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 dark:border-purple-500 shadow-xs'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    shareScope === 'specific_users'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  }`}
                >
                  <UserCheck size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                      👤 Ke Personal (Orang Tertentu)
                    </p>
                    {shareScope === 'specific_users' && (
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Hanya orang yang Anda pilih yang dapat membaca catatan ini (privat/eksklusif).
                  </p>
                </div>
              </div>

              {/* Opsi 2: Ke Divisi */}
              <div
                onClick={() => setShareScope('division')}
                className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  shareScope === 'division'
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-500 shadow-xs'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    shareScope === 'division'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  }`}
                >
                  <Building size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                      🏢 Ke Divisi Tertentu
                    </p>
                    {shareScope === 'division' && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Hanya anggota tim dari divisi yang Anda pilih yang dapat mengakses catatan ini.
                  </p>
                </div>
              </div>

              {/* Opsi 3: Untuk Semuanya */}
              <div
                onClick={() => setShareScope('all')}
                className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  shareScope === 'all'
                    ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-500 shadow-xs'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    shareScope === 'all'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  }`}
                >
                  <Globe size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                      🌐 Untuk Semuanya (Seluruh Karyawan)
                    </p>
                    {shareScope === 'all' && (
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Catatan bersifat umum/terbuka untuk seluruh karyawan kantor Kelana.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Detail Pemilihan: Jika Personal */}
          {shareScope === 'specific_users' && (
            <div className="p-3.5 bg-purple-50/50 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800 space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-950 dark:text-purple-200">
                  Pilih Karyawan Penerima ({targetUserIds.length} dipilih):
                </span>
              </div>

              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari nama karyawan, NIK, atau divisi..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="input pl-7 text-[11px] py-1.5"
                />
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {filteredEmployees.map((emp) => {
                  const isSelected = targetUserIds.includes(emp.id);
                  return (
                    <div
                      key={emp.id}
                      onClick={() => toggleUser(emp.id)}
                      className={`p-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-100 border-purple-400 text-purple-950 dark:bg-purple-950/70 dark:text-purple-200 dark:border-purple-600'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ backgroundColor: emp.color }}
                        >
                          {emp.avatar}
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-xs truncate">{emp.name}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">
                            NIK: {emp.nik} • {emp.division}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center border flex-shrink-0 ${
                          isSelected
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {isSelected && <Check size={10} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detail Pemilihan: Jika Divisi */}
          {shareScope === 'division' && (
            <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-800 space-y-2.5 animate-fadeIn">
              <span className="font-bold text-blue-950 dark:text-blue-200 block">
                Pilih Divisi Tujuan ({targetDivisions.length} dipilih):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {AVAILABLE_DIVISIONS.map((dept) => {
                  const isChecked = targetDivisions.includes(dept);
                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => toggleDivision(dept)}
                      className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer text-xs ${
                        isChecked
                          ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-300'
                      }`}
                    >
                      <span className="truncate">🏢 {dept}</span>
                      {isChecked && <Check size={12} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Form */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="text-[10px] text-gray-400">
              Pengirim: <strong>{currentUser?.name}</strong> ({currentUser?.division})
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary text-xs py-2 px-4 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn-primary text-xs py-2 px-5 font-bold cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Send size={13} /> Buat &amp; Buka Catatan
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
