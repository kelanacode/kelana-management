// Mode "Drive" di halaman Database: kumpulan folder berisi nama + link Google Drive.
// Klik folder langsung membuka link di tab baru. Data disimpan di tabel drive_items.
import React, { useMemo, useState } from 'react';
import { create } from 'zustand';
import { Folder, FolderPlus, Pencil, Trash2, X, Check, ExternalLink, Search, HardDrive } from 'lucide-react';
import { useGoogleDriveStore } from '../../stores/googleDriveStore';
import { useAuthStore } from '../../stores/authStore';
import type { DriveItem } from '../../types/drive';

// Form tambah/edit dibuka dari sidebar maupun area utama
interface DriveFormState {
  open: boolean;
  editing: DriveItem | null;
  openNew: () => void;
  openEdit: (item: DriveItem) => void;
  close: () => void;
}
const useDriveForm = create<DriveFormState>((set) => ({
  open: false,
  editing: null,
  openNew: () => set({ open: true, editing: null }),
  openEdit: (item) => set({ open: true, editing: item }),
  close: () => set({ open: false, editing: null }),
}));

// Ambil daftar mentah dari store lalu saring di luar selector (selector yang membuat array baru memicu render tanpa henti)
const useDriveFolders = () => {
  const items = useGoogleDriveStore((s) => s.items);
  return useMemo(() => items.filter((i) => i.type === 'folder'), [items]);
};

const normalizeUrl = (url: string) => {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

// ---------------- Sidebar ----------------
export const DriveSidebar: React.FC = () => {
  const folders = useDriveFolders();
  const openNew = useDriveForm((s) => s.openNew);

  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Daftar Drive</span>
        <span className="text-[10px] text-amber-600 font-semibold">{folders.length} drive</span>
      </div>
      <div className="space-y-1">
        {folders.map((f) => (
          <a
            key={f.id}
            href={f.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
            title={`Buka ${f.name}`}
          >
            <Folder size={15} className="text-amber-500 fill-amber-400 flex-shrink-0" />
            <span className="truncate flex-1">{f.name}</span>
            <ExternalLink size={11} className="text-gray-400 flex-shrink-0" />
          </a>
        ))}
      </div>
      <button
        type="button"
        onClick={openNew}
        className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:border-amber-400 hover:text-amber-600 transition-colors"
      >
        <FolderPlus size={14} /> Tambah Drive
      </button>
    </div>
  );
};

// ---------------- Form tambah / edit ----------------
const DriveFormModal: React.FC = () => {
  const { open, editing, close } = useDriveForm();
  const { addItem, updateItem } = useGoogleDriveStore();
  const session = useAuthStore((s) => s.session);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [lastKey, setLastKey] = useState<string | null>(null);

  // Isi ulang form setiap kali dibuka
  const key = open ? editing?.id ?? 'new' : null;
  if (key !== lastKey) {
    setLastKey(key);
    setName(editing?.name ?? '');
    setUrl(editing?.url ?? '');
    setError('');
  }

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Nama drive wajib diisi.');
    if (!url.trim()) return setError('Link drive wajib diisi.');
    const finalUrl = normalizeUrl(url);
    try {
      new URL(finalUrl);
    } catch {
      return setError('Link tidak valid.');
    }

    if (editing) {
      updateItem(editing.id, { name: name.trim(), url: finalUrl });
    } else {
      addItem({
        name: name.trim(),
        url: finalUrl,
        type: 'folder',
        mimeType: 'folder',
        author: session?.user.name ?? 'Karyawan',
        division: session?.user.division,
        isStarred: false,
      });
    }
    close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={close}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-xl border border-gray-100 dark:border-gray-800 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
            <Folder size={18} className="text-amber-500 fill-amber-400" />
            {editing ? 'Edit Drive' : 'Tambah Drive'}
          </h3>
          <button type="button" onClick={close} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">Nama Drive</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Misal: Foto Event Firna & Ogi"
            className="input text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">Link Drive</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/..."
            className="input text-sm"
          />
        </div>

        {error && <p className="text-xs text-rose-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={close} className="btn-secondary text-sm">
            Batal
          </button>
          <button type="submit" className="btn-primary text-sm flex items-center gap-1.5">
            <Check size={14} /> {editing ? 'Simpan' : 'Tambah'}
          </button>
        </div>
      </form>
    </div>
  );
};

// ---------------- Area utama: grid folder ----------------
export const DriveFoldersView: React.FC = () => {
  const folders = useDriveFolders();
  const deleteItem = useGoogleDriveStore((s) => s.deleteItem);
  const { openNew, openEdit } = useDriveForm();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const visible = folders
    .filter((f) => !q || f.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
            <HardDrive size={18} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">Drive</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Klik folder untuk membuka link Drive di tab baru</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari drive..."
              className="input text-xs pl-7 py-1.5 w-48"
            />
          </div>
          <button type="button" onClick={openNew} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
            <FolderPlus size={14} /> Tambah Drive
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {folders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3">
            <Folder size={56} className="text-amber-300 fill-amber-200" />
            <p className="font-semibold text-gray-800 dark:text-gray-100">Belum ada drive</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Simpan link Google Drive tim cukup dengan nama dan link-nya.</p>
            <button type="button" onClick={openNew} className="btn-primary text-sm flex items-center gap-1.5">
              <FolderPlus size={14} /> Tambah Drive
            </button>
          </div>
        ) : visible.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">Tidak ada drive yang cocok dengan "{query}".</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {visible.map((f) => (
              <div key={f.id} className="group relative">
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Buka ${f.name}`}
                  className="flex flex-col items-center text-center gap-2 p-4 pt-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-amber-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <Folder size={64} strokeWidth={1.25} className="text-amber-500 fill-amber-300 dark:fill-amber-500/60" />
                  <span className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 break-words w-full">{f.name}</span>
                  <span className="text-[10px] text-gray-400 truncate w-full">{hostOf(f.url)}</span>
                </a>
                <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => openEdit(f)}
                    title="Edit drive"
                    className="p-1.5 rounded-lg bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-primary-600"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Hapus drive "${f.name}"? Isi Google Drive-nya sendiri tidak ikut terhapus.`)) deleteItem(f.id);
                    }}
                    title="Hapus drive"
                    className="p-1.5 rounded-lg bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-rose-600"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <DriveFormModal />
    </div>
  );
};

