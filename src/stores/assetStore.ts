// Manajemen Aset Kantor: register aset, peminjaman, pemeliharaan, pengadaan,
// stock opname, penghapusan, dan stok barang habis pakai.
// Data disinkronkan ke Supabase lewat src/lib/sync.ts (store: 'asset').
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Asset, AssetAudit, AssetCondition, AssetDisposal, AssetLoan, AssetMaintenance,
  AssetRequest, Supply, SupplyMovement,
} from '../types/asset';
import { addDays, nextAssetCode, todayStr } from '../utils/assetUtils';

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const now = () => new Date().toISOString();
const seq = (prefix: string, list: { [k: string]: any }[], field: string) => {
  const ym = todayStr().slice(0, 7).replace('-', '');
  const base = `${prefix}-${ym}-`;
  const max = list
    .filter((x) => String(x[field] ?? '').startsWith(base))
    .reduce((m, x) => Math.max(m, parseInt(String(x[field]).slice(base.length), 10) || 0), 0);
  return base + String(max + 1).padStart(3, '0');
};

export type NewAsset = Omit<Asset, 'id' | 'code' | 'history' | 'createdAt' | 'updatedAt' | 'disposal'>;

interface AssetStore {
  assets: Asset[];
  loans: AssetLoan[];
  maintenance: AssetMaintenance[];
  requests: AssetRequest[];
  audits: AssetAudit[];
  supplies: Supply[];
  supplyMovements: SupplyMovement[];

  addAsset: (data: NewAsset, by: string) => Asset;
  updateAsset: (id: string, patch: Partial<Asset>, by: string, action?: string) => void;
  deleteAsset: (id: string) => void;
  disposeAsset: (id: string, disposal: AssetDisposal, by: string) => void;

  checkout: (input: { assetId: string; borrowerId: string; borrowerName: string; purpose: string; location?: string; dueDate: string; conditionOut: AssetCondition; assign: boolean }, by: string) => void;
  checkin: (loanId: string, conditionIn: AssetCondition, notes: string, by: string) => void;

  addMaintenance: (input: { assetId: string; type: AssetMaintenance['type']; issue: string; vendor?: string; cost?: number; scheduledDate: string }, by: string) => void;
  startMaintenance: (id: string, by: string) => void;
  finishMaintenance: (id: string, input: { cost: number; vendor?: string; notes?: string; condition: AssetCondition }, by: string) => void;
  deleteMaintenance: (id: string) => void;
  schedulePreventive: (by: string) => number;

  addRequest: (input: Omit<AssetRequest, 'id' | 'requestNumber' | 'status' | 'createdAt' | 'updatedAt' | 'vendorQuotes'> & { vendorQuotes?: AssetRequest['vendorQuotes'] }) => void;
  updateRequest: (id: string, patch: Partial<AssetRequest>) => void;
  deleteRequest: (id: string) => void;

  startAudit: (title: string, location: string, by: string) => string;
  recordScan: (auditId: string, assetId: string, condition: AssetCondition, locationFound: string, by: string) => void;
  finishAudit: (auditId: string) => void;
  deleteAudit: (auditId: string) => void;

  addSupply: (data: Omit<Supply, 'id' | 'createdAt' | 'updatedAt'>, by: string) => void;
  updateSupply: (id: string, patch: Partial<Supply>) => void;
  deleteSupply: (id: string) => void;
  moveStock: (supplyId: string, type: SupplyMovement['type'], quantity: number, note: string, by: string) => boolean;
}

const historyEntry = (by: string, action: string) => ({ at: now(), by, action });

