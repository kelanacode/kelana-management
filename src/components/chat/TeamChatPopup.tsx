import { DIVISIONS } from '../../constants/divisions';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageSquare, X, Send, Hash, Lock, Megaphone, Search, Paperclip, Pin, PinOff,
  Trash2, RotateCw, Check, CheckCheck, ChevronLeft, Plus, Bell, BellOff, FileText, Loader2, Download,
} from 'lucide-react';
import { format, isSameDay, isToday, isYesterday } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useAuthStore } from '../../stores/authStore';
import {
  useChatStore,
  unreadInRoom,
  totalUnread,
  dmPartnerId,
  lastReadOf,
  getFileUrl,
  setChatSenderNameResolver,
  ChatRoom,
  ChatMessage,
  PresenceStatus,
} from '../../stores/chatStore';
import type { UserAccount } from '../../types/auth';

const ROLE_OPTIONS = ['Admin', 'CEO', 'HR', 'Manager', 'Finance', 'Marketing', 'Staff'];
const DIVISION_OPTIONS: string[] = [...DIVISIONS];

const presenceColor = (p?: PresenceStatus) =>
  p === 'online' ? 'bg-emerald-500' : p === 'away' ? 'bg-amber-400' : 'bg-gray-300 dark:bg-gray-600';
const presenceLabel = (p?: PresenceStatus) => (p === 'online' ? 'Online' : p === 'away' ? 'Away' : 'Offline');

const formatSize = (bytes?: number) =>
  !bytes ? '' : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  if (isToday(d)) return 'Hari ini';
  if (isYesterday(d)) return 'Kemarin';
  return format(d, 'EEEE, d MMMM yyyy', { locale: idLocale });
};

