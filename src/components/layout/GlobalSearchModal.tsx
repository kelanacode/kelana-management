import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, FileText, Kanban, Database, BookOpen, CheckSquare,
  DollarSign, ShoppingCart, Calendar, ArrowRight, ExternalLink
} from 'lucide-react';
import { useNotesStore, checkNoteAccess } from '../../stores/notesStore';
import { useBoardStore } from '../../stores/boardStore';
import { useDatabaseStore } from '../../stores/databaseStore';
import { useTaskStore } from '../../stores/taskStore';
import { useFinanceStore } from '../../stores/financeStore';
import { useAuthStore } from '../../stores/authStore';

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Notes' | 'Board' | 'Database' | 'Taks' | 'Finance';
  icon: any;
  link: string;
  onClick: () => void;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { notes, selectNote } = useNotesStore();
  const { cards } = useBoardStore();
  const { tables } = useDatabaseStore();
  const { tasks } = useTaskStore();
  const { departmentBudgets } = useFinanceStore();
  const { session } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  // Kumpulkan semua hasil pencarian
  const results: SearchResultItem[] = [];

  if (q.length > 0) {
    // 1. Notes (dengan cek akses)
    notes
      .filter((n) => checkNoteAccess(n, session?.user))
      .filter((n) => n.title.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q) || n.tags?.some(t => t.toLowerCase().includes(q)))
      .slice(0, 4)
      .forEach((n) => {
        results.push({
          id: 'note-' + n.id,
          title: n.title,
          subtitle: `Catatan • ${n.authorName || 'Kelana'}`,
          category: 'Notes',
          icon: FileText,
          link: '/notes',
          onClick: () => {
            selectNote(n.id);
            navigate('/notes');
            onClose();
          },
        });
      });

    // 2. Kanban Board Cards
    cards
      .filter((c) => c.title.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((c) => {
        results.push({
          id: 'card-' + c.id,
          title: c.title,
          subtitle: `Kartu Kanban • Prioritas ${c.priority || 'Normal'}`,
          category: 'Board',
          icon: Kanban,
          link: '/board',
          onClick: () => {
            navigate('/board');
            onClose();
          },
        });
      });

    // 3. Company Tasks
    tasks
      .filter((t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((t) => {
        results.push({
          id: 'task-' + t.id,
          title: t.title,
          subtitle: `Taks Perusahaan • Status: ${t.status}`,
          category: 'Taks',
          icon: CheckSquare,
          link: '/tasks',
          onClick: () => {
            navigate('/tasks');
            onClose();
          },
        });
      });

    // 5. Database Tables
    tables
      .filter((t) => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((t) => {
        results.push({
          id: 'db-' + t.id,
          title: t.name,
          subtitle: `Tabel Database (${t.rows?.length || 0} baris)`,
          category: 'Database',
          icon: Database,
          link: '/database',
          onClick: () => {
            navigate('/database');
            onClose();
          },
        });
      });

    // 6. Alokasi Anggaran / Finance
    departmentBudgets
      .filter((b) => b.department.toLowerCase().includes(q))
      .slice(0, 2)
      .forEach((b) => {
        results.push({
          id: 'fin-' + b.id,
          title: `Anggaran ${b.department}`,
          subtitle: `Pagu: Rp ${b.allocatedBudget.toLocaleString('id-ID')} • Status: ${b.status}`,
          category: 'Finance',
          icon: DollarSign,
          link: '/finance',
          onClick: () => {
            navigate('/finance');
            onClose();
          },
        });
      });
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        results[selectedIndex].onClick();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-700">
          <Search size={20} className="text-primary-600 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Cari catatan, tugas kanban, taks, database, atau anggaran..."
            className="w-full bg-transparent border-0 outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={16} />
            </button>
          ) : (
            <kbd className="text-[11px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600 text-gray-400 font-mono">
              ESC
            </kbd>
          )}
        </div>

        {/* Results Container */}
        <div className="overflow-y-auto p-2 flex-1 divide-y divide-gray-50 dark:divide-gray-800">
          {q.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 mx-auto flex items-center justify-center">
                <Search size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Pencarian Global Ruang Kelana
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Ketik kata kunci untuk mencari di seluruh modul (Notes, Board, Taks, Database, Anggaran).
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {['Notes', 'Kanban', 'Taks', 'Anggaran', 'SOP'].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setQuery(chip)}
                    className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700/60 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40 dark:hover:text-primary-300 text-xs text-gray-600 dark:text-gray-300 transition-colors"
                  >
                    #{chip}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">
              Tidak ada hasil yang cocok dengan kata kunci "<strong>{query}</strong>".
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Ditemukan {results.length} Hasil
              </div>
              {results.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={item.onClick}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary-50 dark:bg-primary-900/40 text-primary-900 dark:text-primary-100'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{item.title}</p>
                        <p className="text-[11px] text-gray-400 truncate">{item.subtitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
                        {item.category}
                      </span>
                      <ArrowRight size={14} className={isSelected ? 'text-primary-600' : 'text-gray-400'} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 font-mono text-[10px]">↑↓</kbd> Navigasi</span>
            <span><kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 font-mono text-[10px]">↵</kbd> Buka</span>
          </div>
          <span>Ruang Kelana Search</span>
        </div>
      </div>
    </div>
  );
};
