import React, { useState, useEffect } from 'react';
import { DatabaseDocument, DocumentCategory } from '../../types';
import { useDatabaseStore } from '../../stores/databaseStore';
import { FileText, ExternalLink, Edit3, Check, Trash2, X, MessageSquare, Link as LinkIcon } from 'lucide-react';
import { CommentsSidebar } from '../notes/CommentsSidebar';

// Dokumen database hanya dari Google Docs: isi dokumen ditampilkan langsung (Live Docs)
// dari link yang diberikan. Tidak ada editor kanvas internal.

export type PaperSize = 'A4' | 'F4';

const CATEGORY_COLORS: Record<DocumentCategory, { bg: string; text: string; border: string }> = {
  SOP: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  Proposal: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  Kontrak: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  Laporan: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  Kebijakan: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
  Lainnya: { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' },
};

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300',
  Review: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300',
  Disetujui: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-300',
  Berlaku: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300',
  Arsip: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-300',
};

interface DocumentDetailViewProps {
  document: DatabaseDocument;
  onUpdate: (updates: Partial<DatabaseDocument>) => void;
  onDelete: () => void;
}

// Ubah URL Google Docs ke format pratinjau yang bisa ditanam di iframe
export const getEmbeddableGDocsUrl = (rawUrl?: string): string => {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  if (url.includes('docs.google.com/document')) {
    if (url.includes('/edit')) {
      url = url.split('/edit')[0] + '/preview?embedded=true';
    } else if (!url.includes('/preview')) {
      url = url.replace(/\/$/, '') + '/preview?embedded=true';
    } else if (!url.includes('embedded=true')) {
      url = url + (url.includes('?') ? '&embedded=true' : '?embedded=true');
    }
  }
  return url;
};

export const isGDocsUrl = (url?: string) => /^https:\/\/docs\.google\.com\//i.test((url ?? '').trim());

