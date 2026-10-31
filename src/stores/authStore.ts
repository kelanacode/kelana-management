import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserAccount, AuthSession, LoginAttempt, UserRole } from '../types/auth';
import { Member } from '../types';
import { supabase } from '../lib/supabase';
import { PROFILE_COLUMNS } from '../lib/dbSchema';
import { fromRow, toRow, startSync, stopSync } from '../lib/sync';
import { useAppStore } from './appStore';

export interface InvitationInfo {
  email: string;
  name: string;
  nik: string;
  division: string;
  position: string;
  role: UserRole;
}

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
  initAuth: () => Promise<void>;
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
  getInvitation: (token: string) => Promise<InvitationInfo | null>;
  activateAccountWithPassword: (token: string, newPassword: string, enable2FA?: boolean) => Promise<{ success: boolean; error?: string }>;
  clearInvitationAlert: () => void;
  checkSessionValid: () => boolean;
  updateUserProfile: (userId: string, data: Partial<UserAccount>) => Promise<{ success: boolean; error?: string }>;
  refreshUsers: () => Promise<void>;
}

const profileToUser = (row: Record<string, any>): UserAccount =>
  ({ passwordHash: '', ...fromRow(row, PROFILE_COLUMNS) }) as unknown as UserAccount;

const toSessionUser = (u: UserAccount): AuthSession['user'] => {
  const { passwordHash: _p, verificationToken: _v, tokenExpiresAt: _t, twoFactorSecret: _s, status: _st, lastLogin: _l, createdAt: _c, invitedBy: _i, ...rest } = u;
  return rest;
};

const initials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'KR';

const toMember = (u: UserAccount): Member => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.position || u.role,
  avatar: u.avatar,
  color: u.color,
  online: u.workStatus !== 'Sedang Cuti' && u.workStatus !== 'Luar Kantor',
});

// Daftar anggota tim & user aktif di appStore mengikuti data profil.
const syncAppMembers = (users: UserAccount[], session: AuthSession | null) => {
  const active = users.filter((u) => u.status === 'Active');
  const me = session ? active.find((u) => u.id === session.user.id) : undefined;
  useAppStore.setState((s) => ({
    members: active.map(toMember),
    settings: { ...s.settings, currentUser: me ? toMember(me) : (undefined as unknown as Member) },
  }));
};

const recordAttempt = (identifier: string, success: boolean, reason?: string): LoginAttempt => ({
  id: Date.now().toString(),
  identifier,
  ip: 'client',
  timestamp: new Date().toISOString(),
  success,
  reason,
});

