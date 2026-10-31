import React, { useState } from 'react';
import { X } from 'lucide-react';

interface SymbolPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (symbol: string) => void;
}

const SYMBOL_CATEGORIES = [
  {
    name: 'Mata Uang',
    symbols: ['Rp', '€', '$', '£', '¥', '₹', '₽', '₩', '¢', '₿', '₱', '₴', '฿', '₫'],
  },
  {
    name: 'Matematika',
    symbols: ['±', '×', '÷', '≠', '≈', '≤', '≥', '∞', '∑', '∏', '√', '∫', '∂', '∆', 'π', 'µ', '‰', '%', '½', '¼', '¾', '⅓', '⅔', '°', '′', '″'],
  },
  {
    name: 'Panah & Arah',
    symbols: ['←', '→', '↑', '↓', '↔', '↕', '⇐', '⇒', '⇑', '⇓', '⇔', '➔', '➜', '➤', '↳', '↵', '⇄', '⇌'],
  },
  {
    name: 'Tanda & Dokumen',
    symbols: ['©', '®', '™', '§', '¶', '†', '‡', '•', '·', '…', '–', '—', '«', '»', '“', '”', '‘', '’', '✓', '✔', '✗', '✘', '★', '☆', '✦', '✧', '♠', '♣', '♥', '♦', '✉', '☎', '✂', '⚠'],
  },
  {
    name: 'Yunani & Huruf',
    symbols: ['α', 'β', 'γ', 'δ', 'ε', 'θ', 'λ', 'μ', 'π', 'ρ', 'σ', 'τ', 'φ', 'ω', 'Ω', 'Σ', 'Φ', 'Ψ'],
  },
];

export const SymbolPickerModal: React.FC<SymbolPickerModalProps> = ({ isOpen, onClose, onInsert }) => {
  const [activeCategory, setActiveCategory] = useState('Mata Uang');

  if (!isOpen) return null;

  const currentCategory = SYMBOL_CATEGORIES.find(c => c.name === activeCategory) || SYMBOL_CATEGORIES[0];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Sisipkan Simbol &amp; Karakter Khusus</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Klik simbol untuk langsung memasukkannya ke posisi kursor</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>

        {/* Categories */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 px-3 pt-2 gap-1 overflow-x-auto text-xs bg-gray-50 dark:bg-gray-800/30">
          {SYMBOL_CATEGORIES.map(c => (
            <button
              key={c.name}
              onClick={() => setActiveCategory(c.name)}
              className={`px-3 py-1.5 rounded-t-lg font-medium whitespace-nowrap transition-colors ${
                activeCategory === c.name
                  ? 'bg-white dark:bg-gray-900 text-primary-600 dark:text-primary-400 border-t border-x border-gray-200 dark:border-gray-700 font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Symbols Grid */}
        <div className="p-4 grid grid-cols-6 sm:grid-cols-7 gap-2 max-h-60 overflow-y-auto">
          {currentCategory.symbols.map(sym => (
            <button
              key={sym}
              onClick={() => {
                onInsert(sym);
                onClose();
              }}
              className="h-10 text-lg flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-primary-900/40 hover:text-primary-600 dark:hover:text-primary-400 border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-all font-sans cursor-pointer active:scale-95"
            >
              {sym}
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-gray-100 dark:border-gray-700 text-center text-xs text-gray-400">
          Tip: Karakter disalin dan disisipkan langsung sebagai teks Unicode standar.
        </div>
      </div>
    </div>
  );
};
