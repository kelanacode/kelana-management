import React, { useEffect, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, MoreHorizontal, X, Calendar, Flag, MessageSquare,
  User, Trash2, Edit3, ChevronDown, Tag, Clock, AlertCircle,
  Edit2, Check
} from 'lucide-react';
import { useBoardStore } from '../stores/boardStore';
import { useAppStore } from '../stores/appStore';
import { useAuthStore } from '../stores/authStore';
import { Card, Column, Priority } from '../types';
import { format, parseISO, isPast } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

// ---- Priority Helpers ----
const priorityConfig: Record<Priority, { label: string; color: string; bg: string }> = {
  high: { label: 'Tinggi', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
  medium: { label: 'Sedang', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  low: { label: 'Rendah', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
};

// ---- Card Detail Modal ----
const CardModal: React.FC<{ card: Card; onClose: () => void }> = ({ card, onClose }) => {
  const { updateCard, addComment, deleteCard } = useBoardStore();
  const { settings, members } = useAppStore();
  const sessionUser = useAuthStore((s) => s.session?.user);
  const me = settings.currentUser ?? {
    name: sessionUser?.name ?? 'Saya',
    avatar: sessionUser?.avatar ?? '?',
    color: sessionUser?.color ?? '#7c3aed',
  };
  const [comment, setComment] = useState('');
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

  const handleSubmitComment = () => {
    if (!comment.trim()) return;
    addComment(card.id, comment, me.name, me.avatar);
    setComment('');
  };

  const isOverdue = card.deadline && isPast(parseISO(card.deadline));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex-1">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => updateCard(card.id, { title })}
              className="text-lg font-bold text-gray-900 dark:text-white bg-transparent border-none outline-none w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { deleteCard(card.id); onClose(); }}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500"
            >
              <Trash2 size={15} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-5 space-y-5" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {/* Labels */}
          {card.labels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {card.labels.map((label) => (
                <span key={label.id} className="px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: label.color }}>
                  {label.name}
                </span>
              ))}
            </div>
          )}

          {/* Meta Info */}
          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-2">Prioritas</label>
              <select
                value={card.priority}
                onChange={(e) => updateCard(card.id, { priority: e.target.value as Priority })}
                className="input text-sm"
              >
                <option value="high">🔴 Tinggi</option>
                <option value="medium">🟡 Sedang</option>
                <option value="low">🟢 Rendah</option>
              </select>
            </div>

            {/* Deadline */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-2">
                Deadline {isOverdue && <span className="text-red-500 ml-1">• Terlambat!</span>}
              </label>
              <input
                type="date"
                value={card.deadline ? format(parseISO(card.deadline), 'yyyy-MM-dd') : ''}
                onChange={(e) => updateCard(card.id, { deadline: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                className={`input text-sm ${isOverdue ? 'border-red-300 text-red-600' : ''}`}
              />
            </div>

            {/* Assignees */}
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-2">Assignee</label>
              <div className="flex gap-2 flex-wrap">
                {members.map((member) => {
                  const assigned = card.assignees.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      onClick={() => {
                        const newAssignees = assigned
                          ? card.assignees.filter((a) => a !== member.id)
                          : [...card.assignees, member.id];
                        updateCard(card.id, { assignees: newAssignees });
                      }}
                      aria-pressed={assigned}
                      title={assigned ? `Hapus ${member.name} dari tugas ini` : `Tugaskan ke ${member.name}`}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all border-2 ${
                        assigned
                          ? 'bg-primary-600 border-primary-600 text-white font-semibold shadow-md shadow-primary-600/30'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${assigned ? 'ring-2 ring-white' : ''}`}
                        style={{ backgroundColor: member.color }}
                      >
                        {member.avatar}
                      </div>
                      <span>{member.name.split(' ')[0]}</span>
                      {assigned && <Check size={14} className="-mr-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-2">Deskripsi</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => updateCard(card.id, { description })}
              rows={4}
              placeholder="Tambahkan deskripsi tugas..."
              className="input text-sm resize-none"
            />
          </div>

          {/* Comments */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-3 flex items-center gap-1">
              <MessageSquare size={13} /> Komentar ({card.comments.length})
            </label>
            <div className="space-y-3 mb-3">
              {card.comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {c.authorAvatar}
                  </div>
                  <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-900 dark:text-white">{c.author}</span>
                      <span className="text-xs text-gray-400">
                        {format(parseISO(c.createdAt), "d MMM, HH:mm", { locale: idLocale })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: me.color }}>
                {me.avatar}
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                  placeholder="Tulis komentar... (Enter untuk kirim)"
                  className="input text-sm flex-1"
                />
                <button onClick={handleSubmitComment} className="btn-primary px-3">Kirim</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---- Kanban Card Component ----
const KanbanCardItem: React.FC<{ card: Card; onClick: () => void; isDragging?: boolean }> = ({ card, onClick, isDragging }) => {
  const { members } = useAppStore();
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));
  const isOverdue = card.deadline && isPast(parseISO(card.deadline));
  const pc = priorityConfig[card.priority];

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 p-3 cursor-pointer hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700 transition-all group ${isDragging ? 'opacity-40 rotate-1 shadow-xl' : ''}`}
    >
      {/* Labels */}
      {card.labels.length > 0 && (
        <div className="flex gap-1.5 mb-2 flex-wrap">
          {card.labels.map((label) => (
            <span key={label.id} className="h-1.5 w-8 rounded-full" style={{ backgroundColor: label.color }} />
          ))}
        </div>
      )}

      <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug mb-2 group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">
        {card.title}
      </p>

      {card.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{card.description}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Priority */}
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${pc.color} ${pc.bg}`}>
            {pc.label}
          </span>
          {/* Deadline */}
          {card.deadline && (
            <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
              <Clock size={11} />
              {format(parseISO(card.deadline), "d MMM", { locale: idLocale })}
            </span>
          )}
        </div>

        {/* Assignees + Comments */}
        <div className="flex items-center gap-2">
          {card.comments.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <MessageSquare size={11} /> {card.comments.length}
            </span>
          )}
          <div className="flex -space-x-1.5">
            {card.assignees.slice(0, 3).map((assigneeId) => {
              const m = memberMap[assigneeId];
              return m ? (
                <div key={assigneeId} className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: m.color }} title={m.name}>
                  {m.avatar}
                </div>
              ) : null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---- Sortable Card Wrapper ----
const SortableCard: React.FC<{ card: Card; onClick: () => void }> = ({ card, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCardItem card={card} onClick={onClick} isDragging={isDragging} />
    </div>
  );
};

// ---- Column Component ----
const KanbanColumnComponent: React.FC<{
  column: Column;
  cards: Card[];
  onCardClick: (card: Card) => void;
}> = ({ column, cards, onCardClick }) => {
  // Seluruh area kolom bisa menjadi tujuan drop, termasuk saat kolom masih kosong
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: column.id });
  const { addCard, deleteColumn, updateColumn } = useBoardStore();
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [colTitle, setColTitle] = useState(column.title);

  const handleAddCard = () => {
    if (newCardTitle.trim()) {
      addCard(column.id, column.boardId, newCardTitle.trim());
      setNewCardTitle('');
      setAddingCard(false);
    }
  };

  return (
    <div className="flex flex-col w-72 flex-shrink-0 max-h-full bg-gray-50 dark:bg-gray-800/50 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: column.color }} />
          {editingTitle ? (
            <input
              autoFocus
              value={colTitle}
              onChange={(e) => setColTitle(e.target.value)}
              onBlur={() => { updateColumn(column.id, { title: colTitle }); setEditingTitle(false); }}
              onKeyDown={(e) => e.key === 'Enter' && (updateColumn(column.id, { title: colTitle }), setEditingTitle(false))}
              className="text-sm font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-white w-full"
            />
          ) : (
            <span onDoubleClick={() => setEditingTitle(true)} className="text-sm font-semibold text-gray-900 dark:text-white cursor-pointer truncate">{column.title}</span>
          )}
          <span className="text-xs text-gray-400 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full flex-shrink-0">{cards.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setAddingCard(true)} className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <Plus size={14} />
          </button>
          <button onClick={() => deleteColumn(column.id)} className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Cards */}
      <div
        ref={setDropRef}
        className={`flex-1 min-h-[100px] overflow-y-auto overscroll-contain p-3 space-y-2 transition-colors ${isOver ? 'bg-primary-50/70 dark:bg-primary-900/20' : ''}`}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} onClick={() => onCardClick(card)} />
          ))}
        </SortableContext>

        {/* Add Card Form */}
        {addingCard && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-primary-200 dark:border-primary-700 p-3 space-y-2">
            <input
              autoFocus
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCard(); if (e.key === 'Escape') setAddingCard(false); }}
              placeholder="Judul kartu..."
              className="input text-sm"
            />
            <div className="flex gap-2">
              <button onClick={handleAddCard} className="btn-primary text-xs py-1.5 px-3">Tambah</button>
              <button onClick={() => setAddingCard(false)} className="btn-secondary text-xs py-1.5 px-3">Batal</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Card Button */}
      {!addingCard && (
        <button
          onClick={() => setAddingCard(true)}
          className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors border-t border-gray-200 dark:border-gray-700"
        >
          <Plus size={14} /> Tambah kartu
        </button>
      )}
    </div>
  );
};

// ---- Board Page ----
export const Board: React.FC = () => {
  const { boards, columns, cards, selectedBoardId, selectBoard, addBoard, updateBoard, deleteBoard, addColumn, moveCard, updateCard } = useBoardStore();
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [addingBoard, setAddingBoard] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  // Editing Board state
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editBoardTitle, setEditBoardTitle] = useState('');
  const [showEmojiPickerBoardId, setShowEmojiPickerBoardId] = useState<string | null>(null);

  const currentBoard = boards.find((b) => b.id === selectedBoardId);

  // Board terpilih sudah tidak ada (dihapus / data baru dimuat): pilih board pertama
  useEffect(() => {
    if (!currentBoard && boards.length > 0) selectBoard(boards[0].id);
  }, [currentBoard, boards, selectBoard]);
  const boardColumns = columns
    .filter((c) => c.boardId === selectedBoardId)
    .sort((a, b) => a.order - b.order);

  const getColumnCards = (columnId: string) =>
    cards.filter((c) => c.columnId === columnId).sort((a, b) => a.order - b.order);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = cards.find((c) => c.id === active.id);
    setActiveCard(card ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeCard = cards.find((c) => c.id === active.id);
    if (!activeCard) return;

    // Check if over a column
    const overColumn = columns.find((c) => c.id === over.id);
    if (overColumn && activeCard.columnId !== overColumn.id) {
      moveCard(activeCard.id, overColumn.id, getColumnCards(overColumn.id).length);
      return;
    }

    // Check if over a card
    const overCard = cards.find((c) => c.id === over.id);
    if (overCard && activeCard.columnId !== overCard.columnId) {
      moveCard(activeCard.id, overCard.columnId, overCard.order);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeCard = cards.find((c) => c.id === active.id);
    const overCard = cards.find((c) => c.id === over.id);

    if (!activeCard) return;

    // Dilepas di area kolom: kartu ditaruh paling bawah kolom itu
    const overColumn = columns.find((c) => c.id === over.id);
    if (overColumn) {
      const target = getColumnCards(overColumn.id).filter((c) => c.id !== activeCard.id);
      [...target, activeCard].forEach((card, idx) =>
        updateCard(card.id, { columnId: overColumn.id, order: idx })
      );
      return;
    }

    if (overCard && activeCard.columnId === overCard.columnId) {
      const colCards = getColumnCards(activeCard.columnId);
      const oldIdx = colCards.findIndex((c) => c.id === active.id);
      const newIdx = colCards.findIndex((c) => c.id === over.id);
      const newOrder = arrayMove(colCards, oldIdx, newIdx);
      newOrder.forEach((card, idx) => updateCard(card.id, { order: idx }));
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Board Sidebar */}
      <div className="w-64 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Board Saya</h3>
            <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">{boards.length}</span>
          </div>
          <div className="space-y-1">
            {boards.map((board) => (
              <div
                key={board.id}
                onClick={() => selectBoard(board.id)}
                className={`group relative w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-sm font-medium transition-all text-left cursor-pointer ${
                  board.id === selectedBoardId
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {editingBoardId === board.id ? (
                  <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                    <input
                      autoFocus
                      type="text"
                      value={editBoardTitle}
                      onChange={(e) => setEditBoardTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (editBoardTitle.trim()) updateBoard(board.id, { title: editBoardTitle.trim() });
                          setEditingBoardId(null);
                        } else if (e.key === 'Escape') {
                          setEditingBoardId(null);
                        }
                      }}
                      onBlur={() => {
                        if (editBoardTitle.trim()) updateBoard(board.id, { title: editBoardTitle.trim() });
                        setEditingBoardId(null);
                      }}
                      className="input text-xs py-1 px-1.5 font-semibold bg-white dark:bg-gray-800 w-full"
                    />
                    <button
                      onClick={() => {
                        if (editBoardTitle.trim()) updateBoard(board.id, { title: editBoardTitle.trim() });
                        setEditingBoardId(null);
                      }}
                      className="p-1 rounded bg-primary-600 text-white hover:bg-primary-700"
                    >
                      <Check size={11} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-base flex-shrink-0">{board.emoji || '📋'}</span>
                      <span className="truncate text-xs">{board.title}</span>
                    </div>

                    {/* Quick action buttons: Edit and Delete */}
                    <div className={`flex items-center gap-0.5 transition-opacity ml-1 ${board.id === selectedBoardId ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'}`}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingBoardId(board.id);
                          setEditBoardTitle(board.title);
                        }}
                        className="p-1 rounded hover:bg-primary-100 dark:hover:bg-primary-900/50 text-gray-400 hover:text-primary-600 transition-colors"
                        title="Ubah Nama Board"
                      >
                        <Edit2 size={12} />
                      </button>

                      {(
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Hapus board "${board.title}" beserta seluruh kartunya?`)) {
                              deleteBoard(board.id);
                            }
                          }}
                          className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-gray-400 hover:text-rose-500 transition-colors"
                          title="Hapus Board"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {addingBoard ? (
          <div className="p-3 space-y-2">
            <input
              autoFocus
              value={newBoardTitle}
              onChange={(e) => setNewBoardTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newBoardTitle.trim()) { addBoard(newBoardTitle.trim()); setNewBoardTitle(''); setAddingBoard(false); }
                if (e.key === 'Escape') setAddingBoard(false);
              }}
              placeholder="Nama board..."
              className="input text-sm"
            />
            <div className="flex gap-2">
              <button onClick={() => { if (newBoardTitle.trim()) { addBoard(newBoardTitle.trim()); setNewBoardTitle(''); setAddingBoard(false); } }} className="btn-primary text-xs py-1.5 px-3 flex-1">Buat</button>
              <button onClick={() => setAddingBoard(false)} className="btn-secondary text-xs py-1.5 px-3">✕</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingBoard(true)} className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Plus size={14} /> Board Baru
          </button>
        )}
      </div>

      {/* Board Content */}
      <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
        {currentBoard && (
          <div className="px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => setShowEmojiPickerBoardId(showEmojiPickerBoardId ? null : currentBoard.id)}
                className="text-2xl cursor-pointer hover:scale-110 transition-transform p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0"
                title="Ganti Emoji Board"
              >
                {currentBoard.emoji || '📋'}
              </button>

              {showEmojiPickerBoardId === currentBoard.id && (
                <div className="absolute top-16 left-64 mt-2 p-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 flex items-center gap-1.5 flex-wrap w-56 animate-fadeIn">
                  {['🎨', '📱', '📋', '🚀', '🎯', '💼', '💡', '🔥', '⚡', '💻', '🛠️', '✨'].map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => {
                        updateBoard(currentBoard.id, { emoji: em });
                        setShowEmojiPickerBoardId(null);
                      }}
                      className="text-xl p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-125 transition-transform cursor-pointer"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={currentBoard.title}
                  onChange={(e) => updateBoard(currentBoard.id, { title: e.target.value })}
                  className="font-bold text-gray-900 dark:text-white text-lg bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-700 focus:border-primary-500 focus:outline-none transition-colors w-full max-w-md px-1"
                  placeholder="Nama Board..."
                  title="Klik untuk mengubah nama board"
                />
                <input
                  type="text"
                  value={currentBoard.description || ''}
                  onChange={(e) => updateBoard(currentBoard.id, { description: e.target.value })}
                  placeholder="Tambahkan deskripsi board..."
                  className="text-xs text-gray-500 dark:text-gray-400 bg-transparent border-b border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:border-primary-400 focus:outline-none w-full max-w-lg px-1 mt-0.5"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full font-medium">
                {cards.filter(c => c.boardId === selectedBoardId).length} kartu
              </span>

              {(
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Hapus board "${currentBoard.title}" beserta seluruh kolom dan kartunya?`)) {
                      deleteBoard(currentBoard.id);
                    }
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Hapus Board Ini"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        )}

        {!currentBoard && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6">
            <div className="text-4xl">📋</div>
            <p className="font-semibold text-gray-800 dark:text-gray-100">Belum ada board</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Buat board untuk mulai mengelola proyek dan tugas tim.</p>
            <button onClick={() => setAddingBoard(true)} className="btn-primary text-sm flex items-center gap-1.5">
              <Plus size={14} /> Buat Board
            </button>
          </div>
        )}

        <div className={`flex-1 min-h-0 overflow-x-auto overflow-y-hidden p-6 ${currentBoard ? '' : 'hidden'}`}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 h-full items-start w-max pb-2">
              {boardColumns.map((column) => (
                <KanbanColumnComponent
                  key={column.id}
                  column={column}
                  cards={getColumnCards(column.id)}
                  onCardClick={setSelectedCard}
                />
              ))}

              {/* Add Column */}
              {addingColumn ? (
                <div className="w-72 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-4 space-y-2">
                  <input
                    autoFocus
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newColumnTitle.trim() && selectedBoardId) {
                        addColumn(selectedBoardId, newColumnTitle.trim());
                        setNewColumnTitle('');
                        setAddingColumn(false);
                      }
                      if (e.key === 'Escape') setAddingColumn(false);
                    }}
                    placeholder="Nama kolom..."
                    className="input text-sm"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => { if (newColumnTitle.trim() && selectedBoardId) { addColumn(selectedBoardId, newColumnTitle.trim()); setNewColumnTitle(''); setAddingColumn(false); } }} className="btn-primary text-xs py-1.5 px-3 flex-1">Tambah</button>
                    <button onClick={() => setAddingColumn(false)} className="btn-secondary text-xs py-1.5 px-3">Batal</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingColumn(true)}
                  className="w-72 flex-shrink-0 h-14 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  <Plus size={16} /> Tambah Kolom
                </button>
              )}
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
              {activeCard ? (
                <KanbanCardItem card={activeCard} onClick={() => {}} isDragging />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* Card Modal */}
      {selectedCard && (
        <CardModal
          card={cards.find((c) => c.id === selectedCard.id) ?? selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
};
