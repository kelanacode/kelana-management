// Form registrasi/edit aset dan panel detail aset (QR, depresiasi, riwayat).
import React, { useMemo, useState } from 'react';
import { ExternalLink, Printer, Wrench, ArrowRightLeft, Trash2, Edit3, AlertTriangle } from 'lucide-react';
import { useAssetStore, type NewAsset } from '../../stores/assetStore';
import type { Asset, AssetCategory, AssetCondition, AssetStatus } from '../../types/asset';
import {
  ASSET_CONDITIONS, ASSET_STATUSES, CATEGORY_INFO, STATUS_STYLE, addDays, daysUntil, depreciation,
  depreciationSchedule, disposalAdvice, rupiah, todayStr,
} from '../../utils/assetUtils';
import { Modal, QrImage, printLabels } from './QrTools';

export const inputCls =
  'w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500';
export const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string; className?: string }> = ({ label, children, hint, className }) => (
  <label className={`block ${className ?? ''}`}>
    <span className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-gray-400 mt-1">{hint}</span>}
  </label>
);

export const DEFAULT_LIFE: Record<AssetCategory, number> = { ITAM: 4, Fixed: 20, Facility: 8, Digital: 4 };

export const AssetFormModal: React.FC<{
  asset?: Asset | null;
  prefill?: Partial<NewAsset>;
  locations: string[];
  by: string;
  onClose: () => void;
  onSaved?: (a: Asset) => void;
}> = ({ asset, prefill, locations, by, onClose, onSaved }) => {
  const { addAsset, updateAsset } = useAssetStore();
  const init = asset ?? prefill ?? {};
  const [f, setF] = useState({
    name: init.name ?? '',
    category: (init.category ?? 'ITAM') as AssetCategory,
    subCategory: init.subCategory ?? '',
    brand: init.brand ?? '',
    model: init.model ?? '',
    serialNumber: init.serialNumber ?? '',
    specs: init.specs ?? '',
    vendor: init.vendor ?? '',
    invoiceNumber: init.invoiceNumber ?? '',
    purchaseDate: init.purchaseDate ?? todayStr(),
    purchasePrice: String(init.purchasePrice ?? ''),
    salvageValue: String(init.salvageValue ?? 0),
    usefulLifeYears: String(init.usefulLifeYears ?? DEFAULT_LIFE[(init.category ?? 'ITAM') as AssetCategory]),
    warrantyUntil: init.warrantyUntil ?? '',
    location: init.location ?? '',
    status: (init.status ?? 'Tersedia') as AssetStatus,
    condition: (init.condition ?? 'Baik') as AssetCondition,
    division: init.division ?? '',
    maintenanceIntervalDays: String(init.maintenanceIntervalDays ?? ''),
    nextMaintenanceDate: init.nextMaintenanceDate ?? '',
    licenseKey: init.licenseKey ?? '',
    licenseExpiry: init.licenseExpiry ?? '',
    digitalUrl: init.digitalUrl ?? '',
    notes: init.notes ?? '',
  });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const valid = f.name.trim() && f.location.trim() && Number(f.purchasePrice) >= 0 && f.purchasePrice !== '';

  const save = () => {
    if (!valid) return;
    const interval = Number(f.maintenanceIntervalDays) || undefined;
    const data: NewAsset = {
      name: f.name.trim(),
      category: f.category,
      subCategory: f.subCategory.trim() || undefined,
      brand: f.brand.trim() || undefined,
      model: f.model.trim() || undefined,
      serialNumber: f.serialNumber.trim() || undefined,
      specs: f.specs.trim() || undefined,
      vendor: f.vendor.trim() || undefined,
      invoiceNumber: f.invoiceNumber.trim() || undefined,
      purchaseDate: f.purchaseDate,
      purchasePrice: Number(f.purchasePrice) || 0,
      salvageValue: Math.min(Number(f.salvageValue) || 0, Number(f.purchasePrice) || 0),
      usefulLifeYears: Number(f.usefulLifeYears) || 0,
      warrantyUntil: f.warrantyUntil || undefined,
      location: f.location.trim(),
      status: f.status,
      condition: f.condition,
      division: f.division.trim() || undefined,
      maintenanceIntervalDays: interval,
      nextMaintenanceDate: f.nextMaintenanceDate || (interval ? addDays(f.purchaseDate || todayStr(), interval) : undefined),
      licenseKey: f.licenseKey.trim() || undefined,
      licenseExpiry: f.licenseExpiry || undefined,
      digitalUrl: f.digitalUrl.trim() || undefined,
      notes: f.notes.trim() || undefined,
      assignedToId: asset?.assignedToId,
      assignedToName: asset?.assignedToName,
    };
    if (asset) {
      updateAsset(asset.id, data, by);
      onSaved?.({ ...asset, ...data });
    } else {
      onSaved?.(addAsset(data, by));
    }
    onClose();
  };

  return (
    <Modal title={asset ? `Edit Aset · ${asset.code}` : 'Registrasi Aset Baru'} onClose={onClose} wide>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Nama aset *" className="md:col-span-2">
          <input className={inputCls} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Laptop ThinkPad T14" />
        </Field>
        <Field label="Kategori" hint={CATEGORY_INFO[f.category].examples}>
          <select
            className={inputCls}
            value={f.category}
            disabled={!!asset}
            onChange={(e) => {
              const c = e.target.value as AssetCategory;
              setF((p) => ({ ...p, category: c, usefulLifeYears: String(DEFAULT_LIFE[c]) }));
            }}
          >
            {(Object.keys(CATEGORY_INFO) as AssetCategory[]).map((c) => (
              <option key={c} value={c}>{CATEGORY_INFO[c].label}</option>
            ))}
          </select>
        </Field>
        <Field label="Sub-kategori"><input className={inputCls} value={f.subCategory} onChange={(e) => set('subCategory', e.target.value)} placeholder="Laptop / Kendaraan / AC" /></Field>
        <Field label="Merek"><input className={inputCls} value={f.brand} onChange={(e) => set('brand', e.target.value)} /></Field>
        <Field label="Tipe / Model"><input className={inputCls} value={f.model} onChange={(e) => set('model', e.target.value)} /></Field>
        <Field label="Nomor seri"><input className={inputCls} value={f.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} /></Field>
        <Field label="Vendor"><input className={inputCls} value={f.vendor} onChange={(e) => set('vendor', e.target.value)} /></Field>
        <Field label="No. invoice"><input className={inputCls} value={f.invoiceNumber} onChange={(e) => set('invoiceNumber', e.target.value)} /></Field>
        <Field label="Spesifikasi" className="md:col-span-3">
          <textarea className={inputCls} rows={2} value={f.specs} onChange={(e) => set('specs', e.target.value)} placeholder="i7, RAM 16GB, SSD 512GB" />
        </Field>

        <Field label="Tanggal beli"><input type="date" className={inputCls} value={f.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} /></Field>
        <Field label="Harga beli (Rp) *"><input type="number" min="0" className={inputCls} value={f.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} /></Field>
        <Field label="Garansi sampai"><input type="date" className={inputCls} value={f.warrantyUntil} onChange={(e) => set('warrantyUntil', e.target.value)} /></Field>
        <Field label="Umur ekonomis (tahun)" hint="Depresiasi garis lurus"><input type="number" min="0" step="0.5" className={inputCls} value={f.usefulLifeYears} onChange={(e) => set('usefulLifeYears', e.target.value)} /></Field>
        <Field label="Nilai sisa (Rp)"><input type="number" min="0" className={inputCls} value={f.salvageValue} onChange={(e) => set('salvageValue', e.target.value)} /></Field>
        <Field label="Divisi pemilik"><input className={inputCls} value={f.division} onChange={(e) => set('division', e.target.value)} /></Field>

        <Field label="Lokasi fisik *">
          <input className={inputCls} list="asset-locations" value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="Ruang Rapat Lt. 2 · Cirebon" />
          <datalist id="asset-locations">{locations.map((l) => <option key={l} value={l} />)}</datalist>
        </Field>
        <Field label="Status">
          <select className={inputCls} value={f.status} onChange={(e) => set('status', e.target.value)}>
            {ASSET_STATUSES.filter((s) => s !== 'Dihapus' && s !== 'Dipinjam').map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Kondisi">
          <select className={inputCls} value={f.condition} onChange={(e) => set('condition', e.target.value)}>
            {ASSET_CONDITIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Interval perawatan (hari)" hint="Kosongkan bila tidak perlu"><input type="number" min="0" className={inputCls} value={f.maintenanceIntervalDays} onChange={(e) => set('maintenanceIntervalDays', e.target.value)} placeholder="90" /></Field>
        <Field label="Perawatan berikutnya"><input type="date" className={inputCls} value={f.nextMaintenanceDate} onChange={(e) => set('nextMaintenanceDate', e.target.value)} /></Field>
        <div />
        {(f.category === 'ITAM' || f.category === 'Digital') && (
          <>
            <Field label={f.category === 'ITAM' ? 'Kunci lisensi' : 'Hak / lisensi'}><input className={inputCls} value={f.licenseKey} onChange={(e) => set('licenseKey', e.target.value)} /></Field>
            <Field label="Lisensi berakhir"><input type="date" className={inputCls} value={f.licenseExpiry} onChange={(e) => set('licenseExpiry', e.target.value)} /></Field>
            <Field label="Link berkas / repo"><input className={inputCls} value={f.digitalUrl} onChange={(e) => set('digitalUrl', e.target.value)} placeholder="https://" /></Field>
          </>
        )}
        <Field label="Catatan" className="md:col-span-3"><textarea className={inputCls} rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Batal</button>
        <button disabled={!valid} onClick={save} className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-40">
          {asset ? 'Simpan Perubahan' : 'Registrasi & Buat QR'}
        </button>
      </div>
    </Modal>
  );
};

export const StatusBadge: React.FC<{ status: AssetStatus }> = ({ status }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[status]}`}>{status}</span>
);

export const AssetDetailModal: React.FC<{
  asset: Asset;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onLoan: () => void;
  onReport: () => void;
  onDispose: () => void;
  onDelete: () => void;
}> = ({ asset, canManage, onClose, onEdit, onLoan, onReport, onDispose, onDelete }) => {
  const { loans, maintenance } = useAssetStore();
  const [tab, setTab] = useState<'info' | 'dep' | 'riwayat'>('info');
  const dep = depreciation(asset);
  const schedule = useMemo(() => depreciationSchedule(asset), [asset]);
  const advice = disposalAdvice(asset, maintenance);
  const ownLoans = loans.filter((l) => l.assetId === asset.id);
  const ownMaint = maintenance.filter((m) => m.assetId === asset.id);
  const warrantyDays = daysUntil(asset.warrantyUntil);
  const row = (label: string, value?: React.ReactNode) =>
    value ? (
      <div className="flex justify-between gap-4 py-1.5 border-b border-gray-100 dark:border-gray-800 text-sm">
        <span className="text-gray-500">{label}</span>
        <span className="text-right font-medium text-gray-900 dark:text-white break-all">{value}</span>
      </div>
    ) : null;

  return (
    <Modal title={<span>{asset.name} <span className="font-mono text-sm text-gray-500">· {asset.code}</span></span>} onClose={onClose} wide>
      <div className="flex flex-col md:flex-row gap-5">
        <div className="md:w-56 flex-shrink-0 flex flex-col items-center gap-3">
          <QrImage code={asset.code} size={180} />
          <span className="font-mono text-xs text-gray-500">{asset.code}</span>
          <div className="flex flex-wrap gap-2 justify-center">
            <StatusBadge status={asset.status} />
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{asset.condition}</span>
          </div>
          <div className="w-full grid grid-cols-2 gap-2">
            <button onClick={() => printLabels([asset])} className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
              <Printer size={14} /> Cetak Label QR
            </button>
            {asset.status !== 'Dihapus' && (
              <button onClick={onReport} className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                <Wrench size={14} /> Laporkan Kerusakan
              </button>
            )}
            {canManage && asset.status !== 'Dihapus' && (
              <>
                <button onClick={onLoan} disabled={asset.status === 'Dipinjam' || asset.status === 'Servis'} className="flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-semibold disabled:opacity-40">
                  <ArrowRightLeft size={13} /> Serah/Pinjam
                </button>
                <button onClick={onEdit} className="flex items-center justify-center gap-1 px-2 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                  <Edit3 size={13} /> Edit
                </button>
                <button onClick={onDispose} className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  <Trash2 size={13} /> Penghapusan (Disposal)
                </button>
              </>
            )}
            {canManage && (
              <button onClick={onDelete} className="col-span-2 text-[11px] text-gray-400 hover:text-rose-600">Hapus data (salah input)</button>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {advice && (
            <div className={`mb-3 flex gap-2 p-3 rounded-xl text-xs ${advice.level === 'Hapus' ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
              <AlertTriangle size={15} className="flex-shrink-0" />
              <span><b>{advice.level === 'Hapus' ? 'Rekomendasi: hapus / ganti aset.' : 'Rekomendasi: pantau & rencanakan peremajaan.'}</b> {advice.reasons.join(' · ')}</span>
            </div>
          )}
          <div className="flex gap-1 mb-3 border-b border-gray-100 dark:border-gray-800">
            {([['info', 'Informasi'], ['dep', 'Depresiasi'], ['riwayat', `Riwayat (${ownLoans.length + ownMaint.length})`]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px ${tab === k ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>{l}</button>
            ))}
          </div>

          {tab === 'info' && (
            <div>
              {row('Kategori', `${CATEGORY_INFO[asset.category].label}${asset.subCategory ? ' · ' + asset.subCategory : ''}`)}
              {row('Merek / Model', [asset.brand, asset.model].filter(Boolean).join(' '))}
              {row('Nomor seri', asset.serialNumber)}
              {row('Spesifikasi', asset.specs)}
              {row('Lokasi', asset.location)}
              {row('Pengguna', asset.assignedToName)}
              {row('Divisi', asset.division)}
              {row('Vendor', asset.vendor)}
              {row('No. invoice', asset.invoiceNumber)}
              {row('Tanggal beli', asset.purchaseDate)}
              {row('Harga beli', rupiah(asset.purchasePrice))}
              {row('Nilai buku saat ini', rupiah(dep.bookValue))}
              {row('Garansi', asset.warrantyUntil ? `${asset.warrantyUntil} (${warrantyDays! >= 0 ? `${warrantyDays} hari lagi` : 'habis'})` : undefined)}
              {row('Perawatan berikutnya', asset.nextMaintenanceDate ? `${asset.nextMaintenanceDate} · tiap ${asset.maintenanceIntervalDays ?? '-'} hari` : undefined)}
              {row('Lisensi', asset.licenseKey)}
              {row('Lisensi berakhir', asset.licenseExpiry)}
              {row('Link', asset.digitalUrl ? <a href={asset.digitalUrl} target="_blank" rel="noreferrer" className="text-primary-600 inline-flex items-center gap-1">Buka <ExternalLink size={12} /></a> : undefined)}
              {row('Stock opname terakhir', asset.lastAuditAt ? `${new Date(asset.lastAuditAt).toLocaleString('id-ID')} · ${asset.lastAuditBy}` : 'Belum pernah')}
              {row('Catatan', asset.notes)}
              {asset.disposal && row('Penghapusan', `${asset.disposal.method} · ${asset.disposal.date} · ${rupiah(asset.disposal.value)} · ${asset.disposal.reason} (disetujui ${asset.disposal.approvedBy})`)}
            </div>
          )}

          {tab === 'dep' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  ['Harga beli', rupiah(asset.purchasePrice)],
                  ['Penyusutan / bulan', rupiah(dep.monthly)],
                  ['Akumulasi', rupiah(dep.accumulated)],
                  ['Nilai buku', rupiah(dep.bookValue)],
                ].map(([l, v]) => (
                  <div key={l} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                    <p className="text-[11px] text-gray-500">{l}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{v}</p>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                  <span>Umur terpakai {dep.elapsedMonths} / {dep.lifeMonths} bulan</span>
                  <span>{dep.percentUsed.toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div className={`h-full ${dep.percentUsed >= 85 ? 'bg-rose-500' : 'bg-primary-500'}`} style={{ width: `${dep.percentUsed}%` }} />
                </div>
              </div>
              <p className="text-[11px] text-gray-500">Metode garis lurus: (harga beli − nilai sisa {rupiah(asset.salvageValue)}) ÷ {asset.usefulLifeYears} tahun.</p>
              {schedule.length > 0 && (
                <table className="w-full text-xs">
                  <thead><tr className="text-left text-gray-500"><th className="py-1">Tahun</th><th className="text-right">Beban penyusutan</th><th className="text-right">Akumulasi</th><th className="text-right">Nilai buku</th></tr></thead>
                  <tbody>
                    {schedule.map((r) => (
                      <tr key={r.year} className={`border-t border-gray-100 dark:border-gray-800 ${r.year === new Date().getFullYear() ? 'font-bold text-primary-600' : 'text-gray-700 dark:text-gray-300'}`}>
                        <td className="py-1">{r.year}</td><td className="text-right">{rupiah(r.expense)}</td><td className="text-right">{rupiah(r.accumulated)}</td><td className="text-right">{rupiah(r.bookValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'riwayat' && (
            <div className="space-y-2">
              {(asset.history ?? []).map((h, i) => (
                <div key={i} className="flex gap-3 text-xs">
                  <span className="text-gray-400 w-32 flex-shrink-0">{new Date(h.at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  <span className="text-gray-700 dark:text-gray-200">{h.action} <span className="text-gray-400">— {h.by}</span></span>
                </div>
              ))}
              {!asset.history?.length && <p className="text-sm text-gray-500">Belum ada riwayat.</p>}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
