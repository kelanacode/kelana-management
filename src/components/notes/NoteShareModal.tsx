import React, { useState, useEffect } from 'react';
import { Note, NoteShareScope } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useAppStore } from '../../stores/appStore';
import {
  Globe,
  Building,
  Users,
  ShieldCheck,
  Check,
  X,
  Lock,
  UserCheck,
  Search
} from 'lucide-react';

interface NoteShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note;
  onSaveShare: (
    shareScope: NoteShareScope,
    targetDivisions: string[],
    targetUserIds: string[],
    targetUserNames: string[]
  ) => void;
}

const AVAILABLE_DIVISIONS = [
  'Teknologi & IT',
  'Operasional & HR',
  'Pemasaran & Bisnis',
  'Keuangan & Akuntansi',
  'Kreatif & Desain',
  'Legal & Kepatuhan'
];

export const NoteShareModal: React.FC<NoteShareModalProps> = ({
  isOpen,
  onClose,
  note,
  onSaveShare
}) => {
  const { users } = useAuthStore();
  const { members } = useAppStore();

  const [shareScope, setShareScope] = useState<NoteShareScope>(note.shareScope || 'all');
  const [targetDivisions, setTargetDivisions] = useState<string[]>(note.targetDivisions || []);
  const [targetUserIds, setTargetUserIds] = useState<string[]>(note.targetUserIds || []);
  const [userSearch, setUserSearch] = useState('');

  // Sinkronkan state saat note berubah
  useEffect(() => {
    if (note) {
      setShareScope(note.shareScope || 'all');
      setTargetDivisions(note.targetDivisions || []);
      setTargetUserIds(note.targetUserIds || []);
    }
  }, [note]);

  if (!isOpen) return null;

  // Gabungkan users dari authStore & members dari appStore jika ada
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
      emp.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      emp.nik.toLowerCase().includes(userSearch.toLowerCase()) ||
      emp.division.toLowerCase().includes(userSearch.toLowerCase())
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

  const handleSave = () => {
    const selectedUsers = allEmployees.filter((emp) => targetUserIds.includes(emp.id));
    const targetUserNames = selectedUsers.map((u) => u.name);

    onSaveShare(shareScope, targetDivisions, targetUserIds, targetUserNames);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col animate-scaleUp">
        {/* Header Modal */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-primary-600 to-indigo-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-sm">
              <Users size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">
                Hak Akses &amp; Berikan Catatan
              </h3>
              <p className="text-xs text-primary-100 mt-0.5 truncate max-w-xs">
                Dokumen: <span className="font-semibold">{note.title || 'Tanpa Judul'}</span>
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

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs overflow-y-auto max-h-[75vh]">
          {/* Pilihan Cakupan Akses */}
          <div className="space-y-3">
            <label className="font-bold text-gray-800 dark:text-gray-200 block text-xs">
              Kemana Catatan Ini Ingin Diberikan / Dikirimkan?
            </label>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Opsi 1: Ke Personal */}
              <div
                onClick={() => setShareScope('specific_users')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
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
                    <p className="font-bold text-sm text-gray-900 dark:text-white">
                      👤 Ke Personal (Orang Tertentu)
                    </p>
                    {shareScope === 'specific_users' && (
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Hanya nama-nama karyawan terpilih yang berhak membuka &amp; membaca dokumen catatan ini.
                  </p>
                </div>
              </div>

              {/* Opsi 2: Ke Divisi */}
              <div
                onClick={() => setShareScope('division')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
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
                    <p className="font-bold text-sm text-gray-900 dark:text-white">
                      🏢 Ke Divisi Tertentu
                    </p>
                    {shareScope === 'division' && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Hanya karyawan dari divisi yang dipilih (serta CEO/Admin) yang dapat melihat catatan ini.
                  </p>
                </div>
              </div>

              {/* Opsi 3: Untuk Semuanya */}
              <div
                onClick={() => setShareScope('all')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
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
                    <p className="font-bold text-sm text-gray-900 dark:text-white">
                      🌐 Untuk Semuanya (Seluruh Karyawan)
                    </p>
                    {shareScope === 'all' && (
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Catatan bersifat umum/terbuka dan dapat dibaca oleh seluruh anggota kantor di semua divisi.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sub-form Opsi 2: Pemilihan Divisi */}
          {shareScope === 'division' && (
            <div className="p-4 bg-blue-50/50 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-800 space-y-3 animate-fadeIn">
              <label className="font-bold text-blue-950 dark:text-blue-200 block text-xs">
                Pilih Divisi yang Diberikan Akses:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_DIVISIONS.map((dept) => {
                  const isChecked = targetDivisions.includes(dept);
                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => toggleDivision(dept)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-300'
                      }`}
                    >
                      <span>🏢 {dept}</span>
                      {isChecked && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
              {targetDivisions.length === 0 && (
                <p className="text-[11px] text-rose-600 font-medium">
                  ⚠️ Silakan pilih minimal 1 divisi untuk diberikan akses.
                </p>
              )}
            </div>
          )}

          {/* Sub-form Opsi 3: Pemilihan Karyawan Tertentu */}
          {shareScope === 'specific_users' && (
            <div className="p-4 bg-purple-50/50 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <label className="font-bold text-purple-950 dark:text-purple-200 block text-xs">
                  Pilih Karyawan Spesifik ({targetUserIds.length} dipilih):
                </label>
              </div>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari karyawan berdasarkan nama, NIK, atau divisi..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="input pl-8 text-xs py-1.5"
                />
              </div>

              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {filteredEmployees.map((emp) => {
                  const isSelected = targetUserIds.includes(emp.id);
                  return (
                    <div
                      key={emp.id}
                      onClick={() => toggleUser(emp.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-100 border-purple-400 text-purple-950 dark:bg-purple-950/70 dark:text-purple-200 dark:border-purple-600'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ backgroundColor: emp.color }}
                        >
                          {emp.avatar}
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-xs truncate">{emp.name}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">
                            NIK: {emp.nik} • {emp.division} ({emp.role})
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                            isSelected
                              ? 'bg-purple-600 border-purple-600 text-white'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {isSelected && <Check size={12} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {targetUserIds.length === 0 && (
                <p className="text-[11px] text-rose-600 font-medium">
                  ⚠️ Silakan centang minimal 1 orang karyawan penerima catatan.
                </p>
              )}
            </div>
          )}

          {/* Info Pembuat & Hak Akses CEO */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl text-[11px] text-gray-500 dark:text-gray-400 space-y-1">
            <p className="flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300">
              <ShieldCheck size={13} className="text-primary-600" />
              Kontrol Akses Terpusat:
            </p>
            <p>
              Pembuat dokumen (<strong>{note.authorName || 'Karyawan'}</strong>) serta <strong>CEO</strong> &amp; <strong>Admin</strong> selalu memiliki hak untuk membaca dan mengawasi seluruh catatan kantor.
            </p>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2 bg-gray-50/50 dark:bg-gray-850">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-2 px-4 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary text-xs py-2 px-5 font-bold cursor-pointer shadow-md"
          >
            Simpan Pengaturan Akses
          </button>
        </div>
      </div>
    </div>
  );
};
