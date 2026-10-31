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

const INITIAL_ITEMS: DriveItem[] = [];

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
      name: 'ruang-kelana-gdrive-storage-clean',
    }
  )
);
