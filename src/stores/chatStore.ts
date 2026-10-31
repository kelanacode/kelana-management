// Chat internal Ruang Kelana: channel, DM, presence, optimistic UI, notifikasi.
//
// Alur kirim pesan:
//   1. Pesan langsung tampil di layar pengirim (status 'sending').
//   2. Disimpan ke tabel chat_room_messages. Server (RLS + trigger) memvalidasi izin,
//      mengisi pengirim & waktu kirim.
//   3. Penerima yang online menerima lewat Supabase Realtime (WebSocket/WSS).
import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type RoomType = 'channel' | 'direct' | 'group';
export type PresenceStatus = 'online' | 'away';

export interface ChatRoom {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  type: RoomType;
  allowedRoles?: string[];
  allowedDivisions?: string[];
  postingRoles?: string[];
  isArchived: boolean;
  createdAt: string;
  lastMessageAt?: string;
}

export interface ChatMember {
  roomId: string;
  userId: string;
  lastReadAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  text?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  isPinned: boolean;
  createdAt: string;
  deletedAt?: string;
  // Hanya di klien
  status?: 'sending' | 'failed';
  pendingFile?: File;
}

export interface ChatToast {
  id: string;
  roomId: string;
  title: string;
  body: string;
}

interface ChatStore {
  ready: boolean;
  isOpen: boolean;
  activeRoomId: string | null;
  myId: string | null;
  rooms: ChatRoom[];
  members: ChatMember[];
  messages: ChatMessage[];
  presence: Record<string, PresenceStatus>;
  toast: ChatToast | null;

