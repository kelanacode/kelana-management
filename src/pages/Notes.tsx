import React, { useState } from 'react';
import {
  Plus, Search, Pin, Trash2, Tag, Calendar, User,
  Share2, Globe, Building, UserCheck, X, Check, Edit2, Palette
} from 'lucide-react';
import {
  useNotesStore,
  checkNoteAccess,
  isNoteReadByUser,
  getNoteRemainingHours
} from '../stores/notesStore';
import { useAuthStore } from '../stores/authStore';
import { NoteShareModal } from '../components/notes/NoteShareModal';
import { Note } from '../types';

const STICKY_COLORS = [
  { name: 'Kuning', bg: '#fef08a', text: '#713f12', border: '#fde047', badge: 'bg-yellow-200 text-yellow-900' },
  { name: 'Hijau', bg: '#bbf7d0', text: '#14532d', border: '#86efac', badge: 'bg-green-200 text-green-900' },
  { name: 'Biru', bg: '#bae6fd', text: '#0c4a6e', border: '#7dd3fc', badge: 'bg-sky-200 text-sky-900' },
  { name: 'Pink', bg: '#fbcfe8', text: '#831843', border: '#f472b6', badge: 'bg-pink-200 text-pink-900' },
  { name: 'Ungu', bg: '#e9d5ff', text: '#581c87', border: '#d8b4fe', badge: 'bg-purple-200 text-purple-900' },
  { name: 'Oranye', bg: '#fed7aa', text: '#7c2d12', border: '#fdba74', badge: 'bg-orange-200 text-orange-900' },
];

