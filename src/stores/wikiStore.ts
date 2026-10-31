import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WikiPage, NoteComment } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 9);

interface WikiStore {
  pages: WikiPage[];
  selectedPageId: string | null;
  selectPage: (id: string) => void;
  addPage: (title: string, parentId?: string) => WikiPage;
  updatePage: (id: string, updates: Partial<WikiPage>) => void;
  deletePage: (id: string) => void;
  addCommentToPage: (pageId: string, content: string, selectedText?: string, author?: string, authorAvatar?: string) => void;
  resolveComment: (pageId: string, commentId: string) => void;
  deleteComment: (pageId: string, commentId: string) => void;
}

const SAMPLE_PAGES: WikiPage[] = [];

export const useWikiStore = create<WikiStore>()(
  persist(
    (set, get) => ({
      pages: SAMPLE_PAGES,
      selectedPageId: 'wiki-1',

      selectPage: (id) => set({ selectedPageId: id }),

      addPage: (title, parentId) => {
        const page: WikiPage = {
          id: generateId(),
          title,
          content: `<h1>${title}</h1><p>Mulai menulis halaman wiki Anda di sini...</p>`,
          emoji: '📄',
          parentId,
          children: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => {
          const pages = [...state.pages, page];
          if (parentId) {
            return {
              pages: pages.map((p) =>
                p.id === parentId ? { ...p, children: [...p.children, page.id] } : p
              ),
              selectedPageId: page.id,
            };
          }
          return { pages, selectedPageId: page.id };
        });
        return page;
      },

      updatePage: (id, updates) =>
        set((state) => ({
          pages: state.pages.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
        })),

      deletePage: (id) => {
        const { pages, selectedPageId } = get();
        const page = pages.find((p) => p.id === id);
        const remaining = pages.filter((p) => p.id !== id && !page?.children.includes(p.id));
        set({
          pages: remaining.map((p) =>
            p.id === page?.parentId ? { ...p, children: p.children.filter((c) => c !== id) } : p
          ),
          selectedPageId: selectedPageId === id ? (remaining[0]?.id ?? null) : selectedPageId,
        });
      },

      addCommentToPage: (pageId, content, selectedText, author = 'Pengguna Aktif', authorAvatar = 'PA') => {
        const comment: NoteComment = {
          id: generateId(),
          content,
          selectedText,
          author,
          authorAvatar,
          createdAt: new Date().toISOString(),
          resolved: false,
        };
        set((state) => ({
          pages: state.pages.map((p) =>
            p.id === pageId ? { ...p, comments: [...(p.comments || []), comment] } : p
          ),
        }));
      },

      resolveComment: (pageId, commentId) => {
        set((state) => ({
          pages: state.pages.map((p) =>
            p.id === pageId
              ? {
                  ...p,
                  comments: (p.comments || []).map((c) =>
                    c.id === commentId ? { ...c, resolved: !c.resolved } : c
                  ),
                }
              : p
          ),
        }));
      },

      deleteComment: (pageId, commentId) => {
        set((state) => ({
          pages: state.pages.map((p) =>
            p.id === pageId
              ? { ...p, comments: (p.comments || []).filter((c) => c.id !== commentId) }
              : p
          ),
        }));
      },
    }),
    { name: 'ruang-kelana-wiki-clean' }
  )
);
