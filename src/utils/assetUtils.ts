// Perhitungan & aturan modul Manajemen Aset
import type { Asset, AssetCategory, AssetMaintenance, AssetStatus, AssetCondition } from '../types/asset';

export const CATEGORY_INFO: Record<AssetCategory, { label: string; short: string; prefix: string; desc: string; examples: string }> = {
  ITAM: { label: 'IT Asset (ITAM)', short: 'IT', prefix: 'IT', desc: 'Perangkat keras & lunak: lisensi, spesifikasi, keamanan', examples: 'Laptop, server, router, lisensi SaaS, printer' },
  Fixed: { label: 'Aset Tetap', short: 'Aset Tetap', prefix: 'FA', desc: 'Aset berwujud bernilai tinggi, masa manfaat panjang', examples: 'Gedung, tanah, kendaraan operasional' },
  Facility: { label: 'Fasilitas Kantor', short: 'Fasilitas', prefix: 'FC', desc: 'Fasilitas fisik penunjang kenyamanan kerja', examples: 'Meja, kursi, AC, proyektor, dispenser' },
  Digital: { label: 'Aset Digital (DAM)', short: 'Digital', prefix: 'DA', desc: 'Berkas digital bernilai komersial/operasional', examples: 'Dokumen legal, source code, desain, media' },
};

export const ASSET_STATUSES: AssetStatus[] = ['Tersedia', 'Digunakan', 'Dipinjam', 'Servis', 'Rusak', 'Dihapus'];
export const ASSET_CONDITIONS: AssetCondition[] = ['Baik', 'Cukup', 'Rusak Ringan', 'Rusak Berat'];

export const STATUS_STYLE: Record<AssetStatus, string> = {
  Tersedia: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Digunakan: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Dipinjam: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  Servis: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Rusak: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  Dihapus: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

export const rupiah = (n: number) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');

// Akses Manajemen Aset (melihat & mengisi): CEO, Admin, dan role HR dengan jabatan General Affair
export const isGeneralAffair = (position?: string) => /general\s*affairs?|\bGA\b/i.test(position ?? '');
export const canAccessAssets = (user?: { role?: string; position?: string } | null) =>
  !!user && (user.role === 'Admin' || user.role === 'CEO' || (user.role === 'HR' && isGeneralAffair(user.position)));
// Persetujuan anggaran pengadaan & penghapusan aset: Admin & CEO
export const canApproveAssets = (role?: string) => ['Admin', 'CEO'].includes(role ?? '');

// Kode unik: KLN-<prefix>-<tahun>-<urut 4 digit>
export const nextAssetCode = (category: AssetCategory, existing: Asset[], year = new Date().getFullYear()) => {
  const base = `KLN-${CATEGORY_INFO[category].prefix}-${year}-`;
  const max = existing
    .filter((a) => a.code?.startsWith(base))
    .reduce((m, a) => Math.max(m, parseInt(a.code.slice(base.length), 10) || 0), 0);
  return base + String(max + 1).padStart(4, '0');
};

export const assetQrUrl = (code: string) => `${window.location.origin}/assets?code=${encodeURIComponent(code)}`;

// Ambil kode aset dari hasil pindai (URL QR atau kode langsung)
export const parseScannedCode = (raw: string) => {
  const text = raw.trim();
  try {
    const u = new URL(text);
    return (u.searchParams.get('code') ?? text).trim().toUpperCase();
  } catch {
    return text.toUpperCase();
  }
};

const monthsBetween = (from: Date, to: Date) =>
  Math.max(0, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) - (to.getDate() < from.getDate() ? 1 : 0));

// Depresiasi garis lurus, dihitung per bulan berjalan
export const depreciation = (a: Asset, at = new Date()) => {
  const cost = a.purchasePrice || 0;
  const salvage = Math.min(a.salvageValue || 0, cost);
  const hasLife = (a.usefulLifeYears || 0) > 0;
  const lifeMonths = Math.max(1, Math.round((a.usefulLifeYears || 0) * 12));
  const base = cost - salvage;
  const monthly = hasLife ? base / lifeMonths : 0;
  const end = a.status === 'Dihapus' && a.disposal?.date ? new Date(a.disposal.date) : at;
  const elapsed = a.purchaseDate ? Math.min(lifeMonths, monthsBetween(new Date(a.purchaseDate), end)) : 0;
  const accumulated = hasLife ? Math.min(base, monthly * elapsed) : 0;
  return {
    monthly,
    yearly: monthly * 12,
    elapsedMonths: elapsed,
    lifeMonths,
    accumulated,
    bookValue: cost - accumulated,
    percentUsed: hasLife ? Math.min(100, (elapsed / lifeMonths) * 100) : 0,
  };
};

// Jadwal depresiasi per tahun
export const depreciationSchedule = (a: Asset) => {
  if (!a.purchaseDate || !((a.usefulLifeYears || 0) > 0)) return [];
  const start = new Date(a.purchaseDate).getFullYear();
  const rows: { year: number; expense: number; accumulated: number; bookValue: number }[] = [];
  for (let y = start; y <= start + Math.ceil(a.usefulLifeYears) + 1; y++) {
    const acc = depreciation({ ...a, status: 'Tersedia' }, new Date(y, 11, 31, 23)).accumulated;
    const prev = rows.length ? rows[rows.length - 1].accumulated : 0;
    if (acc - prev <= 0.5 && rows.length) break;
    rows.push({ year: y, expense: acc - prev, accumulated: acc, bookValue: a.purchasePrice - acc });
  }
  return rows;
};

// Rekomendasi peremajaan / penghapusan berdasarkan depresiasi, kondisi, dan biaya servis
export const disposalAdvice = (a: Asset, maint: AssetMaintenance[]) => {
  if (a.status === 'Dihapus') return null;
  const reasons: string[] = [];
  let critical = false;
  const d = depreciation(a);
  const own = maint.filter((m) => m.assetId === a.id);
  const serviceCost = own.reduce((s, m) => s + (m.cost || 0), 0);
  const repairs = own.filter((m) => m.type === 'Perbaikan').length;
  if (a.usefulLifeYears > 0 && d.percentUsed >= 100) {
    reasons.push('Umur ekonomis sudah habis');
    critical = true;
  } else if (a.usefulLifeYears > 0 && d.percentUsed >= 85) {
    reasons.push(`Umur ekonomis tersisa ${Math.max(0, d.lifeMonths - d.elapsedMonths)} bulan`);
  }
  if (a.condition === 'Rusak Berat') {
    reasons.push('Kondisi rusak berat');
    critical = true;
  }
  if (a.purchasePrice > 0 && serviceCost >= a.purchasePrice * 0.5) {
    reasons.push('Total biaya servis ≥ 50% harga beli');
    critical = true;
  } else if (serviceCost > 0 && serviceCost >= d.bookValue) {
    reasons.push('Total biaya servis melebihi nilai buku');
    critical = true;
  }
  if (repairs >= 3) reasons.push(`Sudah ${repairs}x perbaikan`);
  if (!reasons.length) return null;
  return { level: critical ? ('Hapus' as const) : ('Pantau' as const), reasons, serviceCost };
};

export const daysUntil = (date?: string) => {
  if (!date) return null;
  const t = new Date(date);
  t.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - now.getTime()) / 86400000);
};

export const addDays = (date: string, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
