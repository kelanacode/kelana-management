import React, { useState } from 'react';
import {
  Plus, Trash2, ChevronDown, MoreHorizontal,
  Table as TableIcon, LayoutGrid, Database as DatabaseIcon, Edit3, X, Check,
  FileText, FileSpreadsheet, ExternalLink, RefreshCw, Sparkles,
  CheckCircle2, Filter, Folder, FolderOpen, Tag, Link2, Eye, Globe
} from 'lucide-react';
import { useDatabaseStore } from '../stores/databaseStore';
import { DatabaseField, FieldType, SelectOption, TableCategory, DocumentCategory } from '../types';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { DocumentDetailView } from '../components/database/DocumentDetailView';
import { GoogleIntegrationModal } from '../components/database/GoogleIntegrationModal';
import { DriveSidebar, DriveFoldersView } from '../components/database/DriveFolders';
import { useAuthStore } from '../stores/authStore';

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: '📝 Teks',
  number: '🔢 Angka',
  date: '📅 Tanggal',
  select: '🏷️ Pilihan',
  multiselect: '🏷️ Multi Pilihan',
  checkbox: '☑️ Centang',
  url: '🔗 URL',
  email: '📧 Email',
};

// ---- Cell Renderer ----
const CellRenderer: React.FC<{
  field: DatabaseField;
  value: any;
  onChange: (val: any) => void;
}> = ({ field, value, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(value);

  const commit = () => { onChange(localVal); setEditing(false); };

  if (field.type === 'checkbox') {
    return (
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded accent-primary-600 cursor-pointer"
        />
      </div>
    );
  }

  if (field.type === 'select' && field.options) {
    const selected = field.options.find((o) => o.id === value);
    return (
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm outline-none cursor-pointer"
      >
        <option value="">—</option>
        {field.options.map((opt) => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
    );
  }

  if (field.type === 'date') {
    return (
      <input
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm outline-none cursor-pointer"
      />
    );
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={localVal ?? ''}
        onChange={(e) => setLocalVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        className="w-full bg-transparent text-sm outline-none border-none"
        type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
      />
    );
  }

  const displayValue = () => {
    if (!value && value !== 0) return <span className="text-gray-300 dark:text-gray-600">—</span>;
    if (field.type === 'number') return new Intl.NumberFormat('id-ID').format(value);
    if (field.type === 'url') return <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline truncate block">{value}</a>;
    return String(value);
  };

  return (
    <div onClick={() => { setLocalVal(value); setEditing(true); }} className="cursor-text w-full text-sm truncate">
      {displayValue()}
    </div>
  );
};

// ---- Select Cell with Color ----
const SelectCell: React.FC<{ field: DatabaseField; value: any; onChange: (v: any) => void }> = ({ field, value, onChange }) => {
  const selected = field.options?.find((o) => o.id === value);
  return (
    <div className="relative">
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full bg-transparent text-sm outline-none cursor-pointer appearance-none"
        style={{ color: selected?.color }}
      >
        <option value="">—</option>
        {field.options?.map((opt) => (
          <option key={opt.id} value={opt.id} style={{ color: opt.color }}>{opt.label}</option>
        ))}
      </select>
      {selected && (
        <span className="absolute left-0 top-0 pointer-events-none">
          <span className="px-2 py-0.5 rounded-full text-xs text-white font-medium" style={{ backgroundColor: selected.color }}>
            {selected.label}
          </span>
        </span>
      )}
    </div>
  );
};

export const DatabasePage: React.FC = () => {
  const {
    activeMode, setActiveMode,
    tables, selectedTableId, addTable, deleteTable, selectTable,
    addField, deleteField, addRow, updateCell, deleteRow, updateTable,
    documents, selectedDocumentId, addDocument, deleteDocument, selectDocument, updateDocument
  } = useDatabaseStore();

  const [tableViewMode, setTableViewMode] = useState<'table' | 'gallery'>('table');
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');

  // Add Table state
  const [addingTable, setAddingTable] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableCategory, setNewTableCategory] = useState<TableCategory>('CRM');
  const [newTableSpreadsheetUrl, setNewTableSpreadsheetUrl] = useState('');

  // Add Document state
  const [addingDoc, setAddingDoc] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCategory, setNewDocCategory] = useState<DocumentCategory>('SOP');
  const [newDocGDocsUrl, setNewDocGDocsUrl] = useState('');

  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showEmbeddedSheets, setShowEmbeddedSheets] = useState(true);

  // Helper untuk mengubah Google Docs/Sheets URL ke format embed iframe yang bisa langsung diedit
  const getEmbeddableUrl = (rawUrl?: string): string => {
    if (!rawUrl) return '';
    let url = rawUrl.trim();
    if (url.includes('docs.google.com/spreadsheets')) {
      // Pastikan mode /edit?rm=minimal agar toolbar dan sel dapat langsung diedit di dalam iframe
      if (url.includes('/htmlembed')) {
        url = url.replace('/htmlembed', '/edit');
      }
      if (url.includes('/edit')) {
        url = url.split('/edit')[0] + '/edit?rm=minimal';
      } else {
        url = url.replace(/\/$/, '') + '/edit?rm=minimal';
      }
    } else if (url.includes('docs.google.com/document')) {
      // Ubah ke /edit?rm=minimal untuk Google Docs editable
      if (url.includes('/preview')) {
        url = url.replace('/preview', '/edit');
      }
      if (url.includes('/edit')) {
        url = url.split('/edit')[0] + '/edit?rm=minimal';
      } else {
        url = url.replace(/\/$/, '') + '/edit?rm=minimal';
      }
    }
    return url;
  };

  const { session } = useAuthStore();
  const currentUser = session?.user;
  const currentRole = currentUser?.role;
  const currentPos = (currentUser?.position || '').toLowerCase();
  const userDivision = (currentUser?.division || '').toLowerCase();

  // Role & Division Check:
  // - CEO has access to everything
  // - Finance & Budgeting: ONLY accessible by CEO, Admin, or division Financial
  // - HR & Karyawan: ONLY accessible by CEO, Admin, HR, or division HR & GA
  // - Other tables (CRM, Content, Inventory, etc.): Accessible by anyone!
  const isCEO =
    currentRole === 'CEO' ||
    userDivision.includes('all role') ||
    currentPos.includes('ceo') ||
    currentPos.includes('direktur') ||
    currentPos.includes('chief executive');

  const canAccessTable = (table: any) => {
    if (isCEO) return true;
    const cat = (table.category || '').toLowerCase();
    const name = (table.name || '').toLowerCase();

    // Check if table is Finance & Budgeting
    const isFinanceTable = cat === 'finance' || name.includes('finance') || name.includes('budget');
    if (isFinanceTable) {
      return (
        currentRole === 'Finance' ||
        currentRole === 'Admin' ||
        userDivision.includes('finan') ||
        userDivision.includes('keuangan')
      );
    }

    // Check if table is HR & Karyawan
    const isHRTable = cat === 'hr' || name.includes('hr') || name.includes('karyawan');
    if (isHRTable) {
      return (
        currentRole === 'HR' ||
        currentRole === 'Admin' ||
        userDivision.includes('hr') ||
        userDivision.includes('operasional')
      );
    }

    // All other tables are open to everyone
    return true;
  };

  const visibleTables = tables.filter(canAccessTable);
  const currentTable = visibleTables.find((t) => t.id === selectedTableId) || visibleTables[0];
  const currentDocument = documents.find((d) => d.id === selectedDocumentId) || documents[0];

  const handleAddField = () => {
    if (!newFieldName.trim() || !currentTable) return;
    addField(currentTable.id, { name: newFieldName.trim(), type: newFieldType, width: 180 });
    setNewFieldName('');
    setNewFieldType('text');
    setShowAddField(false);
  };

  const renderCell = (field: DatabaseField, row: any) => {
    const value = row.cells[field.id];
    const onChange = (val: any) => {
      if (currentTable) updateCell(currentTable.id, row.id, field.id, val);
    };

    if (field.type === 'select' && field.options) {
      return <SelectCell field={field} value={value} onChange={onChange} />;
    }
    return <CellRenderer field={field} value={value} onChange={onChange} />;
  };

  // Stats calculation
  const numberFields = currentTable?.fields.filter((f) => f.type === 'number') || [];
  const numberFieldSums = numberFields.map((f) => {
    const total = currentTable?.rows.reduce((sum, r) => sum + (Number(r.cells[f.id]) || 0), 0) || 0;
    return { name: f.name, total };
  });

  return (
    <div className="flex h-full overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* SIDEBAR DATABASE: 2 FITUR UTAMA (TABEL & DOKUMEN) */}
      <div className="w-64 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col z-10">
        {/* Fitur Selector: TABEL vs DOKUMEN */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveMode('tables')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'tables'
                  ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <FileSpreadsheet size={14} />
              <span>Tabel</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('documents')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'documents'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <FileText size={14} />
              <span>Dokumen</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('drive')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'drive'
                  ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <Folder size={14} />
              <span>Drive</span>
            </button>
          </div>
        </div>

        {/* List Items based on Active Mode */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {activeMode === 'drive' ? (
            <DriveSidebar />
          ) : activeMode === 'tables' ? (
            /* TABEL LIST (CRM, Content, Finance) */
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Daftar Tabel Spreadsheet
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold">{visibleTables.length} tabel</span>
              </div>
              <div className="space-y-1">
                {visibleTables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => selectTable(table.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                      table.id === currentTable?.id
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800/80 shadow-xs'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-base">{table.emoji}</span>
                      <span className="truncate">{table.name}</span>
                    </div>
                    {table.category && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
                        {table.category}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {addingTable ? (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                  <input
                    autoFocus
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    placeholder="Nama tabel..."
                    className="input text-xs py-1.5"
                  />
                  <select
                    value={newTableCategory}
                    onChange={(e) => setNewTableCategory(e.target.value as TableCategory)}
                    className="input text-xs py-1"
                  >
                    <option value="CRM">🎯 CRM Leads & Sales</option>
                    <option value="Content">📅 Content Calendar</option>
                    <option value="Finance">💰 Finance & Budget</option>
                    <option value="Inventory">📦 Inventory & Stok</option>
                    <option value="HR">👥 HR & Karyawan</option>
                    <option value="Lainnya">📊 Tabel Lainnya</option>
                  </select>
                  <input
                    type="url"
                    value={newTableSpreadsheetUrl}
                    onChange={(e) => setNewTableSpreadsheetUrl(e.target.value)}
                    placeholder="Tempel link Google Sheet Anda..."
                    className="input text-xs py-1.5"
                  />
                  <p className="text-[10px] text-gray-400">
                    💡 Opsional: Masukkan URL GSheet yang sudah Anda miliki agar langsung terhubung live.
                  </p>
                  <div className="flex gap-1.5 pt-1">
                    <button
                      onClick={() => {
                        if (newTableName.trim()) {
                          addTable(newTableName.trim(), newTableCategory, newTableSpreadsheetUrl.trim() || undefined);
                          setNewTableName('');
                          setNewTableSpreadsheetUrl('');
                          setAddingTable(false);
                        }
                      }}
                      className="btn-primary text-xs py-1 px-3 flex-1"
                    >
                      Buat Tabel
                    </button>
                    <button onClick={() => { setAddingTable(false); setNewTableSpreadsheetUrl(''); }} className="btn-secondary text-xs py-1 px-2">
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingTable(true)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 p-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-400 transition-colors cursor-pointer"
                >
                  <Plus size={14} /> + Tambah Tabel
                </button>
              )}
            </div>
          ) : (
            /* DOKUMEN LIST (SOP, Proposal, Kontrak) */
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Daftar Dokumen GDocs
                </span>
                <span className="text-[10px] text-blue-600 font-semibold">{documents.length} dokumen</span>
              </div>
              <div className="space-y-1">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => selectDocument(doc.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                      doc.id === currentDocument?.id
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800/80 shadow-xs'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-base">{doc.emoji}</span>
                      <span className="truncate">{doc.title}</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                      {doc.category}
                    </span>
                  </button>
                ))}
              </div>

              {addingDoc ? (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                  <input
                    autoFocus
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    placeholder="Judul dokumen..."
                    className="input text-xs py-1.5"
                  />
                  <select
                    value={newDocCategory}
                    onChange={(e) => setNewDocCategory(e.target.value as DocumentCategory)}
                    className="input text-xs py-1"
                  >
                    <option value="SOP">📋 SOP (Standar Operasional)</option>
                    <option value="Proposal">📑 Proposal Bisnis / Proyek</option>
                    <option value="Kontrak">📜 Kontrak / Perjanjian Kerja</option>
                    <option value="Laporan">📊 Laporan Kerja & Evaluasi</option>
                    <option value="Kebijakan">🛡️ Kebijakan Perusahaan</option>
                    <option value="Lainnya">📄 Dokumen Lainnya</option>
                  </select>
                  <input
                    type="url"
                    value={newDocGDocsUrl}
                    onChange={(e) => setNewDocGDocsUrl(e.target.value)}
                    placeholder="Tempel link Google Docs Anda..."
                    className="input text-xs py-1.5"
                  />
                  <p className="text-[10px] text-gray-400">
                    💡 Opsional: Masukkan URL Google Docs yang sudah Anda miliki agar terhubung langsung.
                  </p>
                  <div className="flex gap-1.5 pt-1">
                    <button
                      onClick={() => {
                        if (newDocTitle.trim()) {
                          addDocument(newDocTitle.trim(), newDocCategory, newDocGDocsUrl.trim() || undefined);
                          setNewDocTitle('');
                          setNewDocGDocsUrl('');
                          setAddingDoc(false);
                        }
                      }}
                      className="btn-primary text-xs py-1 px-3 flex-1"
                    >
                      Buat Dokumen
                    </button>
                    <button onClick={() => { setAddingDoc(false); setNewDocGDocsUrl(''); }} className="btn-secondary text-xs py-1 px-2">
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingDoc(true)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 p-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 transition-colors cursor-pointer"
                >
                  <Plus size={14} /> + Tambah Dokumen
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Footer Indicator */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Cloud Sync Ready
          </span>
          <span className="font-semibold text-gray-600 dark:text-gray-300">Ruang Kelana</span>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeMode === 'drive' ? (
          <DriveFoldersView />
        ) : activeMode === 'tables' ? (
          /* =========================================================================
             1. FITUR TABEL (CRM, CONTENT CALENDAR, FINANCE, DLL.)
             ========================================================================= */
          currentTable ? (
            <>
              {/* Table Toolbar */}
              <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{currentTable.emoji}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-gray-900 dark:text-white text-base">{currentTable.name}</h2>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                        {currentTable.category || 'Tabel'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-lg">
                      {currentTable.description || 'Database terstruktur terintegrasi Google Spreadsheet'}
                    </p>
                  </div>
                </div>

                {/* Table Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Google Sheets Modal trigger: Tempel Link & Sinkronisasi */}
                  <button
                    type="button"
                    onClick={() => setShowGoogleModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer shadow-xs"
                    title="Tempel link Google Spreadsheet dan kelola integrasi"
                  >
                    <FileSpreadsheet size={14} className="text-emerald-600" />
                    <span>Google Sheets</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  </button>

                  {/* Tombol Tampilkan Live Spreadsheet Terintegrasi di dalam Ruang Kelana */}
                  {currentTable.spreadsheetUrl && (
                    <button
                      type="button"
                      onClick={() => setShowEmbeddedSheets(!showEmbeddedSheets)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer shadow-xs ${
                        showEmbeddedSheets
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50'
                      }`}
                      title="Tampilkan Google Spreadsheet langsung di dalam Ruang Kelana"
                    >
                      <Eye size={13} />
                      <span>{showEmbeddedSheets ? 'Tutup Live Sheets' : 'Buka Live Sheets'}</span>
                    </button>
                  )}

                  {/* Table/Gallery toggle */}
                  <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setTableViewMode('table')}
                      className={`p-1.5 rounded-md transition-colors ${tableViewMode === 'table' ? 'bg-white dark:bg-gray-700 shadow-sm text-emerald-600 font-bold' : 'text-gray-400'}`}
                      title="Tampilan Tabel Kisi"
                    >
                      <TableIcon size={14} />
                    </button>
                    <button
                      onClick={() => setTableViewMode('gallery')}
                      className={`p-1.5 rounded-md transition-colors ${tableViewMode === 'gallery' ? 'bg-white dark:bg-gray-700 shadow-sm text-emerald-600 font-bold' : 'text-gray-400'}`}
                      title="Tampilan Galeri Kartu"
                    >
                      <LayoutGrid size={14} />
                    </button>
                  </div>

                  <button
                    onClick={() => deleteTable(currentTable.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                    title="Hapus tabel ini"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* TAMPILAN GOOGLE SPREADSHEET LANGSUNG & EDITABLE DI DALAM RUANG KELANA */}
              {currentTable.spreadsheetUrl ? (
                <div className="flex-1 flex flex-col bg-white dark:bg-gray-950 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <FileSpreadsheet size={15} />
                        Live Google Spreadsheet (Mode Edit Aktif Terintegrasi)
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 hidden sm:inline">
                        Setiap ketikan & rumus otomatis tersimpan langsung ke Google Sheets Anda
                      </span>
                      <a
                        href={currentTable.spreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 dark:text-emerald-300 font-semibold hover:underline flex items-center gap-1"
                      >
                        <ExternalLink size={12} /> Buka Tab Baru
                      </a>
                    </div>
                  </div>

                  {/* Iframe Interaktif Full-Height: Langsung Bisa Ketik, Edit Sel, Rumus & Tab Sheet */}
                  <div className="flex-1 w-full h-full bg-gray-50 dark:bg-gray-900">
                    <iframe
                      src={getEmbeddableUrl(currentTable.spreadsheetUrl)}
                      title="Google Spreadsheet Interactive Edit"
                      className="w-full h-full border-0"
                      allow="clipboard-read; clipboard-write; fullscreen"
                    />
                  </div>
                </div>
              ) : (
                /* Fallback Tabel Lokal jika belum ada Link GSheet */
                tableViewMode === 'table' ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <th className="w-10 px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">#</th>
                            {currentTable.fields.map((field) => (
                              <th
                                key={field.id}
                                className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap"
                                style={{ width: field.width ?? 180, minWidth: field.width ?? 180 }}
                              >
                                <div className="flex items-center justify-between group">
                                  <span>{field.name}</span>
                                  <button
                                    onClick={() => deleteField(currentTable.id, field.id)}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-500 transition-all cursor-pointer"
                                    title="Hapus kolom"
                                  >
                                    <X size={11} />
                                  </button>
                                </div>
                              </th>
                            ))}
                            <th className="px-3 py-2.5 text-left">
                              {showAddField ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    autoFocus
                                    value={newFieldName}
                                    onChange={(e) => setNewFieldName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddField()}
                                    placeholder="Nama kolom..."
                                    className="input text-xs py-1 w-28"
                                  />
                                  <select
                                    value={newFieldType}
                                    onChange={(e) => setNewFieldType(e.target.value as FieldType)}
                                    className="input text-xs py-1 w-28"
                                  >
                                    {Object.entries(FIELD_TYPE_LABELS).map(([v, l]) => (
                                      <option key={v} value={v}>{l}</option>
                                    ))}
                                  </select>
                                  <button onClick={handleAddField} className="btn-primary text-xs py-1 px-2 cursor-pointer">✓</button>
                                  <button onClick={() => setShowAddField(false)} className="btn-secondary text-xs py-1 px-2 cursor-pointer">✕</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setShowAddField(true)}
                                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors whitespace-nowrap cursor-pointer"
                                >
                                  <Plus size={13} /> Kolom Baru
                                </button>
                              )}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentTable.rows.map((row, idx) => (
                            <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 group">
                              <td className="px-3 py-2 text-xs text-gray-400">{idx + 1}</td>
                              {currentTable.fields.map((field) => (
                                <td key={field.id} className="px-3 py-2 max-w-[200px]">
                                  {renderCell(field, row)}
                                </td>
                              ))}
                              <td className="px-3 py-2">
                                <button
                                  onClick={() => deleteRow(currentTable.id, row.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-all cursor-pointer"
                                  title="Hapus baris"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                          <tr>
                            <td colSpan={currentTable.fields.length + 2} className="px-3 py-2">
                              <button
                                onClick={() => addRow(currentTable.id)}
                                className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                              >
                                <Plus size={14} /> Tambah Baris
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* GALLERY VIEW FOR TABLES */
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {currentTable.rows.map((row, idx) => {
                        const primaryField = currentTable.fields[0];
                        const primaryValue = primaryField ? row.cells[primaryField.id] : `Item ${idx + 1}`;
                        return (
                          <div key={row.id} className="card p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-2xl">{currentTable.emoji}</span>
                              <button
                                onClick={() => deleteRow(currentTable.id, row.id)}
                                className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 transition-all cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                            <p className="font-semibold text-gray-900 dark:text-white text-sm mb-3 truncate">{primaryValue || `Item ${idx + 1}`}</p>
                            <div className="space-y-1.5">
                              {currentTable.fields.slice(1, 4).map((field) => {
                                const val = row.cells[field.id];
                                if (!val && val !== false && val !== 0) return null;
                                const opt = field.options?.find((o) => o.id === val);
                                return (
                                  <div key={field.id} className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 dark:text-gray-500 truncate flex-shrink-0">{field.name}:</span>
                                    {opt ? (
                                      <span className="text-xs px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: opt.color }}>{opt.label}</span>
                                    ) : field.type === 'checkbox' ? (
                                      <span className="text-xs">{val ? '✅' : '⬜'}</span>
                                    ) : (
                                      <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{String(val)}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      <button
                        onClick={() => addRow(currentTable.id)}
                        className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-emerald-400 hover:text-emerald-600 transition-colors min-h-[120px] cursor-pointer"
                      >
                        <Plus size={20} />
                        <span className="text-sm">Tambah Item</span>
                      </button>
                    </div>
                  </div>
                )
              )}

              {/* Google Sheets Integration Modal */}
              <GoogleIntegrationModal
                isOpen={showGoogleModal}
                onClose={() => setShowGoogleModal(false)}
                table={currentTable}
                onUpdateUrls={(sheetsUrl, docsUrl) => {
                  updateTable(currentTable.id, {
                    spreadsheetUrl: sheetsUrl,
                    lastSyncedAt: new Date().toISOString(),
                  });
                }}
                onSync={() => {
                  updateTable(currentTable.id, {
                    lastSyncedAt: new Date().toISOString(),
                  });
                }}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-8">
                <p className="text-4xl mb-3">📊</p>
                <h3 className="font-bold text-gray-900 dark:text-white">Pilih atau Buat Tabel Spreadsheet</h3>
                <p className="text-xs text-gray-500 mt-1">Gunakan untuk CRM Leads, Content Calendar, Finance, dsb.</p>
                <button onClick={() => setAddingTable(true)} className="btn-primary mt-4">
                  <Plus size={16} /> Buat Tabel Baru
                </button>
              </div>
            </div>
          )
        ) : (
          /* =========================================================================
             2. FITUR DOKUMEN (SOP, PROPOSAL, KONTRAK, DLL.)
             ========================================================================= */
          currentDocument ? (
            <DocumentDetailView
              document={currentDocument}
              onUpdate={(updates) => updateDocument(currentDocument.id, updates)}
              onDelete={() => deleteDocument(currentDocument.id)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-8">
                <p className="text-4xl mb-3">📄</p>
                <h3 className="font-bold text-gray-900 dark:text-white">Pilih atau Buat Dokumen Resmi</h3>
                <p className="text-xs text-gray-500 mt-1">Gunakan untuk SOP Operasional, Proposal Bisnis, Kontrak/NDA, dsb.</p>
                <button onClick={() => setAddingDoc(true)} className="btn-primary mt-4">
                  <Plus size={16} /> Buat Dokumen Baru
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};