export const DocumentDetailView: React.FC<DocumentDetailViewProps> = ({
  document: doc,
  onUpdate,
  onDelete,
}) => {
  const { addCommentToDocument, resolveComment, deleteComment } = useDatabaseStore();

  const [showMetadataEditor, setShowMetadataEditor] = useState(false);
  const [title, setTitle] = useState(doc.title);
  const [category, setCategory] = useState<DocumentCategory>(doc.category);
  const [status, setStatus] = useState(doc.status);
  const [version, setVersion] = useState(doc.version);
  const [department, setDepartment] = useState(doc.department);
  const [author, setAuthor] = useState(doc.author);
  const [gdocsUrl, setGdocsUrl] = useState(doc.gdocsUrl || '');
  const [showGDocsLinkModal, setShowGDocsLinkModal] = useState(false);
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);

  useEffect(() => {
    setTitle(doc.title);
    setCategory(doc.category);
    setStatus(doc.status);
    setVersion(doc.version);
    setDepartment(doc.department);
    setAuthor(doc.author);
    setGdocsUrl(doc.gdocsUrl || '');
  }, [doc.id]);

  const handleSaveMetadata = () => {
    if (gdocsUrl.trim() && !isGDocsUrl(gdocsUrl)) {
      alert('Tautan harus berupa link Google Docs (https://docs.google.com/...).');
      return;
    }
    onUpdate({ title, category, status, version, department, author, gdocsUrl: gdocsUrl.trim() || doc.gdocsUrl, updatedAt: new Date().toISOString() });
    setShowMetadataEditor(false);
  };

  const catStyle = CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.Lainnya;
  const comments = doc.comments || [];
  const unresolvedCommentsCount = comments.filter((c) => !c.resolved).length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-100/70 dark:bg-gray-950/90">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-2.5 flex items-center justify-between flex-wrap gap-3 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{doc.emoji}</span>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  onUpdate({ title: e.target.value });
                }}
                className="font-bold text-gray-900 dark:text-white text-base bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-700 focus:border-primary-500 focus:outline-none transition-colors max-w-sm sm:max-w-md"
                placeholder="Judul Dokumen..."
              />
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                {doc.category}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[doc.status] || ''}`}>
                {doc.status}
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Departemen: {doc.department} • Versi: {doc.version} • Penulis: {doc.author}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowMetadataEditor(!showMetadataEditor)}
            className={`btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shadow-xs ${showMetadataEditor ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300 border-primary-300' : ''}`}
            title="Edit informasi detail dokumen (Kategori, Status, Versi, PIC)"
          >
            <Edit3 size={13} />
            <span>Detail Info</span>
          </button>

          {/* Tombol Pengaturan Link Google Docs */}
          <button
            type="button"
            onClick={() => setShowGDocsLinkModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer shadow-xs"
            title="Kelola tautan integrasi Google Docs"
          >
            <FileText size={14} className="text-blue-600" />
            <span>Google Docs</span>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          </button>

          {doc.gdocsUrl && (
            <a
              href={doc.gdocsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-blue-600 dark:text-blue-400 cursor-pointer shadow-xs"
              title="Buka dokumen terkait di tab baru Google Docs"
            >
              <ExternalLink size={13} />
              <span>Tab Baru</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => setShowCommentsSidebar(!showCommentsSidebar)}
            className={`btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shadow-xs ${showCommentsSidebar ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/40 border-primary-300' : ''}`}
            title="Buka sidebar komentar dokumen"
          >
            <MessageSquare size={13} />
            <span>Komentar</span>
            {unresolvedCommentsCount > 0 && (
              <span className="bg-primary-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                {unresolvedCommentsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
            title="Hapus dokumen ini"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* METADATA QUICK DRAWER / FORM */}
      {showMetadataEditor && (
        <div className="bg-gray-50 dark:bg-gray-800/90 border-b border-gray-200 dark:border-gray-700 px-6 py-3 transition-all animate-fadeIn z-15">
          <div className="max-w-5xl mx-auto space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Pengaturan Informasi Dokumen Resmi
              </h4>
              <button
                onClick={() => setShowMetadataEditor(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Kategori Dokumen:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                  className="input text-xs"
                >
                  <option value="SOP">📋 SOP (Standar Operasional)</option>
                  <option value="Proposal">📑 Proposal Bisnis / Proyek</option>
                  <option value="Kontrak">📜 Kontrak / Perjanjian Kerja</option>
                  <option value="Laporan">📊 Laporan Kerja & Evaluasi</option>
                  <option value="Kebijakan">🛡️ Kebijakan Perusahaan</option>
                  <option value="Lainnya">📄 Dokumen Lainnya</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Status Dokumen:</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="input text-xs"
                >
                  <option value="Draft">Draft</option>
                  <option value="Review">Review</option>
                  <option value="Disetujui">Disetujui</option>
                  <option value="Berlaku">Berlaku Resmi</option>
                  <option value="Arsip">Arsip</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Versi Dokumen:</label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="input text-xs"
                  placeholder="Contoh: v1.0, v2.1"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Departemen / Divisi:</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="input text-xs"
                  placeholder="Contoh: Operasional, IT, HR"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Penulis (Author):</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="input text-xs"
                  placeholder="Nama pembuat atau penanggung jawab"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Tautan Dokumen Google Docs:</label>
                <input
                  type="url"
                  value={gdocsUrl}
                  onChange={(e) => setGdocsUrl(e.target.value)}
                  placeholder="https://docs.google.com/document/d/..."
                  className="input text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowMetadataEditor(false)}
                className="btn-secondary text-xs py-1 px-3"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleSaveMetadata}
                className="btn-primary text-xs py-1 px-4 flex items-center gap-1.5"
              >
                <Check size={13} />
                <span>Simpan Perubahan Info</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {doc.gdocsUrl ? (
            <div className="flex-1 flex flex-col bg-white dark:bg-gray-950 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 text-xs flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                  <span className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <FileText size={15} className="text-blue-600" />
                    Live Google Docs View (Tampilan Khusus Dokumen GDocs)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 hidden md:inline">
                    Dokumen resmi tersimpan langsung ke Google Docs
                  </span>
                  <a
                    href={doc.gdocsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 dark:text-blue-300 font-semibold hover:underline flex items-center gap-1"
                  >
                    <ExternalLink size={12} /> Buka Tab Baru
                  </a>
                </div>
              </div>
    
              <div className="flex-1 w-full h-full bg-gray-50 dark:bg-gray-900">
                <iframe
                  src={getEmbeddableGDocsUrl(doc.gdocsUrl)}
                  title="Google Docs Live Full View"
                  className="w-full h-full border-0"
                  allow="clipboard-read; clipboard-write; fullscreen"
                />
              </div>
            </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md text-center space-y-3">
              <FileText size={40} className="mx-auto text-blue-500" />
              <p className="font-bold text-gray-900 dark:text-white">Dokumen belum terhubung ke Google Docs</p>
              <p className="text-xs text-gray-500">
                Dokumen di Database hanya ditampilkan dari Google Docs. Tempel link Google Docs untuk menampilkan isinya di sini.
              </p>
              <button
                type="button"
                onClick={() => setShowGDocsLinkModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
              >
                <LinkIcon size={13} /> Tempel Link Google Docs
              </button>
            </div>
          </div>
        )}

        <CommentsSidebar
          isOpen={showCommentsSidebar}
          onClose={() => setShowCommentsSidebar(false)}
          comments={comments}
          selectedText=""
          onAddComment={(text, quoted) => addCommentToDocument(doc.id, text, quoted)}
          onResolveComment={(cid) => resolveComment(doc.id, cid)}
          onDeleteComment={(cid) => deleteComment(doc.id, cid)}
        />
      </div>

      {showGDocsLinkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                Integrasi Tautan Google Docs
              </h3>
              <button onClick={() => setShowGDocsLinkModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tempel link berkas Google Docs dari akun Google Anda untuk menghubungkan dokumen ini secara langsung ke dalam Ruang Kelana:
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                  URL Dokumen Google Docs:
                </label>
                <input
                  type="url"
                  value={gdocsUrl}
                  onChange={(e) => setGdocsUrl(e.target.value)}
                  placeholder="https://docs.google.com/document/d/..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-800 dark:text-blue-300 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  💡 Tips Integrasi Berkas Google Docs:
                </p>
                <p>
                  1. Buka Google Docs Anda, klik tombol <strong>Bagikan (Share)</strong> di pojok kanan atas.
                </p>
                <p>
                  2. Atur akses menjadi <em>"Siapa saja yang memiliki link"</em> (atau pastikan akun Anda sedang login di peramban).
                </p>
                <p>
                  3. Salin link dan tempel ke kotak di atas, lalu klik <strong>Simpan Tautan</strong>.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGDocsLinkModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdate({ gdocsUrl });
                    setShowGDocsLinkModal(false);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5"
                >
                  <Check size={13} /> Simpan Tautan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
