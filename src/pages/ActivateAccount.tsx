import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Compass, CheckCircle2, AlertCircle, Lock, Eye, EyeOff,
  ShieldCheck, ArrowRight, UserCheck, Key
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { validatePasswordStrength } from '../utils/crypto';

export const ActivateAccount: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const { users, activateAccountWithPassword } = useAuthStore();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [enable2FA, setEnable2FA] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  // Find user by verification token
  const pendingUser = users.find((u) => u.verificationToken === token);

  const strength = validatePasswordStrength(password);

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (password !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok!');
      return;
    }

    if (!strength.valid) {
      setErrorMessage(`Kata sandi belum memenuhi standar: ${strength.errors.join(', ')}`);
      return;
    }

    setLoading(true);

    try {
      const result = await activateAccountWithPassword(token, password, enable2FA);
      if (!result.success) {
        setErrorMessage(result.error || 'Aktivasi gagal dilakukan.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch {
      setErrorMessage('Terjadi kesalahan sistem saat menyimpan kata sandi.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      <div className="w-full max-w-lg bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl p-8 relative z-10">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl mx-auto flex items-center justify-center shadow-lg border border-gray-200 dark:border-gray-700 p-2 mb-3 ring-4 ring-primary-500/10 overflow-hidden">
            <img
              src="/kelana-logo.png"
              alt="Kelana Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Aktivasi Akun Karyawan
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Tahap 2 & 3: Verifikasi Identitas & Pembuatan Password Kelana Corporate
          </p>
        </div>

        {/* If token invalid */}
        {!pendingUser && !success && (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Tautan Tidak Valid atau Kedaluwarsa</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
                Token verifikasi undangan ini tidak ditemukan di sistem atau telah kedaluwarsa (lebih dari 48 jam).
              </p>
            </div>
            <Link to="/login" className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5">
              Kembali ke Halaman Login
            </Link>
          </div>
        )}

        {/* Success screen */}
        {success && (
          <div className="p-6 text-center space-y-4 animate-fadeIn">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">Akun Resmi Berhasil Diaktifkan!</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 max-w-sm mx-auto">
                Status akun Anda telah berubah menjadi <strong>Active</strong>. Silakan masuk menggunakan email kantor dan kata sandi baru Anda.
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="btn-primary text-sm py-2.5 px-6 font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              Lanjut ke Halaman Login <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Activation Form */}
        {pendingUser && !success && (
          <form onSubmit={handleActivation} className="space-y-4">
            {/* Identity Info Card */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Nama Karyawan:</span>
                <span className="font-bold text-gray-900 dark:text-white">{pendingUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email Kantor:</span>
                <span className="font-semibold text-primary-600">{pendingUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">NIK / ID Karyawan:</span>
                <span className="font-mono text-gray-700 dark:text-gray-300">{pendingUser.nik}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Divisi & Jabatan:</span>
                <span className="text-gray-800 dark:text-gray-200">{pendingUser.division} • {pendingUser.position}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Hak Akses (Role):</span>
                <span className="px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-bold text-[10px]">
                  {pendingUser.role}
                </span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* New Password */}
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                Kata Sandi Baru (Minimal 8 karakter)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Buat kata sandi baru..."
                  className="input pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength Meter Bar */}
              <div className="mt-2 space-y-1">
                <div className="flex gap-1 h-1.5">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <div
                      key={lvl}
                      className={`flex-1 rounded-full transition-all ${
                        strength.score >= lvl
                          ? strength.score >= 4
                            ? 'bg-emerald-500'
                            : strength.score >= 2
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>Kekuatan Kata Sandi: {strength.score}/5</span>
                  {strength.errors.length > 0 && (
                    <span className="text-amber-500 font-medium">{strength.errors[0]}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                Konfirmasi Kata Sandi
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi baru..."
                className="input text-sm"
              />
            </div>

            {/* 2FA Option */}
            <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enable2FA}
                  onChange={(e) => setEnable2FA(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                    <ShieldCheck size={14} className="text-indigo-600" />
                    Aktifkan Otentikasi Dua Faktor (2FA)
                  </span>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    (Direkomendasikan) Membutuhkan kode OTP tambahan saat login untuk keamanan maksimal akun kantor.
                  </p>
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !strength.valid}
              className="w-full btn-primary py-3 text-sm font-semibold flex items-center justify-center gap-2 rounded-xl shadow-lg shadow-primary-600/30 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Menyimpan Kata Sandi...' : 'Simpan Kata Sandi & Aktifkan Akun'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
