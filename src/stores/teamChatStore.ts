import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderColor?: string;
  senderRole?: string;
  content: string;
  timestamp: string;
  recipientId?: string; // 'all' (Saluran Tim Umum) atau userId penerima personal
  recipientName?: string;
  readByUserIds?: string[]; // Daftar ID user yang sudah membaca pesan ini
}

interface TeamChatStore {
  isOpen: boolean;
  activeChatTarget: string; // 'all' atau userId partner chat
  messages: ChatMessage[];
  openChat: (targetId?: string) => void;
  closeChat: () => void;
  toggleChat: () => void;
  setActiveChatTarget: (targetId: string) => void;
  markChatAsReadForUser: (userId: string, targetChannelOrUser: string) => void;
  sendMessage: (msg: {
    senderId: string;
    senderName: string;
    senderAvatar: string;
    senderColor?: string;
    senderRole?: string;
    content: string;
    recipientId?: string;
    recipientName?: string;
  }) => void;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    senderId: 'user-budi',
    senderName: 'Budi Santoso',
    senderAvatar: 'BS',
    senderColor: '#2563eb',
    senderRole: 'Product Designer',
    content: 'Halo tim! Wireframe dan design flow sudah saya upload di board ya 🎨',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    recipientId: 'all',
    readByUserIds: ['user-budi'],
  },
  {
    id: 'msg-2',
    senderId: 'user-citra',
    senderName: 'Citra Dewi',
    senderAvatar: 'CD',
    senderColor: '#10b981',
    senderRole: 'Backend Developer',
    content: 'Mantap Budi! Endpoint REST API untuk module penugasan sudah ready di staging.',
    timestamp: new Date(Date.now() - 2500000).toISOString(),
    recipientId: 'all',
    readByUserIds: ['user-citra'],
  },
  {
    id: 'msg-3',
    senderId: 'user-ceo',
    senderName: 'CEO Kelana Corporate',
    senderAvatar: 'CEO',
    senderColor: '#7c3aed',
    senderRole: 'Chief Executive Officer',
    content: 'Selamat sore rekan-rekan. Mohon seluruh divisi pastikan laporan taks dan rencana Q4 sudah diperbarui sore ini. Terima kasih!',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    recipientId: 'all',
    readByUserIds: ['user-ceo'],
  },
  {
    id: 'msg-dm-1',
    senderId: 'user-admin',
    senderName: 'Admin Kantor Kelana',
    senderAvatar: 'AD',
    senderColor: '#7c3aed',
    senderRole: 'HR & Administrator',
    content: 'Halo rekan tim! Mohon cek data kehadiran dan rincian slip gaji di sistem ya.',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    recipientId: 'user-andi',
    recipientName: 'Andi Wirawan',
    readByUserIds: ['user-admin'],
  },
];

// Helper: Cek apakah user saat ini berhak melihat pesan chat
export const isMessageForUser = (msg: ChatMessage, userId: string): boolean => {
  if (!userId) return false;
  // 1. Pesan umum untuk seluruh tim
  if (!msg.recipientId || msg.recipientId === 'all') return true;
  // 2. Pesan personal: Hanya jika user adalah pengirim atau penerima
  return msg.senderId === userId || msg.recipientId === userId;
};

// Helper: Hitung pesan belum dibaca khusus untuk user tertentu
export const getUnreadChatCountForUser = (messages: ChatMessage[], userId: string): number => {
  if (!userId) return 0;
  return messages.filter((m) => {
    // Jangan hitung pesan yang dikirim oleh diri sendiri
    if (m.senderId === userId) return false;
    // Cek apakah pesan ditujukan untuk user ini
    if (!isMessageForUser(m, userId)) return false;
    // Cek apakah user sudah membaca pesan ini
    return !m.readByUserIds?.includes(userId);
  }).length;
};

export const useTeamChatStore = create<TeamChatStore>()(
  persist(
    (set, get) => ({
      isOpen: false,
      activeChatTarget: 'all', // Default: Saluran Tim Umum
      messages: INITIAL_MESSAGES,

      openChat: (targetId) => {
        set({
          isOpen: true,
          activeChatTarget: targetId || get().activeChatTarget || 'all',
        });
      },

      closeChat: () => {
        set({ isOpen: false });
      },

      toggleChat: () => {
        set((state) => ({ isOpen: !state.isOpen }));
      },

      setActiveChatTarget: (targetId) => {
        set({ activeChatTarget: targetId });
      },

      // Tandai pesan sebagai terbaca untuk user yang sedang aktif
      markChatAsReadForUser: (userId: string, targetChannelOrUser: string) => {
        if (!userId) return;
        set((state) => ({
          messages: state.messages.map((m) => {
            // Jika pesan dikirim oleh diri sendiri, abaikan
            if (m.senderId === userId) return m;

            // Cek apakah pesan berada dalam target channel/chat yang sedang dibuka
            const matchesChannel =
              targetChannelOrUser === 'all'
                ? !m.recipientId || m.recipientId === 'all'
                : (m.senderId === targetChannelOrUser && m.recipientId === userId) ||
                  (m.senderId === userId && m.recipientId === targetChannelOrUser);

            if (matchesChannel) {
              const readers = m.readByUserIds || [];
              if (!readers.includes(userId)) {
                return { ...m, readByUserIds: [...readers, userId] };
              }
            }
            return m;
          }),
        }));
      },

      sendMessage: ({ senderId, senderName, senderAvatar, senderColor, senderRole, content, recipientId, recipientName }) => {
        if (!content.trim()) return;
        const target = recipientId || get().activeChatTarget || 'all';

        const newMsg: ChatMessage = {
          id: 'chat-' + Date.now(),
          senderId,
          senderName,
          senderAvatar,
          senderColor: senderColor || '#7c3aed',
          senderRole: senderRole || 'Staff',
          content: content.trim(),
          timestamp: new Date().toISOString(),
          recipientId: target,
          recipientName: target !== 'all' ? recipientName : undefined,
          readByUserIds: [senderId], // Pengirim otomatis sudah membaca
        };

        set((state) => ({
          messages: [...state.messages, newMsg],
        }));
      },
    }),
    {
      name: 'ruang-kelana-team-chat-v3',
    }
  )
);
