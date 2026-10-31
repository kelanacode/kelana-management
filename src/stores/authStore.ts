import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserAccount, AuthSession, LoginAttempt, UserRole } from '../types/auth';
import { hashPassword, generateToken, generateSessionId, createMockJWT } from '../utils/crypto';

interface AuthStore {
  users: UserAccount[];
  session: AuthSession | null;
  loginAttempts: LoginAttempt[];
  pendingInvitationEmail?: {
    email: string;
    name: string;
    token: string;
    expiresAt: string;
    link: string;
  } | null;

  // Actions
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string; require2FA?: boolean }>;
  verify2FA: (code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  inviteEmployee: (data: {
    name: string;
    email: string;
    nik: string;
    division: string;
    position: string;
    role: UserRole;
  }) => Promise<{ success: boolean; inviteLink: string; token: string; error?: string }>;
  activateAccountWithPassword: (token: string, newPassword: string, enable2FA?: boolean) => Promise<{ success: boolean; error?: string }>;
  clearInvitationAlert: () => void;
  checkSessionValid: () => boolean;
  updateUserProfile: (userId: string, data: Partial<UserAccount>) => Promise<{ success: boolean; error?: string }>;
}

// Initial default accounts
// Password for admin: Admin123!
// Password for andi: Kelana2026!
const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'user-admin',
    name: 'Admin Kantor Kelana',
    email: 'admin@ruangkelana.id',
    username: 'admin',
    nik: 'KEL-001',
    division: 'Operasional & HR',
    position: 'HR & Office Administrator',
    role: 'Admin',
    status: 'Active',
    avatar: 'AD',
    color: '#7c3aed',
    passwordHash: '3eb3fe66b31e3b4d10fa70b5cad49c7112294af6ae4e476a1c405155d45aa121', // Admin123!
    twoFactorEnabled: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-andi',
    name: 'Andi Wirawan',
    email: 'andi@ruangkelana.id',
    username: 'andiwirawan',
    nik: 'KEL-002',
    division: 'Teknologi & IT',
    position: 'Frontend Developer',
    role: 'Staff',
    status: 'Active',
    avatar: 'AW',
    color: '#2563eb',
    passwordHash: 'e8a2ded90df286e476b6b1369ac91440b2f78f205234d1b4a8351707b1665410', // Kelana2026!
    twoFactorEnabled: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-siti',
    name: 'Siti Rahmawati',
    email: 'siti@ruangkelana.id',
    username: 'sitirahmawati',
    nik: 'KEL-003',
    division: 'Financial',
    position: 'Finance & Accounting Lead',
    role: 'Finance',
    status: 'Active',
    avatar: 'SR',
    color: '#059669',
    passwordHash: '3eb3fe66b31e3b4d10fa70b5cad49c7112294af6ae4e476a1c405155d45aa121', // Admin123!
    twoFactorEnabled: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-dian',
    name: 'Dian Permata',
    email: 'dian@ruangkelana.id',
    username: 'dianpermata',
    nik: 'KEL-004',
    division: 'Marketing',
    position: 'Digital Marketing & Growth Lead',
    role: 'Marketing',
    status: 'Active',
    avatar: 'DP',
    color: '#ea580c',
    passwordHash: '3eb3fe66b31e3b4d10fa70b5cad49c7112294af6ae4e476a1c405155d45aa121', // Admin123!
    twoFactorEnabled: false,
    createdAt: new Date().toISOString(),
  },
];

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      users: DEFAULT_USERS,
      session: null,
      loginAttempts: [],
      pendingInvitationEmail: null,

      login: async (identifier, password, rememberMe = false) => {
        const { users, loginAttempts } = get();

        // 4. Validasi Awal (Input Validation)
        const cleanId = identifier.trim().toLowerCase();
        if (!cleanId || !password) {
          const attempt: LoginAttempt = {
            id: Date.now().toString(),
            identifier,
            ip: '127.0.0.1 (Client)',
            timestamp: new Date().toISOString(),
            success: false,
            reason: 'Field email/username atau password kosong',
          };
          set({ loginAttempts: [attempt, ...loginAttempts.slice(0, 49)] });
          return { success: false, error: 'Email/Username dan Password wajib diisi!' };
        }

        // 5. Pengecekan Kredensial ke Database
        const user = users.find(
          (u) =>
            u.email.toLowerCase() === cleanId ||
            u.username.toLowerCase() === cleanId ||
            u.nik.toLowerCase() === cleanId
        );

        if (!user) {
          const attempt: LoginAttempt = {
            id: Date.now().toString(),
            identifier,
            ip: '127.0.0.1 (Client)',
            timestamp: new Date().toISOString(),
            success: false,
            reason: 'Akun tidak ditemukan di database kantor',
          };
          set({ loginAttempts: [attempt, ...loginAttempts.slice(0, 49)] });
          return { success: false, error: 'Kredensial tidak valid: Akun tidak ditemukan.' };
        }

        if (user.status === 'Pending') {
          return {
            success: false,
            error: 'Akun ini masih berstatus "Pending". Silakan cek email kantor Anda untuk aktivasi akun dan pembuatan password baru.',
          };
        }

        if (user.status === 'Suspended') {
          return {
            success: false,
            error: 'Akun ini sedang ditangguhkan (Suspended). Harap hubungi Admin / HRD.',
          };
        }

        // Check password hash
        const inputHash = await hashPassword(password);
        if (inputHash !== user.passwordHash) {
          const attempt: LoginAttempt = {
            id: Date.now().toString(),
            identifier,
            ip: '127.0.0.1 (Client)',
            timestamp: new Date().toISOString(),
            success: false,
            reason: 'Password salah (Hash mismatch)',
          };
          set({ loginAttempts: [attempt, ...loginAttempts.slice(0, 49)] });
          return { success: false, error: 'Kata sandi salah. Silakan coba kembali.' };
        }

        // Check if 2FA is enabled
        if (user.twoFactorEnabled) {
          return { success: true, require2FA: true };
        }

        // 6b. Berhasil: Regenerasi Session ID & JWT
        const newSessionId = generateSessionId();
        const jwtToken = createMockJWT({
          sub: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        });

        // Expiry: 7 days if rememberMe, else 24 hours
        const durationMs = rememberMe ? 7 * 24 * 3600 * 1000 : 24 * 3600 * 1000;
        const expiresAt = new Date(Date.now() + durationMs).toISOString();

        const session: AuthSession = {
          token: jwtToken,
          sessionId: newSessionId,
          expiresAt,
          rememberMe,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            username: user.username,
            nik: user.nik,
            division: user.division,
            position: user.position,
            role: user.role,
            avatar: user.avatar,
            color: user.color,
            twoFactorEnabled: user.twoFactorEnabled,
            photoUrl: user.photoUrl,
            phone: user.phone,
            altEmail: user.altEmail,
            emergencyContactName: user.emergencyContactName,
            emergencyContactRelation: user.emergencyContactRelation,
            emergencyContactPhone: user.emergencyContactPhone,
            managerName: user.managerName,
            bio: user.bio,
            bankName: user.bankName,
            bankAccountNumber: user.bankAccountNumber,
            bankAccountHolder: user.bankAccountHolder,
            digitalSignature: user.digitalSignature,
            signatureDate: user.signatureDate,
            workStatus: user.workStatus,
            statusCustomMessage: user.statusCustomMessage,
            googleCalendarEmail: user.googleCalendarEmail,
            calendarSyncGoogle: user.calendarSyncGoogle,
          },
        };

        // Update last login
        const updatedUsers = users.map((u) =>
          u.id === user.id ? { ...u, lastLogin: new Date().toISOString() } : u
        );

        const attempt: LoginAttempt = {
          id: Date.now().toString(),
          identifier,
          ip: '127.0.0.1 (Client)',
          timestamp: new Date().toISOString(),
          success: true,
        };

        set({
          session,
          users: updatedUsers,
          loginAttempts: [attempt, ...loginAttempts.slice(0, 49)],
        });

        return { success: true };
      },

      verify2FA: async (code: string) => {
        // Simple 2FA verification: accepts 6-digit or '123456'
        if (code.trim().length !== 6) {
          return { success: false, error: 'Kode OTP 2FA harus 6 digit angka.' };
        }
        return { success: true };
      },

      logout: () => {
        set({ session: null });
      },

      checkSessionValid: () => {
        const { session } = get();
        if (!session) return false;
        const now = new Date().getTime();
        const expiry = new Date(session.expiresAt).getTime();
        if (now > expiry) {
          set({ session: null });
          return false;
        }
        return true;
      },

      inviteEmployee: async (data) => {
        const { users } = get();
        const cleanEmail = data.email.trim().toLowerCase();

        // Check duplicate email / NIK
        if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
          return { success: false, inviteLink: '', token: '', error: 'Email kantor ini sudah terdaftar!' };
        }
        if (users.some((u) => u.nik.toLowerCase() === data.nik.trim().toLowerCase())) {
          return { success: false, inviteLink: '', token: '', error: 'NIK ini sudah terdaftar!' };
        }

        const token = generateToken(24);
        // Expiry 48 hours
        const tokenExpiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
        const username = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');

        const initials = data.name
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase() || 'KR';

        const colors = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#db2777', '#0891b2'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const newUser: UserAccount = {
          id: 'user-' + Date.now(),
          name: data.name.trim(),
          email: cleanEmail,
          username: username || 'user' + Date.now(),
          nik: data.nik.trim(),
          division: data.division,
          position: data.position.trim(),
          role: data.role,
          status: 'Pending',
          avatar: initials,
          color: randomColor,
          passwordHash: '',
          verificationToken: token,
          tokenExpiresAt,
          twoFactorEnabled: false,
          createdAt: new Date().toISOString(),
        };

        const inviteLink = `${window.location.origin}/activate?token=${token}`;

        set((state) => ({
          users: [...state.users, newUser],
          pendingInvitationEmail: {
            email: cleanEmail,
            name: data.name.trim(),
            token,
            expiresAt: tokenExpiresAt,
            link: inviteLink,
          },
        }));

        return {
          success: true,
          inviteLink,
          token,
        };
      },

      activateAccountWithPassword: async (token, newPassword, enable2FA = false) => {
        const { users } = get();
        const user = users.find((u) => u.verificationToken === token);

        if (!user) {
          return { success: false, error: 'Token aktivasi tidak valid atau telah kedaluwarsa.' };
        }

        // Check expiration
        if (user.tokenExpiresAt && new Date().getTime() > new Date(user.tokenExpiresAt).getTime()) {
          return { success: false, error: 'Tautan aktivasi telah kedaluwarsa (lebih dari 48 jam). Harap hubungi Admin/HRD untuk undangan baru.' };
        }

        const newHash = await hashPassword(newPassword);

        const updatedUsers = users.map((u) =>
          u.id === user.id
            ? {
                ...u,
                status: 'Active' as const,
                passwordHash: newHash,
                twoFactorEnabled: enable2FA,
                verificationToken: undefined,
                tokenExpiresAt: undefined,
              }
            : u
        );

        set({ users: updatedUsers });
        return { success: true };
      },

      clearInvitationAlert: () => {
        set({ pendingInvitationEmail: null });
      },

      updateUserProfile: async (userId, data) => {
        const { users, session } = get();
        const userExists = users.some((u) => u.id === userId);
        if (!userExists) {
          return { success: false, error: 'User tidak ditemukan' };
        }

        const updatedUsers = users.map((u) => {
          if (u.id === userId) {
            return {
              ...u,
              ...data,
              // Jika nama diubah, update avatar inisial
              avatar: data.name ? data.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : u.avatar,
            };
          }
          return u;
        });

        // Update active session user juga jika user yang diedit sedang login
        let updatedSession = session;
        if (session && session.user.id === userId) {
          const target = updatedUsers.find((u) => u.id === userId)!;
          updatedSession = {
            ...session,
            user: {
              ...session.user,
              name: target.name,
              avatar: target.avatar,
              division: target.division,
              position: target.position,
              photoUrl: target.photoUrl,
              phone: target.phone,
              altEmail: target.altEmail,
              emergencyContactName: target.emergencyContactName,
              emergencyContactRelation: target.emergencyContactRelation,
              emergencyContactPhone: target.emergencyContactPhone,
              managerName: target.managerName,
              bio: target.bio,
              bankName: target.bankName,
              bankAccountNumber: target.bankAccountNumber,
              bankAccountHolder: target.bankAccountHolder,
              digitalSignature: target.digitalSignature,
              signatureDate: target.signatureDate,
              workStatus: target.workStatus,
              statusCustomMessage: target.statusCustomMessage,
              googleCalendarEmail: target.googleCalendarEmail,
              calendarSyncGoogle: target.calendarSyncGoogle,
            },
          };
        }

        set({ users: updatedUsers, session: updatedSession });
        return { success: true };
      },
    }),
    {
      name: 'ruang-kelana-auth',
    }
  )
);
