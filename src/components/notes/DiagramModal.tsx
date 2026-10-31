import React from 'react';
import { X, Network, GitFork, LayoutGrid, Layers, ArrowRight } from 'lucide-react';

interface DiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (diagramHtml: string) => void;
}

const DIAGRAM_TEMPLATES = [
  {
    id: 'process-flow',
    title: 'Diagram Alur Proses (3 Tahap)',
    desc: 'Langkah berurutan: Perencanaan → Eksekusi → Review',
    icon: Network,
    html: `<div style="display:flex; align-items:center; justify-content:center; gap:8px; margin:1.5rem 0; flex-wrap:wrap;">
      <div style="background:#ede9fe; color:#5b21b6; padding:12px 18px; border-radius:10px; font-weight:bold; font-size:13px; text-align:center; min-width:130px; border:1px solid #c4b5fd;">1. Perencanaan<br/><span style="font-weight:normal; font-size:11px;">Identifikasi Kebutuhan</span></div>
      <div style="color:#7c3aed; font-size:18px;">➔</div>
      <div style="background:#e0f2fe; color:#0369a1; padding:12px 18px; border-radius:10px; font-weight:bold; font-size:13px; text-align:center; min-width:130px; border:1px solid #7dd3fc;">2. Eksekusi<br/><span style="font-weight:normal; font-size:11px;">Pengerjaan Fitur</span></div>
      <div style="color:#0284c7; font-size:18px;">➔</div>
      <div style="background:#dcfce7; color:#15803d; padding:12px 18px; border-radius:10px; font-weight:bold; font-size:13px; text-align:center; min-width:130px; border:1px solid #86efac;">3. Evaluasi & Rilis<br/><span style="font-weight:normal; font-size:11px;">QA & Go-Live</span></div>
    </div><p></p>`,
  },
  {
    id: 'swot-grid',
    title: 'Matriks SWOT (Strengths, Weaknesses, Opportunities, Threats)',
    desc: 'Analisis strategis 4 kuadran proyek/bisnis',
    icon: LayoutGrid,
    html: `<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:1.5rem 0;">
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:14px; border-radius:10px;">
        <h4 style="margin:0 0 6px 0; color:#166534; font-size:14px;">💪 Strengths (Kekuatan)</h4>
        <ul style="margin:0; padding-left:18px; font-size:12px; color:#14532d;"><li>Fitur lengkap & terintegrasi</li><li>UI intuitif modern</li></ul>
      </div>
      <div style="background:#fef2f2; border:1px solid #fecaca; padding:14px; border-radius:10px;">
        <h4 style="margin:0 0 6px 0; color:#991b1b; font-size:14px;">⚠️ Weaknesses (Kelemahan)</h4>
        <ul style="margin:0; padding-left:18px; font-size:12px; color:#7f1d1d;"><li>Membutuhkan edukasi pengguna baru</li></ul>
      </div>
      <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:14px; border-radius:10px;">
        <h4 style="margin:0 0 6px 0; color:#1e40af; font-size:14px;">🚀 Opportunities (Peluang)</h4>
        <ul style="margin:0; padding-left:18px; font-size:12px; color:#1e3a8a;"><li>Pasar kerja remote yang bertumbuh</li></ul>
      </div>
      <div style="background:#fffbeb; border:1px solid #fde68a; padding:14px; border-radius:10px;">
        <h4 style="margin:0 0 6px 0; color:#92400e; font-size:14px;">🛡️ Threats (Tantangan)</h4>
        <ul style="margin:0; padding-left:18px; font-size:12px; color:#78350f;"><li>Kompetisi aplikasi global</li></ul>
      </div>
    </div><p></p>`,
  },
  {
    id: 'architecture-3tier',
    title: 'Arsitektur Sistem (Frontend - Backend - Database)',
    desc: 'Diagram layer arsitektur teknologi',
    icon: Layers,
    html: `<div style="max-width:480px; margin:1.5rem auto; border:1px solid #cbd5e1; border-radius:12px; overflow:hidden;">
      <div style="background:#f1f5f9; padding:12px 16px; border-bottom:1px solid #e2e8f0; text-align:center;">
        <strong>🖥️ Client Layer (Frontend)</strong><br/><span style="font-size:11px; color:#64748b;">React 18 + Vite + Tailwind CSS</span>
      </div>
      <div style="background:#faf5ff; padding:12px 16px; border-bottom:1px solid #e2e8f0; text-align:center;">
        <strong>⚙️ Business Logic (Store & Services)</strong><br/><span style="font-size:11px; color:#64748b;">Zustand State Manager + TipTap Engine</span>
      </div>
      <div style="background:#f0fdf4; padding:12px 16px; text-align:center;">
        <strong>💾 Storage & Persistence Layer</strong><br/><span style="font-size:11px; color:#64748b;">LocalStorage & Cloud Sync</span>
      </div>
    </div><p></p>`,
  },
  {
    id: 'decision-tree',
    title: 'Pohon Keputusan (Decision Block)',
    desc: 'Blok percabangan alur logika YA / TIDAK',
    icon: GitFork,
    html: `<div style="text-align:center; margin:1.5rem 0;">
      <div style="display:inline-block; background:#fef3c7; border:2px solid #f59e0b; padding:10px 20px; border-radius:8px; font-weight:bold; font-size:13px; color:#78350f;">Kondisi: Apakah Klien Setuju Penawaran?</div>
      <div style="display:flex; justify-content:center; gap:60px; margin-top:12px;">
        <div style="text-align:center;">
          <div style="color:#16a34a; font-weight:bold; font-size:12px;">[YA] ➔</div>
          <div style="background:#dcfce7; border:1px solid #86efac; color:#166534; padding:8px 14px; border-radius:6px; font-size:12px; margin-top:4px;">Kirim Kontrak Kerja</div>
        </div>
        <div style="text-align:center;">
          <div style="color:#dc2626; font-weight:bold; font-size:12px;">[TIDAK] ➔</div>
          <div style="background:#fee2e2; border:1px solid #fca5a5; color:#991b1b; padding:8px 14px; border-radius:6px; font-size:12px; margin-top:4px;">Jadwalkan Negosiasi Ulang</div>
        </div>
      </div>
    </div><p></p>`,
  },
];

export const DiagramModal: React.FC<DiagramModalProps> = ({ isOpen, onClose, onInsert }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
              <Network size={16} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">Sisipkan Diagram Alur Visual</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pilih template bagan atau diagram alir kerja</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>

        {/* Templates */}
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {DIAGRAM_TEMPLATES.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => {
                  onInsert(t.html);
                  onClose();
                }}
                className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 bg-white dark:bg-gray-800 hover:shadow-sm transition-all flex items-start gap-3.5 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950 text-primary-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Icon size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">{t.title}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.desc}</p>
                </div>
                <ArrowRight size={16} className="text-gray-300 group-hover:text-primary-600 transition-colors mt-2" />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-700 text-right">
          <button onClick={onClose} className="btn-secondary text-xs py-1.5 px-3">Batal</button>
        </div>
      </div>
    </div>
  );
};
