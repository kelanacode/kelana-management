import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Note, NoteComment, NoteShareScope, NoteReadRecord } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 9);

// 2x24 Jam dalam milidetik (48 Jam)
export const NOTE_EXPIRY_MS = 48 * 60 * 60 * 1000;

export const checkNoteAccess = (
  note: Note,
  user?: { id?: string; role?: string; division?: string; position?: string } | null
): boolean => {
  if (!user) return true;

  const role = user.role;
  const userDivision = (user.division || '').toLowerCase();
  const position = (user.position || '').toLowerCase();

  // CEO dan Admin memiliki hak akses penuh untuk mengawasi seluruh catatan
  const isSuperAccess =
    role === 'Admin' ||
    role === 'CEO' ||
    userDivision.includes('all role') ||
    position.includes('ceo') ||
    position.includes('direktur');

  if (isSuperAccess) return true;

  // Pembuat catatan selalu memiliki akses ke catatannya sendiri
  if (note.authorId && note.authorId === user.id) return true;

  const scope = note.shareScope || 'all';

  // 1. Diberikan untuk Semua Orang
  if (scope === 'all') return true;

  // 2. Diberikan untuk Divisi Tertentu
  if (scope === 'division') {
    if (!note.targetDivisions || note.targetDivisions.length === 0) return true;
    return note.targetDivisions.some((dept) =>
      userDivision.includes(dept.toLowerCase()) || dept.toLowerCase().includes(userDivision)
    );
  }

  // 3. Diberikan untuk Orang Tertentu (Spesifik Pengguna)
  // Wajib dicocokkan targetUserIds. Jika tidak di-tag / tidak dikirimkan, tidak boleh lolos!
  if (scope === 'specific_users') {
    if (!note.targetUserIds || note.targetUserIds.length === 0) return false;
    return note.targetUserIds.includes(user.id || '');
  }

  return false;
};

// Cek apakah catatan sudah pernah dibaca oleh pengguna terkait
export const isNoteReadByUser = (note: Note, userId?: string): boolean => {
  if (!userId || !note.readRecords) return false;
  return note.readRecords.some((r) => r.userId === userId);
};

// Ambil rekaman dibaca pengguna
export const getNoteReadRecord = (note: Note, userId?: string): NoteReadRecord | undefined => {
  if (!userId || !note.readRecords) return undefined;
  return note.readRecords.find((r) => r.userId === userId);
};

// Hitung apakah catatan sudah kedaluwarsa (otomatis terhapus setelah 2x24 jam dari waktu dibaca)
export const isNoteExpiredForUser = (note: Note, userId?: string): boolean => {
  if (!userId) return false;
  const readRecord = getNoteReadRecord(note, userId);
  if (!readRecord) return false; // Belum dibaca, jadi belum mulai hitungan 48 jam

  const readTime = new Date(readRecord.readAt).getTime();
  const diff = Date.now() - readTime;
  return diff >= NOTE_EXPIRY_MS;
};

// Hitung sisa jam sebelum terhapus otomatis (dalam satuan jam)
export const getNoteRemainingHours = (note: Note, userId?: string): number => {
  if (!userId) return 48;
  const readRecord = getNoteReadRecord(note, userId);
  if (!readRecord) return 48;

  const readTime = new Date(readRecord.readAt).getTime();
  const diff = Date.now() - readTime;
  const remainingMs = NOTE_EXPIRY_MS - diff;
  if (remainingMs <= 0) return 0;
  return Math.max(1, Math.ceil(remainingMs / (1000 * 60 * 60)));
};

interface NotesStore {
  notes: Note[];
  selectedNoteId: string | null;
  searchQuery: string;
  addNote: (
    title?: string,
    author?: { id?: string; name?: string; division?: string },
    shareConfig?: {
      shareScope?: NoteShareScope;
      targetDivisions?: string[];
      targetUserIds?: string[];
      targetUserNames?: string[];
    }
  ) => Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  selectNote: (id: string | null) => void;
  markNoteAsRead: (noteId: string, userId: string) => void;
  setSearchQuery: (q: string) => void;
  addCommentToNote: (noteId: string, content: string, selectedText?: string, author?: string, authorAvatar?: string) => void;
  resolveComment: (noteId: string, commentId: string) => void;
  deleteComment: (noteId: string, commentId: string) => void;
}

