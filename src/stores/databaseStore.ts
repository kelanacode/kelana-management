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

const SAMPLE_TABLES: DatabaseTable[] = [
  {
    id: TABLE_CRM_ID,
    name: 'CRM Leads & Pipeline',
    emoji: '🎯',
    category: 'CRM',
    description: 'Pipeline penjualan, kontak prospek klien, dan status penawaran bisnis terintegrasi Google Sheets',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
    lastSyncedAt: new Date().toISOString(),
    fields: [
      { id: 'f1', name: 'Nama Prospek', type: 'text', width: 200 },
      { id: 'f2', name: 'Perusahaan', type: 'text', width: 160 },
      { id: 'f3', name: 'Email', type: 'email', width: 200 },
      { id: 'f4', name: 'Status Deal', type: 'select', width: 140, options: [
        { id: 'o1', label: 'Prospek Baru', color: '#6b7280' },
        { id: 'o2', label: 'Dihubungi', color: '#3b82f6' },
        { id: 'o3', label: 'Negosiasi Proposal', color: '#f59e0b' },
        { id: 'o4', label: 'Deal Menang', color: '#10b981' },
        { id: 'o5', label: 'Deal Kalah', color: '#ef4444' },
      ]},
      { id: 'f5', name: 'Nilai Deal (Rp)', type: 'number', width: 160 },
      { id: 'f6', name: 'Follow-up', type: 'date', width: 140 },
      { id: 'f7', name: 'Prioritas Tinggi', type: 'checkbox', width: 110 },
    ],
    rows: [
      { id: 'r1', tableId: TABLE_CRM_ID, cells: { f1: 'PT Maju Bersama', f2: 'Teknologi', f3: 'contact@majubersama.id', f4: 'o3', f5: 120000000, f6: '2026-11-05', f7: true }, createdAt: new Date().toISOString() },
      { id: 'r2', tableId: TABLE_CRM_ID, cells: { f1: 'Budi Prasetyo', f2: 'Startup Digital', f3: 'budi@startupdigital.co', f4: 'o2', f5: 25000000, f6: '2026-11-02', f7: true }, createdAt: new Date().toISOString() },
      { id: 'r3', tableId: TABLE_CRM_ID, cells: { f1: 'CV Karya Nusantara', f2: 'Manufaktur', f3: 'info@karyanusantara.com', f4: 'o1', f5: 75000000, f6: '2026-11-10', f7: false }, createdAt: new Date().toISOString() },
      { id: 'r4', tableId: TABLE_CRM_ID, cells: { f1: 'Siti Rahayu', f2: 'Pendidikan', f3: 'siti@educorp.id', f4: 'o4', f5: 35000000, f6: '2026-10-28', f7: false }, createdAt: new Date().toISOString() },
      { id: 'r5', tableId: TABLE_CRM_ID, cells: { f1: 'PT Global Solusi', f2: 'Konsultan', f3: 'hello@globalsolusi.id', f4: 'o1', f5: 80000000, f6: '2026-11-15', f7: true }, createdAt: new Date().toISOString() },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: TABLE_CONTENT_ID,
    name: 'Content Calendar Multi-Channel',
    emoji: '📅',
    category: 'Content',
    description: 'Jadwal publikasi konten promosi, edukasi, dan update fitur terintegrasi Google Sheets',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
    lastSyncedAt: new Date().toISOString(),
    fields: [
      { id: 'g1', name: 'Judul Konten', type: 'text', width: 250 },
      { id: 'g2', name: 'Platform', type: 'select', width: 130, options: [
        { id: 'p1', label: 'Instagram', color: '#e1306c' },
        { id: 'p2', label: 'Twitter/X', color: '#1da1f2' },
        { id: 'p3', label: 'LinkedIn', color: '#0077b5' },
        { id: 'p4', label: 'Blog Website', color: '#ff6719' },
      ]},
      { id: 'g3', name: 'Tanggal Publish', type: 'date', width: 150 },
      { id: 'g4', name: 'Status Konten', type: 'select', width: 130, options: [
        { id: 'q1', label: 'Ide / Draft', color: '#6b7280' },
        { id: 'q2', label: 'Dalam Review', color: '#f59e0b' },
        { id: 'q3', label: 'Terjadwal / Tayang', color: '#10b981' },
      ]},
      { id: 'g5', name: 'URL Tautan', type: 'url', width: 200 },
    ],
    rows: [
      { id: 's1', tableId: TABLE_CONTENT_ID, cells: { g1: '5 Tips Produktivitas Kerja All-in-One', g2: 'p1', g3: '2026-11-01', g4: 'q3', g5: 'https://blog.example.com/tips-remote' }, createdAt: new Date().toISOString() },
      { id: 's2', tableId: TABLE_CONTENT_ID, cells: { g1: 'Cara Efektif Menggunakan Kanban Board', g2: 'p4', g3: '2026-11-05', g4: 'q2', g5: '' }, createdAt: new Date().toISOString() },
      { id: 's3', tableId: TABLE_CONTENT_ID, cells: { g1: 'Ruang Kelana Database & Document Update', g2: 'p3', g3: '2026-11-08', g4: 'q1', g5: '' }, createdAt: new Date().toISOString() },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: TABLE_FINANCE_ID,
    name: 'Finance & Budget Keuangan Q4',
    emoji: '💰',
    category: 'Finance',
    description: 'Pencatatan kas operasional, invoice proyek, dan pengeluaran divisi terintegrasi Spreadsheet',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
    lastSyncedAt: new Date().toISOString(),
    fields: [
      { id: 'fn1', name: 'Uraian Transaksi', type: 'text', width: 220 },
      { id: 'fn2', name: 'Kategori Biaya', type: 'select', width: 150, options: [
        { id: 'c1', label: 'Pemasukan Proyek', color: '#10b981' },
        { id: 'c2', label: 'Operasional Kantor', color: '#3b82f6' },
        { id: 'c3', label: 'Marketing & Iklan', color: '#8b5cf6' },
        { id: 'c4', label: 'Payroll & Gaji', color: '#f59e0b' },
        { id: 'c5', label: 'Server & Cloud AWS', color: '#6366f1' },
      ]},
      { id: 'fn3', name: 'Arus Kas', type: 'select', width: 130, options: [
        { id: 't1', label: 'Pemasukan (+)', color: '#10b981' },
        { id: 't2', label: 'Pengeluaran (-)', color: '#ef4444' },
      ]},
      { id: 'fn4', name: 'Nominal (Rp)', type: 'number', width: 160 },
      { id: 'fn5', name: 'Tanggal Transaksi', type: 'date', width: 140 },
      { id: 'fn6', name: 'Terverifikasi', type: 'checkbox', width: 110 },
    ],
    rows: [
      { id: 'fnr1', tableId: TABLE_FINANCE_ID, cells: { fn1: 'Pembayaran DP Proyek PT Maju', fn2: 'c1', fn3: 't1', fn4: 50000000, fn5: '2026-10-25', fn6: true }, createdAt: new Date().toISOString() },
      { id: 'fnr2', tableId: TABLE_FINANCE_ID, cells: { fn1: 'Sewa Cloud Server & Database AWS', fn2: 'c5', fn3: 't2', fn4: 8500000, fn5: '2026-10-28', fn6: true }, createdAt: new Date().toISOString() },
      { id: 'fnr3', tableId: TABLE_FINANCE_ID, cells: { fn1: 'Campaign Google Ads & Meta Promosi', fn2: 'c3', fn3: 't2', fn4: 15000000, fn5: '2026-11-01', fn6: false }, createdAt: new Date().toISOString() },
      { id: 'fnr4', tableId: TABLE_FINANCE_ID, cells: { fn1: 'Pelunasan Lisensi Workspace Klien', fn2: 'c1', fn3: 't1', fn4: 75000000, fn5: '2026-11-02', fn6: true }, createdAt: new Date().toISOString() },
      { id: 'fnr5', tableId: TABLE_FINANCE_ID, cells: { fn1: 'Operasional Kantor & Konsumsi Tim', fn2: 'c2', fn3: 't2', fn4: 4200000, fn5: '2026-11-03', fn6: true }, createdAt: new Date().toISOString() },
    ],
    createdAt: new Date().toISOString(),
  },
];

const SAMPLE_DOCUMENTS: DatabaseDocument[] = [
  {
    id: 'doc-sop-1',
    title: 'SOP Onboarding & Orientasi Karyawan Baru',
    emoji: '📋',
    category: 'SOP',
    description: 'Standar Operasional Prosedur resmi penerimaan, penyambutan, dan integrasi karyawan baru di Ruang Kelana.',
    author: 'Dewi Lestari (Head of HR & People Ops)',
    department: 'People Operations',
    version: 'v2.1',
    status: 'Berlaku',
    gdocsUrl: 'https://docs.google.com/document/d/195j9eDD3ccL62en0wp_43_Mms-jVqL2t28C_k2e9g0/edit',
    lastSyncedAt: new Date().toISOString(),
    content: `<h1>STANDAR OPERASIONAL PROSEDUR (SOP)</h1>
<h2>ONBOARDING &amp; ORIENTASI ANGGOTA TIM BARU</h2>
<div class="callout-box"><strong>Nomor Dokumen:</strong> SOP-HR-004-RK | <strong>Status:</strong> Berlaku Resmi | <strong>Versi:</strong> 2.1 | <strong>Departemen:</strong> People Operations</div>

<h3>1. TUJUAN</h3>
<p>Memberikan panduan sistematis bagi divisi People Operations dan Lead Divisi dalam mengintegrasikan anggota tim baru ke lingkungan kerja Ruang Kelana secara lancar, produktif, dan sesuai budaya kolaboratif perusahaan.</p>

<h3>2. RUANG LINGKUP</h3>
<p>Berlaku untuk seluruh karyawan penuh waktu (full-time), paruh waktu (part-time), serta magang di seluruh divisi Ruang Kelana.</p>

<h3>3. PROSEDUR PELAKSANAAN</h3>
<table>
  <thead>
    <tr>
      <th>Tahapan</th>
      <th>Waktu Pelaksanaan</th>
      <th>Aktivitas Utama</th>
      <th>Penanggung Jawab (PIC)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Pra-Hari Pertama</strong></td>
      <td>H-3 Masuk Kerja</td>
      <td>Penyediaan akun email, akses platform Ruang Kelana, laptop dinas, dan pengiriman Welcome Kit.</td>
      <td>IT Support &amp; People Ops</td>
    </tr>
    <tr>
      <td><strong>Hari Pertama (Day 1)</strong></td>
      <td>09.00 - 15.00 WIB</td>
      <td>Sesi perkenalan tim, penandatanganan berkas administrasi, dan orientasi budaya kerja.</td>
      <td>People Ops Lead</td>
    </tr>
    <tr>
      <td><strong>Minggu Pertama (Week 1)</strong></td>
      <td>Hari ke-2 s/d ke-5</td>
      <td>Pengenalan proyek berjalan di Kanban Board, pendampingan Buddy, dan review basis data.</td>
      <td>Mentor / Team Lead</td>
    </tr>
    <tr>
      <td><strong>Evaluasi 30 Hari</strong></td>
      <td>Hari ke-30</td>
      <td>Sesi 1-on-1 feedback, evaluasi kenyamanan kerja, dan penetapan target kuartal (OKRs).</td>
      <td>Divisi Head</td>
    </tr>
  </tbody>
</table>

<h3>4. DOKUMEN PENDUKUNG</h3>
<ul>
  <li>Formulir Serah Terima Inventaris Kantor</li>
  <li>Surat Pernyataan Kerahasiaan Informasi (NDA)</li>
  <li>Buku Panduan Budaya Kerja Ruang Kelana</li>
</ul>`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'doc-prop-1',
    title: 'Proposal Kerjasama Sistem Enterprise PT Maju Bersama',
    emoji: '📑',
    category: 'Proposal',
    description: 'Proposal penawaran implementasi all-in-one workspace kustom untuk PT Maju Bersama periode 2026-2027.',
    author: 'Andi Wirawan (VP of Business Development)',
    department: 'Business Development',
    version: 'v1.0',
    status: 'Review',
    gdocsUrl: 'https://docs.google.com/document/d/195j9eDD3ccL62en0wp_43_Mms-jVqL2t28C_k2e9g0/edit',
    lastSyncedAt: new Date().toISOString(),
    content: `<h1>PROPOSAL PENAWARAN KERJASAMA</h1>
<h2>IMPLEMENTASI SISTEM WORKSPACE ENTERPRISE RUANG KELANA</h2>
<div class="callout-box"><strong>Klien:</strong> PT Maju Bersama | <strong>Nomor:</strong> PROP-BD-2026-089 | <strong>Estimasi Nilai:</strong> Rp 120.000.000</div>

<h3>1. LATAR BELAKANG</h3>
<p>PT Maju Bersama memerlukan sistem sentralisasi koordinasi proyek, pencatatan dokumen operasional, basis data inventaris, dan kalender kegiatan real-time yang mampu menghubungkan 150+ anggota tim secara terpadu tanpa fragmentasi tools.</p>

<h3>2. RUANG LINGKUP SOLUSI</h3>
<ul>
  <li><strong>Penyusunan Modul Catatan &amp; Editor Dokumen GDocs:</strong> Integrasi langsung dengan Word/Google Docs untuk penulisan SOP dan laporan divisi.</li>
  <li><strong>Manajemen Proyek Kanban:</strong> Papan visual tugas dengan workflow multi-tahap dan pengingat deadline.</li>
  <li><strong>Custom Database Engine:</strong> Penyusunan tabel data fleksibel dengan export-import Google Sheets.</li>
  <li><strong>Kalender Kegiatan Terintegrasi WIB:</strong> Notifikasi pop-up timer 15-60 menit sebelum agenda berlangsung.</li>
</ul>

<h3>3. ESTIMASI BIAYA &amp; TAHAPAN PEMBAYARAN</h3>
<table>
  <thead>
    <tr>
      <th>Komponen Pekerjaan</th>
      <th>Spesifikasi</th>
      <th>Jangka Waktu</th>
      <th>Biaya (IDR)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Lisensi Enterprise Ruang Kelana (1 Tahun)</td>
      <td>Unlimited Users, Dedicated Cloud, Auto-Backup</td>
      <td>12 Bulan</td>
      <td>Rp 75.000.000</td>
    </tr>
    <tr>
      <td>Kustomisasi Modul &amp; Database Migration</td>
      <td>Setup skema tabel, integrasi sheets &amp; GDocs</td>
      <td>3 Minggu</td>
      <td>Rp 30.000.000</td>
    </tr>
    <tr>
      <td>Pelatihan &amp; Pendampingan Tim (Training)</td>
      <td>4 Sesi Workshop + 24/7 Priority Support</td>
      <td>1 Bulan</td>
      <td>Rp 15.000.000</td>
    </tr>
  </tbody>
</table>`,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'doc-sop-2',
    title: 'SOP Keamanan Siber & Proteksi Data Pelanggan',
    emoji: '🔒',
    category: 'SOP',
    description: 'Protokol perlindungan data, kontrol hak akses server, dan penanganan insiden siber sesuai UU PDP.',
    author: 'Budi Santoso (Head of Engineering & Security)',
    department: 'IT & Infrastructure',
    version: 'v1.4',
    status: 'Berlaku',
    gdocsUrl: 'https://docs.google.com/document/d/195j9eDD3ccL62en0wp_43_Mms-jVqL2t28C_k2e9g0/edit',
    lastSyncedAt: new Date().toISOString(),
    content: `<h1>STANDAR OPERASIONAL PROSEDUR (SOP)</h1>
<h2>KEAMANAN SIBER &amp; PERLINDUNGAN DATA SENSITIF</h2>
<div class="callout-box"><strong>Kategori:</strong> Keamanan &amp; IT | <strong>Kepatuhan:</strong> ISO/IEC 27001 &amp; UU PDP 2022</div>

<h3>1. KEBIJAKAN OTENTIKASI &amp; HAK AKSES</h3>
<p>Semua personil wajib mengaktifkan autentikasi dua faktor (2FA) pada akun Ruang Kelana dan Google Workspace. Password minimal 12 karakter alfanumerik dan diperbarui tiap 90 hari.</p>

<h3>2. PENYIMPANAN &amp; ENKRIPSI DATA</h3>
<ul>
  <li>Data pelanggan pada modul Database wajib dienkripsi saat transit (TLS 1.3) dan saat diam (AES-256).</li>
  <li>Akses ekspor data ke Google Sheets hanya diberikan kepada level Manager ke atas.</li>
</ul>`,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'doc-kontrak-1',
    title: 'Draft Surat Perjanjian Kerahasiaan (NDA / Kontrak)',
    emoji: '📜',
    category: 'Kontrak',
    description: 'Format baku Non-Disclosure Agreement untuk vendor eksternal, klien, dan mitra strategis.',
    author: 'Citra Kirana, S.H. (Legal Counsel)',
    department: 'Legal & Compliance',
    version: 'v1.0',
    status: 'Draft',
    gdocsUrl: 'https://docs.google.com/document/d/195j9eDD3ccL62en0wp_43_Mms-jVqL2t28C_k2e9g0/edit',
    lastSyncedAt: new Date().toISOString(),
    content: `<h1>PERJANJIAN KERAHASIAAN INFORMASI</h1>
<h2>(NON-DISCLOSURE AGREEMENT - NDA)</h2>
<p>Perjanjian Kerahasiaan Informasi ini dibuat antara Ruang Kelana Solusi Digital dengan PIHAK KEDUA sebagai penerima informasi rahasia.</p>

<h3>PASAL 1: DEFINISI INFORMASI RAHASIA</h3>
<p>Informasi Rahasia mencakup segala data teknis, formula, kode sumber, data prospek CRM, rancangan proposal, dan informasi keuangan yang diserahkan dalam bentuk tertulis, lisan, maupun elektronik.</p>

<h3>PASAL 2: KEWAJIBAN MENJAGA KERAHASIAAN</h3>
<p>Pihak Penerima berjanji untuk tidak menyalin, mendistribusikan, atau membocorkan Informasi Rahasia kepada pihak ketiga tanpa persetujuan tertulis sebelumnya.</p>`,
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    updatedAt: new Date(Date.now() - 259200000).toISOString(),
  },
];

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
      name: 'ruang-kelana-database-v2',
    }
  )
);
