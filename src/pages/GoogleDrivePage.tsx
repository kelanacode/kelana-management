import React, { useState } from 'react';
import {
  HardDrive, Folder, FileText, FileSpreadsheet, File, ExternalLink,
  Plus, Search, Star, Trash2, RefreshCw, Upload, ShieldCheck,
  CheckCircle2, FolderPlus, Link as LinkIcon, AlertCircle, ArrowUpRight
} from 'lucide-react';
import { useGoogleDriveStore } from '../stores/googleDriveStore';
import { useAuthStore } from '../stores/authStore';
import { DriveItem } from '../types/drive';

export const GoogleDrivePage: React.FC = () => {
  const { session } = useAuthStore();
  const currentUser = session?.user;
  const {
    config,
    items,
    searchQuery,
    selectedFilter,
    setSearchQuery,
    setSelectedFilter,
    addItem,
    deleteItem,
    toggleStar,
    setConnected,
    updateConfig,
    uploadMockFile,
  } = useGoogleDriveStore();

  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configEmail, setConfigEmail] = useState(config.userEmail);
  const [configFolderUrl, setConfigFolderUrl] = useState(config.defaultFolderUrl);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(false);

  // File Upload input ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let mime: DriveItem['mimeType'] = 'other';
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') mime = 'pdf';
    else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') mime = 'spreadsheet';
    else if (ext === 'doc' || ext === 'docx' || ext === 'txt') mime = 'document';
    else if (['jpg', 'jpeg', 'png', 'svg', 'webp'].includes(ext || '')) mime = 'image';
    else if (['zip', 'rar', '7z'].includes(ext || '')) mime = 'archive';

    const sizeStr = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    uploadMockFile(file.name, mime, sizeStr, currentUser?.name || 'Staff', currentUser?.division);
    e.target.value = '';
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    addItem({
      name: newFolderName.trim(),
      type: 'folder',
      mimeType: 'folder',
      url: `https://drive.google.com/drive/folders/kelana-${Date.now()}`,
      author: currentUser?.name || 'Staff',
      division: currentUser?.division || 'Umum',
      isStarred: false,
    });

    setNewFolderName('');
    setShowNewFolderModal(false);
  };

  const handleSyncAll = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncFeedback(true);
      setTimeout(() => setSyncFeedback(false), 3000);
    }, 1000);
  };

  const handleSaveConfig = () => {
    updateConfig({
      userEmail: configEmail,
      defaultFolderUrl: configFolderUrl,
    });
    setShowConfigModal(false);
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.division && item.division.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchSearch) return false;

    if (selectedFilter === 'folders') return item.type === 'folder';
    if (selectedFilter === 'documents') return item.mimeType === 'document';
    if (selectedFilter === 'spreadsheets') return item.mimeType === 'spreadsheet';
    if (selectedFilter === 'pdf') return item.mimeType === 'pdf';
    if (selectedFilter === 'starred') return item.isStarred;

    return true;
  });

  const getItemIcon = (mimeType: DriveItem['mimeType']) => {
    switch (mimeType) {
      case 'folder':
        return <Folder className="w-8 h-8 text-amber-500 fill-amber-100" />;
      case 'document':
        return <FileText className="w-8 h-8 text-blue-500" />;
      case 'spreadsheet':
        return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
      case 'pdf':
        return <File className="w-8 h-8 text-rose-500" />;
      default:
        return <File className="w-8 h-8 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Google Drive Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 rounded-2xl p-6 md:p-8 text-white shadow-xl shadow-blue-500/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center p-2.5 border border-white/20 shadow-inner">
              <svg className="w-full h-full" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Google Drive Ruang Kelana</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Terhubung
                </span>
              </div>
              <p className="text-blue-100 text-sm mt-1 max-w-xl">
                Akses cloud folder resmi, arsip catatan tim, lampiran dokumen, dan cadangan data kantor tersinkronisasi otomatis ke Google Workspace.
              </p>
              <div className="mt-3 flex items-center gap-3 text-xs text-blue-200">
                <span>Akun: <strong>{config.userEmail}</strong></span>
                <span>•</span>
                <span>Terakhir Sinkron: <strong>Baru saja</strong></span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSyncAll}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 font-medium text-sm transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan'}
            </button>

            <a
              href={config.defaultFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 rounded-xl font-medium text-sm shadow-md transition-all"
            >
              <ArrowUpRight className="w-4 h-4" />
              Buka Google Drive
            </a>

            <button
              onClick={() => setShowConfigModal(true)}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 text-white transition-all"
              title="Pengaturan Koneksi Google Drive"
            >
              <HardDrive className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {syncFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>Folder dan dokumen Ruang Kelana berhasil disinkronkan dengan Google Drive.</span>
        </div>
      )}

      {/* Control Bar: Actions, Search & Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Upload File */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm shadow-sm transition-all shadow-blue-500/20"
          >
            <Upload className="w-4 h-4" />
            Upload File ke Drive
          </button>

          {/* New Folder */}
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm shadow-sm transition-all"
          >
            <FolderPlus className="w-4 h-4 text-amber-500" />
            Folder Baru
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari file atau folder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
            {(
              [
                { id: 'all', label: 'Semua' },
                { id: 'folders', label: 'Folder' },
                { id: 'documents', label: 'Dokumen' },
                { id: 'spreadsheets', label: 'Sheets' },
                { id: 'pdf', label: 'PDF' },
                { id: 'starred', label: 'Berbintang' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  selectedFilter === tab.id
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Drive Grid Items */}
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Folder className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Tidak ada file atau folder</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Tidak ditemukan item yang cocok dengan pencarian atau filter yang dipilih.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    {getItemIcon(item.mimeType)}
                  </div>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => toggleStar(item.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        item.isStarred ? 'text-amber-500 hover:text-amber-600' : 'text-slate-300 hover:text-amber-500'
                      }`}
                      title={item.isStarred ? 'Hapus bintang' : 'Beri bintang'}
                    >
                      <Star className={`w-4 h-4 ${item.isStarred ? 'fill-amber-400' : ''}`} />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 text-sm line-clamp-2 transition-colors flex items-center gap-1.5"
                >
                  <span>{item.name}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity flex-shrink-0" />
                </a>

                {item.division && (
                  <span className="inline-block mt-2 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {item.division}
                  </span>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-400">
                <span>{item.size || (item.type === 'folder' ? 'Folder' : '')}</span>
                <span>{item.updatedAt}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cloud Integration Information Box */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-800 dark:text-slate-200">
              Sinkronisasi Cloud Workspace Otomatis
            </h4>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              Setiap catatan bertanda tangan, lampiran dokumen HR, dan slip gaji dapat langsung diekspor atau dicadangkan ke Google Drive perusahaan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://drive.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Buka di Browser
          </a>
        </div>
      </div>

      {/* Modal Folder Baru */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Buat Folder Google Drive</h3>
              </div>
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nama Folder
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Dokumen Legal 2026"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all shadow-sm"
                >
                  Buat Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pengaturan Integrasi Drive */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 border border-blue-200 dark:border-blue-800">
                  <HardDrive className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Konfigurasi Google Drive</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Akun Google Workspace / Drive
                </label>
                <input
                  type="email"
                  value={configEmail}
                  onChange={(e) => setConfigEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Tautan Folder Utama (Google Drive Folder Link)
                </label>
                <input
                  type="url"
                  value={configFolderUrl}
                  onChange={(e) => setConfigFolderUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-700">
                <span className="text-xs text-slate-500">Status: Terhubung Aktif</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm transition-all"
                  >
                    Simpan Konfigurasi
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
