// ===================== NOTES =====================
export interface NoteComment {
  id: string;
  selectedText?: string;
  content: string;
  author: string;
  authorAvatar: string;
  createdAt: string;
  resolved?: boolean;
}

export type NoteShareScope = 'all' | 'division' | 'specific_users';

export interface NoteReadRecord {
  userId: string;
  readAt: string; // ISO timestamp waktu dibaca pertama kali
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  comments?: NoteComment[];
  paperSize?: 'A4' | 'F4';
  createdAt: string;
  updatedAt: string;
  emoji?: string;

  // Hak Akses & Target Penerima Catatan:
  // - 'all': Semua Orang (Seluruh Karyawan Kantor Kelana)
  // - 'division': Divisi Tertentu (Hanya divisi yang dipilih)
  // - 'specific_users': Orang Tertentu (Hanya karyawan yang dipilih / personal)
  authorId?: string;
  authorName?: string;
  authorDivision?: string;
  shareScope?: NoteShareScope;
  targetDivisions?: string[];
  targetUserIds?: string[];
  targetUserNames?: string[];

  // Pelacakan Status Dibaca & Kedaluwarsa Otomatis 2x24 Jam (48 Jam)
  readRecords?: NoteReadRecord[];

  // Sticky Note Properties
  color?: string; // Warna pastel sticky note (kuning, hijau, biru, pink, ungu, oranye)
  isPinned?: boolean;
}

// ===================== BOARD / KANBAN =====================
export type Priority = 'low' | 'medium' | 'high';

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Comment {
  id: string;
  author: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  columnId: string;
  boardId: string;
  assignees: string[];
  labels: Label[];
  deadline?: string;
  priority: Priority;
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
  order: number;
}

export interface Column {
  id: string;
  title: string;
  boardId: string;
  color: string;
  order: number;
}

export interface Board {
  id: string;
  title: string;
  description: string;
  emoji: string;
  createdAt: string;
  updatedAt: string;
}

// ===================== DATABASE =====================
export type FieldType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'url' | 'email';

export interface SelectOption {
  id: string;
  label: string;
  color: string;
}

export interface DatabaseField {
  id: string;
  name: string;
  type: FieldType;
  options?: SelectOption[];
  width?: number;
}

export interface DatabaseRow {
  id: string;
  tableId: string;
  cells: Record<string, any>;
  createdAt: string;
}

export type TableCategory = 'CRM' | 'Content' | 'Finance' | 'Inventory' | 'HR' | 'Lainnya';

export interface DatabaseTable {
  id: string;
  name: string;
  emoji: string;
  category?: TableCategory;
  description?: string;
  fields: DatabaseField[];
  rows: DatabaseRow[];
  spreadsheetUrl?: string;
  gdocsUrl?: string;
  lastSyncedAt?: string;
  createdAt: string;
}

export type DocumentCategory = 'SOP' | 'Proposal' | 'Kontrak' | 'Laporan' | 'Kebijakan' | 'Lainnya';

export interface DatabaseDocument {
  id: string;
  title: string;
  emoji: string;
  category: DocumentCategory;
  description?: string;
  content: string;
  author: string;
  department: string;
  version: string;
  status: 'Draft' | 'Review' | 'Disetujui' | 'Berlaku' | 'Arsip';
  paperSize?: 'A4' | 'F4';
  comments?: NoteComment[];
  gdocsUrl?: string;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ===================== WIKI =====================
export interface WikiPage {
  id: string;
  title: string;
  content: string;
  emoji: string;
  parentId?: string;
  children: string[];
  paperSize?: 'A4' | 'F4';
  comments?: NoteComment[];
  createdAt: string;
  updatedAt: string;
}

// ===================== TEAM =====================
export interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  color: string;
  online: boolean;
}

export interface Activity {
  id: string;
  memberId: string;
  action: string;
  target: string;
  timestamp: string;
}

// ===================== CALENDAR =====================
export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'task' | 'event' | 'deadline';
  color: string;
  boardId?: string;
  cardId?: string;
}

// ===================== PENGINGAT & PERISTIWA (EVENT REMINDERS) =====================
export type Division =
  | 'Semua Divisi'
  | 'Teknologi & IT'
  | 'Produk & Desain'
  | 'Pemasaran & Bisnis'
  | 'Marketing'
  | 'Operasional & HR'
  | 'Keuangan & Legal';

export interface EventReminder {
  id: string;
  title: string; // 1. Judul kegiatan/acara
  date: string; // Format YYYY-MM-DD
  isAllDay: boolean; // 2. Satu hari penuh
  startTime: string; // 2. Jam mulai (HH:mm) WIB
  endTime: string; // 2. Jam selesai (HH:mm) WIB
  location: string; // 3. Lokasi acara
  reminderMinutes: number; // Pengingat popup sebelum acara (menit: 5, 10, 15, ..., 60 atau bebas)
  notes: string; // 4. Catatan mengenai acara/kegiatan
  attachmentUrl?: string; // 5. Lampiran: berupa link jika diperlukan
  division: Division; // 6. Untuk divisi mana kegiatannya
  dismissed?: boolean;
  snoozedUntil?: string;
  createdAt: string;
  updatedAt: string;
}

// ===================== GLOBAL =====================
export interface AppSettings {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  currentUser: Member;
}
