import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Compass, Lock, Mail, Eye, EyeOff, ShieldCheck, AlertCircle,
  CheckCircle2, ArrowRight, Building, KeyRound, UserCheck, Shield
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, verify2FA, pendingInvitationEmail, clearInvitationAlert } = useAuthStore();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // States for submission & feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [show2FAPrompt, setShow2FAPrompt] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // Info message if redirected from protected route
  const redirectFrom = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      // 3. & 4. Validasi input & Request Login
      const result = await login(identifier, password, rememberMe);

      if (!result.success) {
        setErrorMessage(result.error || 'Autentikasi gagal. Silakan periksa kembali kredensial Anda.');
        setLoading(false);
        return;
      }

      if (result.require2FA) {
        setShow2FAPrompt(true);
        setLoading(false);
        return;
      }

      // 7. Pengalihan Halaman (Redirect ke dashboard)
      navigate(redirectFrom === '/login' ? '/' : redirectFrom, { replace: true });
    } catch (err: any) {
      setErrorMessage('Terjadi kendala saat menghubungi server autentikasi.');
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    const res = await verify2FA(otpCode);
    if (!res.success) {
      setErrorMessage(res.error || 'Kode OTP tidak valid.');
      setLoading(false);
      return;
    }

    // Complete login
    await login(identifier, password, rememberMe);
    navigate(redirectFrom === '/login' ? '/' : redirectFrom, { replace: true });
  };

  // Quick fill helper for testing/demonstration
  const handleQuickFill = (emailVal: string, passVal: string) => {
    setIdentifier(emailVal);
    setPassword(passVal);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Decorative Rings */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Simulated Email Notification Toast (Tahap Inisiasi Karyawan) */}
      {pendingInvitationEmail && (
        <div className="fixed top-5 right-5 z-50 max-w-md bg-white dark:bg-gray-900 border border-emerald-500/50 shadow-2xl rounded-2xl p-4 animate-bounce-short">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Mail size={18} />
            </div>
            <div className="flex-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900 dark:text-white">📨 Notifikasi Email Kantor:</span>
                <button
                  onClick={clearInvitationAlert}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Undangan akun terkirim ke <strong>{pendingInvitationEmail.email}</strong>.
              </p>
              <div className="mt-2.5">
                <Link
                  to={`/activate?token=${pendingInvitationEmail.token}`}
                  onClick={clearInvitationAlert}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-[11px] transition-colors"
                >
                  Buka Link Aktivasi Karyawan <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800 rounded-3xl shadow-2xl p-8 relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl mx-auto flex items-center justify-center shadow-lg border border-gray-200 dark:border-gray-700 p-2 mb-4 ring-4 ring-primary-500/10 overflow-hidden">
            <img
              src="/kelana-logo.png"
              alt="Kelana Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Ruang Kelana
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Portal Masuk Resmi Kelana Corporate Workspace
          </p>
        </div>

        {/* Error Alert Message */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-rose-600" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* 2FA Prompt Modal View */}
        {show2FAPrompt ? (
          <form onSubmit={handle2FASubmit} className="space-y-4">
            <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800">
              <ShieldCheck size={28} className="text-indigo-600 mx-auto mb-1.5" />
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">Verifikasi Dua Langkah (2FA)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Masukkan 6-digit kode OTP dari aplikasi autentikator Anda.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5 text-center">
                Kode Otentikasi (OTP)
              </label>
              <input
                type="text"
                autoFocus
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="123456"
                className="input text-center font-mono tracking-widest text-lg font-bold py-2.5"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full btn-primary py-2.5 text-sm flex items-center justify-center gap-2 font-semibold shadow-lg shadow-primary-600/30 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Memverifikasi...' : 'Konfirmasi & Masuk'}
            </button>

            <button
              type="button"
              onClick={() => setShow2FAPrompt(false)}
              className="w-full text-center text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 pt-1"
            >
              ← Kembali ke Form Login
            </button>
          </form>
        ) : (
          /* Standard Login Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Input Email / Username / NIK */}
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
                Email Kantor / Username / NIK
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail size={16} />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Email kantor / NIK / Username"
                  className="input pl-10 text-sm py-2.5 rounded-xl border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* 2. Input Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Kata Sandi (Password)
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-10 pr-10 text-sm py-2.5 rounded-xl border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                />
                <span>Ingat Saya (Remember Me)</span>
              </label>

              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                <Shield size={11} className="text-emerald-500" /> Sesi Terenkripsi
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-sm flex items-center justify-center gap-2 font-semibold shadow-lg shadow-primary-600/30 hover:shadow-primary-600/50 transition-all rounded-xl cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memverifikasi Kredensial...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Kantor Kelana</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Demo Fast Login Preset Box */}
        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">
            Pilihan Kredensial Cepat (Uji Coba Sistem):
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickFill('admin@ruangkelana.id', 'Admin123!')}
              className="p-2 rounded-xl bg-gray-50 hover:bg-primary-50 dark:bg-gray-800 dark:hover:bg-primary-950/40 border border-gray-200 dark:border-gray-700 text-left transition-colors cursor-pointer group"
            >
              <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                <KeyRound size={12} className="text-primary-600" /> Admin
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5 truncate">admin@ruangkelana.id</p>
              <p className="text-[10px] text-primary-600 font-mono mt-0.5">Admin123!</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('siti@ruangkelana.id', 'Admin123!')}
              className="p-2 rounded-xl bg-gray-50 hover:bg-emerald-50 dark:bg-gray-800 dark:hover:bg-emerald-950/40 border border-gray-200 dark:border-gray-700 text-left transition-colors cursor-pointer group"
            >
              <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-600" /> Finance
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5 truncate">siti@ruangkelana.id</p>
              <p className="text-[10px] text-emerald-600 font-mono mt-0.5">Admin123!</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('andi@ruangkelana.id', 'Kelana2026!')}
              className="p-2 rounded-xl bg-gray-50 hover:bg-blue-50 dark:bg-gray-800 dark:hover:bg-blue-950/40 border border-gray-200 dark:border-gray-700 text-left transition-colors cursor-pointer group"
            >
              <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                <UserCheck size={12} className="text-blue-600" /> Staff (IT)
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5 truncate">andi@ruangkelana.id</p>
              <p className="text-[10px] text-blue-600 font-mono mt-0.5">Kelana2026!</p>
            </button>
          </div>
        </div>

        {/* Security Footer */}
        <div className="mt-6 text-center text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
          <Building size={12} />
          <span>Sistem Keamanan Terpadu Ruang Kelana © 2026</span>
        </div>
      </div>
    </div>
  );
};
