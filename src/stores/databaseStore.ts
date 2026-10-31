import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DatabaseTable, DatabaseField, DatabaseRow,
  DatabaseDocument, TableCategory, DocumentCategory, NoteComment
} from '../types';

const generateId = () => Math.random().toString(36).substring(2, 9);

interface DatabaseStore {
  // Active feature mode: 'tables' (CRM, Kalender, Finance) or 'documents' (SOP, Proposal, Kontrak)
  activeMode: 'tables' | 'documents';
  setActiveMode: (mode: 'tables' | 'documents') => void;

  // TABEL (Spreadsheet Database)
  tables: DatabaseTable[];
  selectedTableId: string | null;
  addTable: (name: string, category?: TableCategory, spreadsheetUrl?: string) => DatabaseTable;
  updateTable: (id: string, updates: Partial<DatabaseTable>) => void;
  deleteTable: (id: string) => void;
  selectTable: (id: string) => void;
  addField: (tableId: string, field: Omit<DatabaseField, 'id'>) => void;
  updateField: (tableId: string, fieldId: string, updates: Partial<DatabaseField>) => void;
  deleteField: (tableId: string, fieldId: string) => void;
  addRow: (tableId: string) => void;
  updateCell: (tableId: string, rowId: string, fieldId: string, value: any) => void;
  deleteRow: (tableId: string, rowId: string) => void;

  // DOKUMEN (GDocs Database: SOP, Proposal, etc.)
  documents: DatabaseDocument[];
  selectedDocumentId: string | null;
  addDocument: (title: string, category?: DocumentCategory, gdocsUrl?: string) => DatabaseDocument;
  updateDocument: (id: string, updates: Partial<DatabaseDocument>) => void;
  deleteDocument: (id: string) => void;
  selectDocument: (id: string) => void;
  addCommentToDocument: (documentId: string, text: string, quotedText?: string) => void;
  resolveComment: (documentId: string, commentId: string) => void;
  deleteComment: (documentId: string, commentId: string) => void;
}

const TABLE_CRM_ID = 'table-crm';
const TABLE_CONTENT_ID = 'table-content';
const TABLE_FINANCE_ID = 'table-finance';

const SAMPLE_TABLES: DatabaseTable[] = [];

const SAMPLE_DOCUMENTS: DatabaseDocument[] = [];

