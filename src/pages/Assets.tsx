// Manajemen Aset Kantor — siklus hidup aset:
// Pengadaan ➔ Registrasi & Label QR ➔ Distribusi/Peminjaman ➔ Pemeliharaan & Stock Opname ➔ Penghapusan.
// Ditambah pengelolaan barang habis pakai dengan peringatan stok minimum & pengajuan restock.
import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import {
  Package, Plus, Search, Printer, ScanLine, LayoutDashboard, ArrowRightLeft, Wrench, ShoppingCart,
  Boxes, ClipboardCheck, Trash2, AlertTriangle, CheckCircle2, Clock, TrendingDown, Undo2, Play,
  Check, X, PackagePlus, PackageMinus, History,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useAssetStore } from '../stores/assetStore';
import type { Asset, AssetCategory, AssetCondition, AssetDisposal, AssetMaintenance, AssetRequest, AssetStatus, Supply } from '../types/asset';
import {
  ASSET_CONDITIONS, ASSET_STATUSES, CATEGORY_INFO, addDays, canAccessAssets, canApproveAssets, daysUntil,
  depreciation, disposalAdvice, rupiah, todayStr,
} from '../utils/assetUtils';
import { Modal, QrImage, QrScanner, printLabels } from '../components/assets/QrTools';
import { AssetDetailModal, AssetFormModal, Field, StatusBadge, inputCls } from '../components/assets/AssetPanels';
import type { NewAsset } from '../stores/assetStore';

type Tab = 'dashboard' | 'assets' | 'loans' | 'maintenance' | 'procurement' | 'supplies' | 'audit' | 'disposal';

const btnPrimary = 'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold disabled:opacity-40';
const btnGhost = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40';
const card = 'rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800';
const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500';
const td = 'px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 align-top';

const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');

const Empty: React.FC<{ text: string }> = ({ text }) => <div className="py-12 text-center text-sm text-gray-400">{text}</div>;