export const Notes: React.FC = () => {
  const { session, users } = useAuthStore();
  const currentUser = session?.user;
  const activeEmployees = users.filter((u) => u.status === 'Active').sort((a, b) => a.name.localeCompare(b.name));
  const divisionOptions = Array.from(new Set(activeEmployees.map((u) => u.division).filter(Boolean))).sort();
  const currentUserId = currentUser?.id;

  const {
    notes,
    addNote,
    updateNote,
    deleteNote,
    markNoteAsRead,
    searchQuery,
    setSearchQuery,
  } = useNotesStore();

  const [filterScope, setFilterScope] = useState<'all' | 'division' | 'personal' | 'created_by_me'>('all');
  const [activeShareNote, setActiveShareNote] = useState<Note | null>(null);

  // Modal / Inline New Sticky Note
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newColor, setNewColor] = useState(STICKY_COLORS[0].bg);
  const [newTags, setNewTags] = useState('');
  const [newScope, setNewScope] = useState<'all' | 'division' | 'specific_users'>('all');
  const [newDivision, setNewDivision] = useState('');
  const [newRecipientIds, setNewRecipientIds] = useState<string[]>([]);

  // Editing Sticky Note State
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleCreateSticky = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() && !newContent.trim()) return;
    if (newScope === 'division' && !newDivision) return;
    if (newScope === 'specific_users' && newRecipientIds.length === 0) return;

    const created = addNote(
      newTitle.trim() || 'Sticky Note Baru',
      {
        id: currentUser?.id,
        name: currentUser?.name || 'Staff',
        division: currentUser?.division || 'Umum',
      },
      {
        shareScope: newScope,
        targetDivisions: newScope === 'division' ? [newDivision] : [],
        targetUserIds: newScope === 'specific_users' ? newRecipientIds : [],
        targetUserNames:
          newScope === 'specific_users'
            ? newRecipientIds.map((id) => activeEmployees.find((u) => u.id === id)?.name ?? '')
            : [],
      }
    );

    // Save content & color
    updateNote(created.id, {
      content: newContent.trim(),
      color: newColor,
      tags: newTags ? newTags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    });

    setNewTitle('');
    setNewContent('');
    setNewTags('');
    setNewColor(STICKY_COLORS[0].bg);
    setNewScope('all');
    setNewDivision('');
    setNewRecipientIds([]);
    setIsCreating(false);
  };

  // Label "untuk siapa" pada sticky note
  const recipientLabel = (note: Note) => {
    if (note.shareScope === 'division') return `Divisi ${(note.targetDivisions ?? []).join(', ') || '-'}`;
    if (note.shareScope === 'specific_users') {
      const names = note.targetUserNames?.filter(Boolean) ?? [];
      if (names.length === 0) return 'Orang tertentu';
      return names.length <= 2 ? names.join(', ') : `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
    }
    return 'Semua Karyawan';
  };

  const startEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setEditTitle(note.title);
    // Strip HTML tags for clean textarea edit
    const plainText = note.content.replace(/<[^>]+>/g, '').trim();
    setEditContent(plainText || note.content);
    setEditColor(note.color || STICKY_COLORS[0].bg);
  };

  const saveEditNote = (id: string) => {
    updateNote(id, {
      title: editTitle.trim() || 'Tanpa Judul',
      content: editContent.trim(),
      color: editColor,
    });
    setEditingNoteId(null);
  };

  // Filter notes accessible by current user
  const accessibleNotes = notes.filter((n) => checkNoteAccess(n, currentUser));

  const filteredNotes = accessibleNotes.filter((note) => {
    // Search query filter
    const matchSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.tags && note.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

    if (!matchSearch) return false;

    // Scope tab filter
    if (filterScope === 'division') return note.shareScope === 'division';
    if (filterScope === 'personal') return note.shareScope === 'specific_users';
    if (filterScope === 'created_by_me') return note.authorId === currentUserId;

    return true;
  });

  // Sort: Pinned notes on top, then newest updatedAt
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100/70 dark:bg-slate-950 overflow-hidden">
      {/* Top Header & Action Controls */}
      <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-2xl">📌</span> Papan Sticky Notes
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              {accessibleNotes.length} Catatan
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tulis ide cepat, memo pengingat, dan catatan tempel tim secara visual.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search Box */}
          <div className="relative w-full sm:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari sticky note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* New Sticky Note Button */}
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>+ Catatan Tempel Baru</span>
          </button>
        </div>
      </div>

      {/* Scope Filter Tabs */}
      <div className="px-6 py-2.5 bg-white/60 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between overflow-x-auto text-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterScope('all')}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              filterScope === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            Semua ({accessibleNotes.length})
          </button>
          <button
            onClick={() => setFilterScope('division')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              filterScope === 'division'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            🏢 Divisi
          </button>
          <button
            onClick={() => setFilterScope('personal')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              filterScope === 'personal'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            👤 Pribadi / Khusus
          </button>
          <button
            onClick={() => setFilterScope('created_by_me')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              filterScope === 'created_by_me'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            ✍️ Dibuat Saya
          </button>
        </div>

        <span className="text-[11px] text-slate-400 hidden sm:inline">
          Otomatis terhapus 1x24 jam setelah dibuka
        </span>
      </div>

      {/* Main Sticky Notes Board Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        {sortedNotes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <span className="text-5xl mb-3">📝</span>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Belum Ada Sticky Note</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Buat catatan tempel pertama Anda untuk mencatat memo cepat, reminder tugas, atau ide kolaborasi kantor.
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer"
            >
              + Buat Sticky Note
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-max">
            {sortedNotes.map((note) => {
              const remainingHours = getNoteRemainingHours(note, currentUserId);
              const isExpired = remainingHours <= 0 && isNoteReadByUser(note, currentUserId);
              const isEditing = editingNoteId === note.id;
              const noteColor = note.color || STICKY_COLORS[0].bg;

              return (
                <div
                  key={note.id}
                  onClick={() => {
                    if (currentUserId) markNoteAsRead(note.id, currentUserId);
                  }}
                  style={{
                    backgroundColor: noteColor,
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
                  }}
                  className={`relative rounded-2xl p-5 flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-xl border border-black/10 group ${
                    note.isPinned ? 'ring-2 ring-amber-500' : ''
                  }`}
                >
                  {/* Pin Indicator / Action */}
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateNote(note.id, { isPinned: !note.isPinned });
                      }}
                      className={`p-1.5 rounded-lg transition-transform ${
                        note.isPinned ? 'text-amber-800 -rotate-45' : 'text-slate-500/60 hover:text-slate-800'
                      }`}
                      title={note.isPinned ? 'Lepas Pin' : 'Sematkan ke atas'}
                    >
                      <Pin size={16} className={note.isPinned ? 'fill-amber-600 text-amber-700' : ''} />
                    </button>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      {/* Ganti Warna Cepat */}
                      <div className="flex items-center gap-1 bg-white/50 backdrop-blur-xs px-1.5 py-0.5 rounded-full border border-black/10">
                        {STICKY_COLORS.map((c) => (
                          <button
                            key={c.bg}
                            onClick={(e) => {
                              e.stopPropagation();
                              updateNote(note.id, { color: c.bg });
                            }}
                            style={{ backgroundColor: c.bg }}
                            className="w-3.5 h-3.5 rounded-full border border-black/20 hover:scale-125 transition-transform cursor-pointer"
                            title={`Warna ${c.name}`}
                          />
                        ))}
                      </div>

                      {/* Share Settings */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveShareNote(note);
                        }}
                        className="p-1 rounded hover:bg-black/10 text-slate-700 transition-colors"
                        title="Bagikan / Hak Akses Catatan"
                      >
                        <Share2 size={13} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Hapus sticky note ini?')) deleteNote(note.id);
                        }}
                        className="p-1 rounded hover:bg-rose-500 hover:text-white text-slate-600 transition-colors"
                        title="Hapus"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Note Body */}
                  {isEditing ? (
                    <div className="space-y-2 flex-1 flex flex-col" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full font-bold text-sm bg-white/60 rounded-lg px-2 py-1 outline-none border border-black/15 text-slate-900"
                        placeholder="Judul catatan..."
                        autoFocus
                      />
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={4}
                        className="w-full flex-1 text-xs bg-white/60 rounded-lg p-2 outline-none border border-black/15 resize-none text-slate-800"
                        placeholder="Isi memo sticky note..."
                      />
                      <div className="flex justify-end gap-1.5 pt-1">
                        <button
                          onClick={() => setEditingNoteId(null)}
                          className="px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-black/10 rounded"
                        >
                          Batal
                        </button>
                        <button
                          onClick={() => saveEditNote(note.id)}
                          className="px-3 py-1 text-[11px] font-bold bg-slate-900 text-white rounded shadow-xs"
                        >
                          Simpan
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer flex-1"
                      onDoubleClick={() => startEditNote(note)}
                      title="Klik 2x untuk mengedit catatan ini"
                    >
                      <h3 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-2">
                        {note.title || 'Tanpa Judul'}
                      </h3>
                      <p className="text-xs text-slate-800/90 mt-2 whitespace-pre-wrap line-clamp-6 leading-relaxed font-medium">
                        {note.content.replace(/<[^>]+>/g, '') || '(Belum ada isi memo)'}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {note.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/10 text-slate-900 backdrop-blur-xs"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Note Footer: Author, Expiry & Double click hint */}
                  <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between text-[10px] text-slate-700/80">
                    <span className="min-w-0 flex flex-col gap-0.5">
                      <span className="truncate font-semibold" title={`Dari: ${note.authorName || 'Staff'}`}>
                        ✍️ Dari: {note.authorName || 'Staff'}
                      </span>
                      <span className="truncate font-semibold" title={`Untuk: ${recipientLabel(note)}`}>
                        📨 Untuk: {recipientLabel(note)}
                      </span>
                    </span>
                    <span className="font-bold flex items-center gap-1">
                      ⏳ {remainingHours} Jam
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Buat Sticky Note Baru */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            style={{ backgroundColor: newColor }}
            className="w-full max-w-md rounded-3xl p-6 shadow-2xl border border-black/15 transition-all space-y-4 animate-scale-up"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <span>📌</span> Tulis Sticky Note Baru
              </h3>
              <button
                onClick={() => setIsCreating(false)}
                className="text-slate-600 hover:text-slate-900 p-1 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSticky} className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="Judul Catatan..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 font-bold text-sm bg-white/70 rounded-xl border border-black/10 outline-none text-slate-900 placeholder-slate-500"
                  autoFocus
                />
              </div>

              <div>
                <textarea
                  placeholder="Tulis memo, ide tugas, atau pesan singkat di sini..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={4}
                  className="w-full p-3.5 text-xs bg-white/70 rounded-xl border border-black/10 outline-none resize-none text-slate-800 placeholder-slate-500 font-medium"
                />
              </div>

              {/* Dari & Untuk */}
              <div className="space-y-2 rounded-xl bg-white/60 border border-black/10 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-12 font-bold text-slate-800">Dari</span>
                  <span className="font-semibold text-slate-900">
                    {currentUser?.name || 'Staff'}
                    <span className="font-normal text-slate-600"> · {currentUser?.position || currentUser?.role}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-12 font-bold text-slate-800">Untuk</span>
                  <select
                    value={newScope}
                    onChange={(e) => setNewScope(e.target.value as typeof newScope)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-white border border-black/10 text-slate-900 outline-none"
                  >
                    <option value="all">Semua Karyawan</option>
                    <option value="division">Divisi tertentu</option>
                    <option value="specific_users">Orang tertentu</option>
                  </select>
                </div>
                {newScope === 'division' && (
                  <select
                    value={newDivision}
                    onChange={(e) => setNewDivision(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-black/10 text-slate-900 outline-none"
                  >
                    <option value="">Pilih divisi...</option>
                    {divisionOptions.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                )}
                {newScope === 'specific_users' && (
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {activeEmployees
                      .filter((u) => u.id !== currentUser?.id)
                      .map((u) => {
                        const selected = newRecipientIds.includes(u.id);
                        return (
                          <button
                            key={u.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() =>
                              setNewRecipientIds(
                                selected ? newRecipientIds.filter((id) => id !== u.id) : [...newRecipientIds, u.id]
                              )
                            }
                            className={`flex items-center gap-1 pl-0.5 pr-2 py-0.5 rounded-full border-2 transition-all ${
                              selected
                                ? 'bg-slate-900 border-slate-900 text-white font-semibold'
                                : 'bg-white border-black/10 text-slate-700 hover:border-slate-400'
                            }`}
                          >
                            <span
                              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                              style={{ backgroundColor: u.color }}
                            >
                              {u.avatar}
                            </span>
                            {u.name}
                          </button>
                        );
                      })}
                  </div>
                )}
                {newScope === 'division' && !newDivision && <p className="text-[10px] text-rose-600">Pilih divisi tujuan.</p>}
                {newScope === 'specific_users' && newRecipientIds.length === 0 && (
                  <p className="text-[10px] text-rose-600">Pilih minimal satu penerima.</p>
                )}
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Tag label (pisahkan dengan koma: ide, rapat, penting)..."
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  className="w-full px-3.5 py-1.5 text-xs bg-white/70 rounded-xl border border-black/10 outline-none text-slate-900 placeholder-slate-500"
                />
              </div>

              {/* Color Picker */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-slate-800">Warna Sticky Note:</span>
                <div className="flex items-center gap-1.5">
                  {STICKY_COLORS.map((c) => (
                    <button
                      key={c.bg}
                      type="button"
                      onClick={() => setNewColor(c.bg)}
                      style={{ backgroundColor: c.bg }}
                      className={`w-6 h-6 rounded-full border border-black/20 transition-all ${
                        newColor === c.bg ? 'scale-125 ring-2 ring-slate-900' : 'hover:scale-110'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-black/10 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    (!newTitle.trim() && !newContent.trim()) ||
                    (newScope === 'division' && !newDivision) ||
                    (newScope === 'specific_users' && newRecipientIds.length === 0)
                  }
                  className="px-5 py-2 bg-slate-950 text-white font-bold text-xs rounded-xl shadow-md hover:bg-slate-800 disabled:opacity-50"
                >
                  Tempel Catatan 📌
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share / Access Modal */}
      {activeShareNote && (
        <NoteShareModal
          isOpen={Boolean(activeShareNote)}
          onClose={() => setActiveShareNote(null)}
          note={activeShareNote}
          onSaveShare={(shareScope, targetDivisions, targetUserIds, targetUserNames) => {
            updateNote(activeShareNote.id, {
              shareScope,
              targetDivisions,
              targetUserIds,
              targetUserNames,
            });
            setActiveShareNote(null);
          }}
        />
      )}
    </div>
  );
};