const SAMPLE_NOTES: Note[] = [
  {
    id: 'note-1',
    title: 'Selamat Datang di Ruang Kelana 🌟',
    content: '<h1>Selamat Datang di Ruang Kelana!</h1><p>Ruang Kelana adalah ruang kerja all-in-one Anda untuk mencatat, merencanakan, dan berkolaborasi.</p><h2>Fitur Utama:</h2><ul><li><strong>Notes</strong> - Tulis catatan dan dokumen berkelas Word &amp; Google Docs</li><li><strong>Board</strong> - Kelola proyek dengan Kanban</li><li><strong>Database</strong> - Buat tabel data kustom</li><li><strong>Wiki</strong> - Bangun basis pengetahuan</li><li><strong>Kalender</strong> - Pantau jadwal dan pengingat acara (WIB)</li><li><strong>Tim</strong> - Kolaborasi bersama tim</li></ul><h3>Contoh Tabel Dokumen (Gaya Google Docs):</h3><table><thead><tr><th>No</th><th>Fitur Workspace</th><th>Kategori</th><th>Status</th></tr></thead><tbody><tr><td>1</td><td>Editor Dokumen</td><td>Word &amp; GDocs</td><td>Aktif</td></tr><tr><td>2</td><td>Tabel Visual</td><td>Grid Picker</td><td>Aktif</td></tr><tr><td>3</td><td>Papan Kanban</td><td>Manajemen Tugas</td><td>Aktif</td></tr></tbody></table><div class="callout-box"><strong>💡 Tips:</strong> Gunakan ikon <strong>Tabel</strong> di atas untuk menyisipkan tabel dengan kisi visual Google Docs, atau gunakan tombol <strong>+ Baris</strong> untuk menambah baris tabel secara instan!</div>',
    tags: ['welcome', 'panduan'],
    comments: [
      {
        id: 'comm-1',
        selectedText: 'dokumen berkelas Word & Google Docs',
        content: 'Fitur editor dokumen lengkap sudah aktif!',
        author: 'Andi Wirawan',
        authorAvatar: 'AW',
        createdAt: new Date().toISOString(),
        resolved: false,
      }
    ],
    emoji: '🌟',
    paperSize: 'A4',
    color: '#fef08a', // Pastel yellow
    isPinned: true,
    shareScope: 'all',
    authorName: 'Admin Kantor Kelana',
    authorDivision: 'Operasional & HR',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'note-2',
    title: 'Roadmap & Arsitektur IT Q4 (Divisi IT)',
    content: '<h2>Roadmap Teknologi & Arsitektur IT Kelana</h2><p>Daftar inisiatif utama kuartal ini:</p><ul data-type="taskList"><li data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Notifikasi push pop-up untuk agenda WIB</p></div></li><li data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Mode offline untuk catatan</p></div></li><li data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Sync real-time antar perangkat</p></div></li></ul><blockquote>Catatan ini dikhususkan untuk tim Teknologi &amp; IT.</blockquote>',
    tags: ['ide', 'proyek', 'it'],
    emoji: '💻',
    paperSize: 'A4',
    color: '#bae6fd', // Pastel blue
    isPinned: false,
    shareScope: 'division',
    targetDivisions: ['Teknologi & IT'],
    authorName: 'Andi Wirawan',
    authorDivision: 'Teknologi & IT',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'note-3',
    title: 'Briefing Khusus Andi Wirawan (Pribadi)',
    content: '<h2>Briefing Eksklusif untuk Andi Wirawan</h2><p><strong>Pengirim:</strong> Admin / Management</p><h3>Poin Penugasan Khusus:</h3><ol><li>Refactor modul dokumen notes dan RBAC pembagian akses.</li><li>Siapkan sistem approval procurement 4 divisi.</li></ol>',
    tags: ['rahasia', 'pribadi'],
    emoji: '🔒',
    paperSize: 'A4',
    color: '#fbcfe8', // Pastel pink
    isPinned: false,
    shareScope: 'specific_users',
    targetUserIds: ['user-andi'],
    targetUserNames: ['Andi Wirawan'],
    authorName: 'Admin Kantor Kelana',
    authorDivision: 'Operasional & HR',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

export const useNotesStore = create<NotesStore>()(
  persist(
    (set, get) => ({
      notes: SAMPLE_NOTES,
      selectedNoteId: 'note-1',
      searchQuery: '',

      addNote: (title = 'Dokumen Baru', author, shareConfig) => {
        const note: Note = {
          id: generateId(),
          title,
          content: '<p></p>',
          tags: [],
          comments: [],
          emoji: '📌',
          paperSize: 'A4',
          color: '#fef08a', // Default Yellow sticky note
          isPinned: false,
          authorId: author?.id,
          authorName: author?.name || 'Pengguna',
          authorDivision: author?.division || 'Umum',
          shareScope: shareConfig?.shareScope || 'all',
          targetDivisions: shareConfig?.targetDivisions || [],
          targetUserIds: shareConfig?.targetUserIds || [],
          targetUserNames: shareConfig?.targetUserNames || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ notes: [note, ...state.notes], selectedNoteId: note.id }));
        return note;
      },

      updateNote: (id, updates) => {
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
          ),
        }));
      },

      deleteNote: (id) => {
        const { notes, selectedNoteId } = get();
        const remaining = notes.filter((n) => n.id !== id);
        set({
          notes: remaining,
          selectedNoteId: selectedNoteId === id ? (remaining[0]?.id ?? null) : selectedNoteId,
        });
      },

      selectNote: (id) => set({ selectedNoteId: id }),
      setSearchQuery: (q) => set({ searchQuery: q }),

      markNoteAsRead: (noteId: string, userId: string) => {
        if (!noteId || !userId) return;
        set((state) => ({
          notes: state.notes.map((n) => {
            if (n.id !== noteId) return n;
            const records = n.readRecords || [];
            if (records.some((r) => r.userId === userId)) {
              return n; // Sudah tercatat dibaca sebelumnya
            }
            return {
              ...n,
              readRecords: [...records, { userId, readAt: new Date().toISOString() }],
            };
          }),
        }));
      },

      addCommentToNote: (noteId, content, selectedText, author = 'Andi Wirawan', authorAvatar = 'AW') => {
        const comment: NoteComment = {
          id: generateId(),
          content,
          selectedText,
          author,
          authorAvatar,
          createdAt: new Date().toISOString(),
          resolved: false,
        };
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === noteId ? { ...n, comments: [...(n.comments || []), comment] } : n
          ),
        }));
      },

      resolveComment: (noteId, commentId) => {
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === noteId
              ? {
                  ...n,
                  comments: (n.comments || []).map((c) =>
                    c.id === commentId ? { ...c, resolved: !c.resolved } : c
                  ),
                }
              : n
          ),
        }));
      },

      deleteComment: (noteId, commentId) => {
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === noteId
              ? {
                  ...n,
                  comments: (n.comments || []).filter((c) => c.id !== commentId),
                }
              : n
          ),
        }));
      },
    }),
    { name: 'ruang-kelana-notes' }
  )
);
