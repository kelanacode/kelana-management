import React, { useState } from 'react';
import {
  Users, UserPlus, Shield, Mail, KeyRound, CheckCircle2,
  AlertCircle, Copy, Check, ExternalLink, X, Building, Clock
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types/auth';

export const AccountManagementModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { users, session, inviteEmployee } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'list' | 'invite'>('list');

  // Form states for Tahap 1: Inisiasi oleh Admin / HRD
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nik, setNik] = useState('');
  const [division, setDivision] = useState('Teknologi & IT');
  const [position, setPosition] = useState('');
  const [role, setRole] = useState<UserRole>('Staff');

  // Otomatis sesuaikan divisi dan posisi jika memilih role CEO
  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === 'CEO') {
      setDivision('All Role');
      if (!position || position === 'Staff Karyawan') {
        setPosition('Chief Executive Officer (CEO)');
      }
    } else if (newRole === 'Marketing') {
      setDivision('Marketing');
      if (!position || position === 'Staff Karyawan') {
        setPosition('Marketing Specialist');
      }
    } else if (division === 'All Role') {
      setDivision('Teknologi & IT');
    }
  };

  const [loading, setLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ link: string; token: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await inviteEmployee({
        name,
        email,
        nik,
        division,
        position,
        role,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Gagal membuat akun/mengirim undangan.');
        setLoading(false);
        return;
      }

      setInviteResult({
        link: res.inviteLink,
        token: res.token,
        email,
      });

      // Reset form
      setName('');
      setEmail('');
      setNik('');
      setPosition('');
      setLoading(false);
    } catch {
      setErrorMsg('Terjadi kendala saat memproses pembuatan akun.');
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const user = session?.user;
  const isAuthorized =
    user?.role === 'Admin' ||
    user?.role === 'CEO' ||
    user?.position?.toLowerCase().includes('ceo');

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800 p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mx-auto">
            <Shield size={28} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">Akses Terbatas</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Akses kontrol manajemen akun kantor kelana hanya dapat diakses oleh <strong className="text-gray-900 dark:text-white">Admin</strong> dan <strong className="text-gray-900 dark:text-white">CEO</strong>.
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-primary w-full py-2.5 text-xs font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-100 dark:bg-primary-950 text-primary-600 flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Manajemen Akun Kantor Kelana
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Tahapan Inisiasi, Undangan Karyawan, &amp; Role Access Control
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-6 text-xs font-semibold">
          <button
            onClick={() => { setActiveTab('list'); setInviteResult(null); }}
            className={`py-3 px-4 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'list'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            Daftar Karyawan Terdaftar ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('invite')}
            className={`py-3 px-4 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'invite'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <UserPlus size={14} /> + Buat / Undang Karyawan Baru
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'list' ? (
            <div className="space-y-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: u.color }}
                    >
                      {u.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white text-sm">{u.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {u.status === 'Active' ? '● Aktif' : '⏳ Pending / Diundang'}
                        </span>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-[11px] mt-0.5">
                        {u.email} • NIK: <span className="font-mono">{u.nik}</span>
                      </p>
                      <p className="text-gray-400 text-[11px]">
                        {u.division} • {u.position}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="px-2.5 py-1 rounded-lg bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 font-bold text-[11px] border border-primary-200 dark:border-primary-800">
                      Role: {u.role}
                    </span>
                    {u.status === 'Pending' && u.verificationToken && (
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/activate?token=${u.verificationToken}`)}
                        className="text-[10px] text-primary-600 hover:underline flex items-center gap-1 cursor-pointer pt-1"
                        title="Salin tautan aktivasi karyawan"
                      >
                        <Copy size={10} /> Salin Link Aktivasi
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Tab: Inisiasi Akun oleh Admin / HRD */
            <div>
              {inviteResult ? (
                <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center space-y-4 animate-fadeIn">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-base">
                      Tahap 1 Selesai: Undangan Berhasil Dibuat!
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 max-w-md mx-auto">
                      Sistem telah mendaftarkan karyawan dan menerbitkan secure token verifikasi (kedaluwarsa dalam 48 jam) untuk:
                    </p>
                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                      {inviteResult.email}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-emerald-300 dark:border-emerald-700 flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-gray-600 dark:text-gray-300 font-mono text-[11px]">
                      {inviteResult.link}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(inviteResult.link)}
                      className="btn-primary text-xs py-1.5 px-3 flex-shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copied ? 'Tersalin' : 'Salin Link'}</span>
                    </button>
                  </div>

                  <div className="flex justify-center gap-2 pt-2">
                    <a
                      href={inviteResult.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5"
                    >
                      <ExternalLink size={13} /> Uji Buka Halaman Aktivasi
                    </a>
                    <button
                      type="button"
                      onClick={() => setInviteResult(null)}
                      className="btn-primary text-xs py-2 px-4"
                    >
                      Tambah Karyawan Lain
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleInviteSubmit} className="space-y-4">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                    <strong>Pemberitahuan HRD:</strong> Masukkan data resmi karyawan. Sistem akan men-generate tautan aktivasi unik untuk karyawan mengatur kata sandi secara mandiri pada Tahap 2.
                  </div>

                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle size={15} />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                        Nama Lengkap Karyawan
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Contoh: Rian Pratama"
                        className="input text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                        Nomor Induk Karyawan (NIK)
                      </label>
                      <input
                        type="text"
                        required
                        value={nik}
                        onChange={(e) => setNik(e.target.value)}
                        placeholder="Contoh: KEL-005"
                        className="input text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                      Email Karyawan
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contoh: rian@email.com"
                      className="input text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                        Divisi
                      </label>
                      <select
                        value={division}
                        onChange={(e) => setDivision(e.target.value)}
                        className="input text-xs"
                      >
                        <option value="All Role">All Role (Executive / CEO)</option>
                        <option value="Marketing">Marketing / Pemasaran & Bisnis</option>
                        <option value="Teknologi & IT">Teknologi & IT</option>
                        <option value="Produk & Desain">Produk & Desain</option>
                        <option value="Operasional & HR">Operasional & HR</option>
                        <option value="Keuangan & Legal">Keuangan & Legal</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                        Jabatan (Position)
                      </label>
                      <input
                        type="text"
                        required
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        placeholder="Contoh: UI/UX Designer"
                        className="input text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                        Hak Akses (Role RBAC)
                      </label>
                      <select
                        value={role}
                        onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                        className="input text-xs font-bold text-primary-600"
                      >
                        <option value="Staff">Staff (Standard)</option>
                        <option value="Marketing">Marketing (Pemasaran & Bisnis)</option>
                        <option value="Manager">Manager</option>
                        <option value="Finance">Finance</option>
                        <option value="HR">HR / SDM</option>
                        <option value="CEO">CEO (Eksekutif)</option>
                        <option value="Admin">Admin (Full Access)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={() => setActiveTab('list')}
                      className="btn-secondary text-xs py-2 px-4 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary text-xs py-2 px-5 font-semibold flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Mail size={14} />
                      <span>{loading ? 'Memproses Undangan...' : 'Undang Karyawan / Buat Akun'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
