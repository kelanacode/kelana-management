// Tipe data modul Manajemen Aset Kantor

export type AssetCategory = 'ITAM' | 'Fixed' | 'Facility' | 'Digital';
export type AssetStatus = 'Tersedia' | 'Digunakan' | 'Dipinjam' | 'Servis' | 'Rusak' | 'Dihapus';
export type AssetCondition = 'Baik' | 'Cukup' | 'Rusak Ringan' | 'Rusak Berat';

export interface AssetHistoryEntry {
  at: string;
  by: string;
  action: string;
}

export interface AssetDisposal {
  method: 'Dijual' | 'Lelang' | 'Donasi' | 'Dihancurkan';
  date: string;
  value: number;
  reason: string;
  approvedBy: string;
}

export interface Asset {
  id: string;
  code: string;
  name: string;
  category: AssetCategory;
  subCategory?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  specs?: string;
  vendor?: string;
  invoiceNumber?: string;
  purchaseDate: string;
  purchasePrice: number;
  salvageValue: number;
  usefulLifeYears: number;
  warrantyUntil?: string;
  location: string;
  status: AssetStatus;
  condition: AssetCondition;
  assignedToId?: string;
  assignedToName?: string;
  division?: string;
  maintenanceIntervalDays?: number;
  nextMaintenanceDate?: string;
  licenseKey?: string;
  licenseExpiry?: string;
  digitalUrl?: string;
  notes?: string;
  lastAuditAt?: string;
  lastAuditBy?: string;
  disposal?: AssetDisposal | null;
  history: AssetHistoryEntry[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetLoan {
  id: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  borrowerId: string;
  borrowerName: string;
  purpose: string;
  location?: string;
  checkoutAt: string;
  dueDate: string;
  conditionOut: AssetCondition;
  returnedAt?: string;
  conditionIn?: AssetCondition;
  returnNotes?: string;
  status: 'Dipinjam' | 'Dikembalikan';
  handledBy: string;
  createdAt: string;
}

export interface AssetMaintenance {
  id: string;
  ticketNumber: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  type: 'Preventif' | 'Perbaikan';
  issue: string;
  reportedBy: string;
  vendor?: string;
  cost: number;
  scheduledDate: string;
  startedAt?: string;
  finishedAt?: string;
  status: 'Dijadwalkan' | 'Dikerjakan' | 'Selesai';
  notes?: string;
  createdAt: string;
}

export interface VendorQuote {
  vendor: string;
  price: number;
}

export type RequestStatus = 'Diajukan' | 'Divalidasi' | 'Disetujui' | 'Ditolak' | 'Dibeli' | 'Diterima';

export interface AssetRequest {
  id: string;
  requestNumber: string;
  itemName: string;
  category: AssetCategory | 'Supply';
  quantity: number;
  estimatedPrice: number;
  reason: string;
  department: string;
  requesterId: string;
  requesterName: string;
  stockNote?: string;
  vendorQuotes: VendorQuote[];
  selectedVendor?: string;
  status: RequestStatus;
  decidedBy?: string;
  decisionNotes?: string;
  supplyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditScan {
  assetId: string;
  code: string;
  scannedAt: string;
  by: string;
  condition: AssetCondition;
  locationFound: string;
  locationMatch: boolean;
}

export interface AssetAudit {
  id: string;
  title: string;
  location: string; // '' = semua lokasi
  status: 'Berjalan' | 'Selesai';
  startedBy: string;
  startedAt: string;
  finishedAt?: string;
  scans: AuditScan[];
  createdAt: string;
}

export interface Supply {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  reorderQty: number;
  location: string;
  unitPrice: number;
  vendor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplyMovement {
  id: string;
  supplyId: string;
  supplyName: string;
  type: 'Masuk' | 'Keluar' | 'Penyesuaian';
  quantity: number;
  stockAfter: number;
  note?: string;
  userName: string;
  createdAt: string;
}