  start: (userId: string) => Promise<void>;
  stop: () => Promise<void>;
  open: (roomId?: string) => void;
  close: () => void;
  toggle: () => void;
  selectRoom: (roomId: string) => void;
  openDM: (userId: string) => Promise<string | null>;
  send: (text: string, file?: File) => Promise<void>;
  retry: (messageId: string) => Promise<void>;
  discard: (messageId: string) => void;
  togglePin: (messageId: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  markRead: (roomId: string) => Promise<void>;
  createChannel: (input: {
    name: string;
    description?: string;
    allowedRoles?: string[];
    allowedDivisions?: string[];
    postingRoles?: string[];
  }) => Promise<{ success: boolean; error?: string; roomId?: string }>;
  dismissToast: () => void;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const AWAY_AFTER_MS = 5 * 60 * 1000;
const PAGE_SIZE = 1000;

// ---------------- Konversi baris ----------------
const toRoom = (r: any): ChatRoom => ({
  id: r.id,
  slug: r.slug ?? undefined,
  name: r.name,
  description: r.description ?? undefined,
  type: r.type,
  allowedRoles: r.allowed_roles ?? undefined,
  allowedDivisions: r.allowed_divisions ?? undefined,
  postingRoles: r.posting_roles ?? undefined,
  isArchived: r.is_archived,
  createdAt: r.created_at,
  lastMessageAt: r.last_message_at ?? undefined,
});
const toMember = (r: any): ChatMember => ({ roomId: r.room_id, userId: r.user_id, lastReadAt: r.last_read_at });
const toMessage = (r: any): ChatMessage => ({
  id: r.id,
  roomId: r.room_id,
  senderId: r.sender_id,
  text: r.message_text ?? undefined,
  fileUrl: r.file_url ?? undefined,
  fileName: r.file_name ?? undefined,
  fileSize: r.file_size ?? undefined,
  fileType: r.file_type ?? undefined,
  isPinned: r.is_pinned,
  createdAt: r.created_at,
  deletedAt: r.deleted_at ?? undefined,
});

const byTime = (a: ChatMessage, b: ChatMessage) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
const upsertBy = <T>(list: T[], item: T, same: (x: T) => boolean) => {
  const idx = list.findIndex(same);
  if (idx === -1) return [...list, item];
  const next = [...list];
  next[idx] = item;
  return next;
};

// ---------------- Helper publik ----------------

// Waktu "sudah dibaca" milik user. Tanpa catatan: dianggap sejak sesi dimulai.
let sessionStartedAt = new Date().toISOString();
export const lastReadOf = (members: ChatMember[], roomId: string, userId: string | null) =>
  members.find((m) => m.roomId === roomId && m.userId === userId)?.lastReadAt ?? sessionStartedAt;

export const unreadInRoom = (s: Pick<ChatStore, 'messages' | 'members' | 'myId'>, roomId: string) => {
  const since = new Date(lastReadOf(s.members, roomId, s.myId)).getTime();
  return s.messages.filter(
    (m) => m.roomId === roomId && m.senderId !== s.myId && !m.deletedAt && new Date(m.createdAt).getTime() > since
  ).length;
};

export const totalUnread = (s: Pick<ChatStore, 'messages' | 'members' | 'myId' | 'rooms'>) =>
  s.rooms.reduce((sum, r) => sum + unreadInRoom(s, r.id), 0);

export const dmPartnerId = (members: ChatMember[], roomId: string, myId: string | null) =>
  members.find((m) => m.roomId === roomId && m.userId !== myId)?.userId;

// URL sementara (1 jam) untuk lampiran di bucket private
const signedUrlCache = new Map<string, { url: string; expires: number }>();
export async function getFileUrl(path: string): Promise<string | null> {
  const cached = signedUrlCache.get(path);
  if (cached && cached.expires > Date.now()) return cached.url;
  const { data, error } = await supabase.storage.from('chat-files').createSignedUrl(path, 3600);
  if (error || !data) return null;
  signedUrlCache.set(path, { url: data.signedUrl, expires: Date.now() + 55 * 60 * 1000 });
  return data.signedUrl;
}

// ---------------- Store ----------------
let channel: RealtimeChannel | null = null;
let awayTimer: ReturnType<typeof setTimeout> | null = null;
let removeActivityListeners: (() => void) | null = null;
let currentPresence: PresenceStatus = 'online';
let markReadTimer: ReturnType<typeof setTimeout> | null = null;

async function fetchAll(table: string, order: string) {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from(table).select('*').order(order).range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
  }
}

export const useChatStore = create<ChatStore>()((set, get) => {
  const ensureRoom = async (roomId: string) => {
    if (get().rooms.some((r) => r.id === roomId)) return;
    const [{ data: room }, { data: members }] = await Promise.all([
      supabase.from('chat_rooms').select('*').eq('id', roomId).maybeSingle(),
      supabase.from('chat_room_members').select('*').eq('room_id', roomId),
    ]);
    if (!room) return;
    set((s) => ({
      rooms: upsertBy(s.rooms, toRoom(room), (r) => r.id === roomId),
      members: (members ?? []).map(toMember).reduce(
        (acc, m) => upsertBy(acc, m, (x) => x.roomId === m.roomId && x.userId === m.userId),
        s.members
      ),
    }));
  };

  const notify = (msg: ChatMessage) => {
    const s = get();
    if (msg.senderId === s.myId) return;
    const visible = s.isOpen && s.activeRoomId === msg.roomId && !document.hidden;
    if (visible) {
      void get().markRead(msg.roomId);
      return;
    }
    const room = s.rooms.find((r) => r.id === msg.roomId);
    const sender = senderNameResolver(msg.senderId);
    const title = room?.type === 'channel' ? `#${room.name} · ${sender}` : `Pesan dari ${sender}`;
    const body = msg.text ?? (msg.fileName ? `📎 ${msg.fileName}` : '');
    set({ toast: { id: msg.id, roomId: msg.roomId, title, body } });

    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      const n = new Notification(title, { body, tag: msg.roomId, icon: '/kelana-logo.png' });
      n.onclick = () => {
        window.focus();
        get().open(msg.roomId);
        n.close();
      };
    }
  };

  const setPresence = (status: PresenceStatus) => {
    if (!channel || status === currentPresence) return;
    currentPresence = status;
    void channel.track({ user_id: get().myId, status });
  };

  const insertMessage = async (msg: ChatMessage) => {
    let fileFields = {};
    if (msg.pendingFile) {
      const safe = msg.pendingFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${msg.roomId}/${msg.id}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from('chat-files')
        .upload(path, msg.pendingFile, { upsert: true, contentType: msg.pendingFile.type || undefined });
      if (upErr) throw upErr;
      fileFields = {
        file_url: path,
        file_name: msg.pendingFile.name,
        file_size: msg.pendingFile.size,
        file_type: msg.pendingFile.type || null,
      };
    }
    const { data, error } = await supabase
      .from('chat_room_messages')
      .insert({ id: msg.id, room_id: msg.roomId, sender_id: msg.senderId, message_text: msg.text ?? null, ...fileFields })
      .select()
      .single();
    if (error) throw error;
    return toMessage(data);
  };

  const deliver = async (msg: ChatMessage) => {
    try {
      const saved = await insertMessage(msg);
      set((s) => ({ messages: upsertBy(s.messages, saved, (m) => m.id === saved.id).sort(byTime) }));
      void get().markRead(msg.roomId);
    } catch (err) {
      console.error('[chat] gagal mengirim:', err);
      set((s) => ({ messages: s.messages.map((m) => (m.id === msg.id ? { ...m, status: 'failed' } : m)) }));
    }
  };

  return {
    ready: false,
    isOpen: false,
    activeRoomId: null,
    myId: null,
    rooms: [],
    members: [],
    messages: [],
    presence: {},
    toast: null,

    start: async (userId) => {
      if (get().myId === userId && channel) return;
      await get().stop();
      sessionStartedAt = new Date().toISOString();
      set({ myId: userId });

      // Realtime dulu, supaya pesan yang masuk selama memuat tidak terlewat
      const { data: auth } = await supabase.auth.getSession();
      if (auth.session) await supabase.realtime.setAuth(auth.session.access_token);

      channel = supabase.channel('kelana-chat', { config: { presence: { key: userId } } });
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_room_messages' }, (p: any) => {
          if (p.eventType === 'DELETE') {
            set((s) => ({ messages: s.messages.filter((m) => m.id !== p.old.id) }));
            return;
          }
          const msg = toMessage(p.new);
          const isNew = !get().messages.some((m) => m.id === msg.id);
          set((s) => ({ messages: upsertBy(s.messages, msg, (m) => m.id === msg.id).sort(byTime) }));
          void ensureRoom(msg.roomId);
          if (p.eventType === 'INSERT' && isNew) notify(msg);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_room_members' }, (p: any) => {
          if (p.eventType === 'DELETE') return;
          const m = toMember(p.new);
          set((s) => ({ members: upsertBy(s.members, m, (x) => x.roomId === m.roomId && x.userId === m.userId) }));
          void ensureRoom(m.roomId);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, (p: any) => {
          if (p.eventType === 'DELETE') {
            set((s) => ({ rooms: s.rooms.filter((r) => r.id !== p.old.id) }));
            return;
          }
          const room = toRoom(p.new);
          set((s) => ({ rooms: upsertBy(s.rooms, room, (r) => r.id === room.id) }));
        })
        .on('presence', { event: 'sync' }, () => {
          const state = channel?.presenceState<{ user_id: string; status: PresenceStatus }>() ?? {};
          const presence: Record<string, PresenceStatus> = {};
          for (const [key, metas] of Object.entries(state)) {
            // Beberapa tab: dianggap online bila salah satu online
            presence[key] = metas.some((m) => m.status === 'online') ? 'online' : 'away';
          }
          set({ presence });
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            currentPresence = document.hidden ? 'away' : 'online';
            void channel?.track({ user_id: userId, status: currentPresence });
          }
        });

      // Online / Away: tab tersembunyi atau tidak ada aktivitas 5 menit
      const onActivity = () => {
        if (!document.hidden) setPresence('online');
        if (awayTimer) clearTimeout(awayTimer);
        awayTimer = setTimeout(() => setPresence('away'), AWAY_AFTER_MS);
      };
      const onVisibility = () => {
        if (document.hidden) setPresence('away');
        else {
          onActivity();
          const { isOpen, activeRoomId } = get();
          if (isOpen && activeRoomId) void get().markRead(activeRoomId);
        }
      };
      const events = ['mousemove', 'keydown', 'click', 'touchstart'];
      events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
      document.addEventListener('visibilitychange', onVisibility);
      removeActivityListeners = () => {
        events.forEach((e) => window.removeEventListener(e, onActivity));
        document.removeEventListener('visibilitychange', onVisibility);
      };
      onActivity();

      // Muat data
      try {
        const [rooms, members, messages] = await Promise.all([
          fetchAll('chat_rooms', 'created_at'),
          fetchAll('chat_room_members', 'joined_at'),
          fetchAll('chat_room_messages', 'created_at'),
        ]);
        if (get().myId !== userId) return;
        set((s) => ({
          rooms: rooms.map(toRoom),
          members: members.map(toMember),
          // Gabungkan dengan pesan yang dikirim/diterima selama memuat
          messages: messages
            .map(toMessage)
            .reduce((acc, m) => upsertBy(acc, m, (x) => x.id === m.id), s.messages)
            .sort(byTime),
          ready: true,
        }));
        const { activeRoomId, rooms: loaded } = get();
        if (!activeRoomId || !loaded.some((r) => r.id === activeRoomId)) {
          set({ activeRoomId: loaded.find((r) => r.slug === 'umum')?.id ?? loaded[0]?.id ?? null });
        }
      } catch (err) {
        console.error('[chat] gagal memuat:', err);
      }
    },

