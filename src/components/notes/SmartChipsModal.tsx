import React, { useState } from 'react';
import { X, Calendar, User, CheckCircle2, FileText, Tag } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

interface SmartChipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (chipHtml: string) => void;
}

export const SmartChipsModal: React.FC<SmartChipsModalProps> = ({ isOpen, onClose, onInsert }) => {
  const { members } = useAppStore();
  const [chipType, setChipType] = useState<'date' | 'people' | 'status' | 'file'>('date');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMember, setSelectedMember] = useState(members[0]?.name || 'Andi Wirawan');
  const [statusText, setStatusText] = useState('PENTING');
  const [statusColor, setStatusColor] = useState('red');
  const [fileName, setFileName] = useState('Roadmap_Q4.pdf');

  if (!isOpen) return null;

  const handleInsert = () => {
    let html = '';
    if (chipType === 'date') {
      html = `<span class="smart-chip" style="background:#eff6ff; color:#1e40af; border-color:#bfdbfe;">📅 ${selectedDate}</span> `;
    } else if (chipType === 'people') {
      const m = members.find(mem => mem.name === selectedMember);
      html = `<span class="smart-chip" style="background:#f5f3ff; color:#6d28d9; border-color:#ddd6fe;">👤 @${selectedMember}</span> `;
    } else if (chipType === 'status') {
      const colorMap: Record<string, { bg: string; text: string; border: string }> = {
        red: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
        amber: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
        green: { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
        blue: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
      };
      const c = colorMap[statusColor] || colorMap.red;
      html = `<span class="smart-chip" style="background:${c.bg}; color:${c.text}; border-color:${c.border};">🏷️ [${statusText}]</span> `;
    } else {
      html = `<span class="smart-chip" style="background:#f8fafc; color:#334155; border-color:#cbd5e1;">📄 ${fileName}</span> `;
    }

    onInsert(html);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-600 flex items-center justify-center">
              <Tag size={16} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">Sisipkan Smart Chip (Chip Pintar)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Gaya Google Docs: Tanggal, Kontak, Status, atau File</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>

        {/* Chip Type Selector */}
        <div className="grid grid-cols-4 border-b border-gray-100 dark:border-gray-700 p-2 gap-1 text-xs bg-gray-50 dark:bg-gray-800/30">
          {[
            { id: 'date', label: 'Tanggal', icon: Calendar },
            { id: 'people', label: 'Orang', icon: User },
            { id: 'status', label: 'Status', icon: CheckCircle2 },
            { id: 'file', label: 'File', icon: FileText },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setChipType(t.id as any)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg font-medium transition-colors ${
                  chipType === t.id
                    ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon size={16} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          {chipType === 'date' && (
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">Pilih Tanggal:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="input text-sm"
              />
            </div>
          )}

          {chipType === 'people' && (
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">Pilih Rekan Tim (@mention):</label>
              <select
                value={selectedMember}
                onChange={e => setSelectedMember(e.target.value)}
                className="input text-sm"
              >
                {members.map(m => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {chipType === 'status' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">Teks Lencana Status:</label>
                <input
                  type="text"
                  value={statusText}
                  onChange={e => setStatusText(e.target.value)}
                  placeholder="Contoh: PENTING / SELESAI / DALAM REVIEW"
                  className="input text-sm font-semibold uppercase"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">Warna Status:</label>
                <div className="flex gap-2">
                  {[
                    { id: 'red', label: 'Merah (Kritis)', bg: 'bg-red-500' },
                    { id: 'amber', label: 'Kuning (Perlu Perhatian)', bg: 'bg-amber-500' },
                    { id: 'green', label: 'Hijau (Selesai)', bg: 'bg-green-500' },
                    { id: 'blue', label: 'Biru (Info)', bg: 'bg-blue-500' },
                  ].map(c => (
                    <button
                      key={c.id}
                      onClick={() => setStatusColor(c.id)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                        statusColor === c.id ? 'border-primary-600 bg-primary-50 dark:bg-primary-950/40 text-primary-700' : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${c.bg}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {chipType === 'file' && (
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">Nama Dokumen / File Rujukan:</label>
              <input
                type="text"
                value={fileName}
                onChange={e => setFileName(e.target.value)}
                placeholder="Contoh: Dokumen_Spesifikasi_v2.docx"
                className="input text-sm"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-secondary text-xs py-2 px-3.5">Batal</button>
          <button onClick={handleInsert} className="btn-primary text-xs py-2 px-4">
            Sisipkan Chip Pintar
          </button>
        </div>
      </div>
    </div>
  );
};