const Avatar: React.FC<{ user?: UserAccount; size?: string; presence?: PresenceStatus; showPresence?: boolean }> = ({
  user, size = 'w-8 h-8', presence, showPresence,
}) => (
  <div className="relative flex-shrink-0">
    {user?.photoUrl ? (
      <img src={user.photoUrl} alt={user.name} className={`${size} rounded-full object-cover`} />
    ) : (
      <div
        className={`${size} rounded-full flex items-center justify-center text-white text-[11px] font-bold`}
        style={{ backgroundColor: user?.color || '#7c3aed' }}
      >
        {user?.avatar || '?'}
      </div>
    )}
    {showPresence && (
      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${presenceColor(presence)}`} />
    )}
  </div>
);

// ---------------- Lampiran ----------------
const Attachment: React.FC<{ msg: ChatMessage; mine: boolean }> = ({ msg, mine }) => {
  const [url, setUrl] = useState<string | null>(null);
  const isImage = msg.fileType?.startsWith('image/');
  const localPreview = useMemo(
    () => (msg.pendingFile && isImage ? URL.createObjectURL(msg.pendingFile) : null),
    [msg.pendingFile, isImage]
  );

  useEffect(() => {
    if (msg.fileUrl) getFileUrl(msg.fileUrl).then(setUrl);
  }, [msg.fileUrl]);

  const src = url ?? localPreview;
  if (isImage && src) {
    return (
      <a href={url ?? undefined} target="_blank" rel="noreferrer" className="block mt-1">
        <img src={src} alt={msg.fileName} className="max-w-[220px] max-h-56 rounded-xl object-cover border border-black/5" />
      </a>
    );
  }
  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noreferrer"
      className={`mt-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${
        mine ? 'bg-white/15 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600'
      }`}
    >
      <FileText size={16} className="flex-shrink-0" />
      <span className="truncate max-w-[160px] font-medium">{msg.fileName}</span>
      <span className="opacity-70 flex-shrink-0">{formatSize(msg.fileSize)}</span>
      {url && <Download size={13} className="flex-shrink-0" />}
    </a>
  );
};

// ---------------- Form buat channel ----------------
const CreateChannelForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const createChannel = useChatStore((s) => s.createChannel);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [access, setAccess] = useState<'all' | 'roles' | 'divisions'>('all');
  const [roles, setRoles] = useState<string[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [adminOnlyPost, setAdminOnlyPost] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (list: string[], v: string, setList: (l: string[]) => void) =>
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await createChannel({
      name,
      description,
      allowedRoles: access === 'roles' ? roles : undefined,
      allowedDivisions: access === 'divisions' ? divisions : undefined,
      postingRoles: adminOnlyPost ? ['Admin', 'CEO', 'HR'] : undefined,
    });
    setSaving(false);
    if (!res.success) setError(res.error || 'Gagal membuat channel');
    else onClose();
  };

  const chip = (active: boolean) =>
    `px-2 py-1 rounded-lg border text-[11px] ${active ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`;

  return (
    <form onSubmit={submit} className="p-4 space-y-3 text-xs overflow-y-auto">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm text-gray-900 dark:text-white">Buat Channel Baru</h4>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>
      <input
        required
        placeholder="Nama channel, mis. proyek-website"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
      />
      <input
        placeholder="Deskripsi (opsional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
      />
      <div>
        <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1.5">Siapa yang bisa melihat?</p>
        <div className="flex gap-1.5 flex-wrap">
          <button type="button" className={chip(access === 'all')} onClick={() => setAccess('all')}>Semua karyawan</button>
          <button type="button" className={chip(access === 'roles')} onClick={() => setAccess('roles')}>Role tertentu</button>
          <button type="button" className={chip(access === 'divisions')} onClick={() => setAccess('divisions')}>Divisi tertentu</button>
        </div>
        {access === 'roles' && (
          <div className="flex gap-1.5 flex-wrap mt-2">
            {ROLE_OPTIONS.map((r) => (
              <button key={r} type="button" className={chip(roles.includes(r))} onClick={() => toggle(roles, r, setRoles)}>{r}</button>
            ))}
          </div>
        )}
        {access === 'divisions' && (
          <div className="flex gap-1.5 flex-wrap mt-2">
            {DIVISION_OPTIONS.map((d) => (
              <button key={d} type="button" className={chip(divisions.includes(d))} onClick={() => toggle(divisions, d, setDivisions)}>{d}</button>
            ))}
          </div>
        )}
        <p className="text-[10px] text-gray-400 mt-1">Admin & CEO selalu dapat mengakses semua channel.</p>
      </div>
      <label className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
        <input type="checkbox" checked={adminOnlyPost} onChange={(e) => setAdminOnlyPost(e.target.checked)} />
        Hanya Admin, CEO, dan HR yang boleh menulis (mode pengumuman)
      </label>
      {error && <p className="text-rose-600">{error}</p>}
      <button
        type="submit"
        disabled={saving || (access === 'roles' && !roles.length) || (access === 'divisions' && !divisions.length)}
        className="w-full py-2 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold"
      >
        {saving ? 'Membuat...' : 'Buat Channel'}
      </button>
    </form>
  );
};

// ---------------- Komponen utama ----------------
export const TeamChatPopup: React.FC = () => {
  const { session, users } = useAuthStore();
  const me = session?.user;
  const chat = useChatStore();
  const { isOpen, activeRoomId, rooms, members, messages, presence, toast, myId, ready } = chat;

  const [input, setInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [sidebarTab, setSidebarTab] = useState<'chats' | 'directory'>('chats');
  const [showSidebarMobile, setShowSidebarMobile] = useState(true);
  const [showPinned, setShowPinned] = useState(false);
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    'Notification' in window ? Notification.permission : 'unsupported'
  );
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const activeUsers = useMemo(() => users.filter((u) => u.status === 'Active'), [users]);

  useEffect(() => {
    setChatSenderNameResolver((id) => userById.get(id)?.name ?? 'Rekan kerja');
  }, [userById]);

  // Toast in-app hilang otomatis
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => chat.dismissToast(), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? null;
  const roomMessages = useMemo(
    () => messages.filter((m) => m.roomId === activeRoomId && (!showPinned || m.isPinned)),
    [messages, activeRoomId, showPinned]
  );
  const pinnedCount = messages.filter((m) => m.roomId === activeRoomId && m.isPinned && !m.deletedAt).length;

  useEffect(() => {
    if (isOpen) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isOpen, roomMessages.length, activeRoomId]);

  if (!me) return null;

  const isPeopleAdmin = ['Admin', 'CEO', 'HR'].includes(me.role);
  const canPost = (room: ChatRoom | null) =>
    !!room && !room.isArchived && (!room.postingRoles || room.postingRoles.includes(me.role) || ['Admin', 'CEO'].includes(me.role));

  const roomTitle = (room: ChatRoom) => {
    if (room.type === 'channel') return room.name;
    const partner = userById.get(dmPartnerId(members, room.id, myId) ?? '');
    return partner?.name ?? 'Percakapan';
  };

  const channelIcon = (room: ChatRoom, size = 14) =>
    room.postingRoles ? <Megaphone size={size} /> : room.allowedRoles || room.allowedDivisions ? <Lock size={size} /> : <Hash size={size} />;

  const q = search.trim().toLowerCase();
  const channels = rooms
    .filter((r) => r.type === 'channel' && (!q || r.name.includes(q)))
    .sort((a, b) => (a.slug === 'umum' ? -1 : b.slug === 'umum' ? 1 : a.name.localeCompare(b.name)));
  const dms = rooms
    .filter((r) => r.type !== 'channel' && (!q || roomTitle(r).toLowerCase().includes(q)))
    .sort((a, b) => (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt));
  const directory = activeUsers
    .filter((u) => u.id !== myId)
    .filter((u) => !q || `${u.name} ${u.division} ${u.position}`.toLowerCase().includes(q))
    .reduce<Record<string, UserAccount[]>>((acc, u) => {
      (acc[u.division || 'Lainnya'] ??= []).push(u);
      return acc;
    }, {});

  const unread = totalUnread(chat);

  const selectRoom = (id: string) => {
    chat.selectRoom(id);
    setShowPinned(false);
    setShowSidebarMobile(false);
  };

  const startDM = async (userId: string) => {
    const roomId = await chat.openDM(userId);
    if (roomId) {
      setSidebarTab('chats');
      setShowSidebarMobile(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() && !file) return;
    const text = input;
    const attached = file;
    setInput('');
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
    await chat.send(text, attached ?? undefined);
  };

  const requestNotifications = async () => {
    if (!('Notification' in window)) return;
    setNotifPermission(await Notification.requestPermission());
  };

  // Penanda "Dibaca" untuk DM: waktu baca lawan bicara >= waktu kirim pesan saya
  const partnerReadAt =
    activeRoom && activeRoom.type !== 'channel'
      ? new Date(lastReadOf(members, activeRoom.id, dmPartnerId(members, activeRoom.id, myId) ?? null)).getTime()
      : null;

  const activePartner = activeRoom?.type === 'direct' ? userById.get(dmPartnerId(members, activeRoom.id, myId) ?? '') : undefined;
  const onlineCount = activeUsers.filter((u) => presence[u.id] === 'online').length;

  const sidebarItem = (active: boolean) =>
    `w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[13px] transition-colors ${
      active
        ? 'bg-primary-600 text-white'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
    }`;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end pointer-events-none">
      {/* Notifikasi in-app */}
      {toast && !isOpen && (
        <button
          onClick={() => chat.open(toast.roomId)}
          className="pointer-events-auto mb-3 w-80 text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-3 flex gap-3 animate-in fade-in slide-in-from-bottom-3"
        >
          <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-600 flex items-center justify-center flex-shrink-0">
            <MessageSquare size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{toast.title}</p>
            <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{toast.body}</p>
          </div>
          <span
            onClick={(e) => {
              e.stopPropagation();
              chat.dismissToast();
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </span>
        </button>
      )}

      {isOpen && (
        <div className="pointer-events-auto mb-3 w-[calc(100vw-2.5rem)] sm:w-[760px] h-[min(620px,calc(100vh-7rem))] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex">
          {/* ---------- Sidebar ---------- */}
          <aside
            className={`${showSidebarMobile ? 'flex' : 'hidden'} sm:flex w-full sm:w-64 flex-col border-r border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-950/40`}
          >
            <div className="p-3 border-b border-gray-100 dark:border-gray-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-gray-900 dark:text-white">Chat Kelana</p>
                  <p className="text-[11px] text-gray-500">{onlineCount} rekan online</p>
                </div>
                <div className="flex items-center gap-1">
                  {notifPermission === 'default' && (
                    <button onClick={requestNotifications} title="Aktifkan notifikasi browser" className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800">
                      <Bell size={15} />
                    </button>
                  )}
                  {notifPermission === 'denied' && (
                    <span title="Notifikasi browser diblokir. Izinkan lewat pengaturan situs." className="p-1.5 text-gray-400"><BellOff size={15} /></span>
                  )}
                  <button onClick={chat.close} className="sm:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-200"><X size={16} /></button>
                </div>
              </div>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari channel / rekan kerja"
                  className="w-full pl-7 pr-2 py-1.5 rounded-lg text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-gray-200/60 dark:bg-gray-800 rounded-lg text-[11px] font-semibold">
                {(['chats', 'directory'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSidebarTab(t)}
                    className={`py-1 rounded-md ${sidebarTab === t ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500'}`}
                  >
                    {t === 'chats' ? 'Percakapan' : 'Direktori'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {!ready && <p className="text-xs text-gray-400 px-2 py-4 flex items-center gap-2"><Loader2 size={13} className="animate-spin" /> Memuat chat...</p>}

              {ready && sidebarTab === 'chats' && (
                <>
                  <div>
                    <div className="flex items-center justify-between px-2 mb-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Channel</p>
                      {isPeopleAdmin && (
                        <button onClick={() => setCreatingChannel(true)} title="Buat channel" className="text-gray-400 hover:text-primary-600"><Plus size={14} /></button>
                      )}
                    </div>
                    {channels.map((r) => {
                      const n = unreadInRoom(chat, r.id);
                      const active = r.id === activeRoomId;
                      return (
                        <button key={r.id} onClick={() => selectRoom(r.id)} className={sidebarItem(active)}>
                          <span className={active ? 'text-white' : 'text-gray-400'}>{channelIcon(r)}</span>
                          <span className={`flex-1 truncate ${n ? 'font-bold' : ''}`}>{r.name}</span>
                          {n > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">{n}</span>}
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 mb-1">Pesan Langsung</p>
                    {dms.length === 0 && (
                      <p className="text-[11px] text-gray-400 px-2">Belum ada. Buka tab Direktori untuk memulai chat.</p>
                    )}
                    {dms.map((r) => {
                      const partnerId = dmPartnerId(members, r.id, myId);
                      const partner = userById.get(partnerId ?? '');
                      const n = unreadInRoom(chat, r.id);
                      const active = r.id === activeRoomId;
                      return (
                        <button key={r.id} onClick={() => selectRoom(r.id)} className={sidebarItem(active)}>
                          <Avatar user={partner} size="w-6 h-6" presence={presence[partnerId ?? '']} showPresence />
                          <span className={`flex-1 truncate ${n ? 'font-bold' : ''}`}>{roomTitle(r)}</span>
                          {n > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">{n}</span>}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {ready && sidebarTab === 'directory' &&
                Object.entries(directory)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([division, list]) => (
                    <div key={division}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 mb-1">{division}</p>
                      {list
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((u) => (
                          <button key={u.id} onClick={() => startDM(u.id)} className={sidebarItem(false)} title={`Chat dengan ${u.name}`}>
                            <Avatar user={u} size="w-7 h-7" presence={presence[u.id]} showPresence />
                            <span className="flex-1 min-w-0">
                              <span className="block truncate font-medium">{u.name}</span>
                              <span className="block truncate text-[10px] text-gray-500">
                                {u.position || u.role} · {presenceLabel(presence[u.id])}
                                {u.workStatus && u.workStatus !== 'Online' ? ` · ${u.workStatus}` : ''}
                              </span>
                            </span>
                          </button>
                        ))}
                    </div>
                  ))}
              {ready && sidebarTab === 'directory' && Object.keys(directory).length === 0 && (
                <p className="text-[11px] text-gray-400 px-2">Belum ada rekan kerja lain yang aktif.</p>
              )}
            </div>
          </aside>

          {/* ---------- Area percakapan ---------- */}
          <section className={`${showSidebarMobile ? 'hidden' : 'flex'} sm:flex flex-1 flex-col min-w-0`}>
            {creatingChannel ? (
              <CreateChannelForm onClose={() => setCreatingChannel(false)} />
            ) : !activeRoom ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
                <MessageSquare size={32} />
                Pilih channel atau rekan kerja untuk mulai chat
              </div>
            ) : (
              <>
                <header className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                  <button onClick={() => setShowSidebarMobile(true)} className="sm:hidden p-1 -ml-1 text-gray-500"><ChevronLeft size={18} /></button>
                  {activeRoom.type === 'channel' ? (
                    <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-950 text-primary-600 flex items-center justify-center">{channelIcon(activeRoom, 16)}</div>
                  ) : (
                    <Avatar user={activePartner} presence={presence[activePartner?.id ?? '']} showPresence />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                      {activeRoom.type === 'channel' ? `#${activeRoom.name}` : roomTitle(activeRoom)}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {activeRoom.type === 'channel'
                        ? activeRoom.description || 'Channel'
                        : `${activePartner?.position || ''}${activePartner?.division ? ` · ${activePartner.division}` : ''} · ${presenceLabel(presence[activePartner?.id ?? ''])}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPinned((v) => !v)}
                    title="Pesan yang di-pin"
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 ${showPinned ? 'bg-amber-100 text-amber-700' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  >
                    <Pin size={13} /> {pinnedCount}
                  </button>
                  <button onClick={chat.close} className="hidden sm:block p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={16} /></button>
                </header>

                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 bg-gray-50/40 dark:bg-gray-950/20">
                  {showPinned && <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5 mb-2">Menampilkan pesan yang di-pin saja. Pesan ini tidak ikut terhapus otomatis setelah 30 hari.</p>}
                  {roomMessages.length === 0 && (
                    <div className="h-full flex items-center justify-center text-xs text-gray-400">
                      {showPinned ? 'Belum ada pesan yang di-pin.' : 'Belum ada pesan. Mulai percakapan!'}
                    </div>
                  )}
                  {roomMessages.map((m, i) => {
                    const prev = roomMessages[i - 1];
                    const mine = m.senderId === myId;
                    const sender = userById.get(m.senderId);
                    const newDay = !prev || !isSameDay(new Date(prev.createdAt), new Date(m.createdAt));
                    const grouped =
                      !newDay && prev?.senderId === m.senderId && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;
                    const read = mine && partnerReadAt !== null && !m.status && partnerReadAt >= new Date(m.createdAt).getTime();

                    return (
                      <React.Fragment key={m.id}>
                        {newDay && (
                          <div className="flex items-center gap-2 py-2">
                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                            <span className="text-[10px] font-semibold text-gray-400">{dayLabel(m.createdAt)}</span>
                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                          </div>
                        )}
                        <div className={`group flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''} ${grouped ? 'mt-0.5' : 'mt-2'}`}>
                          <div className="w-8">{!mine && !grouped && <Avatar user={sender} />}</div>
                          <div className={`max-w-[75%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                            {!grouped && (
                              <span className="text-[11px] text-gray-500 mb-0.5 px-1">
                                {mine ? 'Anda' : sender?.name ?? 'Mantan karyawan'}
                                {!mine && sender?.position ? ` · ${sender.position}` : ''}
                              </span>
                            )}
                            <div className={`flex items-center gap-1 ${mine ? 'flex-row-reverse' : ''}`}>
                              <div
                                className={`px-3 py-2 rounded-2xl text-[13px] leading-relaxed break-words ${
                                  m.deletedAt
                                    ? 'italic text-gray-400 bg-gray-100 dark:bg-gray-800'
                                    : mine
                                      ? `bg-primary-600 text-white rounded-br-md ${m.status === 'failed' ? 'opacity-60' : ''}`
                                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-bl-md'
                                } ${m.isPinned ? 'ring-2 ring-amber-300' : ''}`}
                              >
                                {m.deletedAt ? (
                                  'Pesan telah dihapus'
                                ) : (
                                  <>
                                    {m.text && <span className="whitespace-pre-wrap">{m.text}</span>}
                                    {(m.fileUrl || m.pendingFile) && <Attachment msg={m} mine={mine} />}
                                  </>
                                )}
                              </div>
                              {!m.deletedAt && !m.status && (
                                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                                  {canPost(activeRoom) && (
                                    <button onClick={() => chat.togglePin(m.id)} title={m.isPinned ? 'Lepas pin' : 'Pin pesan'} className="p-1 rounded text-gray-400 hover:text-amber-600 hover:bg-gray-100 dark:hover:bg-gray-800">
                                      {m.isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                                    </button>
                                  )}
                                  {(mine || ['Admin', 'CEO'].includes(me.role)) && (
                                    <button
                                      onClick={() => confirm('Hapus pesan ini?') && chat.deleteMessage(m.id)}
                                      title="Hapus pesan"
                                      className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 mt-0.5 px-1 flex items-center gap-1">
                              {m.isPinned && <Pin size={10} className="text-amber-500" />}
                              {m.status === 'sending' ? (
                                <>
                                  <Loader2 size={10} className="animate-spin" /> Mengirim...
                                </>
                              ) : m.status === 'failed' ? (
                                <span className="text-rose-500 flex items-center gap-1.5">
                                  Gagal terkirim
                                  <button onClick={() => chat.retry(m.id)} className="underline flex items-center gap-0.5"><RotateCw size={10} /> Kirim ulang</button>
                                  <button onClick={() => chat.discard(m.id)} className="underline">Buang</button>
                                </span>
                              ) : (
                                <>
                                  {format(new Date(m.createdAt), 'HH:mm')}
                                  {mine && activeRoom.type !== 'channel' && (
                                    read ? <CheckCheck size={12} className="text-sky-500" /> : <Check size={12} />
                                  )}
                                  {mine && activeRoom.type !== 'channel' && read && <span>Dibaca</span>}
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                  <div ref={endRef} />
                </div>

                {canPost(activeRoom) ? (
                  <form onSubmit={handleSend} className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                    {file && (
                      <div className="flex items-center gap-2 text-xs bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5">
                        <Paperclip size={13} className="text-gray-500" />
                        <span className="truncate flex-1 text-gray-700 dark:text-gray-200">{file.name}</span>
                        <span className="text-gray-400">{formatSize(file.size)}</span>
                        <button type="button" onClick={() => setFile(null)} className="text-gray-400 hover:text-rose-600"><X size={13} /></button>
                      </div>
                    )}
                    <div className="flex items-end gap-2">
                      <input
                        ref={fileRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f && f.size > 10 * 1024 * 1024) {
                            alert('Ukuran file maksimal 10 MB.');
                            e.target.value = '';
                            return;
                          }
                          setFile(f ?? null);
                        }}
                      />
                      <button type="button" onClick={() => fileRef.current?.click()} title="Lampirkan file (maks 10 MB)" className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                        <Paperclip size={18} />
                      </button>
                      <textarea
                        rows={1}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            void handleSend();
                          }
                        }}
                        placeholder={activeRoom.type === 'channel' ? `Kirim pesan ke #${activeRoom.name}` : `Kirim pesan ke ${roomTitle(activeRoom)}`}
                        className="flex-1 resize-none max-h-32 px-3 py-2 rounded-xl text-[13px] bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        type="submit"
                        disabled={!input.trim() && !file}
                        className="p-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white"
                        title="Kirim (Enter)"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-3 border-t border-gray-100 dark:border-gray-800 text-center text-xs text-gray-500 flex items-center justify-center gap-1.5">
                    <Lock size={12} /> Hanya {activeRoom.postingRoles?.join(', ')} yang dapat menulis di channel ini.
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}

      {/* Tombol chat */}
      <button
        onClick={chat.toggle}
        title="Buka Chat Tim & Personal Ruang Kelana"
        className="pointer-events-auto relative w-14 h-14 rounded-full bg-gradient-to-br from-primary-600 to-indigo-700 text-white shadow-xl hover:scale-105 transition-transform flex items-center justify-center"
      >
        {isOpen ? <X size={22} /> : <MessageSquare size={22} />}
        {!isOpen && unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 border-2 border-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
    </div>
  );
};