export const useAssetStore = create<AssetStore>()(
  persist(
    (set, get) => {
      const patchAsset = (id: string, patch: Partial<Asset>, by: string, action: string) =>
        set((s) => ({
          assets: s.assets.map((a) =>
            a.id === id ? { ...a, ...patch, updatedAt: now(), history: [historyEntry(by, action), ...(a.history ?? [])].slice(0, 100) } : a
          ),
        }));

      return {
        assets: [],
        loans: [],
        maintenance: [],
        requests: [],
        audits: [],
        supplies: [],
        supplyMovements: [],

        // ---------- Register aset ----------
        addAsset: (data, by) => {
          const asset: Asset = {
            ...data,
            id: uid('ast'),
            code: nextAssetCode(data.category, get().assets),
            nextMaintenanceDate:
              data.nextMaintenanceDate ||
              (data.maintenanceIntervalDays ? addDays(data.purchaseDate || todayStr(), data.maintenanceIntervalDays) : undefined),
            disposal: null,
            history: [historyEntry(by, 'Aset diregistrasi & diberi label QR')],
            createdBy: by,
            createdAt: now(),
            updatedAt: now(),
          };
          set((s) => ({ assets: [asset, ...s.assets] }));
          return asset;
        },
        updateAsset: (id, patch, by, action = 'Data aset diperbarui') => patchAsset(id, patch, by, action),
        deleteAsset: (id) =>
          set((s) => ({
            assets: s.assets.filter((a) => a.id !== id),
            loans: s.loans.filter((l) => l.assetId !== id),
            maintenance: s.maintenance.filter((m) => m.assetId !== id),
          })),
        disposeAsset: (id, disposal, by) =>
          patchAsset(
            id,
            { status: 'Dihapus', disposal, assignedToId: undefined, assignedToName: undefined, nextMaintenanceDate: undefined },
            by,
            `Dihapus dari daftar aset (${disposal.method})`
          ),

        // ---------- Peminjaman / serah terima ----------
        checkout: (input, by) => {
          const asset = get().assets.find((a) => a.id === input.assetId);
          if (!asset) return;
          const loan: AssetLoan = {
            id: uid('loan'),
            assetId: asset.id,
            assetCode: asset.code,
            assetName: asset.name,
            borrowerId: input.borrowerId,
            borrowerName: input.borrowerName,
            purpose: input.purpose,
            location: input.location,
            checkoutAt: now(),
            dueDate: input.dueDate,
            conditionOut: input.conditionOut,
            status: 'Dipinjam',
            handledBy: by,
            createdAt: now(),
          };
          set((s) => ({ loans: [loan, ...s.loans] }));
          patchAsset(
            asset.id,
            {
              status: input.assign ? 'Digunakan' : 'Dipinjam',
              assignedToId: input.borrowerId,
              assignedToName: input.borrowerName,
              condition: input.conditionOut,
              ...(input.location ? { location: input.location } : {}),
            },
            by,
            `${input.assign ? 'Diserahkan' : 'Dipinjamkan'} ke ${input.borrowerName}`
          );
        },
        checkin: (loanId, conditionIn, notes, by) => {
          const loan = get().loans.find((l) => l.id === loanId);
          if (!loan || loan.status === 'Dikembalikan') return;
          set((s) => ({
            loans: s.loans.map((l) =>
              l.id === loanId ? { ...l, status: 'Dikembalikan', returnedAt: now(), conditionIn, returnNotes: notes } : l
            ),
          }));
          const broken = conditionIn === 'Rusak Ringan' || conditionIn === 'Rusak Berat';
          patchAsset(
            loan.assetId,
            { status: broken ? 'Rusak' : 'Tersedia', condition: conditionIn, assignedToId: undefined, assignedToName: undefined },
            by,
            `Dikembalikan oleh ${loan.borrowerName} (kondisi: ${conditionIn})`
          );
          if (broken) {
            get().addMaintenance(
              { assetId: loan.assetId, type: 'Perbaikan', issue: notes || `Kondisi saat kembali: ${conditionIn}`, scheduledDate: todayStr() },
              by
            );
          }
        },

        // ---------- Pemeliharaan ----------
        addMaintenance: (input, by) => {
          const asset = get().assets.find((a) => a.id === input.assetId);
          if (!asset) return;
          const ticket: AssetMaintenance = {
            id: uid('mnt'),
            ticketNumber: seq('SRV', get().maintenance, 'ticketNumber'),
            assetId: asset.id,
            assetCode: asset.code,
            assetName: asset.name,
            type: input.type,
            issue: input.issue,
            reportedBy: by,
            vendor: input.vendor,
            cost: input.cost ?? 0,
            scheduledDate: input.scheduledDate,
            status: 'Dijadwalkan',
            createdAt: now(),
          };
          set((s) => ({ maintenance: [ticket, ...s.maintenance] }));
          if (input.type === 'Perbaikan' && asset.status !== 'Rusak') {
            patchAsset(asset.id, { status: 'Rusak' }, by, `Tiket servis ${ticket.ticketNumber}: ${input.issue}`);
          } else {
            patchAsset(asset.id, {}, by, `Tiket ${input.type.toLowerCase()} ${ticket.ticketNumber} dibuat`);
          }
        },
        startMaintenance: (id, by) => {
          const t = get().maintenance.find((m) => m.id === id);
          if (!t) return;
          set((s) => ({ maintenance: s.maintenance.map((m) => (m.id === id ? { ...m, status: 'Dikerjakan', startedAt: now() } : m)) }));
          patchAsset(t.assetId, { status: 'Servis' }, by, `Servis ${t.ticketNumber} mulai dikerjakan`);
        },
        finishMaintenance: (id, input, by) => {
          const t = get().maintenance.find((m) => m.id === id);
          if (!t) return;
          set((s) => ({
            maintenance: s.maintenance.map((m) =>
              m.id === id
                ? { ...m, status: 'Selesai', finishedAt: now(), startedAt: m.startedAt ?? now(), cost: input.cost, vendor: input.vendor || m.vendor, notes: input.notes }
                : m
            ),
          }));
          const asset = get().assets.find((a) => a.id === t.assetId);
          if (!asset) return;
          const broken = input.condition === 'Rusak Berat';
          const hasLoan = get().loans.some((l) => l.assetId === asset.id && l.status === 'Dipinjam');
          patchAsset(
            asset.id,
            {
              condition: input.condition,
              status: broken ? 'Rusak' : asset.assignedToId ? (hasLoan ? 'Dipinjam' : 'Digunakan') : 'Tersedia',
              ...(asset.maintenanceIntervalDays ? { nextMaintenanceDate: addDays(todayStr(), asset.maintenanceIntervalDays) } : {}),
            },
            by,
            `Servis ${t.ticketNumber} selesai (biaya Rp ${Math.round(input.cost).toLocaleString('id-ID')})`
          );
        },
        deleteMaintenance: (id) => set((s) => ({ maintenance: s.maintenance.filter((m) => m.id !== id) })),
        // Buat tiket preventif otomatis untuk aset yang jatuh tempo perawatan ≤ 7 hari
        schedulePreventive: (by) => {
          const limit = addDays(todayStr(), 7);
          const { assets, maintenance } = get();
          const due = assets.filter(
            (a) =>
              a.status !== 'Dihapus' &&
              a.nextMaintenanceDate &&
              a.nextMaintenanceDate <= limit &&
              !maintenance.some((m) => m.assetId === a.id && m.type === 'Preventif' && m.status !== 'Selesai')
          );
          due.forEach((a) =>
            get().addMaintenance(
              { assetId: a.id, type: 'Preventif', issue: 'Perawatan rutin terjadwal', scheduledDate: a.nextMaintenanceDate! },
              by
            )
          );
          return due.length;
        },

        // ---------- Pengadaan ----------
        addRequest: (input) => {
          const req: AssetRequest = {
            ...input,
            vendorQuotes: input.vendorQuotes ?? [],
            id: uid('preq'),
            requestNumber: seq('PGD', get().requests, 'requestNumber'),
            status: 'Diajukan',
            createdAt: now(),
            updatedAt: now(),
          };
          set((s) => ({ requests: [req, ...s.requests] }));
        },
        updateRequest: (id, patch) =>
          set((s) => ({ requests: s.requests.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: now() } : r)) })),
        deleteRequest: (id) => set((s) => ({ requests: s.requests.filter((r) => r.id !== id) })),

        // ---------- Stock opname ----------
        startAudit: (title, location, by) => {
          const audit: AssetAudit = { id: uid('aud'), title, location, status: 'Berjalan', startedBy: by, startedAt: now(), scans: [], createdAt: now() };
          set((s) => ({ audits: [audit, ...s.audits] }));
          return audit.id;
        },
        recordScan: (auditId, assetId, condition, locationFound, by) => {
          const asset = get().assets.find((a) => a.id === assetId);
          if (!asset) return;
          const scan = {
            assetId,
            code: asset.code,
            scannedAt: now(),
            by,
            condition,
            locationFound,
            locationMatch: !locationFound || locationFound.trim().toLowerCase() === (asset.location ?? '').trim().toLowerCase(),
          };
          set((s) => ({
            audits: s.audits.map((a) =>
              a.id === auditId ? { ...a, scans: [scan, ...a.scans.filter((x) => x.assetId !== assetId)] } : a
            ),
          }));
          const broken = condition === 'Rusak Ringan' || condition === 'Rusak Berat';
          patchAsset(
            assetId,
            {
              lastAuditAt: now(),
              lastAuditBy: by,
              condition,
              ...(broken && (asset.status === 'Tersedia' || asset.status === 'Digunakan') ? { status: 'Rusak' as const } : {}),
            },
            by,
            `Stock opname: ditemukan di ${locationFound || asset.location} (${condition})`
          );
        },
        finishAudit: (auditId) =>
          set((s) => ({ audits: s.audits.map((a) => (a.id === auditId ? { ...a, status: 'Selesai', finishedAt: now() } : a)) })),
        deleteAudit: (auditId) => set((s) => ({ audits: s.audits.filter((a) => a.id !== auditId) })),

        // ---------- Barang habis pakai ----------
        addSupply: (data, by) => {
          const supply: Supply = { ...data, id: uid('sup'), createdAt: now(), updatedAt: now() };
          set((s) => ({ supplies: [supply, ...s.supplies] }));
          if (data.stock > 0) {
            set((s) => ({
              supplyMovements: [
                { id: uid('mov'), supplyId: supply.id, supplyName: supply.name, type: 'Masuk', quantity: data.stock, stockAfter: data.stock, note: 'Stok awal', userName: by, createdAt: now() },
                ...s.supplyMovements,
              ],
            }));
          }
        },
        updateSupply: (id, patch) =>
          set((s) => ({ supplies: s.supplies.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now() } : x)) })),
        deleteSupply: (id) =>
          set((s) => ({
            supplies: s.supplies.filter((x) => x.id !== id),
            supplyMovements: s.supplyMovements.filter((m) => m.supplyId !== id),
          })),
        moveStock: (supplyId, type, quantity, note, by) => {
          const sup = get().supplies.find((x) => x.id === supplyId);
          if (!sup || !(quantity > 0 || type === 'Penyesuaian')) return false;
          const after = type === 'Masuk' ? sup.stock + quantity : type === 'Keluar' ? sup.stock - quantity : quantity;
          if (after < 0) return false;
          set((s) => ({
            supplies: s.supplies.map((x) => (x.id === supplyId ? { ...x, stock: after, updatedAt: now() } : x)),
            supplyMovements: [
              {
                id: uid('mov'),
                supplyId,
                supplyName: sup.name,
                type,
                quantity: type === 'Penyesuaian' ? after - sup.stock : quantity,
                stockAfter: after,
                note,
                userName: by,
                createdAt: now(),
              },
              ...s.supplyMovements,
            ].slice(0, 2000),
          }));
          return true;
        },
      };
    },
    { name: 'ruang-kelana-assets' }
  )
);
