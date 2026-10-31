// User & Authentication Types for Ruang Kelana

export type UserRole = 'Admin' | 'CEO' | 'HR' | 'Manager' | 'Finance' | 'Marketing' | 'Staff';
export type UserStatus = 'Active' | 'Pending' | 'Suspended';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  username: string;
  nik: string; // Nomor Induk Karyawan
  division: string;
  position: string;
  role: UserRole;
  status: UserStatus;
  avatar: string;
  color: string;
  passwordHash: string; // SHA-256 hex or bcrypt hash
  verificationToken?: string; // Token verifikasi email (expiry 24-48 jam)
  tokenExpiresAt?: string;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  lastLogin?: string;
  createdAt: string;
  invitedBy?: string;

  // Personalisasi Profil Pegawai
  photoUrl?: string; // Foto resmi / semi-formal pegawai
  phone?: string; // Nomor telepon aktif (WhatsApp)
  altEmail?: string; // Email alternatif
  emergencyContactName?: string; // Nama kontak darurat
  emergencyContactRelation?: string; // Hubungan (Orang Tua / Pasangan / Saudara)
  emergencyContactPhone?: string; // Nomor kontak darurat
  managerName?: string; // Nama atasan langsung (SPV/Manager)
  bio?: string; // Biodata singkat / peran kantor
  bankName?: string; // Nama bank payroll (BCA, Mandiri, BRI, BNI, dll)
  bankAccountNumber?: string; // Nomor rekening
  bankAccountHolder?: string; // Nama pemilik rekening

  // Produktivitas & Integrasi Alat Kerja
  digitalSignature?: string; // Tanda tangan digital gambar PNG (Base64 data URL)
  signatureDate?: string; // Tanggal verifikasi tanda tangan
  workStatus?: 'Online' | 'Sedang Rapat' | 'Makan Siang' | 'Sedang Cuti' | 'Fokus Kerja' | 'Luar Kantor'; // Pesan otomatis / status kehadiran
  statusCustomMessage?: string; // Pesan kustom out-of-office
  googleCalendarEmail?: string; // Email akun Google Calendar pribadi pegawai
  calendarSyncGoogle?: boolean; // Integrasi Google Calendar pegawai
  googleDriveConnected?: boolean; // Status koneksi akun Google Drive
  googleDriveEmail?: string; // Email akun Google Drive terhubung
  googleDriveFolderUrl?: string; // URL folder kerja Google Drive utama
}

export interface AuthSession {
  token: string; // JWT-like session token
  sessionId: string;
  user: {
    id: string;
    name: string;
    email: string;
    username: string;
    nik: string;
    division: string;
    position: string;
    role: UserRole;
    avatar: string;
    color: string;
    twoFactorEnabled?: boolean;

    // Personalisasi
    photoUrl?: string;
    phone?: string;
    altEmail?: string;
    emergencyContactName?: string;
    emergencyContactRelation?: string;
    emergencyContactPhone?: string;
    managerName?: string;
    bio?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountHolder?: string;
    digitalSignature?: string;
    signatureDate?: string;
    workStatus?: 'Online' | 'Sedang Rapat' | 'Makan Siang' | 'Sedang Cuti' | 'Fokus Kerja' | 'Luar Kantor';
    statusCustomMessage?: string;
    googleCalendarEmail?: string;
    calendarSyncGoogle?: boolean;
    googleDriveConnected?: boolean;
    googleDriveEmail?: string;
    googleDriveFolderUrl?: string;
  };
  expiresAt: string;
  rememberMe: boolean;
}

export interface LoginAttempt {
  id: string;
  identifier: string;
  ip: string;
  timestamp: string;
  success: boolean;
  reason?: string;
}
