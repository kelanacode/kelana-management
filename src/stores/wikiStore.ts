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

const SAMPLE_PAGES: WikiPage[] = [
  {
    id: 'wiki-1',
    title: 'Panduan Perusahaan',
    content: '<h1>📖 Panduan Perusahaan</h1><p>Selamat datang di Wiki perusahaan. Halaman ini berisi semua informasi yang Anda butuhkan untuk memulai dan bekerja efektif bersama tim kami.</p><h2>Visi & Misi</h2><p><strong>Visi:</strong> Menjadi platform produktivitas terdepan di Asia Tenggara.</p><p><strong>Misi:</strong> Membantu individu dan tim bekerja lebih cerdas, bukan lebih keras, melalui teknologi yang intuitif.</p><h2>Nilai-Nilai Inti</h2><ul><li>🤝 <strong>Kolaborasi</strong> - Kami percaya pada kekuatan kerja tim</li><li>💡 <strong>Inovasi</strong> - Selalu mencari cara yang lebih baik</li><li>🎯 <strong>Fokus</strong> - Mengutamakan hasil yang bermakna</li><li>🌱 <strong>Pertumbuhan</strong> - Belajar dan berkembang bersama</li></ul>',
    emoji: '📖',
    children: ['wiki-2', 'wiki-3'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'wiki-2',
    title: 'Onboarding Karyawan Baru',
    content: '<h1>👋 Onboarding Karyawan Baru</h1><h2>Checklist Hari Pertama</h2><ul><li>☑ Setup akun email perusahaan</li><li>☑ Join channel Slack tim</li><li>☑ Baca panduan budaya kerja</li><li>☑ Perkenalkan diri di channel #general</li><li>☑ Setup Ruang Kelana workspace</li></ul><h2>Tools yang Digunakan</h2><p>Tim kami menggunakan stack tools berikut:</p><ul><li><strong>Ruang Kelana</strong> - Project management & dokumentasi</li><li><strong>Slack</strong> - Komunikasi tim</li><li><strong>Google Workspace</strong> - Email, docs, calendar</li><li><strong>Figma</strong> - Desain & prototyping</li></ul><h2>Kontak Penting</h2><p>Jika ada pertanyaan, hubungi HR di <strong>hr@ruangkelana.id</strong></p>',
    emoji: '👋',
    parentId: 'wiki-1',
    children: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'wiki-3',
    title: 'Kebijakan Kerja Remote',
    content: '<h1>🏠 Kebijakan Kerja Remote</h1><h2>Jam Kerja</h2><p>Tim kami bekerja secara fleksibel namun kami menetapkan <strong>core hours</strong> antara <strong>10:00 - 16:00 WIB</strong> dimana semua anggota tim diharapkan dapat dihubungi.</p><h2>Komunikasi</h2><ul><li>Respons pesan Slack dalam <strong>2 jam</strong> pada jam kerja</li><li>Update status di Slack (available/away/DND)</li><li>Gunakan async-first communication</li></ul><h2>Meeting</h2><ul><li>Stand-up harian: Senin-Jumat pukul 09:30 WIB (15 menit)</li><li>Sprint review: Setiap 2 minggu, Jumat sore</li><li>1-on-1 dengan manager: Mingguan, dijadwalkan masing-masing</li></ul>',
    emoji: '🏠',
    parentId: 'wiki-1',
    children: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'wiki-4',
    title: 'Dokumentasi Teknis',
    content: '<h1>⚙️ Dokumentasi Teknis</h1><h2>Arsitektur Sistem</h2><p>Ruang Kelana dibangun dengan arsitektur modern yang skalabel:</p><ul><li><strong>Frontend:</strong> React 18 + TypeScript + Vite</li><li><strong>State Management:</strong> Zustand</li><li><strong>Styling:</strong> Tailwind CSS</li><li><strong>Editor:</strong> TipTap (ProseMirror)</li><li><strong>DnD:</strong> @dnd-kit</li></ul><h2>Konvensi Kode</h2><ul><li>Gunakan TypeScript strict mode</li><li>Komponen dalam PascalCase</li><li>Hook dalam camelCase dengan prefix "use"</li><li>File types di src/types/index.ts</li></ul><h2>Deployment</h2><p>Branch <code>main</code> otomatis di-deploy ke production via CI/CD pipeline.</p>',
    emoji: '⚙️',
    children: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

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
    { name: 'ruang-kelana-wiki' }
  )
);
