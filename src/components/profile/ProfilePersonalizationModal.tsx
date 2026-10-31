import React, { useState, useEffect } from 'react';
import {
  X, User, Mail, Phone, Building2, Briefcase, Award,
  CreditCard, ShieldAlert, Sparkles, Check, Calendar,
  PenTool, MessageSquare, Save, Camera, CheckCircle2, HardDrive
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface ProfilePersonalizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfilePersonalizationModal: React.FC<ProfilePersonalizationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { session, updateUserProfile } = useAuthStore();
  const currentUser = session?.user;

  const [activeTab, setActiveTab] = useState<'profile' | 'tools'>('profile');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1. Identitas & Profil Dasar Form State
  const [photoUrl, setPhotoUrl] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [altEmail, setAltEmail] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('Keluarga');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [position, setPosition] = useState('');
  const [division, setDivision] = useState('');
  const [managerName, setManagerName] = useState('');
  const [bio, setBio] = useState('');
  const [bankName, setBankName] = useState('BCA (Bank Central Asia)');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');

  // 2. Produktivitas & Integrasi Alat Kerja Form State
  const [digitalSignature, setDigitalSignature] = useState('');
  const [signatureDate, setSignatureDate] = useState('');
  const [workStatus, setWorkStatus] = useState<'Online' | 'Sedang Rapat' | 'Makan Siang' | 'Sedang Cuti' | 'Fokus Kerja' | 'Luar Kantor'>('Online');
  const [statusCustomMessage, setStatusCustomMessage] = useState('');
  const [googleCalendarEmail, setGoogleCalendarEmail] = useState('');
  const [calendarSyncGoogle, setCalendarSyncGoogle] = useState(false);
  const [googleDriveConnected, setGoogleDriveConnected] = useState(true);
  const [googleDriveEmail, setGoogleDriveEmail] = useState('');
  const [googleDriveFolderUrl, setGoogleDriveFolderUrl] = useState('');

  // Sync state whenever modal opens or currentUser changes
  useEffect(() => {
    if (currentUser) {
      setPhotoUrl(currentUser.photoUrl || '');
      setName(currentUser.name || '');
      setPhone(currentUser.phone || '');
      setAltEmail(currentUser.altEmail || '');
      setEmergencyContactName(currentUser.emergencyContactName || '');
      setEmergencyContactRelation(currentUser.emergencyContactRelation || 'Keluarga');
      setEmergencyContactPhone(currentUser.emergencyContactPhone || '');
      setPosition(currentUser.position || '');
      setDivision(currentUser.division || '');
      setManagerName(currentUser.managerName || '');
      setBio(currentUser.bio || '');
      setBankName(currentUser.bankName || 'BCA (Bank Central Asia)');
      setBankAccountNumber(currentUser.bankAccountNumber || '');
      setBankAccountHolder(currentUser.bankAccountHolder || currentUser.name || '');

      setDigitalSignature(currentUser.digitalSignature || '');
      setSignatureDate(currentUser.signatureDate || new Date().toISOString());
      setWorkStatus(currentUser.workStatus || 'Online');
      setStatusCustomMessage(currentUser.statusCustomMessage || '');
      setGoogleCalendarEmail(currentUser.googleCalendarEmail || currentUser.email || '');
      setCalendarSyncGoogle(currentUser.calendarSyncGoogle ?? true);
      setGoogleDriveConnected(currentUser.googleDriveConnected ?? true);
      setGoogleDriveEmail(currentUser.googleDriveEmail || currentUser.email || '');
      setGoogleDriveFolderUrl(currentUser.googleDriveFolderUrl || 'https://drive.google.com/drive/u/0/my-drive');
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran foto profil maksimal 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle Signature Image Upload & Auto-Convert to PNG
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('Ukuran berkas tanda tangan maksimal 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Otomatis convert ke PNG format transparan via Canvas
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          // Eksport dalam format image/png asli
          const pngDataUrl = canvas.toDataURL('image/png');
          setDigitalSignature(pngDataUrl);
          setSignatureDate(new Date().toISOString());
        } else {
          setDigitalSignature(reader.result as string);
          setSignatureDate(new Date().toISOString());
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await updateUserProfile(currentUser.id, {
      name,
      photoUrl,
      phone,
      altEmail,
      emergencyContactName,
      emergencyContactRelation,
      emergencyContactPhone,
      position,
      division,
      managerName,
      bio,
      bankName,
      bankAccountNumber,
      bankAccountHolder,
      digitalSignature,
      signatureDate,
      workStatus,
      statusCustomMessage,
      googleCalendarEmail,
      calendarSyncGoogle,
      googleDriveConnected,
      googleDriveEmail,
      googleDriveFolderUrl,
    });

    setLoading(false);
    if (res.success) {
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } else {
      alert(res.error || 'Gagal menyimpan personalisasi profil.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl md:min-w-[620px] shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-850">
          <div className="flex items-center gap-3">
            <div className="relative">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={name}
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-primary-500 shadow-md"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-md"
                  style={{ backgroundColor: currentUser.color || '#7c3aed' }}
                >
                  {currentUser.avatar}
                </div>
              )}
              <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-900 ${
                workStatus === 'Online' ? 'bg-emerald-500' :
                workStatus === 'Sedang Rapat' ? 'bg-amber-500' :
                workStatus === 'Makan Siang' ? 'bg-blue-500' :
                workStatus === 'Sedang Cuti' ? 'bg-rose-500' : 'bg-indigo-500'
              }`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Pengaturan Data Diri &amp; Personalisasi
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300">
                  {currentUser.nik}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Kelola tanda pengenal digital, kontak darurat, rekening payroll, dan efisiensi kerja.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-3 border-b border-gray-100 dark:border-gray-800 flex gap-4 text-xs font-semibold bg-white dark:bg-gray-900">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'profile'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <User size={15} />
            1. Identitas &amp; Profil Dasar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tools')}
            className={`pb-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'tools'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <Sparkles size={15} />
            2. Produktivitas &amp; Integrasi Alat Kerja
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Photo & Basic Name */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative group flex-shrink-0">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={name}
                      className="w-20 h-20 rounded-2xl object-cover ring-2 ring-primary-500 shadow-md"
                    />
                  ) : (
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shadow-md"
                      style={{ backgroundColor: currentUser.color || '#7c3aed' }}
                    >
                      {currentUser.avatar}
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/40 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera size={18} />
                    <span className="text-[10px] mt-0.5 font-semibold">Ubah</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex-1 w-full space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-gray-800 dark:text-gray-200">
                      Foto Profil Pegawai
                    </label>
                    <label className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 cursor-pointer">
                      Pilih dari Komputer
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Gunakan foto resmi atau semi-formal pegawai berlatar rapi agar rekan kerja dan pimpinan mudah mengenali Anda.
                  </p>
                  {photoUrl && (
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      className="text-[11px] text-rose-500 hover:text-rose-600 cursor-pointer"
                    >
                      Hapus Foto (Gunakan Inisial Warna)
                    </button>
                  )}
                </div>
              </div>

              {/* Data Identitas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama lengkap pegawai"
                    className="input text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                    Email Resmi Kantor (Terkunci)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={currentUser.email}
                    className="input text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                    Nomor Telepon Aktif (WhatsApp) *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 text-gray-400" size={14} />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Contoh: 0812-3456-7890"
                      className="input pl-9 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                    Email Alternatif / Personal
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 text-gray-400" size={14} />
                    <input
                      type="email"
                      value={altEmail}
                      onChange={(e) => setAltEmail(e.target.value)}
                      placeholder="email.pribadi@gmail.com"
                      className="input pl-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Jabatan & Departemen */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 space-y-3">
                <h4 className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <Briefcase size={14} className="text-indigo-600" />
                  Jabatan &amp; Struktur Departemen
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                      Posisi / Pekerjaan
                    </label>
                    <input
                      type="text"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder="Frontend Developer"
                      className="input text-xs bg-white dark:bg-gray-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                      Departemen / Divisi
                    </label>
                    <input
                      type="text"
                      value={division}
                      onChange={(e) => setDivision(e.target.value)}
                      placeholder="Teknologi & IT"
                      className="input text-xs bg-white dark:bg-gray-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                      Atasan Langsung (SPV/Manager)
                    </label>
                    <input
                      type="text"
                      value={managerName}
                      onChange={(e) => setManagerName(e.target.value)}
                      placeholder="Delon (CEO) / HR Manager"
                      className="input text-xs bg-white dark:bg-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Biodata Singkat (Bio) */}
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Biodata Singkat (Bio &amp; Keahlian)
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Ceritakan singkat peran Anda, fokus keahlian, atau moto kerja..."
                  className="input text-xs"
                />
              </div>

              {/* Bank Account untuk Payroll */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                    <CreditCard size={14} className="text-emerald-600" />
                    Informasi Rekening Bank (Payroll Gaji)
                  </h4>
                  <span className="text-[10px] bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded font-bold">
                    Kerahasiaan Terjamin
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                      Nama Bank
                    </label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="input text-xs bg-white dark:bg-gray-900"
                    >
                      <option value="BCA (Bank Central Asia)">BCA</option>
                      <option value="Bank Mandiri">Mandiri</option>
                      <option value="BRI (Bank Rakyat Indonesia)">BRI</option>
                      <option value="BNI (Bank Negara Indonesia)">BNI</option>
                      <option value="Bank Syariah Indonesia (BSI)">BSI</option>
                      <option value="Bank CIMB Niaga">CIMB Niaga</option>
                      <option value="Bank Jago">Bank Jago</option>
                      <option value="Seabank">Seabank</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                      Nomor Rekening
                    </label>
                    <input
                      type="text"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      placeholder="Contoh: 1234567890"
                      className="input text-xs bg-white dark:bg-gray-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                      Nama Pemilik Rekening
                    </label>
                    <input
                      type="text"
                      value={bankAccountHolder}
                      onChange={(e) => setBankAccountHolder(e.target.value)}
                      placeholder="Sesuai buku tabungan"
                      className="input text-xs bg-white dark:bg-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Kontak Darurat (Emergency Contact) */}
              <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/60 space-y-3">
                <h4 className="font-bold text-rose-950 dark:text-rose-200 flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-rose-600" />
                  Kontak Darurat (Emergency Contact)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                      Nama Kontak
                    </label>
                    <input
                      type="text"
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      placeholder="Nama keluarga terdekat"
                      className="input text-xs bg-white dark:bg-gray-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                      Hubungan
                    </label>
                    <select
                      value={emergencyContactRelation}
                      onChange={(e) => setEmergencyContactRelation(e.target.value)}
                      className="input text-xs bg-white dark:bg-gray-900"
                    >
                      <option value="Orang Tua">Orang Tua</option>
                      <option value="Pasangan (Suami/Istri)">Pasangan (Suami/Istri)</option>
                      <option value="Saudara Kandung">Saudara Kandung</option>
                      <option value="Keluarga">Keluarga Lainnya</option>
                      <option value="Sahabat">Sahabat Terdekat</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                      Nomor Telepon Darurat
                    </label>
                    <input
                      type="tel"
                      value={emergencyContactPhone}
                      onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className="input text-xs bg-white dark:bg-gray-900"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Status Kehadiran / Pesan Otomatis (Out of Office) */}
              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-amber-600" />
                    Status Kehadiran &amp; Pesan Otomatis (Out of Office)
                  </h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    workStatus === 'Online' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                    'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {workStatus}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Status ini akan tampil pada pop-up chat tim dan daftar rekan kerja kantor secara real-time.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {(['Online', 'Sedang Rapat', 'Makan Siang', 'Fokus Kerja', 'Sedang Cuti', 'Luar Kantor'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setWorkStatus(status)}
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                        workStatus === status
                          ? 'border-primary-500 bg-white dark:bg-gray-900 font-bold text-primary-700 dark:text-primary-300 shadow-sm'
                          : 'border-gray-200 dark:border-gray-700/60 bg-white/70 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                      }`}
                    >
                      <span>{status}</span>
                      {workStatus === status && <Check size={13} className="text-primary-600" />}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 block mb-1">
                    Catatan Status / Pesan Balasan Otomatis:
                  </label>
                  <input
                    type="text"
                    value={statusCustomMessage}
                    onChange={(e) => setStatusCustomMessage(e.target.value)}
                    placeholder="Contoh: Sedang evaluasi sprint Q4, respon chat mungkin lambat hingga jam 15:00."
                    className="input text-xs bg-white dark:bg-gray-900"
                  />
                </div>
              </div>

              {/* Tanda Tangan Digital (Upload Gambar PNG Otomatis) */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 text-xs">
                    <PenTool size={14} className="text-primary-600" />
                    Tanda Tangan Digital (Gambar PNG / E-Signature)
                  </label>
                  <label className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 cursor-pointer flex items-center gap-1">
                    <Camera size={13} />
                    Unggah Berkas Tanda Tangan
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSignatureUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Unggah foto atau scan tanda tangan Anda (JPG/JPEG/WebP/PNG). Sistem akan <strong>secara otomatis mengonversi ke format PNG transparan</strong> yang siap digunakan di seluruh sistem (slip gaji, lembar dokumen notes, dan berkas approval).
                </p>

                {digitalSignature ? (
                  <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50/80 dark:bg-gray-800/80 flex items-center justify-center">
                        <img
                          src={digitalSignature}
                          alt="Tanda Tangan Digital"
                          className="h-16 max-w-[200px] object-contain"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-emerald-500" />
                          <span className="font-bold text-gray-800 dark:text-gray-200 text-xs">
                            Format PNG Terverifikasi
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Tertaut ke identitas: {name} ({currentUser.nik})
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDigitalSignature('')}
                      className="text-xs text-rose-500 hover:text-rose-600 font-semibold cursor-pointer"
                    >
                      Hapus Tanda Tangan
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-indigo-200 dark:border-indigo-800/80 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-all text-center">
                    <PenTool size={24} className="text-indigo-400 mb-1.5" />
                    <span className="font-bold text-gray-700 dark:text-gray-200 text-xs">
                      Pilih atau Seret Foto Tanda Tangan
                    </span>
                    <span className="text-[10px] text-gray-400 mt-0.5">
                      Format apapun otomatis dikonversi ke PNG berkualitas tinggi
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSignatureUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Integrasi Kalender Kerja (Google Calendar Pribadi Karyawan) */}
              <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                    <Calendar size={14} className="text-blue-600" />
                    Integrasi Kalender Kerja (Google Calendar Masing-masing Pegawai)
                  </h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    calendarSyncGoogle ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {calendarSyncGoogle ? 'Tersinkronisasi' : 'Non-aktif'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Sinkronkan jadwal meeting, deadline penugasan taks, dan pengingat kantor langsung ke <strong>akun Google Calendar pribadi masing-masing pegawai</strong>.
                </p>

                <div className="space-y-3 pt-1">
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 flex items-center justify-center font-bold text-xs">
                          G
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 dark:text-gray-200">Google Calendar Akun Pribadi Pegawai</p>
                          <p className="text-[10px] text-gray-500">Sinkronisasi real-time dua arah ke kalender smartphone</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={calendarSyncGoogle}
                        onChange={(e) => setCalendarSyncGoogle(e.target.checked)}
                        className="w-4 h-4 text-primary-600 rounded cursor-pointer"
                      />
                    </div>

                    {calendarSyncGoogle && (
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                        <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                          Email Akun Google Calendar Anda:
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="email"
                            value={googleCalendarEmail}
                            onChange={(e) => setGoogleCalendarEmail(e.target.value)}
                            placeholder="nama.pegawai@gmail.com atau akun Google Workspace"
                            className="input text-xs flex-1"
                          />
                          <a
                            href={`https://calendar.google.com/calendar/u/${googleCalendarEmail || currentUser.email}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-semibold text-[11px] hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-1 cursor-pointer flex-shrink-0"
                          >
                            Buka Kalender <Calendar size={12} />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Google Drive Integration */}
                  <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 flex items-center justify-center font-bold text-xs">
                          <HardDrive size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 dark:text-gray-200">Google Drive & Cloud Dokumen</p>
                          <p className="text-[10px] text-gray-500">Penyimpanan arsip catatan, slip gaji, dan folder kerja cloud</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={googleDriveConnected}
                        onChange={(e) => setGoogleDriveConnected(e.target.checked)}
                        className="w-4 h-4 text-primary-600 rounded cursor-pointer"
                      />
                    </div>

                    {googleDriveConnected && (
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
                        <div>
                          <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                            Email Google Drive Pegawai / Kantor:
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="email"
                              value={googleDriveEmail}
                              onChange={(e) => setGoogleDriveEmail(e.target.value)}
                              placeholder="akun.drive@gmail.com"
                              className="input text-xs flex-1"
                            />
                            <a
                              href={googleDriveFolderUrl || `https://drive.google.com/drive/u/${googleDriveEmail || currentUser.email}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-1 cursor-pointer flex-shrink-0"
                            >
                              Buka Drive <HardDrive size={12} />
                            </a>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                            Link Folder Kerja Google Drive (Opsional):
                          </label>
                          <input
                            type="url"
                            value={googleDriveFolderUrl}
                            onChange={(e) => setGoogleDriveFolderUrl(e.target.value)}
                            placeholder="https://drive.google.com/drive/folders/..."
                            className="input text-xs w-full"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Button Footer */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="text-emerald-600 font-bold flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 size={16} /> Berhasil disimpan!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary text-xs py-2 px-4 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary text-xs py-2 px-5 font-bold flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Save size={14} />
                {loading ? 'Menyimpan...' : 'Simpan Personalisasi'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
