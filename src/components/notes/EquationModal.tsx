import React, { useState } from 'react';
import { X, Check, Calculator } from 'lucide-react';

interface EquationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (equationHtml: string) => void;
}

const PRESET_FORMULAS = [
  { name: 'Teorema Pythagoras', formula: 'a² + b² = c²' },
  { name: 'Rumus Kuadrat', formula: 'x = (-b ± √(b² - 4ac)) / (2a)' },
  { name: 'Luas Lingkaran', formula: 'A = π × r²' },
  { name: 'Persamaan Garis Lurus', formula: 'y = mx + c' },
  { name: 'Energi Relativitas Einstein', formula: 'E = m × c²' },
  { name: 'Hukum Newton II', formula: 'F = m × a' },
  { name: 'Bunga Majemuk', formula: 'A = P(1 + r/n)^(nt)' },
  { name: 'Margin Keuntungan', formula: 'Margin (%) = ((Pendapatan - Biaya) / Pendapatan) × 100' },
  { name: 'Nilai Rata-rata (Mean)', formula: 'x̄ = (∑ xᵢ) / n' },
  { name: 'Persentase Pertumbuhan', formula: 'Growth = ((Nilai Baru - Nilai Lama) / Nilai Lama) × 100%' },
];

export const EquationModal: React.FC<EquationModalProps> = ({ isOpen, onClose, onInsert }) => {
  const [customFormula, setCustomFormula] = useState('a² + b² = c²');
  const [label, setLabel] = useState('Teorema Pythagoras');

  if (!isOpen) return null;

  const handleInsert = (formulaText: string, formulaLabel?: string) => {
    const html = `<span class="formula-box" title="${formulaLabel || 'Rumus'}">📐 <em>${formulaText}</em></span> `;
    onInsert(html);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center">
              <Calculator size={16} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">Sisipkan Rumus &amp; Persamaan Matematika</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pilih rumus populer atau ketik persamaan kustom Anda</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Custom input */}
          <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Ketik Persamaan Kustom:</label>
            <input
              type="text"
              value={customFormula}
              onChange={e => setCustomFormula(e.target.value)}
              placeholder="Contoh: f(x) = ax² + bx + c"
              className="input text-sm font-mono"
            />
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-gray-400">Pratinjau: <span className="font-serif italic font-bold text-emerald-600 dark:text-emerald-400">{customFormula || '...'}</span></span>
              <button
                onClick={() => handleInsert(customFormula, label)}
                disabled={!customFormula.trim()}
                className="btn-primary text-xs py-1.5 px-3"
              >
                <Check size={13} /> Sisipkan Ini
              </button>
            </div>
          </div>

          {/* Presets */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-2 uppercase tracking-wider">
              Rumus Cepat / Presets Populer:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_FORMULAS.map(p => (
                <button
                  key={p.name}
                  onClick={() => handleInsert(p.formula, p.name)}
                  className="p-2.5 text-left rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white dark:bg-gray-800/70 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-all group"
                >
                  <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-emerald-600 font-medium">{p.name}</p>
                  <p className="text-xs font-serif italic text-gray-900 dark:text-white mt-1 font-semibold">{p.formula}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-700 text-right">
          <button onClick={onClose} className="btn-secondary text-xs py-1.5 px-3">Tutup</button>
        </div>
      </div>
    </div>
  );
};
