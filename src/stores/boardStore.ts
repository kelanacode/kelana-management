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

const SAMPLE_BOARDS: Board[] = [];

const SAMPLE_COLUMNS: Column[] = [];

const SAMPLE_CARDS: Card[] = [];

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
    { name: 'ruang-kelana-board-clean' }
  )
);
