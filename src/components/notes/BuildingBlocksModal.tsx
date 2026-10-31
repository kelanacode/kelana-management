import React from 'react';
import { X, Layers, Users, Rocket, AlertTriangle, FileCheck, ArrowRight } from 'lucide-react';

interface BuildingBlocksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (templateHtml: string) => void;
}

const BUILDING_BLOCKS = [
  {
    id: 'meeting-notes',
    title: 'Catatan Rapat Lengkap (Meeting Notes)',
    desc: 'Peserta rapat, tujuan, poin diskusi, dan tabel action items',
    icon: Users,
    html: `<h2>📝 Notula Rapat Tim</h2>
<p><strong>Tanggal:</strong> ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} | <strong>Waktu:</strong> 10:00 - 11:30 WIB</p>
<p><strong>Peserta:</strong> @Andi Wirawan, @Budi Santoso, @Citra Dewi</p>
<hr/>
<h3>🎯 Tujuan Rapat</h3>
<p>Membahas sinkronisasi modul aplikasi dan timeline deployment.</p>
<h3>💡 Poin-Poin Diskusi</h3>
<ul>
  <li>Penyelesaian fitur pengeditan dokumen berstandar Google Docs &amp; Word.</li>
  <li>Validasi integrasi kalender dan pengingat acara divisi.</li>
</ul>
<h3>✅ Tindak Lanjut (Action Items)</h3>
<table style="width:100%; border-collapse:collapse;">
  <thead>
    <tr><th style="border:1px solid #cbd5e1; padding:8px;">Tugas</th><th style="border:1px solid #cbd5e1; padding:8px;">Penanggung Jawab</th><th style="border:1px solid #cbd5e1; padding:8px;">Tenggat</th></tr>
  </thead>
  <tbody>
    <tr><td style="border:1px solid #cbd5e1; padding:8px;">Finalisasi testing dark mode</td><td style="border:1px solid #cbd5e1; padding:8px;">Andi</td><td style="border:1px solid #cbd5e1; padding:8px;">Besok</td></tr>
    <tr><td style="border:1px solid #cbd5e1; padding:8px;">Review dokumentasi pengguna</td><td style="border:1px solid #cbd5e1; padding:8px;">Budi</td><td style="border:1px solid #cbd5e1; padding:8px;">Lusa</td></tr>
  </tbody>
</table><p></p>`,
  },
  {
    id: 'project-brief',
    title: 'Ringkasan Proyek (Project Brief)',
    desc: 'Latar belakang, sasaran KPI, ruang lingkup, dan jadwal deliverable',
    icon: Rocket,
    html: `<h2>🚀 Ringkasan Proyek: [Nama Inisiatif]</h2>
<div class="callout-box"><strong>Ringkasan Eksekutif:</strong> Inisiatif ini bertujuan untuk meningkatkan produktivitas kolaborasi kerja tim secara terpusat.</div>
<h3>1. Latar Belakang &amp; Sasaran</h3>
<p>Kebutuhan workspace all-in-one yang fleksibel untuk dokumentasi, manajemen tugas, dan database kustom.</p>
<h3>2. Ruang Lingkup Kerja</h3>
<ul>
  <li><strong>Dalam Cakupan:</strong> Editor dokumen, kanban drag-and-drop, kalender acara WIB.</li>
  <li><strong>Luar Cakupan:</strong> Sistem penggajian payroll otomatis.</li>
</ul>
<h3>3. Jadwal Deliverable</h3>
<ul>
  <li>Milestone 1: Prototype Desain &amp; Arsitektur</li>
  <li>Milestone 2: Implementasi Fitur Utama</li>
  <li>Milestone 3: Pengujian QA &amp; Rilis Produksi</li>
</ul><p></p>`,
  },
  {
    id: 'callout-box',
    title: 'Kotak Peringatan / Info (Callout Box)',
    desc: 'Kotak sorotan warna dengan batas kiri tebal untuk informasi penting',
    icon: AlertTriangle,
    html: `<div class="callout-box">
  <h4 style="margin:0 0 4px 0; color:#6d28d9;">💡 Informasi Penting / Catatan Khusus</h4>
  <p style="margin:0; font-size:14px; color:#4c1d95;">Tuliskan poin krusial, syarat regulasi, atau peringatan keselamatan kerja di sini.</p>
</div><p></p>`,
  },
  {
    id: 'decision-log',
    title: 'Lembar Catatan Keputusan (Decision Log)',
    desc: 'Dokumentasi keputusan strategis, opsi alternatif, dan justifikasi',
    icon: FileCheck,
    html: `<h2>📋 Catatan Keputusan Strategis</h2>
<table style="width:100%; border-collapse:collapse;">
  <thead>
    <tr><th style="border:1px solid #cbd5e1; padding:8px;">Tanggal</th><th style="border:1px solid #cbd5e1; padding:8px;">Topik Keputusan</th><th style="border:1px solid #cbd5e1; padding:8px;">Opsi Terpilih</th><th style="border:1px solid #cbd5e1; padding:8px;">Alasan / Justifikasi</th></tr>
  </thead>
  <tbody>
    <tr>
      <td style="border:1px solid #cbd5e1; padding:8px;">${new Date().toLocaleDateString('id-ID')}</td>
      <td style="border:1px solid #cbd5e1; padding:8px;">Format Dokumen Editor</td>
      <td style="border:1px solid #cbd5e1; padding:8px;">TipTap Modular Suite</td>
      <td style="border:1px solid #cbd5e1; padding:8px;">Dukungan tabel, task list, dan kustomisasi Google Docs / Word yang luwes</td>
    </tr>
  </tbody>
</table><p></p>`,
  },
];

export const BuildingBlocksModal: React.FC<BuildingBlocksModalProps> = ({ isOpen, onClose, onInsert }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-600 flex items-center justify-center">
              <Layers size={16} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">Sisipkan Elemen Penyusun (Building Blocks)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Gaya Google Docs: Template terstruktur siap pakai</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>

        {/* Templates list */}
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {BUILDING_BLOCKS.map(b => {
            const Icon = b.icon;
            return (
              <button
                key={b.id}
                onClick={() => {
                  onInsert(b.html);
                  onClose();
                }}
                className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 bg-white dark:bg-gray-800 hover:shadow-sm transition-all flex items-start gap-3.5 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950 text-primary-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Icon size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">{b.title}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{b.desc}</p>
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
