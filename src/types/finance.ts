// Finance ERP Types for Ruang Kelana

export type FinanceTab =
  | 'accounting'
  | 'procurement'
  | 'sales'
  | 'inventory'
  | 'assets'
  | 'payroll'
  | 'budgeting'
  | 'reports';

// 1. Accounting & General Ledger
export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  reference: string;
  accountDebit: string;
  accountCredit: string;
  amount: number;
  category: 'Kas/Bank' | 'Utang' | 'Piutang' | 'Biaya Operasional' | 'Pendapatan' | 'Aset Tetap';
  status: 'Posted' | 'Draft';
  createdBy: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  balance: number;
  currency: string;
}

// 2. Procurement (Procure-to-Pay)
export type PRStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Converted to PO';
export type POStatus = 'Issued' | 'Partially Received' | 'Received & AP Billed' | 'Completed' | 'Cancelled';

export interface PurchaseRequisition {
  id: string;
  prNumber: string;
  requesterName: string;
  department: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;
  totalAmount: number;
  reason: string;
  status: PRStatus;
  date: string;
  approvedBy?: string;
  approvalDate?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  prNumber?: string;
  vendorName: string;
  vendorContact: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: POStatus;
  orderDate: string;
  expectedDelivery: string;
  goodsReceiptStatus: 'Belum Diterima' | 'Sudah Diterima (Gudang)';
  paymentStatus: 'Belum Bayar' | 'Terjadwal' | 'Lunas';
}

// 3. Sales & Invoicing (Order-to-Cash)
export type SOStatus = 'Draft' | 'Confirmed' | 'Shipped & Invoiced' | 'Paid & Completed' | 'Cancelled';

export interface SalesOrder {
  id: string;
  soNumber: string;
  customerName: string;
  customerCompany: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: SOStatus;
  orderDate: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  paymentStatus: 'Unpaid' | 'Partial' | 'Paid (Mekari/Bank)';
  paymentMethod?: string;
}

// 4. Inventory & Warehouse
export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  valuationPerUnit: number; // Harga perolehan
  totalValuation: number;
  warehouseLocation: string;
  lastUpdated: string;
}

// 5. Fixed Assets
export interface FixedAsset {
  id: string;
  assetCode: string;
  name: string;
  category: 'Elektronik & Komputer' | 'Kendaraan' | 'Furnitur Kantor' | 'Gedung / Properti';
  location: string;
  purchaseDate: string;
  acquisitionCost: number;
  usefulLifeYears: number; // Umur ekonomis (tahun)
  accumulatedDepreciation: number;
  bookValue: number; // Nilai buku terkini
  condition: 'Sangat Baik' | 'Baik' | 'Perlu Servis';
  assignedTo?: string;
}

// 6. HRIS & Payroll Bridge
export interface PayrollRecord {
  id: string;
  employeeNik: string;
  employeeName: string;
  division: string;
  position: string;
  period: string; // Bulan & Tahun misal 'Oktober 2026'
  basicSalary: number;
  allowances: number;
  attendanceDeductions: number;
  taxPPH21: number;
  netSalary: number;
  paymentStatus: 'Draft' | 'Approved' | 'Disbursed (Posted to GL)';
  disbursementDate?: string;
  paymentProofUrl?: string; // Lampiran bukti transfer bank
  slipSentStatus?: 'Belum Dikirim' | 'Terkirim ke Email Karyawan';
  slipSentAt?: string;
  notes?: string;
}

// 7. Budgeting & Financial Planning
export interface DepartmentBudget {
  id: string;
  department: string;
  year: number;
  allocatedBudget: number;
  spentBudget: number;
  remainingBudget: number;
  variancePercentage: number;
  status: 'Aman' | 'Peringatan (>80%)' | 'Over Budget';
}

// 8. Expense Claim (Operational Expense Workflow)
export interface OperationalExpenseClaim {
  id: string;
  claimNumber: string;
  claimantName: string;
  department: string;
  description: string;
  category: 'Petty Cash' | 'Transport & Perjalanan' | 'Konsumsi & Meeting' | 'Langganan Software' | 'Operasional';
  amount: number;
  receiptImage?: string;
  status: 'Pending Approval' | 'Approved & Reimbursed' | 'Rejected';
  submissionDate: string;
  approvedBy?: string;
}
