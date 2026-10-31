import React, { useState } from 'react';
import { DatabaseTable } from '../../types';
import {
  FileSpreadsheet, FileText, ExternalLink, Download,
  Copy, Check, RefreshCw, X, Link as LinkIcon, CheckCircle2
} from 'lucide-react';
import {
  downloadCSV, copyForGoogleSheets,
  copyForGoogleDocs, downloadHTMLDocument
} from '../../utils/databaseIntegration';

interface GoogleIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: DatabaseTable;
  onUpdateUrls: (spreadsheetUrl: string, gdocsUrl: string) => void;
  onSync: () => void;
}

export const GoogleIntegrationModal: React.FC<GoogleIntegrationModalProps> = ({
  isOpen,
  onClose,
  table,
  onUpdateUrls,
  onSync,
}) => {
  const [sheetsUrl, setSheetsUrl] = useState(
    table.spreadsheetUrl || 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit'
  );
  const [docsUrl, setDocsUrl] = useState(
    table.gdocsUrl || 'https://docs.google.com/document/d/195j9eDD3ccL62en0wp_43_Mms-jVqL2t28C_k2e9g0/edit'
  );
  const [copiedSheets, setCopiedSheets] = useState(false);
  const [copiedDocs, setCopiedDocs] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateUrls(sheetsUrl, docsUrl);
  };

  const handleSyncNow = () => {
    setIsSyncing(true);
    setTimeout(() => {
      onSync();
      setIsSyncing(false);
    }, 600);
  };

  const handleCopySheets = async () => {
    const success = await copyForGoogleSheets(table);
    if (success) {
      setCopiedSheets(true);
      setTimeout(() => setCopiedSheets(false), 2000);
    }
  };

  const handleCopyDocs = async () => {
    const success = await copyForGoogleDocs(table);
    if (success) {
      setCopiedDocs(true);
      setTimeout(() => setCopiedDocs(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700 overflow-hidden text-gray-900 dark:text-gray-100 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-blue-50/60 to-emerald-50/60 dark:from-blue-950/30 dark:to-emerald-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-xl">
              🔄
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                Integrasi Google Docs & Google Sheets
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Kelola dan pantau database {table.name} yang terhubung 2 arah
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-gray-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Status Bar */}
          <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <div className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  Status: Terhubung & Siap Sinkronisasi
                </div>
                <div className="text-[11px] text-gray-400">
                  Sinkronisasi terakhir:{' '}
                  {table.lastSyncedAt
                    ? new Date(table.lastSyncedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
                    : 'Baru saja'}
                </div>
              </div>
            </div>
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
            </button>
          </div>

          {/* 1. Google Sheets Section */}
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 p-4 bg-emerald-50/20 dark:bg-emerald-950/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet size={16} />
                </div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                  Bentuk Tabel ↔ Google Sheets
                </h4>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                Spreadsheet Aktif
              </span>
            </div>

            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 font-medium">
                Tautan Dokumen Google Sheets:
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={sheetsUrl}
                  onChange={(e) => setSheetsUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="input text-xs flex-1"
                />
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Simpan
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <a
                href={sheetsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <ExternalLink size={12} /> Buka di Google Sheets
              </a>
              <button
                type="button"
                onClick={handleCopySheets}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                {copiedSheets ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                <span>{copiedSheets ? 'Tersalin!' : 'Salin Data untuk Sheets'}</span>
              </button>
              <button
                type="button"
                onClick={() => downloadCSV(table)}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <Download size={12} /> Ekspor .CSV
              </button>
            </div>

            {/* Panduan Akun Berbeda */}
            <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <span>🔑</span> Cara Menghubungkan Sheet dari Akun Google Berbeda:
              </p>
              <p>
                1. Buka file Google Sheet tersebut dengan akun Google pemiliknya.
              </p>
              <p>
                2. Klik tombol biru <strong>Bagikan (Share)</strong> di pojok kanan atas.
              </p>
              <p>
                3. Ubah Akses Umum ke <strong>"Siapa saja yang memiliki link"</strong> (pilih <em>Editor</em> jika ingin tim bisa edit).
              </p>
              <p>
                4. Salin link dan tempel ke kotak di atas, lalu klik <strong>Simpan</strong>. Sheet akan langsung live dan dapat diakses siapa pun di tim Anda!
              </p>
            </div>
          </div>

          {/* 2. Google Docs Section */}
          <div className="rounded-xl border border-blue-200 dark:border-blue-800/60 p-4 bg-blue-50/20 dark:bg-blue-950/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                  <FileText size={16} />
                </div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                  Bentuk Dokumen ↔ Google Docs
                </h4>
              </div>
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                Dokumen Aktif
              </span>
            </div>

            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1 font-medium">
                Tautan Dokumen Google Docs:
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={docsUrl}
                  onChange={(e) => setDocsUrl(e.target.value)}
                  placeholder="https://docs.google.com/document/d/..."
                  className="input text-xs flex-1"
                />
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Simpan
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <a
                href={docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <ExternalLink size={12} /> Buka di Google Docs
              </a>
              <button
                type="button"
                onClick={handleCopyDocs}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                {copiedDocs ? <Check size={12} className="text-blue-500" /> : <Copy size={12} />}
                <span>{copiedDocs ? 'Tersalin!' : 'Salin Format GDocs'}</span>
              </button>
              <button
                type="button"
                onClick={() => downloadHTMLDocument(table)}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <Download size={12} /> Unduh Laporan .HTML
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2 bg-gray-50 dark:bg-gray-900/80">
          <button onClick={onClose} className="btn-primary text-xs py-2 px-5">
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
