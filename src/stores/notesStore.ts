import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Note, NoteComment, NoteShareScope, NoteReadRecord } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 9);

// 1x24 Jam dalam milidetik: catatan hilang 24 jam setelah dibuka penerimanya
export const NOTE_EXPIRY_MS = 24 * 60 * 60 * 1000;

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

// Hitung apakah catatan sudah kedaluwarsa (otomatis terhapus setelah 1x24 jam dari waktu dibaca)
export const isNoteExpiredForUser = (note: Note, userId?: string): boolean => {
  if (!userId) return false;
  const readRecord = getNoteReadRecord(note, userId);
  if (!readRecord) return false; // Belum dibaca, jadi belum mulai hitungan 24 jam

  const readTime = new Date(readRecord.readAt).getTime();
  const diff = Date.now() - readTime;
  return diff >= NOTE_EXPIRY_MS;
};

// Hitung sisa jam sebelum terhapus otomatis (dalam satuan jam)
export const getNoteRemainingHours = (note: Note, userId?: string): number => {
  if (!userId) return 24;
  const readRecord = getNoteReadRecord(note, userId);
  if (!readRecord) return 24;

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

const SAMPLE_NOTES: Note[] = [];

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
    { name: 'ruang-kelana-notes-clean' }
  )
);
