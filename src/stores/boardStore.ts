import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Board, Column, Card, Comment } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 9);

interface BoardStore {
  boards: Board[];
  columns: Column[];
  cards: Card[];
  selectedBoardId: string | null;
  addBoard: (title: string, description?: string) => Board;
  updateBoard: (id: string, updates: Partial<Board>) => void;
  deleteBoard: (id: string) => void;
  selectBoard: (id: string) => void;
  addColumn: (boardId: string, title: string, color?: string) => Column;
  updateColumn: (id: string, updates: Partial<Column>) => void;
  deleteColumn: (id: string) => void;
  addCard: (columnId: string, boardId: string, title: string) => Card;
  updateCard: (id: string, updates: Partial<Card>) => void;
  deleteCard: (id: string) => void;
  moveCard: (cardId: string, newColumnId: string, newOrder: number) => void;
  addComment: (cardId: string, content: string, author: string, authorAvatar: string) => void;
}

const BOARD_ID = 'board-1';

const SAMPLE_BOARDS: Board[] = [
  {
    id: BOARD_ID,
    title: 'Website Redesign',
    description: 'Proyek redesign website perusahaan Q4 2026',
    emoji: '🎨',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'board-2',
    title: 'Mobile App Development',
    description: 'Pengembangan aplikasi mobile Ruang Kelana',
    emoji: '📱',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SAMPLE_COLUMNS: Column[] = [
  { id: 'col-1', title: 'To Do', boardId: BOARD_ID, color: '#6b7280', order: 0 },
  { id: 'col-2', title: 'In Progress', boardId: BOARD_ID, color: '#2563eb', order: 1 },
  { id: 'col-3', title: 'Review', boardId: BOARD_ID, color: '#d97706', order: 2 },
  { id: 'col-4', title: 'Done', boardId: BOARD_ID, color: '#10b981', order: 3 },
  { id: 'col-5', title: 'To Do', boardId: 'board-2', color: '#6b7280', order: 0 },
  { id: 'col-6', title: 'In Progress', boardId: 'board-2', color: '#2563eb', order: 1 },
  { id: 'col-7', title: 'Done', boardId: 'board-2', color: '#10b981', order: 2 },
];

const SAMPLE_CARDS: Card[] = [
  {
    id: 'card-1',
    title: 'Riset dan analisis kompetitor',
    description: 'Lakukan riset mendalam terhadap 5 kompetitor utama untuk menemukan peluang desain.',
    columnId: 'col-4',
    boardId: BOARD_ID,
    assignees: ['member-1'],
    labels: [{ id: 'l1', name: 'Riset', color: '#8b5cf6' }],
    deadline: new Date(Date.now() - 5 * 86400000).toISOString(),
    priority: 'high',
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: 0,
  },
  {
    id: 'card-2',
    title: 'Desain wireframe halaman utama',
    description: 'Buat wireframe lo-fi untuk homepage, about, dan contact page.',
    columnId: 'col-4',
    boardId: BOARD_ID,
    assignees: ['member-2'],
    labels: [{ id: 'l2', name: 'Desain', color: '#f59e0b' }],
    deadline: new Date(Date.now() - 2 * 86400000).toISOString(),
    priority: 'high',
    comments: [
      {
        id: 'c1',
        author: 'Budi Santoso',
        authorAvatar: 'BS',
        content: 'Wireframe sudah diapprove oleh stakeholder!',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: 1,
  },
  {
    id: 'card-3',
    title: 'Implementasi design system',
    description: 'Setup komponen dasar: button, input, card, modal, navbar sesuai brand guidelines.',
    columnId: 'col-2',
    boardId: BOARD_ID,
    assignees: ['member-1', 'member-3'],
    labels: [{ id: 'l3', name: 'Frontend', color: '#3b82f6' }],
    deadline: new Date(Date.now() + 3 * 86400000).toISOString(),
    priority: 'high',
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: 0,
  },
  {
    id: 'card-4',
    title: 'Optimasi performa & SEO',
    description: 'Audit Lighthouse, optimalkan Core Web Vitals, tambahkan meta tags dan schema markup.',
    columnId: 'col-2',
    boardId: BOARD_ID,
    assignees: ['member-2'],
    labels: [{ id: 'l4', name: 'SEO', color: '#10b981' }],
    deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
    priority: 'medium',
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: 1,
  },
  {
    id: 'card-5',
    title: 'Review konten dan copywriting',
    description: 'Revisi semua teks halaman agar sesuai tone of voice brand yang baru.',
    columnId: 'col-3',
    boardId: BOARD_ID,
    assignees: ['member-3'],
    labels: [{ id: 'l5', name: 'Konten', color: '#ec4899' }],
    deadline: new Date(Date.now() + 2 * 86400000).toISOString(),
    priority: 'medium',
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: 0,
  },
  {
    id: 'card-6',
    title: 'Setup hosting dan deployment',
    description: 'Konfigurasi server, CI/CD pipeline, dan domain baru untuk produksi.',
    columnId: 'col-1',
    boardId: BOARD_ID,
    assignees: ['member-1'],
    labels: [{ id: 'l6', name: 'DevOps', color: '#f97316' }],
    deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
    priority: 'low',
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: 0,
  },
  {
    id: 'card-7',
    title: 'Testing lintas browser',
    description: 'Test di Chrome, Firefox, Safari, dan Edge. Pastikan kompatibel di mobile.',
    columnId: 'col-1',
    boardId: BOARD_ID,
    assignees: ['member-2', 'member-3'],
    labels: [{ id: 'l7', name: 'QA', color: '#14b8a6' }],
    deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
    priority: 'medium',
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: 1,
  },
];

export const useBoardStore = create<BoardStore>()(
  persist(
    (set, get) => ({
      boards: SAMPLE_BOARDS,
      columns: SAMPLE_COLUMNS,
      cards: SAMPLE_CARDS,
      selectedBoardId: BOARD_ID,

      addBoard: (title, description = '') => {
        const board: Board = {
          id: generateId(),
          title,
          description,
          emoji: '📋',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const defaultCols: Column[] = [
          { id: generateId(), title: 'To Do', boardId: board.id, color: '#6b7280', order: 0 },
          { id: generateId(), title: 'In Progress', boardId: board.id, color: '#2563eb', order: 1 },
          { id: generateId(), title: 'Done', boardId: board.id, color: '#10b981', order: 2 },
        ];
        set((state) => ({
          boards: [...state.boards, board],
          columns: [...state.columns, ...defaultCols],
          selectedBoardId: board.id,
        }));
        return board;
      },

      updateBoard: (id, updates) =>
        set((state) => ({
          boards: state.boards.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        })),

      deleteBoard: (id) => {
        const { boards, columns, cards } = get();
        const colIds = columns.filter((c) => c.boardId === id).map((c) => c.id);
        set({
          boards: boards.filter((b) => b.id !== id),
          columns: columns.filter((c) => c.boardId !== id),
          cards: cards.filter((c) => !colIds.includes(c.columnId)),
          selectedBoardId: boards.filter((b) => b.id !== id)[0]?.id ?? null,
        });
      },

      selectBoard: (id) => set({ selectedBoardId: id }),

      addColumn: (boardId, title, color = '#6b7280') => {
        const { columns } = get();
        const boardCols = columns.filter((c) => c.boardId === boardId);
        const col: Column = {
          id: generateId(),
          title,
          boardId,
          color,
          order: boardCols.length,
        };
        set((state) => ({ columns: [...state.columns, col] }));
        return col;
      },

      updateColumn: (id, updates) =>
        set((state) => ({
          columns: state.columns.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      deleteColumn: (id) => {
        set((state) => ({
          columns: state.columns.filter((c) => c.id !== id),
          cards: state.cards.filter((c) => c.columnId !== id),
        }));
      },

      addCard: (columnId, boardId, title) => {
        const { cards } = get();
        const colCards = cards.filter((c) => c.columnId === columnId);
        const card: Card = {
          id: generateId(),
          title,
          description: '',
          columnId,
          boardId,
          assignees: [],
          labels: [],
          priority: 'medium',
          comments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          order: colCards.length,
        };
        set((state) => ({ cards: [...state.cards, card] }));
        return card;
      },

      updateCard: (id, updates) =>
        set((state) => ({
          cards: state.cards.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
          ),
        })),

      deleteCard: (id) =>
        set((state) => ({ cards: state.cards.filter((c) => c.id !== id) })),

      moveCard: (cardId, newColumnId, newOrder) => {
        set((state) => {
          const cards = state.cards.map((c) =>
            c.id === cardId ? { ...c, columnId: newColumnId, order: newOrder } : c
          );
          return { cards };
        });
      },

      addComment: (cardId, content, author, authorAvatar) => {
        const comment: Comment = {
          id: generateId(),
          author,
          authorAvatar,
          content,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          cards: state.cards.map((c) =>
            c.id === cardId ? { ...c, comments: [...c.comments, comment] } : c
          ),
        }));
      },
    }),
    { name: 'ruang-kelana-board' }
  )
);
