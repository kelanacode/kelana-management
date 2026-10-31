import React, { useState } from 'react';
import { Table as TableIcon, Plus, Trash2, Columns, Rows } from 'lucide-react';

interface TableGridPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGrid: (rows: number, cols: number) => void;
  isInTable?: boolean;
  onInsertRowAfter?: () => void;
  onInsertRowBefore?: () => void;
  onInsertColAfter?: () => void;
  onInsertColBefore?: () => void;
  onDeleteRow?: () => void;
  onDeleteCol?: () => void;
  onDeleteTable?: () => void;
}

const MAX_ROWS = 8;
const MAX_COLS = 8;

export const TableGridPicker: React.FC<TableGridPickerProps> = ({
  isOpen,
  onClose,
  onSelectGrid,
  isInTable = false,
  onInsertRowAfter,
  onInsertRowBefore,
  onInsertColAfter,
  onInsertColBefore,
  onDeleteRow,
  onDeleteCol,
  onDeleteTable,
}) => {
  const [hoverRows, setHoverRows] = useState(3);
  const [hoverCols, setHoverCols] = useState(3);

  if (!isOpen) return null;

  return (
    <div
      className="absolute top-full left-0 mt-1.5 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50 w-72 animate-in fade-in zoom-in-95 duration-150 text-gray-800 dark:text-gray-100"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header with dynamic dimension indicator */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-1.5 font-bold text-xs">
          <TableIcon size={14} className="text-blue-600 dark:text-blue-400" />
          <span>Sisipkan Tabel</span>
        </div>
        <div className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs border border-blue-200 dark:border-blue-800">
          {hoverCols} × {hoverRows} Tabel
        </div>
      </div>

      {/* Interactive Google Docs Style Grid Matrix */}
      <div className="py-3">
        <div className="text-[11px] text-gray-400 dark:text-gray-500 mb-2">
          Arahkan kursor lalu klik untuk menentukan ukuran:
        </div>
        <div
          className="grid gap-1 p-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/80 dark:border-gray-700/80 justify-center cursor-pointer select-none"
          style={{ gridTemplateColumns: `repeat(${MAX_COLS}, minmax(0, 1fr))` }}
          onMouseLeave={() => {
            // Keep current or default
          }}
        >
          {Array.from({ length: MAX_ROWS }).map((_, rIdx) => {
            const rowNumber = rIdx + 1;
            return Array.from({ length: MAX_COLS }).map((_, cIdx) => {
              const colNumber = cIdx + 1;
              const isSelected = rowNumber <= hoverRows && colNumber <= hoverCols;
              return (
                <div
                  key={`${rowNumber}-${colNumber}`}
                  onMouseEnter={() => {
                    setHoverRows(rowNumber);
                    setHoverCols(colNumber);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelectGrid(rowNumber, colNumber);
                  }}
                  className={`w-5 h-5 rounded transition-all duration-75 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 dark:bg-blue-500 border border-blue-700 dark:border-blue-400 shadow-xs scale-105'
                      : 'bg-white dark:bg-gray-700/60 border border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                  title={`${colNumber} × ${rowNumber}`}
                />
              );
            });
          })}
        </div>
      </div>

      {/* Quick Dimension Presets */}
      <div className="flex items-center gap-1.5 pb-3 border-b border-gray-100 dark:border-gray-800">
        <span className="text-[10px] text-gray-400 uppercase font-semibold">Ukuran Cepat:</span>
        {[
          { label: '2×2', r: 2, c: 2 },
          { label: '3×3', r: 3, c: 3 },
          { label: '4×3', r: 3, c: 4 },
          { label: '5×4', r: 4, c: 5 },
        ].map((preset) => (
          <button
            key={preset.label}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onSelectGrid(preset.r, preset.c);
            }}
            className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-800 dark:hover:bg-blue-950/50 dark:hover:text-blue-300 transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Table Row / Column Controls (when cursor is in a table) */}
      {isInTable && (
        <div className="pt-2 space-y-1">
          <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
            Pengaturan Tabel Aktif:
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {onInsertRowAfter && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onInsertRowAfter();
                  onClose();
                }}
                className="px-2 py-1.5 text-left rounded-lg bg-gray-50 hover:bg-blue-50 dark:bg-gray-800 dark:hover:bg-gray-700/80 text-[11px] font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5 transition-colors"
              >
                <Rows size={12} className="text-blue-600" />
                <span>+ Baris Bawah</span>
              </button>
            )}
            {onInsertRowBefore && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onInsertRowBefore();
                  onClose();
                }}
                className="px-2 py-1.5 text-left rounded-lg bg-gray-50 hover:bg-blue-50 dark:bg-gray-800 dark:hover:bg-gray-700/80 text-[11px] font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5 transition-colors"
              >
                <Rows size={12} className="text-blue-600" />
                <span>+ Baris Atas</span>
              </button>
            )}
            {onInsertColAfter && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onInsertColAfter();
                  onClose();
                }}
                className="px-2 py-1.5 text-left rounded-lg bg-gray-50 hover:bg-blue-50 dark:bg-gray-800 dark:hover:bg-gray-700/80 text-[11px] font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5 transition-colors"
              >
                <Columns size={12} className="text-indigo-600" />
                <span>+ Kolom Kanan</span>
              </button>
            )}
            {onInsertColBefore && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onInsertColBefore();
                  onClose();
                }}
                className="px-2 py-1.5 text-left rounded-lg bg-gray-50 hover:bg-blue-50 dark:bg-gray-800 dark:hover:bg-gray-700/80 text-[11px] font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5 transition-colors"
              >
                <Columns size={12} className="text-indigo-600" />
                <span>+ Kolom Kiri</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            {onDeleteRow && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onDeleteRow();
                  onClose();
                }}
                className="flex-1 px-2 py-1 text-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-[11px] font-medium text-red-600 transition-colors"
              >
                Hapus Baris
              </button>
            )}
            {onDeleteCol && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onDeleteCol();
                  onClose();
                }}
                className="flex-1 px-2 py-1 text-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-[11px] font-medium text-red-600 transition-colors"
              >
                Hapus Kolom
              </button>
            )}
            {onDeleteTable && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onDeleteTable();
                  onClose();
                }}
                className="px-2 py-1 text-center rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-950/80 text-[11px] font-bold text-red-700 dark:text-red-300 transition-colors"
                title="Hapus seluruh tabel"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
