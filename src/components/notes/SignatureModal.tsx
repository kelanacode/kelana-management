import React, { useRef, useState, useEffect } from 'react';
import { X, Check, RotateCcw, PenTool, Type, Image as ImageIcon, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (signatureHtml: string) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({ isOpen, onClose, onInsert }) => {
  const { session } = useAuthStore();
  const currentUser = session?.user;
  const savedDigitalSignature = currentUser?.digitalSignature;

  const [mode, setMode] = useState<'profile' | 'draw' | 'type'>(savedDigitalSignature ? 'profile' : 'draw');
  const [typedName, setTypedName] = useState(currentUser?.name || 'Andi Wirawan');
  const [fontFamily, setFontFamily] = useState('Dancing Script');
  const [signDate, setSignDate] = useState(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (isOpen && mode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleInsert = () => {
    if (mode === 'profile') {
      if (!savedDigitalSignature) return;
      const html = `<div style="display:inline-block; border-bottom:2px dashed #94a3b8; padding:8px 16px; margin:12px 0; background:rgba(239,246,255,0.4); border-radius:6px;"><img src="${savedDigitalSignature}" style="height:65px; max-width:220px; object-fit:contain; display:block;" alt="Tanda Tangan Digital Resmi"/><div style="font-size:11px; color:#64748b; margin-top:4px;">Tertanda: ${currentUser?.name || ''} (${currentUser?.nik || ''}) • ${signDate}</div></div><p></p>`;
      onInsert(html);
    } else if (mode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return;
      const dataUrl = canvas.toDataURL('image/png');
      const html = `<div style="display:inline-block; border-bottom:2px dashed #94a3b8; padding:8px 16px; margin:12px 0; background:rgba(239,246,255,0.4); border-radius:6px;"><img src="${dataUrl}" style="height:60px; max-width:200px; display:block;" alt="Tanda Tangan Elektronik"/><div style="font-size:11px; color:#64748b; margin-top:4px;">Tertanda: Ditandatangani secara elektronik • ${signDate}</div></div><p></p>`;
      onInsert(html);
    } else {
      if (!typedName.trim()) return;
      const html = `<div class="signature-box" style="font-family:'${fontFamily}', cursive; margin:12px 0;"><div style="font-size:26px;">${typedName}</div><div style="font-size:11px; font-family:sans-serif; color:#64748b; margin-top:4px;">Tanda Tangan Digital Terverifikasi • ${signDate}</div></div><p></p>`;
      onInsert(html);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-600 flex items-center justify-center">
              <PenTool size={16} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">Sisipkan Tanda Tangan Elektronik</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Bubuhkan e-signature resmi pada dokumen catatan</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 p-2 gap-2 bg-gray-50 dark:bg-gray-800/30 overflow-x-auto">
          {savedDigitalSignature && (
            <button
              onClick={() => setMode('profile')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                mode === 'profile'
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Sparkles size={13} className="text-amber-500" /> Tanda Tangan Profil
            </button>
          )}
          <button
            onClick={() => setMode('draw')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              mode === 'draw'
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <PenTool size={13} /> Gambar Manual
          </button>
          <button
            onClick={() => setMode('type')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              mode === 'type'
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Type size={13} /> Ketik Nama
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {mode === 'profile' && savedDigitalSignature ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-primary-200 dark:border-primary-800/60 bg-primary-50/40 dark:bg-primary-950/20 flex flex-col items-center justify-center text-center space-y-2">
                <img
                  src={savedDigitalSignature}
                  alt="Tanda Tangan Digital Resmi"
                  className="h-20 max-w-[240px] object-contain"
                />
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  {currentUser?.name} ({currentUser?.nik})
                </p>
                <p className="text-[11px] text-gray-500">
                  Tanda tangan digital resmi akun Anda yang tersimpan di profil personalisasi.
                </p>
              </div>
            </div>
          ) : mode === 'draw' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Gunakan mouse atau sentuhan jari di dalam kotak:</span>
                <button onClick={clearCanvas} className="flex items-center gap-1 text-red-500 hover:underline">
                  <RotateCcw size={12} /> Hapus / Bersihkan
                </button>
              </div>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-950 p-1 flex justify-center">
                <canvas
                  ref={canvasRef}
                  width={420}
                  height={150}
                  className="bg-white dark:bg-gray-900 rounded-lg cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">Nama Penandatangan</label>
                <input
                  type="text"
                  value={typedName}
                  onChange={e => setTypedName(e.target.value)}
                  className="input text-sm"
                  placeholder="Ketik nama lengkap..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">Gaya Huruf Tanda Tangan</label>
                <select
                  value={fontFamily}
                  onChange={e => setFontFamily(e.target.value)}
                  className="input text-sm"
                >
                  <option value="Dancing Script">Dancing Script (Artistik Elegan)</option>
                  <option value="Brush Script MT">Brush Script (Klasik)</option>
                  <option value="Caveat">Caveat (Tangan Santai)</option>
                </select>
              </div>

              {/* Preview */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
                <p className="text-xs text-gray-400 mb-2">Pratinjau Tanda Tangan:</p>
                <div
                  style={{ fontFamily: `'${fontFamily}', cursive` }}
                  className="text-3xl text-blue-700 dark:text-blue-300 py-2 border-b-2 border-dashed border-gray-300 dark:border-gray-600 inline-block px-6"
                >
                  {typedName || 'Nama Anda'}
                </div>
                <p className="text-[11px] text-gray-400 mt-2">Tertanda: {signDate}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-secondary text-xs py-2 px-3.5">Batal</button>
          <button onClick={handleInsert} className="btn-primary text-xs py-2 px-4">
            <Check size={14} /> Sisipkan Tanda Tangan
          </button>
        </div>
      </div>
    </div>
  );
};
