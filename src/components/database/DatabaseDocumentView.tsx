import React, { useState } from 'react';
import { DatabaseTable, DatabaseField } from '../../types';
import {
  FileText, Copy, Download, ExternalLink, Plus, Trash2,
  Check, Edit2, FileSpreadsheet, RefreshCw, Sparkles, CheckCircle2
} from 'lucide-react';
import { formatCellValue, copyForGoogleDocs, downloadHTMLDocument } from '../../utils/databaseIntegration';

interface DatabaseDocumentViewProps {
  table: DatabaseTable;
  onUpdateCell: (rowId: string, fieldId: string, value: any) => void;
  onAddRow: () => void;
  onDeleteRow: (rowId: string) => void;
  onOpenIntegration: () => void;
}

export const DatabaseDocumentView: React.FC<DatabaseDocumentViewProps> = ({
  table,
  onUpdateCell,
  onAddRow,
  onDeleteRow,
  onOpenIntegration,
}) => {
  const [copied, setCopied] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const handleCopyDocs = async () => {
    const ok = await copyForGoogleDocs(table);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const dateFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex-1 overflow-y-auto bg-gray-100/70 dark:bg-gray-950/90 p-4 sm:p-8 flex justify-center">
      {/* Paper Canvas (Google Docs Style) */}
      <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 p-8 sm:p-12 transition-all">
        {/* Document Header Ribbon */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-gray-200 dark:border-gray-800 flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800">
            <FileText size={14} />
            <span>Format Dokumen Laporan (Google Docs)</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyDocs}
              className="btn-secondary text-xs py-1 px-3 flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Salin dokumen lengkap agar dapat langsung di-paste ke Google Docs"
            >
              {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin untuk GDocs'}</span>
            </button>
            <button
              type="button"
              onClick={() => downloadHTMLDocument(table)}
              className="btn-secondary text-xs py-1 px-3 flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Unduh laporan dokumen"
            >
              <Download size={13} />
              <span>Unduh Dokumen</span>
            </button>
            {table.gdocsUrl && (
              <a
                href={table.gdocsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-xs py-1 px-3 flex items-center gap-1.5 cursor-pointer shadow-xs text-blue-600 dark:text-blue-400"
              >
                <ExternalLink size={13} />
                <span>Buka GDocs</span>
              </a>
            )}
            <button
              type="button"
              onClick={onOpenIntegration}
              className="px-2.5 py-1 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            >
              Integrasi ⚙️
            </button>
          </div>
        </div>

        {/* Document Title & Meta */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{table.emoji}</span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                Laporan Database: {table.name}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Dibuat otomatis oleh Ruang Kelana • Sinkron dengan Google Docs &amp; Google Sheets • {dateFormatted}
              </p>
            </div>
          </div>
          {table.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 italic mt-3 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg border-l-4 border-blue-500">
              {table.description}
            </p>
          )}
        </div>

        {/* Section 1: Executive Summary Table (Google Docs Table) */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              I. Ringkasan Eksekutif (Tabel Spreadsheet)
            </h2>
            <span className="text-xs text-gray-400">{table.rows.length} total entri data</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-300 dark:border-gray-700">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
                  <th className="w-8 px-3 py-2.5 text-center font-bold text-gray-600 dark:text-gray-300 border-r border-gray-300 dark:border-gray-700">
                    #
                  </th>
                  {table.fields.map((f) => (
                    <th
                      key={f.id}
                      className="px-3 py-2.5 text-left font-bold text-gray-700 dark:text-gray-200 border-r border-gray-300 dark:border-gray-700 whitespace-nowrap"
                    >
                      {f.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-200 dark:border-gray-800 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                  >
                    <td className="px-3 py-2 text-center text-gray-400 font-medium border-r border-gray-200 dark:border-gray-800">
                      {idx + 1}
                    </td>
                    {table.fields.map((f) => {
                      const val = row.cells[f.id];
                      const opt = f.options?.find((o) => o.id === val);
                      return (
                        <td
                          key={f.id}
                          className="px-3 py-2 border-r border-gray-200 dark:border-gray-800 max-w-[200px] truncate"
                        >
                          {opt ? (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] text-white font-medium"
                              style={{ backgroundColor: opt.color }}
                            >
                              {opt.label}
                            </span>
                          ) : f.type === 'checkbox' ? (
                            <span>{val ? '✅ Ya' : '⬜ Tidak'}</span>
                          ) : f.type === 'number' && val !== null && val !== undefined ? (
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {new Intl.NumberFormat('id-ID').format(val)}
                            </span>
                          ) : (
                            <span className="text-gray-800 dark:text-gray-200">
                              {val ? String(val) : '—'}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Detailed Record Sections (GDocs Individual Cards) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              II. Rincian Dokumen Lengkap (Catatan GDocs)
            </h2>
            <button
              type="button"
              onClick={onAddRow}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Plus size={13} />
              <span>+ Tambah Entri Dokumen</span>
            </button>
          </div>

          <div className="space-y-4">
            {table.rows.map((row, idx) => {
              const primaryField = table.fields[0];
              const primaryVal = primaryField ? row.cells[primaryField.id] : null;

              return (
                <div
                  key={row.id}
                  className="rounded-xl border border-gray-200 dark:border-gray-700/80 p-5 bg-white dark:bg-gray-850 hover:shadow-md transition-shadow relative group"
                >
                  {/* Top Bar of Record */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <h3 className="font-bold text-base text-gray-900 dark:text-white">
                        {primaryVal ? String(primaryVal) : `Entri Dokumen #${idx + 1}`}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingRowId(editingRowId === row.id ? null : row.id)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 size={12} />
                        <span>{editingRowId === row.id ? 'Tutup Edit' : 'Edit Entri'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteRow(row.id)}
                        className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        title="Hapus entri ini"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {table.fields.map((f) => {
                      const val = row.cells[f.id];
                      const opt = f.options?.find((o) => o.id === val);
                      const isEditing = editingRowId === row.id;

                      return (
                        <div
                          key={f.id}
                          className="p-2.5 rounded-lg bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800"
                        >
                          <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 block mb-1">
                            {f.name}
                          </span>

                          {isEditing ? (
                            f.type === 'select' && f.options ? (
                              <select
                                value={val ?? ''}
                                onChange={(e) => onUpdateCell(row.id, f.id, e.target.value || null)}
                                className="w-full bg-white dark:bg-gray-800 text-xs p-1 rounded border border-gray-300 dark:border-gray-600 outline-none"
                              >
                                <option value="">— Pilih —</option>
                                {f.options.map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            ) : f.type === 'checkbox' ? (
                              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!val}
                                  onChange={(e) => onUpdateCell(row.id, f.id, e.target.checked)}
                                  className="accent-primary-600 rounded"
                                />
                                <span>{val ? 'Aktif' : 'Non-aktif'}</span>
                              </label>
                            ) : (
                              <input
                                type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                                value={val ?? ''}
                                onChange={(e) =>
                                  onUpdateCell(
                                    row.id,
                                    f.id,
                                    f.type === 'number' ? (e.target.value ? Number(e.target.value) : '') : e.target.value
                                  )
                                }
                                className="w-full bg-white dark:bg-gray-800 text-xs p-1 rounded border border-gray-300 dark:border-gray-600 outline-none"
                              />
                            )
                          ) : (
                            <div className="text-xs font-medium text-gray-800 dark:text-gray-200">
                              {opt ? (
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] text-white font-semibold inline-block"
                                  style={{ backgroundColor: opt.color }}
                                >
                                  {opt.label}
                                </span>
                              ) : f.type === 'checkbox' ? (
                                <span className="flex items-center gap-1">
                                  {val ? '✅ Selesai / Ya' : '⬜ Belum / Tidak'}
                                </span>
                              ) : f.type === 'number' && val !== null && val !== undefined ? (
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  {new Intl.NumberFormat('id-ID').format(val)}
                                </span>
                              ) : f.type === 'url' && val ? (
                                <a
                                  href={val}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline truncate block"
                                >
                                  {val}
                                </a>
                              ) : (
                                <span>{val ? String(val) : '—'}</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Document Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs text-gray-400">
          <span>Ruang Kelana Database Engine</span>
          <span>Terintegrasi 2 Bentuk: Tabel (Spreadsheet) &amp; Dokumen (GDocs)</span>
        </div>
      </div>
    </div>
  );
};
