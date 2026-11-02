// QR Code aset: gambar QR, cetak label, dan pemindai kamera untuk stock opname.
import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Camera, Keyboard, X } from 'lucide-react';
import type { Asset } from '../../types/asset';
import { assetQrUrl, parseScannedCode } from '../../utils/assetUtils';

export const Modal: React.FC<{ title: React.ReactNode; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({
  title,
  onClose,
  children,
  wide,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className={`w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700`}>
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <h3 className="font-bold text-gray-900 dark:text-white min-w-0 truncate">{title}</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Tutup">
          <X size={18} />
        </button>
      </div>
      <div className="overflow-y-auto p-5">{children}</div>
    </div>
  </div>
);

export const qrDataUrl = (code: string) => QRCode.toDataURL(assetQrUrl(code), { margin: 1, width: 240, errorCorrectionLevel: 'M' });

export const QrImage: React.FC<{ code: string; size?: number }> = ({ code, size = 120 }) => {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    qrDataUrl(code).then((u) => alive && setSrc(u));
    return () => {
      alive = false;
    };
  }, [code]);
  return src ? (
    <img src={src} alt={`QR ${code}`} width={size} height={size} className="rounded bg-white" />
  ) : (
    <div style={{ width: size, height: size }} className="rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
  );
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// Cetak label QR (lembar A4, 3 kolom) untuk ditempel pada fisik barang
export const printLabels = async (assets: Asset[]) => {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('Popup diblokir browser. Izinkan popup untuk mencetak label.');
    return;
  }
  const items = await Promise.all(assets.map(async (a) => ({ a, img: await qrDataUrl(a.code) })));
  win.document.write(`<!DOCTYPE html><html><head><title>Label Aset</title><style>
    @page { size: A4; margin: 10mm; }
    body { font-family: Arial, sans-serif; margin: 0; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
    .label { border: 1px dashed #999; border-radius: 3mm; padding: 3mm; display: flex; gap: 3mm; align-items: center; page-break-inside: avoid; }
    .label img { width: 24mm; height: 24mm; }
    .org { font-size: 7pt; color: #666; text-transform: uppercase; letter-spacing: .5px; }
    .code { font-size: 9pt; font-weight: bold; font-family: monospace; }
    .name { font-size: 8pt; margin-top: 1mm; }
    .loc { font-size: 7pt; color: #555; margin-top: 1mm; }
  </style></head><body><div class="grid">${items
    .map(
      ({ a, img }) => `<div class="label"><img src="${img}"/><div><div class="org">Aset Ruang Kelana</div><div class="code">${esc(
        a.code
      )}</div><div class="name">${esc(a.name)}</div><div class="loc">${esc(a.location || '')}</div></div></div>`
    )
    .join('')}</div></body></html>`);
  win.document.close();
  // Dipanggil dari jendela utama (skrip inline diblokir oleh Content Security Policy)
  setTimeout(() => win.print(), 500);
};

// Pemindai QR: kamera (BarcodeDetector) dengan cadangan input manual / scanner USB
export const QrScanner: React.FC<{ onCode: (code: string) => void; paused?: boolean }> = ({ onCode, paused }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<'manual' | 'camera'>('manual');
  const [error, setError] = useState('');
  const [manual, setManual] = useState('');
  const lastRef = useRef({ code: '', at: 0 });
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  useEffect(() => {
    if (mode !== 'camera') return;
    let stream: MediaStream | null = null;
    let timer = 0;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (stopped || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13'] });
        const tick = async () => {
          if (stopped) return;
          try {
            if (!pausedRef.current && videoRef.current && videoRef.current.readyState >= 2) {
              const found = await detector.detect(videoRef.current);
              const raw = found?.[0]?.rawValue;
              if (raw) {
                const code = parseScannedCode(raw);
                const t = Date.now();
                if (code !== lastRef.current.code || t - lastRef.current.at > 3000) {
                  lastRef.current = { code, at: t };
                  onCodeRef.current(code);
                }
              }
            }
          } catch {
            /* frame belum siap */
          }
          timer = window.setTimeout(tick, 350);
        };
        tick();
      } catch {
        setError('Kamera tidak dapat diakses. Izinkan akses kamera atau gunakan input manual.');
        setMode('manual');
      }
    })();
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [mode]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border ${
            mode === 'manual' ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          <Keyboard size={15} /> Ketik / Scanner USB
        </button>
        <button
          type="button"
          disabled={!supported}
          title={supported ? '' : 'Browser ini belum mendukung pemindaian kamera (gunakan Chrome Android/desktop)'}
          onClick={() => {
            setError('');
            setMode('camera');
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border disabled:opacity-40 ${
            mode === 'camera' ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          <Camera size={15} /> Kamera
        </button>
      </div>
      {mode === 'camera' ? (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          <div className="absolute inset-[18%] border-2 border-white/80 rounded-xl pointer-events-none" />
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manual.trim()) onCode(parseScannedCode(manual));
            setManual('');
          }}
          className="flex gap-2"
        >
          <input
            autoFocus
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Kode aset, mis. KLN-IT-2026-0001"
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-mono text-gray-900 dark:text-white"
          />
          <button className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold">Cari</button>
        </form>
      )}
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {!supported && <p className="text-[11px] text-gray-500">Tips: dari HP, buka kamera bawaan & arahkan ke QR — tautan langsung membuka detail aset.</p>}
    </div>
  );
};