    stop: async () => {
      if (channel) {
        await channel.untrack().catch(() => undefined);
        await supabase.removeChannel(channel);
      }
      channel = null;
      if (awayTimer) clearTimeout(awayTimer);
      removeActivityListeners?.();
      removeActivityListeners = null;
      set({ ready: false, myId: null, rooms: [], members: [], messages: [], presence: {}, toast: null, activeRoomId: null, isOpen: false });
    },

    open: (roomId) => {
      set((s) => ({ isOpen: true, activeRoomId: roomId ?? s.activeRoomId, toast: null }));
      const id = get().activeRoomId;
      if (id) void get().markRead(id);
    },
    close: () => set({ isOpen: false }),
    toggle: () => (get().isOpen ? get().close() : get().open()),

    selectRoom: (roomId) => {
      set({ activeRoomId: roomId });
      void get().markRead(roomId);
    },

    openDM: async (userId) => {
      const { data, error } = await supabase.rpc('chat_get_or_create_dm', { p_other: userId });
      if (error || !data) {
        console.error('[chat] gagal membuka DM:', error);
        return null;
      }
      const roomId = data as string;
      await ensureRoom(roomId);
      get().open(roomId);
      return roomId;
    },

    send: async (text, file) => {
      const { activeRoomId, myId } = get();
      const clean = text.trim();
      if (!activeRoomId || !myId || (!clean && !file)) return;
      if (file && file.size > MAX_FILE_BYTES) {
        alert('Ukuran file maksimal 10 MB.');
        return;
      }
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        roomId: activeRoomId,
        senderId: myId,
        text: clean || undefined,
        fileName: file?.name,
        fileSize: file?.size,
        fileType: file?.type,
        isPinned: false,
        // Waktu sementara; diganti waktu server setelah tersimpan.
        // Diletakkan setelah pesan terakhir agar langsung tampil paling bawah walau jam perangkat meleset.
        createdAt: new Date(
          Math.max(Date.now(), ...get().messages.filter((m) => m.roomId === activeRoomId).map((m) => new Date(m.createdAt).getTime() + 1))
        ).toISOString(),
        status: 'sending',
        pendingFile: file,
      };
      set((s) => ({ messages: [...s.messages, msg] }));
      await deliver(msg);
    },

    retry: async (messageId) => {
      const msg = get().messages.find((m) => m.id === messageId);
      if (!msg || msg.status !== 'failed') return;
      set((s) => ({ messages: s.messages.map((m) => (m.id === messageId ? { ...m, status: 'sending' } : m)) }));
      await deliver({ ...msg, status: 'sending' });
    },

    discard: (messageId) => set((s) => ({ messages: s.messages.filter((m) => m.id !== messageId) })),

    togglePin: async (messageId) => {
      const { error } = await supabase.rpc('chat_toggle_pin', { p_message: messageId });
      if (error) alert(error.message);
    },

    deleteMessage: async (messageId) => {
      const { error } = await supabase.rpc('chat_delete_message', { p_message: messageId });
      if (error) alert(error.message);
    },

    markRead: async (roomId) => {
      // Digabung agar tidak memanggil server terlalu sering
      if (markReadTimer) clearTimeout(markReadTimer);
      markReadTimer = setTimeout(async () => {
        const { myId } = get();
        if (!myId) return;
        const { data, error } = await supabase.rpc('chat_mark_read', { p_room: roomId });
        if (error || !data) return;
        const m: ChatMember = { roomId, userId: myId, lastReadAt: new Date(data as string).toISOString() };
        set((s) => ({ members: upsertBy(s.members, m, (x) => x.roomId === roomId && x.userId === myId) }));
      }, 300);
    },

    createChannel: async (input) => {
      const { data, error } = await supabase.rpc('chat_create_channel', {
        p_name: input.name,
        p_description: input.description || null,
        p_allowed_roles: input.allowedRoles?.length ? input.allowedRoles : null,
        p_allowed_divisions: input.allowedDivisions?.length ? input.allowedDivisions : null,
        p_posting_roles: input.postingRoles?.length ? input.postingRoles : null,
      });
      if (error) {
        return {
          success: false,
          error: error.message.includes('duplicate') ? 'Nama channel sudah dipakai.' : error.message,
        };
      }
      await ensureRoom(data as string);
      get().selectRoom(data as string);
      return { success: true, roomId: data as string };
    },

    dismissToast: () => set({ toast: null }),
  };
});

// Nama pengirim untuk notifikasi; diisi oleh komponen yang punya akses daftar user.
let senderNameResolver: (userId: string) => string = () => 'Rekan kerja';
export const setChatSenderNameResolver = (fn: (userId: string) => string) => {
  senderNameResolver = fn;
};