export const useDatabaseStore = create<DatabaseStore>()(
  persist(
    (set, get) => ({
      activeMode: 'tables',
      setActiveMode: (mode) => set({ activeMode: mode }),

      // TABLES (Spreadsheet)
      tables: SAMPLE_TABLES,
      selectedTableId: TABLE_CRM_ID,

      addTable: (name, category = 'CRM', spreadsheetUrl) => {
        const table: DatabaseTable = {
          id: generateId(),
          name,
          emoji: category === 'CRM' ? '🎯' : category === 'Content' ? '📅' : category === 'Finance' ? '💰' : '📊',
          category,
          fields: [
            { id: generateId(), name: 'Nama', type: 'text', width: 200 },
            { id: generateId(), name: 'Keterangan', type: 'text', width: 240 },
            { id: generateId(), name: 'Tanggal', type: 'date', width: 140 },
          ],
          rows: [],
          spreadsheetUrl: spreadsheetUrl || 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
          lastSyncedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ tables: [...state.tables, table], selectedTableId: table.id }));
        return table;
      },

      updateTable: (id, updates) =>
        set((state) => ({ tables: state.tables.map((t) => (t.id === id ? { ...t, ...updates } : t)) })),

      deleteTable: (id) => {
        const { tables } = get();
        const remaining = tables.filter((t) => t.id !== id);
        set({ tables: remaining, selectedTableId: remaining[0]?.id ?? null });
      },

      selectTable: (id) => set({ selectedTableId: id }),

      addField: (tableId, field) => {
        const newField: DatabaseField = { id: generateId(), ...field };
        set((state) => ({
          tables: state.tables.map((t) =>
            t.id === tableId ? { ...t, fields: [...t.fields, newField] } : t
          ),
        }));
      },

      updateField: (tableId, fieldId, updates) =>
        set((state) => ({
          tables: state.tables.map((t) =>
            t.id === tableId
              ? { ...t, fields: t.fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)) }
              : t
          ),
        })),

      deleteField: (tableId, fieldId) =>
        set((state) => ({
          tables: state.tables.map((t) =>
            t.id === tableId ? { ...t, fields: t.fields.filter((f) => f.id !== fieldId) } : t
          ),
        })),

      addRow: (tableId) => {
        const row: DatabaseRow = {
          id: generateId(),
          tableId,
          cells: {},
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          tables: state.tables.map((t) =>
            t.id === tableId ? { ...t, rows: [...t.rows, row] } : t
          ),
        }));
      },

      updateCell: (tableId, rowId, fieldId, value) =>
        set((state) => ({
          tables: state.tables.map((t) =>
            t.id === tableId
              ? {
                  ...t,
                  rows: t.rows.map((r) =>
                    r.id === rowId ? { ...r, cells: { ...r.cells, [fieldId]: value } } : r
                  ),
                }
              : t
          ),
        })),

      deleteRow: (tableId, rowId) =>
        set((state) => ({
          tables: state.tables.map((t) =>
            t.id === tableId ? { ...t, rows: t.rows.filter((r) => r.id !== rowId) } : t
          ),
        })),

      // DOCUMENTS (GDocs Database: SOP, Proposal, Kontrak)
      documents: SAMPLE_DOCUMENTS,
      selectedDocumentId: 'doc-sop-1',

      addDocument: (title, category = 'SOP', gdocsUrl) => {
        const doc: DatabaseDocument = {
          id: generateId(),
          title,
          emoji: category === 'SOP' ? '📋' : category === 'Proposal' ? '📑' : category === 'Kontrak' ? '📜' : '📄',
          category,
          author: 'Admin Ruang Kelana',
          department: 'Operasional',
          version: 'v1.0',
          status: 'Draft',
          gdocsUrl: gdocsUrl || 'https://docs.google.com/document/d/195j9eDD3ccL62en0wp_43_Mms-jVqL2t28C_k2e9g0/edit',
          lastSyncedAt: new Date().toISOString(),
          content: `<h1>${title.toUpperCase()}</h1><p>Draf dokumen resmi ${category} Ruang Kelana.</p><h3>1. TUJUAN</h3><p>Tuliskan tujuan dokumen...</p>`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ documents: [doc, ...state.documents], selectedDocumentId: doc.id }));
        return doc;
      },

      updateDocument: (id, updates) =>
        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
          ),
        })),

      deleteDocument: (id) => {
        const { documents } = get();
        const remaining = documents.filter((d) => d.id !== id);
        set({ documents: remaining, selectedDocumentId: remaining[0]?.id ?? null });
      },

      selectDocument: (id) => set({ selectedDocumentId: id }),

      addCommentToDocument: (documentId, text, quotedText) => {
        const newComment: NoteComment = {
          id: generateId(),
          content: text,
          selectedText: quotedText,
          author: 'Anda (Pengguna)',
          authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
          createdAt: new Date().toISOString(),
          resolved: false,
        };
        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === documentId
              ? { ...d, comments: [...(d.comments || []), newComment] }
              : d
          ),
        }));
      },

      resolveComment: (documentId, commentId) => {
        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === documentId
              ? {
                  ...d,
                  comments: (d.comments || []).map((c) =>
                    c.id === commentId ? { ...c, resolved: !c.resolved } : c
                  ),
                }
              : d
          ),
        }));
      },

      deleteComment: (documentId, commentId) => {
        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === documentId
              ? {
                  ...d,
                  comments: (d.comments || []).filter((c) => c.id !== commentId),
                }
              : d
          ),
        }));
      },
    }),
    {
      name: 'ruang-kelana-database-v2-clean',
    }
  )
);
