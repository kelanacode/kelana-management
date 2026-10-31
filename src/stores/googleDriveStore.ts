import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DriveItem, GoogleDriveConfig } from '../types/drive';

interface GoogleDriveStore {
  config: GoogleDriveConfig;
  items: DriveItem[];
  searchQuery: string;
  selectedFilter: 'all' | 'folders' | 'documents' | 'spreadsheets' | 'pdf' | 'starred';

  // Actions
  setConnected: (connected: boolean, email?: string, folderUrl?: string) => void;
  updateConfig: (patch: Partial<GoogleDriveConfig>) => void;
  addItem: (item: Omit<DriveItem, 'id' | 'updatedAt'>) => void;
  deleteItem: (id: string) => void;
  toggleStar: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setSelectedFilter: (filter: 'all' | 'folders' | 'documents' | 'spreadsheets' | 'pdf' | 'starred') => void;
  uploadMockFile: (fileName: string, mimeType: DriveItem['mimeType'], size: string, author: string, division?: string) => void;
  syncNoteToDrive: (title: string, author: string, division?: string) => void;
}

const INITIAL_ITEMS: DriveItem[] = [
  {
    id: 'gdrive-folder-1',
    name: 'Dokumen SOP & Panduan Kerja Kelana',
    type: 'folder',
    mimeType: 'folder',
    updatedAt: new Date(Date.now() - 3600000 * 24 * 2).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    url: 'https://drive.google.com/drive/folders/1Kelana-SOP-Dokumen-Resmi',
    author: 'Admin Kantor Kelana',
    division: 'Operasional & HR',
    isStarred: true,
  },
  {
    id: 'gdrive-folder-2',
    name: 'Template Desain & Brand Identity Ruang Kelana',
    type: 'folder',
    mimeType: 'folder',
    updatedAt: new Date(Date.now() - 3600000 * 24 * 5).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    url: 'https://drive.google.com/drive/folders/1Kelana-BrandAssets-2026',
    author: 'Tim Kreatif & Desain',
    division: 'Produk & Desain',
    isStarred: false,
  },
  {
    id: 'gdrive-folder-3',
    name: 'Laporan Keuangan & Penggajian (Payroll)',
    type: 'folder',
    mimeType: 'folder',
    updatedAt: new Date(Date.now() - 3600000 * 24 * 1).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    url: 'https://drive.google.com/drive/folders/1Kelana-Payroll-Financial',
    author: 'Finance & Accounting',
    division: 'Keuangan & Legal',
    isStarred: true,
  },
  {
    id: 'gdrive-file-1',
    name: 'Company Profile & Proposal Kerjasama 2026.pdf',
    type: 'file',
    mimeType: 'pdf',
    size: '4.8 MB',
    updatedAt: new Date(Date.now() - 3600000 * 12).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    url: 'https://drive.google.com/file/d/1Kelana-Proposal-2026/view',
    author: 'Admin Kantor Kelana',
    division: 'Pemasaran & Bisnis',
    isStarred: true,
  },
  {
    id: 'gdrive-file-2',
    name: 'Database Kontak Vendor & Klien Aktif.xlsx',
    type: 'file',
    mimeType: 'spreadsheet',
    size: '1.2 MB',
    updatedAt: new Date(Date.now() - 3600000 * 48).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    url: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
    author: 'Operasional & Procurement',
    division: 'Operasional & HR',
    isStarred: false,
  },
  {
    id: 'gdrive-file-3',
    name: 'Notulensi Rapat Evaluasi Q1 2026.gdoc',
    type: 'file',
    mimeType: 'document',
    size: '340 KB',
    updatedAt: new Date(Date.now() - 3600000 * 6).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    url: 'https://docs.google.com/document/d/195j9eDD3ccL62en0wp_43_Mms-jVqL2t28C_k2e9g0/edit',
    author: 'Andi Wirawan',
    division: 'Teknologi & IT',
    isStarred: false,
  },
];

export const useGoogleDriveStore = create<GoogleDriveStore>()(
  persist(
    (set, get) => ({
      config: {
        isConnected: true,
        userEmail: 'kelana.corporate@gmail.com',
        connectedAt: new Date().toISOString(),
        defaultFolderUrl: 'https://drive.google.com/drive/u/0/my-drive',
        autoBackupNotes: true,
        autoBackupSalarySlips: true,
        sharedWorkspaceFolder: 'https://drive.google.com/drive/folders/1RuangKelana-Workspace',
      },
      items: INITIAL_ITEMS,
      searchQuery: '',
      selectedFilter: 'all',

      setConnected: (connected, email, folderUrl) => {
        set((state) => ({
          config: {
            ...state.config,
            isConnected: connected,
            userEmail: email || state.config.userEmail,
            connectedAt: connected ? new Date().toISOString() : undefined,
            defaultFolderUrl: folderUrl || state.config.defaultFolderUrl,
          },
        }));
      },

      updateConfig: (patch) => {
        set((state) => ({
          config: {
            ...state.config,
            ...patch,
          },
        }));
      },

      addItem: (item) => {
        const newItem: DriveItem = {
          ...item,
          id: `gdrive-item-${Date.now()}`,
          updatedAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        };
        set((state) => ({
          items: [newItem, ...state.items],
        }));
      },

      deleteItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      toggleStar: (id) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, isStarred: !item.isStarred } : item
          ),
        }));
      },

      setSearchQuery: (query) => set({ searchQuery: query }),
      setSelectedFilter: (filter) => set({ selectedFilter: filter }),

      uploadMockFile: (fileName, mimeType, size, author, division) => {
        const newItem: DriveItem = {
          id: `gdrive-upload-${Date.now()}`,
          name: fileName,
          type: 'file',
          mimeType: mimeType,
          size: size,
          updatedAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          url: 'https://drive.google.com/drive/my-drive',
          author: author,
          division: division || 'Umum',
          isStarred: false,
        };
        set((state) => ({
          items: [newItem, ...state.items],
        }));
      },

      syncNoteToDrive: (title, author, division) => {
        const docName = `${title}.gdoc`;
        const existing = get().items.find((i) => i.name === docName);
        if (existing) {
          set((state) => ({
            items: state.items.map((i) =>
              i.id === existing.id
                ? { ...i, updatedAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }
                : i
            ),
          }));
        } else {
          get().uploadMockFile(docName, 'document', '120 KB', author, division);
        }
      },
    }),
    {
      name: 'ruang-kelana-gdrive-storage',
    }
  )
);