// 2FA di aplikasi ini masih berupa verifikasi kode 6 digit di sisi klien.
let twoFactorPassedFor: string | null = null;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      users: [],
      session: null,
      loginAttempts: [],
      pendingInvitationEmail: null,

      refreshUsers: async () => {
        const [{ data: profiles, error }, { data: invites }] = await Promise.all([
          supabase.from('profiles').select('*').order('created_at'),
          supabase.from('invitations').select('*').is('used_at', null).order('created_at'),
        ]);
        if (error) {
          console.error('[auth] gagal memuat profil:', error);
          return;
        }
        const pending: UserAccount[] = (invites ?? []).map((inv) => ({
          id: `invite-${inv.token}`,
          name: inv.name,
          email: inv.email,
          username: inv.username ?? inv.email.split('@')[0],
          nik: inv.nik ?? '',
          division: inv.division ?? '',
          position: inv.position ?? '',
          role: inv.role,
          status: 'Pending',
          avatar: inv.avatar ?? initials(inv.name),
          color: inv.color ?? '#7c3aed',
          passwordHash: '',
          verificationToken: inv.token,
          tokenExpiresAt: inv.expires_at,
          createdAt: inv.created_at,
          invitedBy: inv.invited_by ?? undefined,
        }));
        const users = [...(profiles ?? []).map(profileToUser), ...pending];

        const { session } = get();
        const me = session ? users.find((u) => u.id === session.user.id) : undefined;
        const nextSession = session && me ? { ...session, user: toSessionUser(me) } : session;
        set({ users, session: nextSession });
        syncAppMembers(users, nextSession);
      },

      // Dipanggil sekali saat aplikasi dibuka: cocokkan sesi lokal dengan sesi Supabase.
      initAuth: async () => {
        const { data } = await supabase.auth.getSession();
        const sbSession = data.session;
        if (!sbSession) {
          set({ session: null });
          await stopSync();
          return;
        }
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', sbSession.user.id).maybeSingle();
        if (!profile || profile.status !== 'Active') {
          await supabase.auth.signOut();
          set({ session: null });
          return;
        }
        const user = profileToUser(profile);
        const prev = get().session;
        set({
          session: {
            token: sbSession.access_token,
            sessionId: sbSession.user.id,
            expiresAt: prev?.expiresAt ?? new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
            rememberMe: prev?.rememberMe ?? false,
            user: toSessionUser(user),
          },
        });
        await get().refreshUsers();
        void startSync();
      },

      login: async (identifier, password, rememberMe = false) => {
        const { loginAttempts } = get();
        const log = (success: boolean, reason?: string) =>
          set({ loginAttempts: [recordAttempt(identifier, success, reason), ...loginAttempts.slice(0, 49)] });

        const cleanId = identifier.trim().toLowerCase();
        if (!cleanId || !password) {
          log(false, 'Field email/username atau password kosong');
          return { success: false, error: 'Email/Username dan Password wajib diisi!' };
        }

        // Username / NIK -> email
        let email = cleanId;
        if (!cleanId.includes('@')) {
          const { data, error } = await supabase.rpc('resolve_login_email', { identifier: cleanId });
          if (error) return { success: false, error: 'Tidak dapat menghubungi server. Coba lagi.' };
          if (!data) {
            log(false, 'Akun tidak ditemukan');
            return { success: false, error: 'Kredensial tidak valid: Akun tidak ditemukan.' };
          }
          email = data as string;
        }

        const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError || !auth.session) {
          log(false, authError?.message ?? 'Login gagal');
          return { success: false, error: 'Email/username atau kata sandi salah. Silakan coba kembali.' };
        }

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', auth.user.id).maybeSingle();
        if (!profile) {
          await supabase.auth.signOut();
          return { success: false, error: 'Profil karyawan untuk akun ini belum ada. Hubungi Admin / HRD.' };
        }
        if (profile.status === 'Suspended') {
          await supabase.auth.signOut();
          return { success: false, error: 'Akun ini sedang ditangguhkan (Suspended). Harap hubungi Admin / HRD.' };
        }

        const user = profileToUser(profile);
        if (user.twoFactorEnabled && twoFactorPassedFor !== user.id) {
          twoFactorPassedFor = `pending:${user.id}`;
          return { success: true, require2FA: true };
        }
        twoFactorPassedFor = null;

        const durationMs = rememberMe ? 7 * 24 * 3600 * 1000 : 24 * 3600 * 1000;
        set({
          session: {
            token: auth.session.access_token,
            sessionId: auth.user.id,
            expiresAt: new Date(Date.now() + durationMs).toISOString(),
            rememberMe,
            user: toSessionUser(user),
          },
        });
        log(true);

        await supabase.from('profiles').update({ last_login: new Date().toISOString() }).eq('id', user.id);
        await get().refreshUsers();
        void startSync();
        return { success: true };
      },

      verify2FA: async (code: string) => {
        if (!/^\d{6}$/.test(code.trim())) {
          return { success: false, error: 'Kode OTP 2FA harus 6 digit angka.' };
        }
        if (twoFactorPassedFor?.startsWith('pending:')) {
          twoFactorPassedFor = twoFactorPassedFor.slice('pending:'.length);
        }
        return { success: true };
      },

      logout: () => {
        set({ session: null, users: [] });
        twoFactorPassedFor = null;
        void stopSync().then(() => supabase.auth.signOut());
      },

      checkSessionValid: () => {
        const { session } = get();
        if (!session) return false;
        if (Date.now() > new Date(session.expiresAt).getTime()) {
          get().logout();
          return false;
        }
        return true;
      },

      inviteEmployee: async (data) => {
        const { users, session } = get();
        const cleanEmail = data.email.trim().toLowerCase();

        if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
          return { success: false, inviteLink: '', token: '', error: 'Email kantor ini sudah terdaftar!' };
        }
        if (users.some((u) => u.nik.toLowerCase() === data.nik.trim().toLowerCase())) {
          return { success: false, inviteLink: '', token: '', error: 'NIK ini sudah terdaftar!' };
        }

        const colors = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#db2777', '#0891b2'];
        const { data: inv, error } = await supabase
          .from('invitations')
          .insert({
            email: cleanEmail,
            name: data.name.trim(),
            username: cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ''),
            nik: data.nik.trim(),
            division: data.division,
            position: data.position.trim(),
            role: data.role,
            avatar: initials(data.name.trim()),
            color: colors[Math.floor(Math.random() * colors.length)],
            invited_by: session?.user.name,
          })
          .select()
          .single();

        if (error || !inv) {
          return {
            success: false,
            inviteLink: '',
            token: '',
            error: 'Gagal membuat undangan. Hanya Admin, CEO, atau HR yang dapat mengundang karyawan.',
          };
        }

        const inviteLink = `${window.location.origin}/activate?token=${inv.token}`;
        set({
          pendingInvitationEmail: {
            email: cleanEmail,
            name: data.name.trim(),
            token: inv.token,
            expiresAt: inv.expires_at,
            link: inviteLink,
          },
        });
        await get().refreshUsers();
        return { success: true, inviteLink, token: inv.token };
      },

      getInvitation: async (token) => {
        if (!token) return null;
        const { data, error } = await supabase.rpc('get_invitation', { p_token: token });
        if (error || !data || (Array.isArray(data) && data.length === 0)) return null;
        return (Array.isArray(data) ? data[0] : data) as InvitationInfo;
      },

      activateAccountWithPassword: async (token, newPassword, enable2FA = false) => {
        const invitation = await get().getInvitation(token);
        if (!invitation) {
          return { success: false, error: 'Token aktivasi tidak valid atau telah kedaluwarsa. Harap hubungi Admin/HRD untuk undangan baru.' };
        }

        const { error } = await supabase.auth.signUp({
          email: invitation.email,
          password: newPassword,
          options: { data: { two_factor_enabled: enable2FA } },
        });
        if (error) {
          return { success: false, error: `Aktivasi gagal: ${error.message}` };
        }
        // Pengguna diminta login ulang dari halaman login.
        await supabase.auth.signOut();
        return { success: true };
      },

      clearInvitationAlert: () => {
        set({ pendingInvitationEmail: null });
      },

      updateUserProfile: async (userId, data) => {
        const { users } = get();
        const current = users.find((u) => u.id === userId);
        if (!current) {
          return { success: false, error: 'User tidak ditemukan' };
        }

        const merged: UserAccount = {
          ...current,
          ...data,
          avatar: data.name ? initials(data.name) : current.avatar,
        };
        const { error } = await supabase
          .from('profiles')
          .update(toRow(merged, PROFILE_COLUMNS, false))
          .eq('id', userId);
        if (error) {
          return { success: false, error: `Gagal menyimpan profil: ${error.message}` };
        }

        await get().refreshUsers();
        return { success: true };
      },
    }),
    {
      name: 'ruang-kelana-auth-supabase',
      partialize: (state) => ({ session: state.session }),
    }
  )
);