const Bars: React.FC<{ data: { label: string; value: number; color: string; display?: string }[] }> = ({ data }) => {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600 dark:text-gray-300">{d.label}</span>
            <span className="font-semibold text-gray-900 dark:text-white">{d.display ?? d.value}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const STATUS_COLOR: Record<AssetStatus, string> = {
  Tersedia: '#10b981', Digunakan: '#3b82f6', Dipinjam: '#8b5cf6', Servis: '#f59e0b', Rusak: '#f43f5e', Dihapus: '#9ca3af',
};
const CATEGORY_COLOR: Record<AssetCategory, string> = { ITAM: '#3b82f6', Fixed: '#0ea5e9', Facility: '#10b981', Digital: '#a855f7' };
const REQ_STYLE: Record<AssetRequest['status'], string> = {
  Diajukan: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  Divalidasi: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Disetujui: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Ditolak: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  Dibeli: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  Diterima: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
};

export const AssetsPage: React.FC = () => {
  const { session, users } = useAuthStore();
  const me = session?.user;
  const myName = me?.name ?? 'Staff';
  const canManage = canAccessAssets(me);
  const canApprove = canApproveAssets(me?.role);
  const store = useAssetStore();
  const { assets, loans, maintenance, requests, audits, supplies, supplyMovements } = store;

  const [tab, setTab] = useState<Tab>('dashboard');
  const [params, setParams] = useSearchParams();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formFor, setFormFor] = useState<{ asset?: Asset | null; prefill?: Partial<NewAsset>; requestId?: string; extraCopies?: number } | null>(null);
  const [loanFor, setLoanFor] = useState<Asset | null>(null);
  const [reportFor, setReportFor] = useState<Asset | null>(null);
  const [disposeFor, setDisposeFor] = useState<Asset | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const detail = assets.find((a) => a.id === detailId) ?? null;
  const activeUsers = useMemo(() => users.filter((u) => u.status === 'Active').sort((a, b) => a.name.localeCompare(b.name)), [users]);
  const locations = useMemo(() => Array.from(new Set(assets.map((a) => a.location).filter(Boolean))).sort(), [assets]);
  const liveAssets = useMemo(() => assets.filter((a) => a.status !== 'Dihapus'), [assets]);

  // Buka detail dari QR (…/assets?code=KLN-IT-2026-0001)
  const codeParam = params.get('code');
  useEffect(() => {
    if (!codeParam) return;
    const found = assets.find((a) => a.code.toUpperCase() === codeParam.toUpperCase());
    if (found) {
      setDetailId(found.id);
      setParams({}, { replace: true });
    }
  }, [codeParam, assets, setParams]);

  // Jadwal perawatan preventif otomatis (tiket dibuat H-7)
  useEffect(() => {
    if (!canManage || !assets.length) return;
    const t = setTimeout(() => store.schedulePreventive('Sistem (jadwal otomatis)'), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage, assets.length]);

  const lowStock = supplies.filter((s) => s.stock <= s.minStock);
  const overdueLoans = loans.filter((l) => l.status === 'Dipinjam' && (daysUntil(l.dueDate) ?? 0) < 0);
  const openTickets = maintenance.filter((m) => m.status !== 'Selesai');
  const pendingRequests = requests.filter((r) => ['Diajukan', 'Divalidasi', 'Disetujui', 'Dibeli'].includes(r.status));
  const adviceList = useMemo(
    () => liveAssets.map((a) => ({ a, adv: disposalAdvice(a, maintenance) })).filter((x) => x.adv),
    [liveAssets, maintenance]
  );

  const tabs: { key: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'assets', label: 'Daftar Aset', icon: Package },
    { key: 'loans', label: 'Peminjaman', icon: ArrowRightLeft, badge: overdueLoans.length },
    { key: 'maintenance', label: 'Pemeliharaan', icon: Wrench, badge: openTickets.length },
    { key: 'procurement', label: 'Pengadaan', icon: ShoppingCart, badge: pendingRequests.length },
    { key: 'supplies', label: 'Barang Habis Pakai', icon: Boxes, badge: lowStock.length },
    { key: 'audit', label: 'Stock Opname', icon: ClipboardCheck },
    { key: 'disposal', label: 'Penghapusan', icon: Trash2, badge: adviceList.filter((x) => x.adv!.level === 'Hapus').length },
  ];

  const onScanned = (code: string) => {
    const found = assets.find((a) => a.code.toUpperCase() === code);
    if (found) {
      setScanOpen(false);
      setDetailId(found.id);
    } else alert(`Aset dengan kode ${code} tidak ditemukan.`);
  };

  if (!canManage) return <Navigate to="/" replace />;

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="text-primary-600" /> Manajemen Aset Kantor
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Rencanakan, lacak, pelihara, hingga hapus aset perusahaan — sekaligus kelola stok barang habis pakai.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={btnGhost} onClick={() => setScanOpen(true)}><ScanLine size={16} /> Pindai QR</button>
            {canManage && (
              <button className={btnPrimary} onClick={() => setFormFor({})}><Plus size={16} /> Registrasi Aset</button>
            )}
          </div>
        </div>

        {/* Alur siklus hidup */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
          {[
            ['1. Perencanaan & Pengadaan', 'procurement'],
            ['2. Registrasi & Label QR', 'assets'],
            ['3. Distribusi & Operasional', 'loans'],
            ['4. Pemeliharaan & Audit', 'maintenance'],
            ['5. Penghapusan', 'disposal'],
          ].map(([label, t], i) => (
            <React.Fragment key={t}>
              {i > 0 && <span className="text-gray-300">➔</span>}
              <button onClick={() => setTab(t as Tab)} className={`px-2.5 py-1 rounded-full border ${tab === t ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900'}`}>
                {label}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 border-b border-gray-200 dark:border-gray-800">
          {tabs.map(({ key, label, icon: Icon, badge }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px ${
                tab === key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <Icon size={15} /> {label}
              {!!badge && <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center">{badge}</span>}
            </button>
          ))}
        </div>

        {tab === 'dashboard' && (
          <DashboardTab
            assets={liveAssets}
            allAssets={assets}
            maintenance={maintenance}
            lowStock={lowStock}
            overdueLoans={overdueLoans.length}
            openTickets={openTickets}
            adviceList={adviceList}
            pendingRequests={pendingRequests.length}
            goto={setTab}
            openAsset={setDetailId}
          />
        )}
        {tab === 'assets' && <AssetsTab assets={assets} locations={locations} openAsset={setDetailId} />}
        {tab === 'loans' && (
          <LoansTab canManage={canManage} myName={myName} openAsset={setDetailId} startLoan={() => setLoanFor({} as Asset)} />
        )}
        {tab === 'maintenance' && <MaintenanceTab canManage={canManage} myName={myName} openAsset={setDetailId} newTicket={() => setReportFor({} as Asset)} />}
        {tab === 'procurement' && (
          <ProcurementTab
            canManage={canManage}
            canApprove={canApprove}
            me={me}
            supplies={supplies}
            onReceiveAsset={(r) =>
              setFormFor({
                prefill: {
                  name: r.itemName,
                  category: r.category as AssetCategory,
                  purchasePrice: r.estimatedPrice,
                  vendor: r.selectedVendor,
                  division: r.department,
                  purchaseDate: todayStr(),
                },
                requestId: r.id,
                extraCopies: Math.max(0, (r.quantity || 1) - 1),
              })
            }
          />
        )}
        {tab === 'supplies' && <SuppliesTab canManage={canManage} me={me} supplies={supplies} movements={supplyMovements} />}
        {tab === 'audit' && <AuditTab canManage={canManage} myName={myName} audits={audits} assets={liveAssets} locations={locations} openAsset={setDetailId} />}
        {tab === 'disposal' && (
          <DisposalTab assets={assets} adviceList={adviceList} canApprove={canApprove} openAsset={setDetailId} dispose={setDisposeFor} />
        )}
      </div>

      {/* ---------- Modal ---------- */}
      {scanOpen && (
        <Modal title="Pindai QR Aset" onClose={() => setScanOpen(false)}>
          <QrScanner onCode={onScanned} />
        </Modal>
      )}
      {formFor && (
        <AssetFormModal
          asset={formFor.asset}
          prefill={formFor.prefill}
          locations={locations}
          by={myName}
          onClose={() => setFormFor(null)}
          onSaved={(a) => {
            if (formFor.requestId) {
              const { id, code, history, createdAt, updatedAt, disposal, ...base } = a;
              void id; void code; void history; void createdAt; void updatedAt; void disposal;
              for (let i = 0; i < (formFor.extraCopies ?? 0); i++) store.addAsset({ ...base, serialNumber: undefined }, myName);
              store.updateRequest(formFor.requestId, { status: 'Diterima' });
              setTab('assets');
            }
            if (!formFor.asset) setDetailId(a.id);
          }}
        />
      )}
      {detail && (
        <AssetDetailModal
          asset={detail}
          canManage={canManage}
          onClose={() => setDetailId(null)}
          onEdit={() => setFormFor({ asset: detail })}
          onLoan={() => setLoanFor(detail)}
          onReport={() => setReportFor(detail)}
          onDispose={() => {
            if (!canApprove) {
              alert('Penghapusan aset harus disetujui CEO atau Admin.');
              return;
            }
            setDisposeFor(detail);
          }}
          onDelete={() => {
            if (confirm(`Hapus permanen data ${detail.code}? Gunakan "Penghapusan (Disposal)" untuk aset yang dijual/didonasikan.`)) {
              store.deleteAsset(detail.id);
              setDetailId(null);
            }
          }}
        />
      )}
      {loanFor && (
        <LoanModal
          asset={loanFor.id ? loanFor : null}
          assets={liveAssets.filter((a) => a.status === 'Tersedia' || a.status === 'Digunakan')}
          users={activeUsers}
          onClose={() => setLoanFor(null)}
          onSave={(input) => {
            store.checkout(input, myName);
            setLoanFor(null);
          }}
        />
      )}
      {reportFor && (
        <TicketModal
          asset={reportFor.id ? reportFor : null}
          assets={liveAssets}
          canManage={canManage}
          onClose={() => setReportFor(null)}
          onSave={(input) => {
            store.addMaintenance(input, myName);
            setReportFor(null);
          }}
        />
      )}
      {disposeFor && (
        <DisposeModal
          asset={disposeFor}
          onClose={() => setDisposeFor(null)}
          onSave={(d) => {
            store.disposeAsset(disposeFor.id, { ...d, approvedBy: myName }, myName);
            setDisposeFor(null);
          }}
        />
      )}
    </div>
  );
};

// =====================================================================
// Dashboard
// =====================================================================
const DashboardTab: React.FC<{
  assets: Asset[];
  allAssets: Asset[];
  maintenance: AssetMaintenance[];
  lowStock: Supply[];
  overdueLoans: number;
  openTickets: AssetMaintenance[];
  adviceList: { a: Asset; adv: ReturnType<typeof disposalAdvice> }[];
  pendingRequests: number;
  goto: (t: Tab) => void;
  openAsset: (id: string) => void;
}> = ({ assets, allAssets, maintenance, lowStock, overdueLoans, openTickets, adviceList, pendingRequests, goto, openAsset }) => {
  const totals = useMemo(() => {
    let cost = 0, book = 0, monthly = 0;
    assets.forEach((a) => {
      const d = depreciation(a);
      cost += a.purchasePrice || 0;
      book += d.bookValue;
      if (d.elapsedMonths < d.lifeMonths) monthly += d.monthly;
    });
    const year = new Date().getFullYear().toString();
    const serviceYear = maintenance.filter((m) => (m.finishedAt ?? m.createdAt).startsWith(year)).reduce((s, m) => s + (m.cost || 0), 0);
    const serviceAll = maintenance.reduce((s, m) => s + (m.cost || 0), 0);
    return { cost, book, monthly, serviceYear, serviceAll };
  }, [assets, maintenance]);

  const expiring = useMemo(
    () =>
      assets
        .flatMap((a) => [
          a.warrantyUntil ? { a, what: 'Garansi', date: a.warrantyUntil } : null,
          a.licenseExpiry ? { a, what: 'Lisensi', date: a.licenseExpiry } : null,
        ])
        .filter((x): x is { a: Asset; what: string; date: string } => !!x)
        .map((x) => ({ ...x, days: daysUntil(x.date)! }))
        .filter((x) => x.days <= 30 && x.days >= -30)
        .sort((x, y) => x.days - y.days),
    [assets]
  );
  const dueMaint = assets
    .filter((a) => a.nextMaintenanceDate && (daysUntil(a.nextMaintenanceDate) ?? 99) <= 14)
    .sort((x, y) => x.nextMaintenanceDate!.localeCompare(y.nextMaintenanceDate!));

  const kpis = [
    { label: 'Aset aktif', value: String(assets.length), sub: `${allAssets.length - assets.length} sudah dihapus`, icon: Package, color: 'text-primary-600' },
    { label: 'Nilai perolehan', value: rupiah(totals.cost), sub: 'Total harga beli aset aktif', icon: ShoppingCart, color: 'text-blue-600' },
    { label: 'Nilai buku', value: rupiah(totals.book), sub: `Penyusutan ${rupiah(totals.monthly)}/bulan`, icon: TrendingDown, color: 'text-amber-600' },
    { label: 'Biaya servis tahun ini', value: rupiah(totals.serviceYear), sub: `Total sepanjang waktu ${rupiah(totals.serviceAll)}`, icon: Wrench, color: 'text-rose-600' },
  ];

  const alerts = [
    { n: overdueLoans, text: 'peminjaman melewati batas kembali', tab: 'loans' as Tab },
    { n: openTickets.length, text: 'tiket servis/perawatan terbuka', tab: 'maintenance' as Tab },
    { n: lowStock.length, text: 'barang habis pakai di bawah stok minimum', tab: 'supplies' as Tab },
    { n: pendingRequests, text: 'pengajuan pengadaan sedang diproses', tab: 'procurement' as Tab },
    { n: adviceList.length, text: 'aset direkomendasikan peremajaan/penghapusan', tab: 'disposal' as Tab },
  ].filter((x) => x.n > 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className={`${card} p-4`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500">{k.label}</p>
              <k.icon size={16} className={k.color} />
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1 truncate">{k.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">{k.sub}</p>
          </div>
        ))}
      </div>

      {alerts.length > 0 && (
        <div className={`${card} p-4 space-y-2`}>
          <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><AlertTriangle size={16} className="text-amber-500" /> Perlu perhatian</p>
          {alerts.map((a) => (
            <button key={a.text} onClick={() => goto(a.tab)} className="w-full flex items-center gap-2 text-left text-sm px-3 py-2 rounded-xl bg-amber-50/70 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-gray-700 dark:text-gray-200">
              <b className="text-amber-700 dark:text-amber-300">{a.n}</b> {a.text} <span className="ml-auto text-xs text-primary-600">Lihat →</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`${card} p-4`}>
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Status aset</p>
          <Bars data={ASSET_STATUSES.filter((s) => s !== 'Dihapus').map((s) => ({ label: s, value: assets.filter((a) => a.status === s).length, color: STATUS_COLOR[s] }))} />
        </div>
        <div className={`${card} p-4`}>
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Kondisi aset</p>
          <Bars
            data={ASSET_CONDITIONS.map((c, i) => ({
              label: c,
              value: assets.filter((a) => a.condition === c).length,
              color: ['#10b981', '#84cc16', '#f59e0b', '#f43f5e'][i],
            }))}
          />
        </div>
        <div className={`${card} p-4`}>
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Nilai buku per kategori</p>
          <Bars
            data={(Object.keys(CATEGORY_INFO) as AssetCategory[]).map((c) => {
              const v = assets.filter((a) => a.category === c).reduce((s, a) => s + depreciation(a).bookValue, 0);
              return { label: `${CATEGORY_INFO[c].label} (${assets.filter((a) => a.category === c).length})`, value: v, display: rupiah(v), color: CATEGORY_COLOR[c] };
            })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`${card} p-4`}>
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Clock size={15} /> Perawatan ≤ 14 hari</p>
          {dueMaint.length === 0 && <p className="text-xs text-gray-400">Tidak ada jadwal dekat.</p>}
          {dueMaint.slice(0, 6).map((a) => {
            const d = daysUntil(a.nextMaintenanceDate)!;
            return (
              <button key={a.id} onClick={() => openAsset(a.id)} className="w-full flex justify-between gap-2 text-left text-xs py-1.5 border-b border-gray-100 dark:border-gray-800">
                <span className="truncate text-gray-700 dark:text-gray-200">{a.name}</span>
                <span className={d < 0 ? 'text-rose-600 font-semibold' : 'text-gray-500'}>{d < 0 ? `telat ${-d} hr` : d === 0 ? 'hari ini' : `${d} hr`}</span>
              </button>
            );
          })}
        </div>
        <div className={`${card} p-4`}>
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><AlertTriangle size={15} /> Garansi / lisensi berakhir</p>
          {expiring.length === 0 && <p className="text-xs text-gray-400">Tidak ada yang berakhir dalam 30 hari.</p>}
          {expiring.slice(0, 6).map((x) => (
            <button key={x.a.id + x.what} onClick={() => openAsset(x.a.id)} className="w-full flex justify-between gap-2 text-left text-xs py-1.5 border-b border-gray-100 dark:border-gray-800">
              <span className="truncate text-gray-700 dark:text-gray-200">{x.what} · {x.a.name}</span>
              <span className={x.days < 0 ? 'text-rose-600 font-semibold' : 'text-amber-600'}>{x.days < 0 ? 'habis' : `${x.days} hr`}</span>
            </button>
          ))}
        </div>
        <div className={`${card} p-4`}>
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><TrendingDown size={15} /> Rekomendasi peremajaan</p>
          {adviceList.length === 0 && <p className="text-xs text-gray-400">Semua aset masih layak.</p>}
          {adviceList.slice(0, 6).map(({ a, adv }) => (
            <button key={a.id} onClick={() => openAsset(a.id)} className="w-full text-left text-xs py-1.5 border-b border-gray-100 dark:border-gray-800">
              <span className="flex justify-between gap-2">
                <span className="truncate text-gray-700 dark:text-gray-200">{a.name}</span>
                <span className={adv!.level === 'Hapus' ? 'text-rose-600 font-semibold' : 'text-amber-600'}>{adv!.level === 'Hapus' ? 'Ganti' : 'Pantau'}</span>
              </span>
              <span className="text-[11px] text-gray-400">{adv!.reasons.join(' · ')}</span>
            </button>
          ))}
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className={`${card} p-4`}>
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Boxes size={15} className="text-rose-500" /> Stok menipis</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {lowStock.map((s) => (
              <button key={s.id} onClick={() => goto('supplies')} className="flex justify-between text-left text-xs p-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20">
                <span className="font-semibold text-gray-800 dark:text-gray-100">{s.name}</span>
                <span className="text-rose-600">{s.stock} / min {s.minStock} {s.unit}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// =====================================================================
// Daftar aset
// =====================================================================
const AssetsTab: React.FC<{ assets: Asset[]; locations: string[]; openAsset: (id: string) => void }> = ({ assets, locations, openAsset }) => {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<'' | AssetCategory>('');
  const [status, setStatus] = useState<'' | AssetStatus | 'aktif'>('aktif');
  const [loc, setLoc] = useState('');
  const list = assets.filter((a) => {
    const text = `${a.code} ${a.name} ${a.brand ?? ''} ${a.model ?? ''} ${a.serialNumber ?? ''} ${a.assignedToName ?? ''}`.toLowerCase();
    return (
      (!q || text.includes(q.toLowerCase())) &&
      (!cat || a.category === cat) &&
      (status === 'aktif' ? a.status !== 'Dihapus' : !status || a.status === status) &&
      (!loc || a.location === loc)
    );
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {(Object.keys(CATEGORY_INFO) as AssetCategory[]).map((c) => (
          <button key={c} onClick={() => setCat(cat === c ? '' : c)} className={`${card} p-3 text-left ${cat === c ? 'ring-2 ring-primary-500' : ''}`}>
            <p className="text-xs font-bold text-gray-900 dark:text-white">{CATEGORY_INFO[c].label}</p>
            <p className="text-[11px] text-gray-500 line-clamp-1">{CATEGORY_INFO[c].examples}</p>
            <p className="text-lg font-bold mt-1" style={{ color: CATEGORY_COLOR[c] }}>{assets.filter((a) => a.category === c && a.status !== 'Dihapus').length}</p>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className={`${inputCls} pl-9`} placeholder="Cari kode, nama, merek, nomor seri, pengguna…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={`${inputCls} w-auto`} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="aktif">Semua aktif</option>
          <option value="">Semua (termasuk dihapus)</option>
          {ASSET_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className={`${inputCls} w-auto`} value={loc} onChange={(e) => setLoc(e.target.value)}>
          <option value="">Semua lokasi</option>
          {locations.map((l) => <option key={l}>{l}</option>)}
        </select>
        <button className={btnGhost} disabled={!list.length} onClick={() => printLabels(list)}><Printer size={15} /> Cetak label ({list.length})</button>
      </div>
      <div className={`${card} overflow-x-auto`}>
        {list.length === 0 ? (
          <Empty text={assets.length ? 'Tidak ada aset yang cocok dengan filter.' : 'Belum ada aset. Klik "Registrasi Aset" untuk menambahkan.'} />
        ) : (
          <table className="w-full min-w-[860px]">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr><th className={th}>QR</th><th className={th}>Aset</th><th className={th}>Kategori</th><th className={th}>Lokasi</th><th className={th}>Pengguna</th><th className={th}>Status</th><th className={`${th} text-right`}>Nilai buku</th></tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id} onClick={() => openAsset(a.id)} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer">
                  <td className={td}><QrImage code={a.code} size={40} /></td>
                  <td className={td}>
                    <p className="font-semibold text-gray-900 dark:text-white">{a.name}</p>
                    <p className="text-[11px] font-mono text-gray-500">{a.code}{a.serialNumber ? ` · SN ${a.serialNumber}` : ''}</p>
                  </td>
                  <td className={td}>{CATEGORY_INFO[a.category].short}{a.subCategory ? <span className="block text-[11px] text-gray-400">{a.subCategory}</span> : null}</td>
                  <td className={td}>{a.location}</td>
                  <td className={td}>{a.assignedToName ?? <span className="text-gray-400">-</span>}</td>
                  <td className={td}><StatusBadge status={a.status} /><span className="block text-[11px] text-gray-400 mt-0.5">{a.condition}</span></td>
                  <td className={`${td} text-right`}>{rupiah(depreciation(a).bookValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// =====================================================================
// Peminjaman / serah terima
// =====================================================================
const LoansTab: React.FC<{ canManage: boolean; myName: string; openAsset: (id: string) => void; startLoan: () => void }> = ({ canManage, myName, openAsset, startLoan }) => {
  const { loans, checkin } = useAssetStore();
  const [returning, setReturning] = useState<string | null>(null);
  const active = loans.filter((l) => l.status === 'Dipinjam').sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const done = loans.filter((l) => l.status === 'Dikembalikan');
  const loan = loans.find((l) => l.id === returning);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Catat serah-terima aset (check-out) dan pengembalian (check-in) beserta kondisinya.</p>
        {canManage && <button className={btnPrimary} onClick={startLoan}><ArrowRightLeft size={15} /> Check-out Aset</button>}
      </div>
      <div className={`${card} overflow-x-auto`}>
        <p className="px-4 pt-4 text-sm font-bold text-gray-900 dark:text-white">Sedang dipinjam / digunakan ({active.length})</p>
        {active.length === 0 ? <Empty text="Tidak ada aset yang sedang dipinjam." /> : (
          <table className="w-full min-w-[760px] mt-2">
            <thead className="bg-gray-50 dark:bg-gray-800/50"><tr><th className={th}>Aset</th><th className={th}>Peminjam</th><th className={th}>Keperluan</th><th className={th}>Keluar</th><th className={th}>Batas kembali</th><th className={th}></th></tr></thead>
            <tbody>
              {active.map((l) => {
                const d = daysUntil(l.dueDate)!;
                return (
                  <tr key={l.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className={td}><button onClick={() => openAsset(l.assetId)} className="text-left"><p className="font-semibold text-gray-900 dark:text-white hover:text-primary-600">{l.assetName}</p><p className="text-[11px] font-mono text-gray-500">{l.assetCode}</p></button></td>
                    <td className={td}>{l.borrowerName}{l.location && <span className="block text-[11px] text-gray-400">{l.location}</span>}</td>
                    <td className={td}>{l.purpose}</td>
                    <td className={td}>{fmtDate(l.checkoutAt)}<span className="block text-[11px] text-gray-400">kondisi {l.conditionOut}</span></td>
                    <td className={td}><span className={d < 0 ? 'text-rose-600 font-semibold' : d <= 2 ? 'text-amber-600' : ''}>{fmtDate(l.dueDate)}</span><span className="block text-[11px] text-gray-400">{d < 0 ? `terlambat ${-d} hari` : d === 0 ? 'hari ini' : `${d} hari lagi`}</span></td>
                    <td className={`${td} text-right`}>{canManage && <button className={btnGhost} onClick={() => setReturning(l.id)}><Undo2 size={14} /> Check-in</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className={`${card} overflow-x-auto`}>
        <p className="px-4 pt-4 text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2"><History size={15} /> Riwayat pengembalian</p>
        {done.length === 0 ? <Empty text="Belum ada riwayat." /> : (
          <table className="w-full min-w-[700px] mt-2">
            <thead className="bg-gray-50 dark:bg-gray-800/50"><tr><th className={th}>Aset</th><th className={th}>Peminjam</th><th className={th}>Periode</th><th className={th}>Kondisi keluar → kembali</th><th className={th}>Catatan</th></tr></thead>
            <tbody>
              {done.slice(0, 100).map((l) => (
                <tr key={l.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className={td}>{l.assetName}<span className="block text-[11px] font-mono text-gray-500">{l.assetCode}</span></td>
                  <td className={td}>{l.borrowerName}</td>
                  <td className={td}>{fmtDate(l.checkoutAt)} – {fmtDate(l.returnedAt)}</td>
                  <td className={td}>{l.conditionOut} → <b className={l.conditionIn?.startsWith('Rusak') ? 'text-rose-600' : ''}>{l.conditionIn}</b></td>
                  <td className={td}>{l.returnNotes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {loan && <ReturnModal loanName={`${loan.assetName} · ${loan.borrowerName}`} onClose={() => setReturning(null)} onSave={(c, n) => { checkin(loan.id, c, n, myName); setReturning(null); }} />}
    </div>
  );
};

const LoanModal: React.FC<{
  asset: Asset | null;
  assets: Asset[];
  users: { id: string; name: string; division: string }[];
  onClose: () => void;
  onSave: (input: { assetId: string; borrowerId: string; borrowerName: string; purpose: string; location?: string; dueDate: string; conditionOut: AssetCondition; assign: boolean }) => void;
}> = ({ asset, assets, users, onClose, onSave }) => {
  const [assetId, setAssetId] = useState(asset?.id ?? '');
  const [userId, setUserId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [location, setLocation] = useState('');
  const [assign, setAssign] = useState(false);
  const [dueDate, setDueDate] = useState(addDays(todayStr(), 7));
  const sel = assets.find((a) => a.id === assetId) ?? asset;
  const [cond, setCond] = useState<AssetCondition>(sel?.condition ?? 'Baik');
  const user = users.find((u) => u.id === userId);
  return (
    <Modal title="Check-out / Serah Terima Aset" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Aset">
          <select className={inputCls} value={assetId} onChange={(e) => { setAssetId(e.target.value); const a = assets.find((x) => x.id === e.target.value); if (a) setCond(a.condition); }}>
            <option value="">Pilih aset…</option>
            {asset && !assets.some((a) => a.id === asset.id) && <option value={asset.id}>{asset.code} · {asset.name}</option>}
            {assets.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name} ({a.status})</option>)}
          </select>
        </Field>
        <Field label="Diserahkan kepada">
          <select className={inputCls} value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Pilih karyawan…</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.division}</option>)}
          </select>
        </Field>
        <div className="flex gap-2">
          {[[false, 'Peminjaman sementara'], [true, 'Penyerahan tetap (inventaris karyawan)']].map(([v, l]) => (
            <button key={String(v)} type="button" onClick={() => setAssign(v as boolean)} className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold border ${assign === v ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>{l as string}</button>
          ))}
        </div>
        <Field label="Keperluan"><input className={inputCls} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Liputan event / kerja lapangan" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={assign ? 'Tinjau ulang' : 'Batas pengembalian'}><input type="date" className={inputCls} value={dueDate} min={todayStr()} onChange={(e) => setDueDate(e.target.value)} /></Field>
          <Field label="Kondisi saat keluar">
            <select className={inputCls} value={cond} onChange={(e) => setCond(e.target.value as AssetCondition)}>{ASSET_CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select>
          </Field>
        </div>
        <Field label="Lokasi penempatan (opsional)"><input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder={sel?.location} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className={btnGhost}>Batal</button>
          <button
            className={btnPrimary}
            disabled={!sel || !user || !purpose.trim() || !dueDate}
            onClick={() => onSave({ assetId: sel!.id, borrowerId: user!.id, borrowerName: user!.name, purpose: purpose.trim(), location: location.trim() || undefined, dueDate, conditionOut: cond, assign })}
          >
            Simpan Check-out
          </button>
        </div>
      </div>
    </Modal>
  );
};

const ReturnModal: React.FC<{ loanName: string; onClose: () => void; onSave: (c: AssetCondition, notes: string) => void }> = ({ loanName, onClose, onSave }) => {
  const [cond, setCond] = useState<AssetCondition>('Baik');
  const [notes, setNotes] = useState('');
  return (
    <Modal title={`Check-in · ${loanName}`} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Kondisi saat kembali">
          <div className="grid grid-cols-2 gap-2">
            {ASSET_CONDITIONS.map((c) => (
              <button key={c} type="button" onClick={() => setCond(c)} className={`px-3 py-2 rounded-xl text-sm font-semibold border ${cond === c ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>{c}</button>
            ))}
          </div>
        </Field>
        {cond.startsWith('Rusak') && <p className="text-xs text-amber-600">Tiket perbaikan akan dibuat otomatis dan status aset menjadi Rusak.</p>}
        <Field label="Catatan"><textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Kelengkapan, lecet, dll." /></Field>
        <div className="flex justify-end gap-2"><button onClick={onClose} className={btnGhost}>Batal</button><button className={btnPrimary} onClick={() => onSave(cond, notes.trim())}>Konfirmasi Pengembalian</button></div>
      </div>
    </Modal>
  );
};

// =====================================================================
// Pemeliharaan
// =====================================================================
const MaintenanceTab: React.FC<{ canManage: boolean; myName: string; openAsset: (id: string) => void; newTicket: () => void }> = ({ canManage, myName, openAsset, newTicket }) => {
  const { maintenance, startMaintenance, finishMaintenance, deleteMaintenance } = useAssetStore();
  const [filter, setFilter] = useState<'open' | 'Selesai' | 'all'>('open');
  const [finishing, setFinishing] = useState<AssetMaintenance | null>(null);
  const list = maintenance
    .filter((m) => (filter === 'all' ? true : filter === 'open' ? m.status !== 'Selesai' : m.status === 'Selesai'))
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  const totalCost = maintenance.reduce((s, m) => s + (m.cost || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex gap-1">
          {([['open', 'Terbuka'], ['Selesai', 'Selesai'], ['all', 'Semua']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${filter === k ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>{l}</button>
          ))}
          <span className="ml-2 self-center text-xs text-gray-500">Total biaya servis: <b>{rupiah(totalCost)}</b></span>
        </div>
        <button className={btnPrimary} onClick={newTicket}><Wrench size={15} /> {canManage ? 'Buat Tiket' : 'Laporkan Kerusakan'}</button>
      </div>
      <p className="text-[11px] text-gray-500">Tiket perawatan preventif dibuat otomatis 7 hari sebelum jadwal perawatan rutin tiap aset.</p>
      <div className={`${card} overflow-x-auto`}>
        {list.length === 0 ? <Empty text="Tidak ada tiket." /> : (
          <table className="w-full min-w-[860px]">
            <thead className="bg-gray-50 dark:bg-gray-800/50"><tr><th className={th}>Tiket</th><th className={th}>Aset</th><th className={th}>Keluhan / pekerjaan</th><th className={th}>Jadwal</th><th className={th}>Vendor & biaya</th><th className={th}>Status</th><th className={th}></th></tr></thead>
            <tbody>
              {list.map((m) => {
                const d = daysUntil(m.scheduledDate)!;
                const dur = m.startedAt && m.finishedAt ? Math.max(0, Math.round((new Date(m.finishedAt).getTime() - new Date(m.startedAt).getTime()) / 86400000)) : null;
                return (
                  <tr key={m.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className={td}><p className="font-mono text-xs">{m.ticketNumber}</p><span className={`text-[11px] font-semibold ${m.type === 'Preventif' ? 'text-blue-600' : 'text-amber-600'}`}>{m.type}</span></td>
                    <td className={td}><button onClick={() => openAsset(m.assetId)} className="text-left hover:text-primary-600"><p className="font-semibold">{m.assetName}</p><p className="text-[11px] font-mono text-gray-500">{m.assetCode}</p></button></td>
                    <td className={td}>{m.issue}<span className="block text-[11px] text-gray-400">oleh {m.reportedBy}</span>{m.notes && <span className="block text-[11px] text-gray-500">Hasil: {m.notes}</span>}</td>
                    <td className={td}>{fmtDate(m.scheduledDate)}{m.status !== 'Selesai' && <span className={`block text-[11px] ${d < 0 ? 'text-rose-600' : 'text-gray-400'}`}>{d < 0 ? `telat ${-d} hari` : d === 0 ? 'hari ini' : `${d} hari lagi`}</span>}{dur !== null && <span className="block text-[11px] text-gray-400">durasi {dur} hari</span>}</td>
                    <td className={td}>{m.vendor || '-'}<span className="block text-[11px] text-gray-500">{rupiah(m.cost)}</span></td>
                    <td className={td}><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${m.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : m.status === 'Dikerjakan' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>{m.status}</span></td>
                    <td className={`${td} text-right whitespace-nowrap`}>
                      {canManage && m.status === 'Dijadwalkan' && <button className={btnGhost} onClick={() => startMaintenance(m.id, myName)}><Play size={13} /> Mulai</button>}
                      {canManage && m.status !== 'Selesai' && <button className={`${btnGhost} ml-1`} onClick={() => setFinishing(m)}><Check size={13} /> Selesai</button>}
                      {canManage && <button className="ml-1 p-2 text-gray-400 hover:text-rose-600" onClick={() => confirm('Hapus tiket ini?') && deleteMaintenance(m.id)}><Trash2 size={14} /></button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {finishing && <FinishModal ticket={finishing} onClose={() => setFinishing(null)} onSave={(input) => { finishMaintenance(finishing.id, input, myName); setFinishing(null); }} />}
    </div>
  );
};

const TicketModal: React.FC<{
  asset: Asset | null;
  assets: Asset[];
  canManage: boolean;
  onClose: () => void;
  onSave: (input: { assetId: string; type: AssetMaintenance['type']; issue: string; vendor?: string; cost?: number; scheduledDate: string }) => void;
}> = ({ asset, assets, canManage, onClose, onSave }) => {
  const [assetId, setAssetId] = useState(asset?.id ?? '');
  const [type, setType] = useState<AssetMaintenance['type']>('Perbaikan');
  const [issue, setIssue] = useState('');
  const [vendor, setVendor] = useState('');
  const [cost, setCost] = useState('');
  const [date, setDate] = useState(todayStr());
  return (
    <Modal title={canManage ? 'Tiket Servis / Perawatan' : 'Laporkan Kerusakan Aset'} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Aset">
          <select className={inputCls} value={assetId} onChange={(e) => setAssetId(e.target.value)}>
            <option value="">Pilih aset…</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
          </select>
        </Field>
        {canManage && (
          <div className="flex gap-2">
            {(['Perbaikan', 'Preventif'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setType(t)} className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold border ${type === t ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>{t === 'Perbaikan' ? 'Perbaikan (kerusakan)' : 'Perawatan preventif'}</button>
            ))}
          </div>
        )}
        <Field label={type === 'Perbaikan' ? 'Keluhan / kerusakan' : 'Pekerjaan perawatan'}><textarea className={inputCls} rows={3} value={issue} onChange={(e) => setIssue(e.target.value)} /></Field>
        {canManage && (
          <div className="grid grid-cols-3 gap-3">
            <Field label="Jadwal"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Vendor / teknisi"><input className={inputCls} value={vendor} onChange={(e) => setVendor(e.target.value)} /></Field>
            <Field label="Estimasi biaya"><input type="number" min="0" className={inputCls} value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className={btnGhost}>Batal</button>
          <button className={btnPrimary} disabled={!assetId || !issue.trim()} onClick={() => onSave({ assetId, type, issue: issue.trim(), vendor: vendor.trim() || undefined, cost: Number(cost) || 0, scheduledDate: date })}>Kirim</button>
        </div>
      </div>
    </Modal>
  );
};

const FinishModal: React.FC<{ ticket: AssetMaintenance; onClose: () => void; onSave: (input: { cost: number; vendor?: string; notes?: string; condition: AssetCondition }) => void }> = ({ ticket, onClose, onSave }) => {
  const [cost, setCost] = useState(String(ticket.cost || ''));
  const [vendor, setVendor] = useState(ticket.vendor ?? '');
  const [notes, setNotes] = useState('');
  const [cond, setCond] = useState<AssetCondition>('Baik');
  return (
    <Modal title={`Selesaikan ${ticket.ticketNumber}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Biaya akhir (Rp)"><input type="number" min="0" className={inputCls} value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
          <Field label="Vendor / pihak ketiga"><input className={inputCls} value={vendor} onChange={(e) => setVendor(e.target.value)} /></Field>
        </div>
        <Field label="Kondisi aset setelah servis">
          <select className={inputCls} value={cond} onChange={(e) => setCond(e.target.value as AssetCondition)}>{ASSET_CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select>
        </Field>
        <Field label="Hasil pekerjaan"><textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <div className="flex justify-end gap-2"><button onClick={onClose} className={btnGhost}>Batal</button><button className={btnPrimary} onClick={() => onSave({ cost: Number(cost) || 0, vendor: vendor.trim() || undefined, notes: notes.trim() || undefined, condition: cond })}>Tandai Selesai</button></div>
      </div>
    </Modal>
  );
};

// =====================================================================
// Pengadaan
// =====================================================================
const ProcurementTab: React.FC<{
  canManage: boolean;
  canApprove: boolean;
  me: { id: string; name: string; division: string } | undefined;
  supplies: Supply[];
  onReceiveAsset: (r: AssetRequest) => void;
}> = ({ canManage, canApprove, me, supplies, onReceiveAsset }) => {
  const { requests, addRequest, updateRequest, deleteRequest, moveStock } = useAssetStore();
  const [creating, setCreating] = useState(false);
  const [validating, setValidating] = useState<AssetRequest | null>(null);
  const [filter, setFilter] = useState<'proses' | 'all'>('proses');
  const list = requests.filter((r) => filter === 'all' || !['Diterima', 'Ditolak'].includes(r.status));

  const decide = (r: AssetRequest, ok: boolean) => {
    const note = prompt(ok ? 'Catatan persetujuan (opsional):' : 'Alasan penolakan:') ?? null;
    if (note === null) return;
    updateRequest(r.id, { status: ok ? 'Disetujui' : 'Ditolak', decidedBy: me?.name, decisionNotes: note });
  };
  const receive = (r: AssetRequest) => {
    if (r.category === 'Supply') {
      if (!r.supplyId) return;
      if (moveStock(r.supplyId, 'Masuk', r.quantity, `Pengadaan ${r.requestNumber}`, me?.name ?? 'Staff')) updateRequest(r.id, { status: 'Diterima' });
    } else onReceiveAsset(r);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex gap-1">
          {([['proses', 'Sedang diproses'], ['all', 'Semua']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${filter === k ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>{l}</button>
          ))}
        </div>
        <button className={btnPrimary} onClick={() => setCreating(true)}><Plus size={15} /> Ajukan Pengadaan</button>
      </div>
      <p className="text-[11px] text-gray-500">Alur: Diajukan (divisi) ➔ Divalidasi (cek stok & bandingkan vendor oleh pengelola aset) ➔ Disetujui (CEO/Admin) ➔ Dibeli ➔ Diterima (cek invoice, registrasi & label QR).</p>
      <div className="space-y-2">
        {list.length === 0 && <div className={card}><Empty text="Belum ada pengajuan." /></div>}
        {list.map((r) => {
          const cheapest = [...(r.vendorQuotes ?? [])].sort((a, b) => a.price - b.price)[0];
          return (
            <div key={r.id} className={`${card} p-4`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white">{r.itemName} <span className="text-gray-500 font-normal">× {r.quantity}</span></p>
                  <p className="text-[11px] text-gray-500"><span className="font-mono">{r.requestNumber}</span> · {r.category === 'Supply' ? 'Barang habis pakai' : CATEGORY_INFO[r.category].label} · {r.department} · {r.requesterName} · {fmtDate(r.createdAt)}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${REQ_STYLE[r.status]}`}>{r.status}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{r.reason}</p>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-gray-500">
                <span>Estimasi: <b className="text-gray-800 dark:text-gray-100">{rupiah(r.estimatedPrice * r.quantity)}</b> ({rupiah(r.estimatedPrice)}/unit)</span>
                {r.stockNote && <span>Cek stok: {r.stockNote}</span>}
                {r.vendorQuotes?.length > 0 && <span>Penawaran: {r.vendorQuotes.map((q) => `${q.vendor} ${rupiah(q.price)}`).join(' · ')}{cheapest && ` (termurah: ${cheapest.vendor})`}</span>}
                {r.selectedVendor && <span>Vendor terpilih: <b>{r.selectedVendor}</b></span>}
                {r.decidedBy && <span>Keputusan: {r.decidedBy}{r.decisionNotes ? ` — "${r.decisionNotes}"` : ''}</span>}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {canManage && r.status === 'Diajukan' && <button className={btnGhost} onClick={() => setValidating(r)}><ClipboardCheck size={14} /> Validasi & Bandingkan Vendor</button>}
                {canApprove && (r.status === 'Divalidasi' || r.status === 'Diajukan') && (
                  <>
                    <button className={btnPrimary} onClick={() => decide(r, true)}><CheckCircle2 size={14} /> Setujui Anggaran</button>
                    <button className={btnGhost} onClick={() => decide(r, false)}><X size={14} /> Tolak</button>
                  </>
                )}
                {canManage && r.status === 'Disetujui' && (
                  <button className={btnPrimary} onClick={() => { const v = prompt('Vendor yang dipilih:', r.selectedVendor || cheapest?.vendor || ''); if (v !== null) updateRequest(r.id, { status: 'Dibeli', selectedVendor: v.trim() || r.selectedVendor }); }}>
                    <ShoppingCart size={14} /> Tandai Sudah Dibeli
                  </button>
                )}
                {canManage && r.status === 'Dibeli' && (
                  <button className={btnPrimary} onClick={() => receive(r)}><PackagePlus size={14} /> Barang Diterima {r.category === 'Supply' ? '(stok masuk)' : '(registrasi aset)'}</button>
                )}
                {(canManage || (r.requesterId === me?.id && r.status === 'Diajukan')) && (
                  <button className="ml-auto p-2 text-gray-400 hover:text-rose-600" onClick={() => confirm('Hapus pengajuan ini?') && deleteRequest(r.id)}><Trash2 size={14} /></button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {creating && <RequestModal me={me} supplies={supplies} onClose={() => setCreating(false)} onSave={(d) => { addRequest(d); setCreating(false); }} />}
      {validating && (
        <ValidateModal
          request={validating}
          onClose={() => setValidating(null)}
          onSave={(patch) => { updateRequest(validating.id, { ...patch, status: 'Divalidasi' }); setValidating(null); }}
        />
      )}
    </div>
  );
};

const RequestModal: React.FC<{
  me: { id: string; name: string; division: string } | undefined;
  supplies: Supply[];
  onClose: () => void;
  onSave: (d: Parameters<ReturnType<typeof useAssetStore.getState>['addRequest']>[0]) => void;
}> = ({ me, supplies, onClose, onSave }) => {
  const [category, setCategory] = useState<AssetRequest['category']>('ITAM');
  const [supplyId, setSupplyId] = useState('');
  const [itemName, setItemName] = useState('');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [reason, setReason] = useState('');
  const sup = supplies.find((s) => s.id === supplyId);
  const name = category === 'Supply' ? sup?.name ?? '' : itemName.trim();
  return (
    <Modal title="Ajukan Pengadaan Barang" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Jenis barang">
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as AssetRequest['category'])}>
            {(Object.keys(CATEGORY_INFO) as AssetCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_INFO[c].label}</option>)}
            <option value="Supply">Barang habis pakai (restock)</option>
          </select>
        </Field>
        {category === 'Supply' ? (
          <Field label="Barang">
            <select className={inputCls} value={supplyId} onChange={(e) => { setSupplyId(e.target.value); const s = supplies.find((x) => x.id === e.target.value); if (s) { setQty(String(s.reorderQty || 1)); setPrice(String(s.unitPrice || '')); } }}>
              <option value="">Pilih barang…</option>
              {supplies.map((s) => <option key={s.id} value={s.id}>{s.name} (stok {s.stock} {s.unit})</option>)}
            </select>
          </Field>
        ) : (
          <Field label="Nama barang"><input className={inputCls} value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Kamera mirrorless untuk tim konten" /></Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jumlah"><input type="number" min="1" className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
          <Field label="Estimasi harga / unit (Rp)"><input type="number" min="0" className={inputCls} value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
        </div>
        <Field label="Alasan kebutuhan"><textarea className={inputCls} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className={btnGhost}>Batal</button>
          <button
            className={btnPrimary}
            disabled={!name || !(Number(qty) > 0) || !reason.trim()}
            onClick={() => onSave({ itemName: name, category, quantity: Number(qty), estimatedPrice: Number(price) || 0, reason: reason.trim(), department: me?.division ?? '-', requesterId: me?.id ?? '', requesterName: me?.name ?? 'Staff', supplyId: category === 'Supply' ? supplyId : undefined })}
          >
            Kirim Pengajuan
          </button>
        </div>
      </div>
    </Modal>
  );
};

const ValidateModal: React.FC<{ request: AssetRequest; onClose: () => void; onSave: (p: Partial<AssetRequest>) => void }> = ({ request, onClose, onSave }) => {
  const [stockNote, setStockNote] = useState(request.stockNote ?? '');
  const [quotes, setQuotes] = useState(request.vendorQuotes?.length ? request.vendorQuotes.map((q) => ({ vendor: q.vendor, price: String(q.price) })) : [{ vendor: '', price: '' }, { vendor: '', price: '' }]);
  const valid = quotes.filter((q) => q.vendor.trim() && Number(q.price) > 0).map((q) => ({ vendor: q.vendor.trim(), price: Number(q.price) }));
  const best = [...valid].sort((a, b) => a.price - b.price)[0];
  return (
    <Modal title={`Validasi ${request.requestNumber}`} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Hasil cek stok gudang" hint="Pastikan stok memang habis / tidak ada aset menganggur yang bisa dipakai"><input className={inputCls} value={stockNote} onChange={(e) => setStockNote(e.target.value)} placeholder="Stok kosong, tidak ada unit cadangan" /></Field>
        <div>
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Perbandingan vendor (harga/unit)</p>
          {quotes.map((q, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input className={inputCls} placeholder={`Vendor ${i + 1}`} value={q.vendor} onChange={(e) => setQuotes(quotes.map((x, j) => (j === i ? { ...x, vendor: e.target.value } : x)))} />
              <input type="number" min="0" className={`${inputCls} w-40`} placeholder="Harga" value={q.price} onChange={(e) => setQuotes(quotes.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
            </div>
          ))}
          <button type="button" className="text-xs text-primary-600 font-semibold" onClick={() => setQuotes([...quotes, { vendor: '', price: '' }])}>+ Tambah vendor</button>
          {best && <p className="text-xs text-emerald-600 mt-1">Termurah: {best.vendor} · {rupiah(best.price)} (total {rupiah(best.price * request.quantity)})</p>}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className={btnGhost}>Batal</button>
          <button className={btnPrimary} disabled={!stockNote.trim()} onClick={() => onSave({ stockNote: stockNote.trim(), vendorQuotes: valid, selectedVendor: best?.vendor, ...(best ? { estimatedPrice: best.price } : {}) })}>Simpan Validasi</button>
        </div>
      </div>
    </Modal>
  );
};

// =====================================================================
// Barang habis pakai
// =====================================================================
const SuppliesTab: React.FC<{ canManage: boolean; me: { id: string; name: string; division: string } | undefined; supplies: Supply[]; movements: ReturnType<typeof useAssetStore.getState>['supplyMovements'] }> = ({ canManage, me, supplies, movements }) => {
  const { addSupply, updateSupply, deleteSupply, moveStock, addRequest, requests } = useAssetStore();
  const [editing, setEditing] = useState<Supply | 'new' | null>(null);
  const [moving, setMoving] = useState<{ s: Supply; type: 'Masuk' | 'Keluar' | 'Penyesuaian' } | null>(null);
  const [q, setQ] = useState('');
  const [showLog, setShowLog] = useState(false);
  const myName = me?.name ?? 'Staff';
  const list = supplies
    .filter((s) => !q || `${s.sku} ${s.name} ${s.category}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(b.stock <= b.minStock) - Number(a.stock <= a.minStock) || a.name.localeCompare(b.name));
  const openRestock = (s: Supply) => requests.find((r) => r.supplyId === s.id && !['Diterima', 'Ditolak'].includes(r.status));
  const low = supplies.filter((s) => s.stock <= s.minStock);

  const requestRestock = (s: Supply) =>
    addRequest({
      itemName: s.name,
      category: 'Supply',
      supplyId: s.id,
      quantity: Math.max(1, s.reorderQty || s.minStock * 2 - s.stock),
      estimatedPrice: s.unitPrice || 0,
      reason: `Restock: stok ${s.stock} ${s.unit} sudah di bawah/sama dengan batas minimum ${s.minStock} ${s.unit}.`,
      department: me?.division ?? '-',
      requesterId: me?.id ?? '',
      requesterName: myName,
      selectedVendor: s.vendor,
    });

  return (
    <div className="space-y-3">
      {low.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-sm text-rose-700 dark:text-rose-300">
          <AlertTriangle size={16} /> <b>{low.length} barang</b> mencapai batas bawah stok — segera ajukan restock.
          {canManage && low.some((s) => !openRestock(s)) && (
            <button className="ml-auto px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold" onClick={() => low.filter((s) => !openRestock(s)).forEach(requestRestock)}>
              Ajukan restock semua ({low.filter((s) => !openRestock(s)).length})
            </button>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className={`${inputCls} pl-9`} placeholder="Cari barang…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className={btnGhost} onClick={() => setShowLog(!showLog)}><History size={15} /> {showLog ? 'Daftar stok' : 'Riwayat keluar-masuk'}</button>
        {canManage && <button className={btnPrimary} onClick={() => setEditing('new')}><Plus size={15} /> Barang Baru</button>}
      </div>

      {showLog ? (
        <div className={`${card} overflow-x-auto`}>
          {movements.length === 0 ? <Empty text="Belum ada pergerakan stok." /> : (
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50 dark:bg-gray-800/50"><tr><th className={th}>Waktu</th><th className={th}>Barang</th><th className={th}>Jenis</th><th className={`${th} text-right`}>Jumlah</th><th className={`${th} text-right`}>Sisa</th><th className={th}>Oleh / catatan</th></tr></thead>
              <tbody>
                {movements.slice(0, 200).map((m) => (
                  <tr key={m.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className={td}>{new Date(m.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td className={td}>{m.supplyName}</td>
                    <td className={td}><span className={m.type === 'Masuk' ? 'text-emerald-600' : m.type === 'Keluar' ? 'text-rose-600' : 'text-blue-600'}>{m.type}</span></td>
                    <td className={`${td} text-right`}>{m.type === 'Keluar' ? '-' : m.quantity > 0 && m.type === 'Penyesuaian' ? '+' : m.type === 'Masuk' ? '+' : ''}{m.quantity}</td>
                    <td className={`${td} text-right`}>{m.stockAfter}</td>
                    <td className={td}>{m.userName}{m.note && <span className="block text-[11px] text-gray-400">{m.note}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className={`${card} overflow-x-auto`}>
          {list.length === 0 ? <Empty text={supplies.length ? 'Tidak ditemukan.' : 'Belum ada barang habis pakai (kertas, tinta, galon, kopi, ATK…).'} /> : (
            <table className="w-full min-w-[860px]">
              <thead className="bg-gray-50 dark:bg-gray-800/50"><tr><th className={th}>Barang</th><th className={th}>Lokasi</th><th className={th}>Stok</th><th className={`${th} text-right`}>Nilai stok</th><th className={th}></th></tr></thead>
              <tbody>
                {list.map((s) => {
                  const isLow = s.stock <= s.minStock;
                  const pct = Math.min(100, (s.stock / Math.max(1, s.minStock * 3)) * 100);
                  const pending = openRestock(s);
                  return (
                    <tr key={s.id} className={`border-t border-gray-100 dark:border-gray-800 ${isLow ? 'bg-rose-50/50 dark:bg-rose-900/10' : ''}`}>
                      <td className={td}><p className="font-semibold text-gray-900 dark:text-white">{s.name}</p><p className="text-[11px] text-gray-500"><span className="font-mono">{s.sku}</span> · {s.category}</p></td>
                      <td className={td}>{s.location}</td>
                      <td className={`${td} w-56`}>
                        <div className="flex justify-between text-xs"><b className={isLow ? 'text-rose-600' : 'text-gray-900 dark:text-white'}>{s.stock} {s.unit}</b><span className="text-gray-400">min {s.minStock}</span></div>
                        <div className="h-1.5 mt-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"><div className={`h-full ${isLow ? 'bg-rose-500' : s.stock <= s.minStock * 1.5 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} /></div>
                        {isLow && <span className="text-[11px] text-rose-600 font-semibold">{pending ? `Restock ${pending.requestNumber} · ${pending.status}` : 'Di bawah batas — perlu restock'}</span>}
                      </td>
                      <td className={`${td} text-right`}>{rupiah(s.stock * s.unitPrice)}<span className="block text-[11px] text-gray-400">{rupiah(s.unitPrice)}/{s.unit}</span></td>
                      <td className={`${td} text-right whitespace-nowrap`}>
                        <button className={btnGhost} title="Ambil / pakai barang" onClick={() => setMoving({ s, type: 'Keluar' })}><PackageMinus size={14} /> Ambil</button>
                        {canManage && <button className={`${btnGhost} ml-1`} title="Stok masuk" onClick={() => setMoving({ s, type: 'Masuk' })}><PackagePlus size={14} /></button>}
                        {canManage && isLow && !pending && <button className="ml-1 inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold" onClick={() => requestRestock(s)}><ShoppingCart size={13} /> Restock</button>}
                        {canManage && <button className="ml-1 p-2 text-gray-400 hover:text-primary-600" onClick={() => setEditing(s)}>Edit</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {editing && (
        <SupplyModal
          supply={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onDelete={editing !== 'new' ? () => { if (confirm('Hapus barang ini beserta riwayatnya?')) { deleteSupply((editing as Supply).id); setEditing(null); } } : undefined}
          onSave={(d) => {
            if (editing === 'new') addSupply(d, myName);
            else {
              const { stock, ...rest } = d;
              updateSupply(editing.id, rest);
              if (stock !== editing.stock) moveStock(editing.id, 'Penyesuaian', stock, 'Koreksi stok', myName);
            }
            setEditing(null);
          }}
        />
      )}
      {moving && (
        <MoveModal
          supply={moving.s}
          type={moving.type}
          onClose={() => setMoving(null)}
          onSave={(qty, note) => {
            if (!moveStock(moving.s.id, moving.type, qty, note, myName)) return alert('Jumlah melebihi stok tersedia.');
            setMoving(null);
          }}
        />
      )}
    </div>
  );
};

const SupplyModal: React.FC<{ supply: Supply | null; onClose: () => void; onDelete?: () => void; onSave: (d: Omit<Supply, 'id' | 'createdAt' | 'updatedAt'>) => void }> = ({ supply, onClose, onDelete, onSave }) => {
  const [f, setF] = useState({
    sku: supply?.sku ?? `ATK-${Date.now().toString().slice(-5)}`,
    name: supply?.name ?? '',
    category: supply?.category ?? 'ATK',
    unit: supply?.unit ?? 'pcs',
    stock: String(supply?.stock ?? 0),
    minStock: String(supply?.minStock ?? 5),
    reorderQty: String(supply?.reorderQty ?? 20),
    location: supply?.location ?? 'Gudang',
    unitPrice: String(supply?.unitPrice ?? ''),
    vendor: supply?.vendor ?? '',
  });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Modal title={supply ? `Edit ${supply.name}` : 'Barang Habis Pakai Baru'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nama barang *" className="col-span-2"><input className={inputCls} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Kertas A4 80gsm" /></Field>
        <Field label="SKU"><input className={inputCls} value={f.sku} onChange={(e) => set('sku', e.target.value)} /></Field>
        <Field label="Kategori">
          <input className={inputCls} list="supply-cats" value={f.category} onChange={(e) => set('category', e.target.value)} />
          <datalist id="supply-cats">{['ATK', 'Tinta & Toner', 'Pantry', 'Kebersihan', 'Kesehatan', 'Elektronik kecil'].map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Satuan"><input className={inputCls} value={f.unit} onChange={(e) => set('unit', e.target.value)} placeholder="rim / pcs / galon" /></Field>
        <Field label={supply ? 'Stok (koreksi)' : 'Stok awal'}><input type="number" min="0" className={inputCls} value={f.stock} onChange={(e) => set('stock', e.target.value)} /></Field>
        <Field label="Batas bawah (stok minimum)" hint="Peringatan restock saat stok ≤ angka ini"><input type="number" min="0" className={inputCls} value={f.minStock} onChange={(e) => set('minStock', e.target.value)} /></Field>
        <Field label="Jumlah restock standar"><input type="number" min="1" className={inputCls} value={f.reorderQty} onChange={(e) => set('reorderQty', e.target.value)} /></Field>
        <Field label="Harga / satuan (Rp)"><input type="number" min="0" className={inputCls} value={f.unitPrice} onChange={(e) => set('unitPrice', e.target.value)} /></Field>
        <Field label="Vendor langganan"><input className={inputCls} value={f.vendor} onChange={(e) => set('vendor', e.target.value)} /></Field>
        <Field label="Lokasi simpan" className="col-span-2"><input className={inputCls} value={f.location} onChange={(e) => set('location', e.target.value)} /></Field>
      </div>
      <div className="flex justify-between gap-2 mt-4">
        {onDelete ? <button onClick={onDelete} className="text-xs text-rose-600 font-semibold">Hapus barang</button> : <span />}
        <div className="flex gap-2">
          <button onClick={onClose} className={btnGhost}>Batal</button>
          <button
            className={btnPrimary}
            disabled={!f.name.trim() || !f.unit.trim()}
            onClick={() => onSave({ sku: f.sku.trim(), name: f.name.trim(), category: f.category.trim(), unit: f.unit.trim(), stock: Math.max(0, Number(f.stock) || 0), minStock: Math.max(0, Number(f.minStock) || 0), reorderQty: Math.max(1, Number(f.reorderQty) || 1), location: f.location.trim(), unitPrice: Number(f.unitPrice) || 0, vendor: f.vendor.trim() || undefined })}
          >
            Simpan
          </button>
        </div>
      </div>
    </Modal>
  );
};

const MoveModal: React.FC<{ supply: Supply; type: 'Masuk' | 'Keluar' | 'Penyesuaian'; onClose: () => void; onSave: (qty: number, note: string) => void }> = ({ supply, type, onClose, onSave }) => {
  const [qty, setQty] = useState('1');
  const [note, setNote] = useState('');
  const after = type === 'Masuk' ? supply.stock + (Number(qty) || 0) : supply.stock - (Number(qty) || 0);
  return (
    <Modal title={`${type === 'Masuk' ? 'Stok Masuk' : 'Ambil Barang'} · ${supply.name}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-gray-500">Stok saat ini: <b className="text-gray-900 dark:text-white">{supply.stock} {supply.unit}</b></p>
        <Field label={`Jumlah (${supply.unit})`}><input type="number" min="1" max={type === 'Keluar' ? supply.stock : undefined} className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} autoFocus /></Field>
        <Field label="Catatan"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder={type === 'Masuk' ? 'No. nota / vendor' : 'Untuk keperluan…'} /></Field>
        <p className={`text-xs ${after < 0 ? 'text-rose-600' : after <= supply.minStock ? 'text-amber-600' : 'text-gray-500'}`}>
          Stok setelahnya: {after} {supply.unit}{after >= 0 && after <= supply.minStock ? ' — di bawah batas minimum, ajukan restock' : ''}
        </p>
        <div className="flex justify-end gap-2"><button onClick={onClose} className={btnGhost}>Batal</button><button className={btnPrimary} disabled={!(Number(qty) > 0) || after < 0} onClick={() => onSave(Number(qty), note.trim())}>Simpan</button></div>
      </div>
    </Modal>
  );
};

// =====================================================================
// Stock opname
// =====================================================================
const AuditTab: React.FC<{ canManage: boolean; myName: string; audits: ReturnType<typeof useAssetStore.getState>['audits']; assets: Asset[]; locations: string[]; openAsset: (id: string) => void }> = ({ canManage, myName, audits, assets, locations, openAsset }) => {
  const { startAudit, recordScan, finishAudit, deleteAudit } = useAssetStore();
  const [activeId, setActiveId] = useState<string | null>(audits.find((a) => a.status === 'Berjalan')?.id ?? null);
  const [newTitle, setNewTitle] = useState(`Stock opname ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`);
  const [newLoc, setNewLoc] = useState('');
  const [pending, setPending] = useState<Asset | null>(null);
  const [msg, setMsg] = useState('');
  const audit = audits.find((a) => a.id === activeId) ?? null;
  const expected = audit ? assets.filter((a) => !audit.location || a.location === audit.location) : [];
  const scannedIds = new Set(audit?.scans.map((s) => s.assetId));
  const missing = expected.filter((a) => !scannedIds.has(a.id));

  const onCode = (code: string) => {
    const a = assets.find((x) => x.code.toUpperCase() === code);
    if (!a) return setMsg(`❌ ${code} tidak terdaftar di sistem`);
    setMsg('');
    setPending(a);
  };

  if (!audit) {
    return (
      <div className="space-y-4">
        {canManage && (
          <div className={`${card} p-4 space-y-3`}>
            <p className="font-bold text-gray-900 dark:text-white">Mulai sesi stock opname</p>
            <p className="text-xs text-gray-500">Tim aset berkeliling memindai QR tiap barang untuk mencocokkan jumlah fisik, lokasi, dan kondisi nyata dengan data sistem.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input className={`${inputCls} md:col-span-2`} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              <select className={inputCls} value={newLoc} onChange={(e) => setNewLoc(e.target.value)}>
                <option value="">Semua lokasi</option>
                {locations.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <button className={btnPrimary} disabled={!newTitle.trim()} onClick={() => setActiveId(startAudit(newTitle.trim(), newLoc, myName))}><ScanLine size={15} /> Mulai Pindai</button>
          </div>
        )}
        <div className={card}>
          <p className="px-4 pt-4 font-bold text-sm text-gray-900 dark:text-white">Riwayat stock opname</p>
          {audits.length === 0 ? <Empty text="Belum ada sesi stock opname." /> : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800 mt-2">
              {audits.map((a) => (
                <button key={a.id} onClick={() => setActiveId(a.id)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <span>
                    <span className="block text-sm font-semibold text-gray-900 dark:text-white">{a.title}</span>
                    <span className="text-[11px] text-gray-500">{a.location || 'Semua lokasi'} · {fmtDate(a.startedAt)} · {a.startedBy} · {a.scans.length} terpindai</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${a.status === 'Berjalan' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{a.status}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const mismatched = audit.scans.filter((s) => !s.locationMatch);
  const damaged = audit.scans.filter((s) => s.condition.startsWith('Rusak'));
  const pct = expected.length ? Math.round(((expected.length - missing.length) / expected.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <button onClick={() => setActiveId(null)} className="text-xs text-primary-600 font-semibold">← Semua sesi</button>
          <p className="font-bold text-gray-900 dark:text-white">{audit.title}</p>
          <p className="text-[11px] text-gray-500">{audit.location || 'Semua lokasi'} · dimulai {fmtDate(audit.startedAt)} oleh {audit.startedBy} {audit.finishedAt && `· selesai ${fmtDate(audit.finishedAt)}`}</p>
        </div>
        <div className="flex gap-2">
          {canManage && audit.status === 'Berjalan' && <button className={btnPrimary} onClick={() => confirm(`Selesaikan sesi? ${missing.length} aset belum ditemukan.`) && finishAudit(audit.id)}><CheckCircle2 size={15} /> Selesaikan</button>}
          {canManage && <button className={btnGhost} onClick={() => { if (confirm('Hapus sesi ini?')) { deleteAudit(audit.id); setActiveId(null); } }}><Trash2 size={14} /></button>}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Progres', `${pct}%`, `${expected.length - missing.length} / ${expected.length} aset`],
          ['Belum ditemukan', String(missing.length), 'Perlu ditelusuri'],
          ['Lokasi tidak cocok', String(mismatched.length), 'Beda dengan data sistem'],
          ['Ditemukan rusak', String(damaged.length), 'Otomatis ditandai Rusak'],
        ].map(([l, v, s]) => (
          <div key={l} className={`${card} p-3`}><p className="text-[11px] text-gray-500">{l}</p><p className="text-xl font-bold text-gray-900 dark:text-white">{v}</p><p className="text-[11px] text-gray-400">{s}</p></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {audit.status === 'Berjalan' && canManage && (
          <div className={`${card} p-4 space-y-2`}>
            <p className="font-bold text-sm text-gray-900 dark:text-white">Pindai QR aset</p>
            <QrScanner onCode={onCode} paused={!!pending} />
            {msg && <p className="text-sm text-rose-600">{msg}</p>}
          </div>
        )}
        <div className={`${card} p-4`}>
          <p className="font-bold text-sm text-gray-900 dark:text-white mb-2">Belum ditemukan ({missing.length})</p>
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            {missing.map((a) => (
              <div key={a.id} className="flex justify-between gap-2 py-1.5 text-xs">
                <button onClick={() => openAsset(a.id)} className="text-left hover:text-primary-600"><b>{a.name}</b> <span className="font-mono text-gray-500">{a.code}</span></button>
                <span className="flex items-center gap-2 text-gray-400">{a.location}{canManage && audit.status === 'Berjalan' && <button className="text-primary-600 font-semibold" onClick={() => setPending(a)}>Tandai ada</button>}</span>
              </div>
            ))}
            {missing.length === 0 && <p className="text-xs text-emerald-600">Semua aset sudah terverifikasi 🎉</p>}
          </div>
        </div>
      </div>
      <div className={`${card} overflow-x-auto`}>
        <p className="px-4 pt-4 font-bold text-sm text-gray-900 dark:text-white">Terpindai ({audit.scans.length})</p>
        {audit.scans.length === 0 ? <Empty text="Belum ada aset dipindai." /> : (
          <table className="w-full min-w-[700px] mt-2">
            <thead className="bg-gray-50 dark:bg-gray-800/50"><tr><th className={th}>Waktu</th><th className={th}>Aset</th><th className={th}>Lokasi ditemukan</th><th className={th}>Kondisi</th><th className={th}>Petugas</th></tr></thead>
            <tbody>
              {audit.scans.map((s) => {
                const a = assets.find((x) => x.id === s.assetId);
                return (
                  <tr key={s.assetId} className="border-t border-gray-100 dark:border-gray-800">
                    <td className={td}>{new Date(s.scannedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className={td}>{a?.name ?? '-'}<span className="block text-[11px] font-mono text-gray-500">{s.code}</span></td>
                    <td className={td}>{s.locationFound || a?.location}{!s.locationMatch && <span className="block text-[11px] text-amber-600">⚠ data sistem: {a?.location}</span>}</td>
                    <td className={td}><span className={s.condition.startsWith('Rusak') ? 'text-rose-600 font-semibold' : ''}>{s.condition}</span></td>
                    <td className={td}>{s.by}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {pending && (
        <ScanConfirmModal
          asset={pending}
          defaultLocation={audit.location || pending.location}
          already={scannedIds.has(pending.id)}
          onClose={() => setPending(null)}
          onSave={(cond, loc, fixLocation) => {
            recordScan(audit.id, pending.id, cond, loc, myName);
            if (fixLocation && loc && loc !== pending.location) useAssetStore.getState().updateAsset(pending.id, { location: loc }, myName, `Lokasi dikoreksi saat stock opname: ${loc}`);
            setMsg(`✅ ${pending.code} · ${pending.name} tercatat`);
            setPending(null);
          }}
        />
      )}
    </div>
  );
};

const ScanConfirmModal: React.FC<{ asset: Asset; defaultLocation: string; already: boolean; onClose: () => void; onSave: (c: AssetCondition, loc: string, fixLocation: boolean) => void }> = ({ asset, defaultLocation, already, onClose, onSave }) => {
  const [cond, setCond] = useState<AssetCondition>(asset.condition);
  const [loc, setLoc] = useState(defaultLocation);
  const [fix, setFix] = useState(true);
  return (
    <Modal title={`Verifikasi ${asset.code}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="flex gap-3 items-center">
          <QrImage code={asset.code} size={64} />
          <div><p className="font-semibold text-gray-900 dark:text-white">{asset.name}</p><p className="text-xs text-gray-500">Data sistem: {asset.location} · {asset.condition} · {asset.status}</p>{already && <p className="text-[11px] text-amber-600">Sudah dipindai di sesi ini — data akan diperbarui.</p>}</div>
        </div>
        <Field label="Kondisi nyata">
          <div className="grid grid-cols-2 gap-2">
            {ASSET_CONDITIONS.map((c) => (
              <button key={c} type="button" onClick={() => setCond(c)} className={`px-3 py-2 rounded-xl text-sm font-semibold border ${cond === c ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>{c}</button>
            ))}
          </div>
        </Field>
        <Field label="Lokasi ditemukan"><input className={inputCls} value={loc} onChange={(e) => setLoc(e.target.value)} /></Field>
        {loc.trim() && loc.trim().toLowerCase() !== asset.location.toLowerCase() && (
          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300"><input type="checkbox" checked={fix} onChange={(e) => setFix(e.target.checked)} /> Perbarui lokasi aset di sistem ke "{loc.trim()}"</label>
        )}
        <div className="flex justify-end gap-2"><button onClick={onClose} className={btnGhost}>Batal</button><button className={btnPrimary} onClick={() => onSave(cond, loc.trim(), fix)}>Catat</button></div>
      </div>
    </Modal>
  );
};

// =====================================================================
// Penghapusan (disposal / write-off)
// =====================================================================
const DisposalTab: React.FC<{
  assets: Asset[];
  adviceList: { a: Asset; adv: ReturnType<typeof disposalAdvice> }[];
  canApprove: boolean;
  openAsset: (id: string) => void;
  dispose: (a: Asset) => void;
}> = ({ assets, adviceList, canApprove, openAsset, dispose }) => {
  const disposed = assets.filter((a) => a.status === 'Dihapus');
  const sorted = [...adviceList].sort((x, y) => (x.adv!.level === y.adv!.level ? 0 : x.adv!.level === 'Hapus' ? -1 : 1));
  const recovered = disposed.reduce((s, a) => s + (a.disposal?.value || 0), 0);
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Rekomendasi dihitung dari umur ekonomis (depresiasi), kondisi fisik terakhir, dan total biaya servis. Penghapusan disetujui CEO/Admin; aset keluar dari daftar inventaris & perhitungan nilai buku.</p>
      <div className={`${card} overflow-x-auto`}>
        <p className="px-4 pt-4 font-bold text-sm text-gray-900 dark:text-white">Rekomendasi sistem ({sorted.length})</p>
        {sorted.length === 0 ? <Empty text="Tidak ada aset yang perlu dihapus saat ini." /> : (
          <table className="w-full min-w-[760px] mt-2">
            <thead className="bg-gray-50 dark:bg-gray-800/50"><tr><th className={th}>Aset</th><th className={th}>Alasan</th><th className={`${th} text-right`}>Nilai buku</th><th className={`${th} text-right`}>Biaya servis</th><th className={th}></th></tr></thead>
            <tbody>
              {sorted.map(({ a, adv }) => (
                <tr key={a.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className={td}><button onClick={() => openAsset(a.id)} className="text-left hover:text-primary-600"><p className="font-semibold">{a.name}</p><p className="text-[11px] font-mono text-gray-500">{a.code} · {a.condition}</p></button></td>
                  <td className={td}><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold mr-1 ${adv!.level === 'Hapus' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{adv!.level === 'Hapus' ? 'Hapus/Ganti' : 'Pantau'}</span>{adv!.reasons.join(' · ')}</td>
                  <td className={`${td} text-right`}>{rupiah(depreciation(a).bookValue)}</td>
                  <td className={`${td} text-right`}>{rupiah(adv!.serviceCost)}</td>
                  <td className={`${td} text-right`}>{canApprove && <button className={btnGhost} onClick={() => dispose(a)}><Trash2 size={13} /> Proses</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className={`${card} overflow-x-auto`}>
        <p className="px-4 pt-4 font-bold text-sm text-gray-900 dark:text-white">Aset yang sudah dihapus ({disposed.length}) · nilai pemulihan {rupiah(recovered)}</p>
        {disposed.length === 0 ? <Empty text="Belum ada aset yang dihapus." /> : (
          <table className="w-full min-w-[760px] mt-2">
            <thead className="bg-gray-50 dark:bg-gray-800/50"><tr><th className={th}>Aset</th><th className={th}>Metode</th><th className={th}>Tanggal</th><th className={`${th} text-right`}>Nilai jual</th><th className={th}>Alasan</th><th className={th}>Disetujui</th></tr></thead>
            <tbody>
              {disposed.map((a) => (
                <tr key={a.id} className="border-t border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50" onClick={() => openAsset(a.id)}>
                  <td className={td}>{a.name}<span className="block text-[11px] font-mono text-gray-500">{a.code}</span></td>
                  <td className={td}>{a.disposal?.method}</td>
                  <td className={td}>{fmtDate(a.disposal?.date)}</td>
                  <td className={`${td} text-right`}>{rupiah(a.disposal?.value ?? 0)}</td>
                  <td className={td}>{a.disposal?.reason}</td>
                  <td className={td}>{a.disposal?.approvedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const DisposeModal: React.FC<{ asset: Asset; onClose: () => void; onSave: (d: Omit<AssetDisposal, 'approvedBy'>) => void }> = ({ asset, onClose, onSave }) => {
  const [method, setMethod] = useState<AssetDisposal['method']>('Dijual');
  const [date, setDate] = useState(todayStr());
  const [value, setValue] = useState(String(Math.round(depreciation(asset).bookValue)));
  const [reason, setReason] = useState(disposalAdvice(asset, useAssetStore.getState().maintenance)?.reasons.join(', ') ?? '');
  const book = depreciation(asset).bookValue;
  const gain = (Number(value) || 0) - book;
  return (
    <Modal title={`Penghapusan Aset · ${asset.code}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">{asset.name} · nilai buku saat ini <b>{rupiah(book)}</b></p>
        <Field label="Metode">
          <div className="grid grid-cols-4 gap-2">
            {(['Dijual', 'Lelang', 'Donasi', 'Dihancurkan'] as const).map((m) => (
              <button key={m} type="button" onClick={() => { setMethod(m); if (m === 'Donasi' || m === 'Dihancurkan') setValue('0'); }} className={`px-2 py-2 rounded-xl text-xs font-semibold border ${method === m ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>{m}</button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tanggal"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Nilai diterima (Rp)"><input type="number" min="0" className={inputCls} value={value} onChange={(e) => setValue(e.target.value)} disabled={method === 'Donasi' || method === 'Dihancurkan'} /></Field>
        </div>
        <p className={`text-xs ${gain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{gain >= 0 ? 'Laba' : 'Rugi'} pelepasan aset: {rupiah(Math.abs(gain))}</p>
        <Field label="Alasan"><textarea className={inputCls} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className={btnGhost}>Batal</button>
          <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold disabled:opacity-40" disabled={!reason.trim()} onClick={() => onSave({ method, date, value: Number(value) || 0, reason: reason.trim() })}>
            <Trash2 size={14} /> Setujui & Hapus dari Inventaris
          </button>
        </div>
      </div>
    </Modal>
  );
};
