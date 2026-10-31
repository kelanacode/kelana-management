import React, { useRef, useState, useEffect } from 'react';
import { X, Check, RotateCcw, Palette, Paintbrush } from 'lucide-react';

interface CanvasDrawingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (imageHtml: string) => void;
}

const COLORS = ['#000000', '#dc2626', '#2563eb', '#16a34a', '#d97706', '#9333ea', '#db2777', '#ffffff'];

export const CanvasDrawingModal: React.FC<CanvasDrawingModalProps> = ({ isOpen, onClose, onInsert }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#2563eb');
  const [lineWidth, setLineWidth] = useState(3);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasContent(true);
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
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  };

  const handleInsert = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;
    const dataUrl = canvas.toDataURL('image/png');
    const html = `<div style="text-align:center; margin:1rem 0;"><img src="${dataUrl}" style="max-width:100%; border:1px solid #e2e8f0; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.06);" alt="Coretan Kanvas"/><p style="font-size:11px; color:#64748b; margin-top:4px;">Ilustrasi Kanvas Bebas</p></div><p></p>`;
    onInsert(html);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center">
              <Paintbrush size={16} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">Kanvas Gambar & Sketsa</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Buat coretan, diagram tangan, atau ilustrasi bebas</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>

        {/* Toolbar controls */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <Palette size={14} className="text-gray-500" />
            <div className="flex items-center gap-1">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${color === c ? 'scale-125 border-primary-600 shadow-xs' : 'border-gray-300'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-500">Tebal:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={lineWidth}
              onChange={e => setLineWidth(Number(e.target.value))}
              className="w-24 accent-primary-600 cursor-pointer"
            />
            <span className="w-4 font-mono">{lineWidth}px</span>
          </div>

          <button onClick={clearCanvas} className="flex items-center gap-1 text-red-500 hover:underline">
            <RotateCcw size={13} /> Bersihkan
          </button>
        </div>

        {/* Canvas area */}
        <div className="p-4 flex justify-center bg-gray-100 dark:bg-gray-950">
          <canvas
            ref={canvasRef}
            width={520}
            height={280}
            className="bg-white rounded-xl shadow-xs cursor-crosshair touch-none border border-gray-300 dark:border-gray-700"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-secondary text-xs py-2 px-3.5">Batal</button>
          <button onClick={handleInsert} disabled={!hasContent} className="btn-primary text-xs py-2 px-4 disabled:opacity-50">
            <Check size={14} /> Sisipkan ke Dokumen
          </button>
        </div>
      </div>
    </div>
  );
};
