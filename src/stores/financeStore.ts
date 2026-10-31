import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  JournalEntry,
  BankAccount,
  PurchaseRequisition,
  PurchaseOrder,
  SalesOrder,
  InventoryItem,
  FixedAsset,
  PayrollRecord,
  DepartmentBudget,
  OperationalExpenseClaim,
} from '../types/finance';

interface FinanceStore {
  // Data State
  bankAccounts: BankAccount[];
  journalEntries: JournalEntry[];
  purchaseRequisitions: PurchaseRequisition[];
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  inventoryItems: InventoryItem[];
  fixedAssets: FixedAsset[];
  payrollRecords: PayrollRecord[];
  departmentBudgets: DepartmentBudget[];
  expenseClaims: OperationalExpenseClaim[];

  // Actions Procure-to-Pay
  createPurchaseRequisition: (pr: Omit<PurchaseRequisition, 'id' | 'prNumber' | 'date' | 'status'>) => void;
  approvePurchaseRequisition: (id: string, approverName: string) => void;
  rejectPurchaseRequisition: (id: string) => void;
  createPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'orderDate' | 'status' | 'goodsReceiptStatus' | 'paymentStatus'>) => void;
  receiveGoods: (poId: string) => void;
  payPurchaseOrder: (poId: string, bankId: string) => void;

  // Actions Order-to-Cash
  createSalesOrder: (so: Omit<SalesOrder, 'id' | 'soNumber' | 'orderDate' | 'status' | 'paymentStatus'>) => void;
  shipAndInvoiceSalesOrder: (soId: string) => void;
  reconcileSalesPayment: (soId: string, bankId: string, paymentMethod: string) => void;

  // Actions Operational Expense Management
  submitExpenseClaim: (claim: Omit<OperationalExpenseClaim, 'id' | 'claimNumber' | 'submissionDate' | 'status'>) => void;
  approveAndReimburseExpenseClaim: (id: string, approverName: string, bankId: string) => void;
  rejectExpenseClaim: (id: string) => void;

  // Actions Accounting & Cash
  addBankAccount: (account: Omit<BankAccount, 'id'>) => void;
  updateBankAccount: (id: string, account: Partial<Omit<BankAccount, 'id'>>) => void;
  adjustBankBalance: (id: string, amountChange: number, description?: string) => void;
  deleteBankAccount: (id: string) => void;
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'entryNumber' | 'date'>) => void;

  // Actions Inventory
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated' | 'totalValuation'>) => void;
  updateInventoryItem: (id: string, item: Partial<Omit<InventoryItem, 'id' | 'totalValuation'>>) => void;
  deleteInventoryItem: (id: string) => void;
  adjustInventoryStock: (sku: string, change: number, reason: string) => void;

  // Actions Fixed Assets
  addFixedAsset: (asset: Omit<FixedAsset, 'id' | 'accumulatedDepreciation' | 'bookValue'> & { initialDepreciation?: number }) => void;
  updateFixedAsset: (id: string, asset: Partial<Omit<FixedAsset, 'id'>>) => void;
  depreciateFixedAsset: (id: string, amount: number, description?: string) => void;
  deleteFixedAsset: (id: string) => void;

  // Actions Payroll Disbursal & Management
  addPayrollRecord: (record: Omit<PayrollRecord, 'id' | 'netSalary'>) => void;
  updatePayrollRecord: (id: string, record: Partial<Omit<PayrollRecord, 'id'>>) => void;
  deletePayrollRecord: (id: string) => void;
  disbursePayrollRecord: (payrollId: string, bankId: string, proofUrl?: string) => void;
  attachPaymentProof: (payrollId: string, proofUrl: string) => void;
  sendSalarySlip: (payrollId: string) => void;

  // Actions Department Budgeting
  addDepartmentBudget: (budget: Omit<DepartmentBudget, 'id' | 'remainingBudget' | 'variancePercentage' | 'status'>) => void;
  updateDepartmentBudget: (id: string, budget: Partial<Omit<DepartmentBudget, 'id' | 'remainingBudget' | 'variancePercentage' | 'status'>>) => void;
  adjustDepartmentBudget: (id: string, allocatedChange: number) => void;
  deleteDepartmentBudget: (id: string) => void;

  // Reset demo data if needed
  resetToDemo: () => void;
}

const INITIAL_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'bank-bca',
    bankName: 'Bank BCA Operasional',
    accountNumber: '882-019-3312',
    accountHolder: 'PT Ruang Kelana Nusantara',
    balance: 785400000,
    currency: 'IDR',
  },
  {
    id: 'bank-mandiri',
    bankName: 'Bank Mandiri Payroll & Pajak',
    accountNumber: '142-00-998811-2',
    accountHolder: 'PT Ruang Kelana Nusantara',
    balance: 420500000,
    currency: 'IDR',
  },
];

const INITIAL_JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: 'je-001',
    entryNumber: 'JV-202610-001',
    date: '2026-10-01',
    description: 'Saldo Awal Modal & Kas Perusahaan',
    reference: 'SALDO-AWAL',
    accountDebit: '1010 - Kas & Bank Utama',
    accountCredit: '3010 - Modal Disetor',
    amount: 1000000000,
    category: 'Kas/Bank',
    status: 'Posted',
    createdBy: 'Siti Rahmawati (Finance)',
  },
  {
    id: 'je-002',
    entryNumber: 'JV-202610-002',
    date: '2026-10-15',
    description: 'Pembayaran Termin 1 Klien PT Citra Digital',
    reference: 'INV-2026-081',
    accountDebit: '1010 - Kas & Bank BCA',
    accountCredit: '1120 - Piutang Usaha (AR)',
    amount: 85000000,
    category: 'Piutang',
    status: 'Posted',
    createdBy: 'Siti Rahmawati (Finance)',
  },
  {
    id: 'je-003',
    entryNumber: 'JV-202610-003',
    date: '2026-10-24',
    description: 'Pembayaran Lisensi Cloud & Server AWS Enterprise',
    reference: 'BILL-AWS-991',
    accountDebit: '6010 - Beban Server & IT',
    accountCredit: '1010 - Kas & Bank BCA',
    amount: 14500000,
    category: 'Biaya Operasional',
    status: 'Posted',
    createdBy: 'Siti Rahmawati (Finance)',
  },
];

const INITIAL_PURCHASE_REQUISITIONS: PurchaseRequisition[] = [
  {
    id: 'pr-001',
    prNumber: 'PR-202610-001',
    requesterName: 'Andi Wirawan',
    department: 'Teknologi & IT',
    itemName: 'Monitor Dell UltraSharp 27" 4K (3 Unit)',
    category: 'Peralatan IT & Hardware',
    quantity: 3,
    unit: 'Unit',
    estimatedPrice: 7500000,
    totalAmount: 22500000,
    reason: 'Kebutuhan tim developer baru untuk setup dual monitor workspace',
    status: 'Approved',
    date: '2026-10-25',
    approvedBy: 'Budi Santoso (Admin / Manager)',
    approvalDate: '2026-10-26',
  },
  {
    id: 'pr-002',
    prNumber: 'PR-202610-002',
    requesterName: 'Maya Indah',
    department: 'Pemasaran & Bisnis',
    itemName: 'Booth Exhibition & Standing Banner Expo Tech 2026',
    category: 'Promosi & Pemasaran',
    quantity: 1,
    unit: 'Paket',
    estimatedPrice: 15000000,
    totalAmount: 15000000,
    reason: 'Pameran startup & enterprise expo di JCC Jakarta',
    status: 'Pending Approval',
    date: '2026-10-28',
  },
];

const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po-001',
    poNumber: 'PO-202610-001',
    prNumber: 'PR-202610-001',
    vendorName: 'PT Sentra Hardware Indonesia',
    vendorContact: 'sales@sentrahardware.id (021-5558899)',
    itemName: 'Monitor Dell UltraSharp 27" 4K',
    quantity: 3,
    unitPrice: 7500000,
    totalAmount: 22500000,
    status: 'Received & AP Billed',
    orderDate: '2026-10-26',
    expectedDelivery: '2026-10-29',
    goodsReceiptStatus: 'Sudah Diterima (Gudang)',
    paymentStatus: 'Belum Bayar',
  },
];

const INITIAL_SALES_ORDERS: SalesOrder[] = [
  {
    id: 'so-001',
    soNumber: 'SO-202610-001',
    customerName: 'Bapak Hendra Gunawan',
    customerCompany: 'PT Maju Bersama Makmur',
    itemName: 'Implementasi Workspace Enterprise Ruang Kelana (Annual 150 Seat)',
    quantity: 1,
    unitPrice: 120000000,
    totalAmount: 120000000,
    status: 'Shipped & Invoiced',
    orderDate: '2026-10-18',
    invoiceNumber: 'INV-RK-2026-0042',
    invoiceDate: '2026-10-20',
    paymentStatus: 'Unpaid',
  },
  {
    id: 'so-002',
    soNumber: 'SO-202610-002',
    customerName: 'Ibu Ratna Dewi',
    customerCompany: 'PT Sinergi Media Digital',
    itemName: 'Paket Custom Modul Workflow & API Integrations',
    quantity: 1,
    unitPrice: 45000000,
    totalAmount: 45000000,
    status: 'Paid & Completed',
    orderDate: '2026-10-10',
    invoiceNumber: 'INV-RK-2026-0038',
    invoiceDate: '2026-10-12',
    paymentStatus: 'Paid (Mekari/Bank)',
    paymentMethod: 'BCA Virtual Account (Mekari Pay)',
  },
];

const INITIAL_INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: 'inv-001',
    sku: 'HW-DELL-U27',
    name: 'Monitor Dell UltraSharp 27" 4K',
    category: 'Hardware & IT',
    stock: 5,
    minStock: 2,
    unit: 'Unit',
    valuationPerUnit: 7500000,
    totalValuation: 37500000,
    warehouseLocation: 'Gudang Utama Lantai 2 (Rak B-03)',
    lastUpdated: '2026-10-29',
  },
  {
    id: 'inv-002',
    sku: 'HW-MBP-M3',
    name: 'MacBook Pro M3 Pro 18GB/512GB',
    category: 'Laptop Karyawan',
    stock: 4,
    minStock: 2,
    unit: 'Unit',
    valuationPerUnit: 28500000,
    totalValuation: 114000000,
    warehouseLocation: 'Brankas IT Asset Lt. 3',
    lastUpdated: '2026-10-27',
  },
  {
    id: 'inv-003',
    sku: 'MRCH-RK-HOODIE',
    name: 'Exclusive Kelana Team Hoodie 2026',
    category: 'Merchandise & Seragam',
    stock: 45,
    minStock: 15,
    unit: 'Pcs',
    valuationPerUnit: 250000,
    totalValuation: 11250000,
    warehouseLocation: 'Lemari Souvenir & HR Lt. 1',
    lastUpdated: '2026-10-20',
  },
];

const INITIAL_FIXED_ASSETS: FixedAsset[] = [
  {
    id: 'fa-001',
    assetCode: 'AST-SRV-01',
    name: 'High-Performance Local Cluster Server (Rackmount)',
    category: 'Elektronik & Komputer',
    location: 'Server Room Ruang Kelana Lt. 3',
    purchaseDate: '2025-01-15',
    acquisitionCost: 95000000,
    usefulLifeYears: 4,
    accumulatedDepreciation: 41562500,
    bookValue: 53437500,
    condition: 'Sangat Baik',
    assignedTo: 'Tim DevOps IT',
  },
  {
    id: 'fa-002',
    assetCode: 'AST-VEH-01',
    name: 'Toyota Kijang Innova Zenix Hybrid (Kendaraan Dinas Operasional)',
    category: 'Kendaraan',
    location: 'Parkir Utama Kantor Lt. Basement',
    purchaseDate: '2025-06-10',
    acquisitionCost: 460000000,
    usefulLifeYears: 8,
    accumulatedDepreciation: 76666666,
    bookValue: 383333334,
    condition: 'Sangat Baik',
    assignedTo: 'General Affair & Operasional',
  },
  {
    id: 'fa-003',
    assetCode: 'AST-FURN-01',
    name: 'Ergonomic Desk & Herman Miller Chairs (25 Set)',
    category: 'Furnitur Kantor',
    location: 'Open Office Lt. 2 & 3',
    purchaseDate: '2024-11-01',
    acquisitionCost: 150000000,
    usefulLifeYears: 5,
    accumulatedDepreciation: 60000000,
    bookValue: 90000000,
    condition: 'Baik',
    assignedTo: 'Seluruh Karyawan',
  },
];

const INITIAL_PAYROLL_RECORDS: PayrollRecord[] = [
  {
    id: 'pay-001',
    employeeNik: 'KEL-001',
    employeeName: 'Admin Kantor Kelana',
    division: 'Operasional & HR',
    position: 'HR & Office Administrator',
    period: 'Oktober 2026',
    basicSalary: 12500000,
    allowances: 2500000,
    attendanceDeductions: 0,
    taxPPH21: 750000,
    netSalary: 14250000,
    paymentStatus: 'Approved',
  },
  {
    id: 'pay-002',
    employeeNik: 'KEL-002',
    employeeName: 'Andi Wirawan',
    division: 'Teknologi & IT',
    position: 'Frontend Developer',
    period: 'Oktober 2026',
    basicSalary: 11000000,
    allowances: 1800000,
    attendanceDeductions: 150000,
    taxPPH21: 630000,
    netSalary: 12020000,
    paymentStatus: 'Approved',
  },
  {
    id: 'pay-003',
    employeeNik: 'KEL-003',
    employeeName: 'Siti Rahmawati',
    division: 'Financial',
    position: 'Finance & Accounting Lead',
    period: 'Oktober 2026',
    basicSalary: 13500000,
    allowances: 2200000,
    attendanceDeductions: 0,
    taxPPH21: 850000,
    netSalary: 14850000,
    paymentStatus: 'Draft',
  },
];

const INITIAL_DEPARTMENT_BUDGETS: DepartmentBudget[] = [
  {
    id: 'bdg-001',
    department: 'Teknologi & IT',
    year: 2026,
    allocatedBudget: 350000000,
    spentBudget: 245000000,
    remainingBudget: 105000000,
    variancePercentage: 70.0,
    status: 'Aman',
  },
  {
    id: 'bdg-002',
    department: 'Pemasaran & Bisnis',
    year: 2026,
    allocatedBudget: 200000000,
    spentBudget: 172000000,
    remainingBudget: 28000000,
    variancePercentage: 86.0,
    status: 'Peringatan (>80%)',
  },
  {
    id: 'bdg-003',
    department: 'Operasional & HR',
    year: 2026,
    allocatedBudget: 180000000,
    spentBudget: 115000000,
    remainingBudget: 65000000,
    variancePercentage: 63.8,
    status: 'Aman',
  },
  {
    id: 'bdg-004',
    department: 'Financial & Accounting',
    year: 2026,
    allocatedBudget: 80000000,
    spentBudget: 38000000,
    remainingBudget: 42000000,
    variancePercentage: 47.5,
    status: 'Aman',
  },
];

const INITIAL_EXPENSE_CLAIMS: OperationalExpenseClaim[] = [
  {
    id: 'clm-001',
    claimNumber: 'CLM-202610-001',
    claimantName: 'Andi Wirawan',
    department: 'Teknologi & IT',
    description: 'Klaim taksi bandara & konsumsi meeting klien di Surabaya',
    category: 'Transport & Perjalanan',
    amount: 1250000,
    status: 'Approved & Reimbursed',
    submissionDate: '2026-10-22',
    approvedBy: 'Siti Rahmawati (Finance)',
  },
  {
    id: 'clm-002',
    claimNumber: 'CLM-202610-002',
    claimantName: 'Maya Indah',
    department: 'Pemasaran & Bisnis',
    description: 'Beli ATK, whiteboard marker, & snack meeting bulanan all-hands',
    category: 'Petty Cash',
    amount: 680000,
    status: 'Pending Approval',
    submissionDate: '2026-10-29',
  },
];

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      bankAccounts: INITIAL_BANK_ACCOUNTS,
      journalEntries: INITIAL_JOURNAL_ENTRIES,
      purchaseRequisitions: INITIAL_PURCHASE_REQUISITIONS,
      purchaseOrders: INITIAL_PURCHASE_ORDERS,
      salesOrders: INITIAL_SALES_ORDERS,
      inventoryItems: INITIAL_INVENTORY_ITEMS,
      fixedAssets: INITIAL_FIXED_ASSETS,
      payrollRecords: INITIAL_PAYROLL_RECORDS,
      departmentBudgets: INITIAL_DEPARTMENT_BUDGETS,
      expenseClaims: INITIAL_EXPENSE_CLAIMS,

      // Workflow A: Procure to Pay
      createPurchaseRequisition: (prData) => {
        const nextId = `pr-${Date.now()}`;
        const prNumber = `PR-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(get().purchaseRequisitions.length + 1).padStart(3, '0')}`;
        const newPR: PurchaseRequisition = {
          ...prData,
          id: nextId,
          prNumber,
          date: new Date().toISOString().split('T')[0],
          status: 'Pending Approval',
        };
        set((state) => ({ purchaseRequisitions: [newPR, ...state.purchaseRequisitions] }));
      },

      approvePurchaseRequisition: (id, approverName) => {
        set((state) => {
          const pr = state.purchaseRequisitions.find((p) => p.id === id);
          if (!pr) return state;

          const updatedPRs = state.purchaseRequisitions.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: 'Approved' as const,
                  approvedBy: approverName,
                  approvalDate: new Date().toISOString().split('T')[0],
                }
              : p
          );

          // Auto convert to PO (Workflow step 3)
          const poNumber = `PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(state.purchaseOrders.length + 1).padStart(3, '0')}`;
          const newPO: PurchaseOrder = {
            id: `po-${Date.now()}`,
            poNumber,
            prNumber: pr.prNumber,
            vendorName: 'Vendor Rekomendasi Procurement',
            vendorContact: 'vendor@partner.co.id',
            itemName: pr.itemName,
            quantity: pr.quantity,
            unitPrice: pr.estimatedPrice,
            totalAmount: pr.totalAmount,
            status: 'Issued',
            orderDate: new Date().toISOString().split('T')[0],
            expectedDelivery: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
            goodsReceiptStatus: 'Belum Diterima',
            paymentStatus: 'Belum Bayar',
          };

          return {
            purchaseRequisitions: updatedPRs,
            purchaseOrders: [newPO, ...state.purchaseOrders],
          };
        });
      },

      rejectPurchaseRequisition: (id) => {
        set((state) => ({
          purchaseRequisitions: state.purchaseRequisitions.map((p) =>
            p.id === id ? { ...p, status: 'Rejected' as const } : p
          ),
        }));
      },

      createPurchaseOrder: (poData) => {
        const nextId = `po-${Date.now()}`;
        const poNumber = `PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(get().purchaseOrders.length + 1).padStart(3, '0')}`;
        const newPO: PurchaseOrder = {
          ...poData,
          id: nextId,
          poNumber,
          orderDate: new Date().toISOString().split('T')[0],
          status: 'Issued',
          goodsReceiptStatus: 'Belum Diterima',
          paymentStatus: 'Belum Bayar',
        };
        set((state) => ({ purchaseOrders: [newPO, ...state.purchaseOrders] }));
      },

      // Goods Receipt: stock arrives -> update inventory & book Accounts Payable
      receiveGoods: (poId) => {
        set((state) => {
          const po = state.purchaseOrders.find((p) => p.id === poId);
          if (!po) return state;

          const updatedPOs = state.purchaseOrders.map((p) =>
            p.id === poId
              ? {
                  ...p,
                  goodsReceiptStatus: 'Sudah Diterima (Gudang)' as const,
                  status: 'Received & AP Billed' as const,
                }
              : p
          );

          // Tambah Jurnal Otomatis Utang Dagang (AP)
          const newJE: JournalEntry = {
            id: `je-${Date.now()}`,
            entryNumber: `JV-${Date.now().toString().slice(-6)}`,
            date: new Date().toISOString().split('T')[0],
            description: `Penerimaan Barang PO ${po.poNumber} (${po.itemName})`,
            reference: po.poNumber,
            accountDebit: '1310 - Persediaan / Beban Barang Masuk',
            accountCredit: '2010 - Utang Usaha (AP)',
            amount: po.totalAmount,
            category: 'Utang',
            status: 'Posted',
            createdBy: 'Sistem ERP Otomatis (Goods Receipt)',
          };

          return {
            purchaseOrders: updatedPOs,
            journalEntries: [newJE, ...state.journalEntries],
          };
        });
      },

      payPurchaseOrder: (poId, bankId) => {
        set((state) => {
          const po = state.purchaseOrders.find((p) => p.id === poId);
          const bank = state.bankAccounts.find((b) => b.id === bankId) || state.bankAccounts[0];
          if (!po || !bank) return state;

          const updatedPOs = state.purchaseOrders.map((p) =>
            p.id === poId ? { ...p, paymentStatus: 'Lunas' as const, status: 'Completed' as const } : p
          );

          const updatedBanks = state.bankAccounts.map((b) =>
            b.id === bank.id ? { ...b, balance: b.balance - po.totalAmount } : b
          );

          // Jurnal Pelunasan Utang -> Kas/Bank Berkurang
          const newJE: JournalEntry = {
            id: `je-${Date.now()}`,
            entryNumber: `JV-${Date.now().toString().slice(-6)}`,
            date: new Date().toISOString().split('T')[0],
            description: `Pelunasan Utang Vendor PO ${po.poNumber} via ${bank.bankName}`,
            reference: po.poNumber,
            accountDebit: '2010 - Utang Usaha (AP)',
            accountCredit: `1010 - ${bank.bankName}`,
            amount: po.totalAmount,
            category: 'Utang',
            status: 'Posted',
            createdBy: 'Finance Disbursement Officer',
          };

          return {
            purchaseOrders: updatedPOs,
            bankAccounts: updatedBanks,
            journalEntries: [newJE, ...state.journalEntries],
          };
        });
      },

      // Workflow B: Order to Cash
      createSalesOrder: (soData) => {
        const nextId = `so-${Date.now()}`;
        const soNumber = `SO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(get().salesOrders.length + 1).padStart(3, '0')}`;
        const newSO: SalesOrder = {
          ...soData,
          id: nextId,
          soNumber,
          orderDate: new Date().toISOString().split('T')[0],
          status: 'Confirmed',
          paymentStatus: 'Unpaid',
        };
        set((state) => ({ salesOrders: [newSO, ...state.salesOrders] }));
      },

      shipAndInvoiceSalesOrder: (soId) => {
        set((state) => {
          const so = state.salesOrders.find((s) => s.id === soId);
          if (!so) return state;

          const invNumber = `INV-RK-${new Date().getFullYear()}-${String(state.salesOrders.length + 10).padStart(4, '0')}`;
          const updatedSOs = state.salesOrders.map((s) =>
            s.id === soId
              ? {
                  ...s,
                  status: 'Shipped & Invoiced' as const,
                  invoiceNumber: invNumber,
                  invoiceDate: new Date().toISOString().split('T')[0],
                }
              : s
          );

          // Jurnal Otomatis: Piutang Usaha (AR) bertambah, Pendapatan bertambah
          const newJE: JournalEntry = {
            id: `je-${Date.now()}`,
            entryNumber: `JV-${Date.now().toString().slice(-6)}`,
            date: new Date().toISOString().split('T')[0],
            description: `Penerbitan Faktur ${invNumber} kepada ${so.customerCompany}`,
            reference: invNumber,
            accountDebit: '1120 - Piutang Usaha (AR)',
            accountCredit: '4010 - Pendapatan Penjualan Layanan',
            amount: so.totalAmount,
            category: 'Piutang',
            status: 'Posted',
            createdBy: 'Sistem ERP Billing Otomatis',
          };

          return {
            salesOrders: updatedSOs,
            journalEntries: [newJE, ...state.journalEntries],
          };
        });
      },

      reconcileSalesPayment: (soId, bankId, paymentMethod) => {
        set((state) => {
          const so = state.salesOrders.find((s) => s.id === soId);
          const bank = state.bankAccounts.find((b) => b.id === bankId) || state.bankAccounts[0];
          if (!so || !bank) return state;

          const updatedSOs = state.salesOrders.map((s) =>
            s.id === soId
              ? {
                  ...s,
                  status: 'Paid & Completed' as const,
                  paymentStatus: 'Paid (Mekari/Bank)' as const,
                  paymentMethod: paymentMethod || 'Bank Transfer',
                }
              : s
          );

          const updatedBanks = state.bankAccounts.map((b) =>
            b.id === bank.id ? { ...b, balance: b.balance + so.totalAmount } : b
          );

          // Jurnal Penerimaan Kas / Rekonsiliasi Bank
          const newJE: JournalEntry = {
            id: `je-${Date.now()}`,
            entryNumber: `JV-${Date.now().toString().slice(-6)}`,
            date: new Date().toISOString().split('T')[0],
            description: `Penerimaan Pelunasan Faktur ${so.invoiceNumber || so.soNumber} (${so.customerCompany})`,
            reference: so.invoiceNumber || so.soNumber,
            accountDebit: `1010 - ${bank.bankName}`,
            accountCredit: '1120 - Piutang Usaha (AR)',
            amount: so.totalAmount,
            category: 'Kas/Bank',
            status: 'Posted',
            createdBy: 'Finance Cash & Bank Reconciler',
          };

          return {
            salesOrders: updatedSOs,
            bankAccounts: updatedBanks,
            journalEntries: [newJE, ...state.journalEntries],
          };
        });
      },

      // Workflow C: Expense Management
      submitExpenseClaim: (claimData) => {
        const nextId = `clm-${Date.now()}`;
        const claimNumber = `CLM-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(get().expenseClaims.length + 1).padStart(3, '0')}`;
        const newClaim: OperationalExpenseClaim = {
          ...claimData,
          id: nextId,
          claimNumber,
          submissionDate: new Date().toISOString().split('T')[0],
          status: 'Pending Approval',
        };
        set((state) => ({ expenseClaims: [newClaim, ...state.expenseClaims] }));
      },

      approveAndReimburseExpenseClaim: (id, approverName, bankId) => {
        set((state) => {
          const claim = state.expenseClaims.find((c) => c.id === id);
          const bank = state.bankAccounts.find((b) => b.id === bankId) || state.bankAccounts[0];
          if (!claim || !bank) return state;

          const updatedClaims = state.expenseClaims.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: 'Approved & Reimbursed' as const,
                  approvedBy: approverName,
                }
              : c
          );

          const updatedBanks = state.bankAccounts.map((b) =>
            b.id === bank.id ? { ...b, balance: b.balance - claim.amount } : b
          );

          // Auto Jurnal Debit Beban Operasional, Kredit Kas/Bank
          const newJE: JournalEntry = {
            id: `je-${Date.now()}`,
            entryNumber: `JV-${Date.now().toString().slice(-6)}`,
            date: new Date().toISOString().split('T')[0],
            description: `Reimbursement Klaim ${claim.claimNumber}: ${claim.description} (${claim.claimantName})`,
            reference: claim.claimNumber,
            accountDebit: `6090 - Beban Operasional (${claim.category})`,
            accountCredit: `1010 - ${bank.bankName}`,
            amount: claim.amount,
            category: 'Biaya Operasional',
            status: 'Posted',
            createdBy: `${approverName} (Expense Approver)`,
          };

          return {
            expenseClaims: updatedClaims,
            bankAccounts: updatedBanks,
            journalEntries: [newJE, ...state.journalEntries],
          };
        });
      },

      rejectExpenseClaim: (id) => {
        set((state) => ({
          expenseClaims: state.expenseClaims.map((c) =>
            c.id === id ? { ...c, status: 'Rejected' as const } : c
          ),
        }));
      },

      // Bank Accounts CRUD
      addBankAccount: (accountData) => {
        const nextId = `bank-${Date.now()}`;
        const newBank: BankAccount = {
          ...accountData,
          id: nextId,
        };
        set((state) => ({ bankAccounts: [...state.bankAccounts, newBank] }));
      },

      updateBankAccount: (id, updatedFields) => {
        set((state) => ({
          bankAccounts: state.bankAccounts.map((b) => (b.id === id ? { ...b, ...updatedFields } : b)),
        }));
      },

      adjustBankBalance: (id, amountChange, description) => {
        set((state) => {
          const bank = state.bankAccounts.find((b) => b.id === id);
          if (!bank) return state;

          const updatedBanks = state.bankAccounts.map((b) =>
            b.id === id ? { ...b, balance: Math.max(0, b.balance + amountChange) } : b
          );

          // Buat jurnal mutasi kas/bank otomatis
          const isDeposit = amountChange > 0;
          const absAmount = Math.abs(amountChange);
          const newJE: JournalEntry = {
            id: `je-${Date.now()}`,
            entryNumber: `JV-${Date.now().toString().slice(-6)}`,
            date: new Date().toISOString().split('T')[0],
            description: description || `Penyesuaian Saldo Kas ${bank.bankName} (${isDeposit ? 'Setor/Tambah' : 'Tarik/Kurang'})`,
            reference: `ADJ-${bank.id.slice(-4)}`,
            accountDebit: isDeposit ? `1010 - ${bank.bankName}` : '6090 - Penyesuaian Kas Operasional',
            accountCredit: isDeposit ? '3010 - Setoran Modal / Kas Masuk' : `1010 - ${bank.bankName}`,
            amount: absAmount,
            category: 'Kas/Bank',
            status: 'Posted',
            createdBy: 'Kasir / Finance',
          };

          return {
            bankAccounts: updatedBanks,
            journalEntries: [newJE, ...state.journalEntries],
          };
        });
      },

      deleteBankAccount: (id) => {
        set((state) => ({
          bankAccounts: state.bankAccounts.filter((b) => b.id !== id),
        }));
      },

      addJournalEntry: (entryData) => {
        const nextId = `je-${Date.now()}`;
        const entryNumber = `JV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(get().journalEntries.length + 1).padStart(3, '0')}`;
        const newJE: JournalEntry = {
          ...entryData,
          id: nextId,
          entryNumber,
          date: new Date().toISOString().split('T')[0],
        };
        set((state) => ({ journalEntries: [newJE, ...state.journalEntries] }));
      },

      addInventoryItem: (itemData) => {
        const nextId = `inv-${Date.now()}`;
        const totalValuation = itemData.stock * itemData.valuationPerUnit;
        const newItem: InventoryItem = {
          ...itemData,
          id: nextId,
          totalValuation,
          lastUpdated: new Date().toISOString().split('T')[0],
        };
        set((state) => ({ inventoryItems: [newItem, ...state.inventoryItems] }));
      },

      updateInventoryItem: (id, updatedFields) => {
        set((state) => ({
          inventoryItems: state.inventoryItems.map((item) => {
            if (item.id === id) {
              const updated = { ...item, ...updatedFields };
              updated.totalValuation = updated.stock * updated.valuationPerUnit;
              updated.lastUpdated = new Date().toISOString().split('T')[0];
              return updated;
            }
            return item;
          }),
        }));
      },

      deleteInventoryItem: (id) => {
        set((state) => ({
          inventoryItems: state.inventoryItems.filter((item) => item.id !== id),
        }));
      },

      adjustInventoryStock: (sku, change, reason) => {
        set((state) => ({
          inventoryItems: state.inventoryItems.map((item) => {
            if (item.sku === sku) {
              const newStock = Math.max(0, item.stock + change);
              return {
                ...item,
                stock: newStock,
                totalValuation: newStock * item.valuationPerUnit,
                lastUpdated: new Date().toISOString().split('T')[0],
              };
            }
            return item;
          }),
        }));
      },

      // Fixed Assets Actions
      addFixedAsset: (assetData) => {
        const nextId = `fa-${Date.now()}`;
        const accumulatedDepreciation = assetData.initialDepreciation || 0;
        const bookValue = Math.max(0, assetData.acquisitionCost - accumulatedDepreciation);
        const newAsset: FixedAsset = {
          ...assetData,
          id: nextId,
          accumulatedDepreciation,
          bookValue,
        };
        set((state) => ({ fixedAssets: [newAsset, ...state.fixedAssets] }));
      },

      updateFixedAsset: (id, updatedFields) => {
        set((state) => ({
          fixedAssets: state.fixedAssets.map((asset) => {
            if (asset.id === id) {
              const updated = { ...asset, ...updatedFields };
              updated.bookValue = Math.max(0, updated.acquisitionCost - updated.accumulatedDepreciation);
              return updated;
            }
            return asset;
          }),
        }));
      },

      depreciateFixedAsset: (id, amount, description) => {
        set((state) => {
          const asset = state.fixedAssets.find((a) => a.id === id);
          if (!asset) return state;

          const newDepr = asset.accumulatedDepreciation + amount;
          const newBookValue = Math.max(0, asset.acquisitionCost - newDepr);

          const updatedAssets = state.fixedAssets.map((a) =>
            a.id === id
              ? {
                  ...a,
                  accumulatedDepreciation: newDepr,
                  bookValue: newBookValue,
                }
              : a
          );

          // Buat jurnal depresiasi aset otomatis
          const newJE: JournalEntry = {
            id: `je-${Date.now()}`,
            entryNumber: `JV-${Date.now().toString().slice(-6)}`,
            date: new Date().toISOString().split('T')[0],
            description: description || `Penyusutan Nilai Aset ${asset.name} (${asset.assetCode})`,
            reference: asset.assetCode,
            accountDebit: '6090 - Beban Penyusutan Aset Tetap',
            accountCredit: '1510 - Akumulasi Penyusutan Aset',
            amount,
            category: 'Aset Tetap',
            status: 'Posted',
            createdBy: 'Sistem Depresiasi Aset',
          };

          return {
            fixedAssets: updatedAssets,
            journalEntries: [newJE, ...state.journalEntries],
          };
        });
      },

      deleteFixedAsset: (id) => {
        set((state) => ({
          fixedAssets: state.fixedAssets.filter((a) => a.id !== id),
        }));
      },

      // Payroll Actions
      addPayrollRecord: (payrollData) => {
        const nextId = `pay-${Date.now()}`;
        const netSalary = Math.max(
          0,
          payrollData.basicSalary + payrollData.allowances - payrollData.attendanceDeductions - payrollData.taxPPH21
        );
        const newRecord: PayrollRecord = {
          ...payrollData,
          id: nextId,
          netSalary,
          slipSentStatus: 'Belum Dikirim',
        };
        set((state) => ({ payrollRecords: [newRecord, ...state.payrollRecords] }));
      },

      updatePayrollRecord: (id, updatedFields) => {
        set((state) => ({
          payrollRecords: state.payrollRecords.map((r) => {
            if (r.id === id) {
              const updated = { ...r, ...updatedFields };
              updated.netSalary = Math.max(
                0,
                updated.basicSalary + updated.allowances - updated.attendanceDeductions - updated.taxPPH21
              );
              return updated;
            }
            return r;
          }),
        }));
      },

      deletePayrollRecord: (id) => {
        set((state) => ({
          payrollRecords: state.payrollRecords.filter((r) => r.id !== id),
        }));
      },

      disbursePayrollRecord: (payrollId, bankId, proofUrl) => {
        set((state) => {
          const rec = state.payrollRecords.find((r) => r.id === payrollId);
          const bank = state.bankAccounts.find((b) => b.id === bankId) || state.bankAccounts[1] || state.bankAccounts[0];
          if (!rec || !bank) return state;

          const updatedRecs = state.payrollRecords.map((r) =>
            r.id === payrollId
              ? {
                  ...r,
                  paymentStatus: 'Disbursed (Posted to GL)' as const,
                  disbursementDate: new Date().toISOString().split('T')[0],
                  paymentProofUrl: proofUrl || r.paymentProofUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400',
                }
              : r
          );

          const updatedBanks = state.bankAccounts.map((b) =>
            b.id === bank.id ? { ...b, balance: b.balance - rec.netSalary } : b
          );

          const newJE: JournalEntry = {
            id: `je-${Date.now()}`,
            entryNumber: `JV-${Date.now().toString().slice(-6)}`,
            date: new Date().toISOString().split('T')[0],
            description: `Pembayaran Gaji Karyawan ${rec.employeeName} (${rec.period})`,
            reference: `PAY-${rec.employeeNik}`,
            accountDebit: '6001 - Beban Gaji & Kompensasi Karyawan',
            accountCredit: `1010 - ${bank.bankName}`,
            amount: rec.netSalary,
            category: 'Biaya Operasional',
            status: 'Posted',
            createdBy: 'Payroll System Integration',
          };

          return {
            payrollRecords: updatedRecs,
            bankAccounts: updatedBanks,
            journalEntries: [newJE, ...state.journalEntries],
          };
        });
      },

      attachPaymentProof: (payrollId, proofUrl) => {
        set((state) => ({
          payrollRecords: state.payrollRecords.map((r) =>
            r.id === payrollId ? { ...r, paymentProofUrl: proofUrl } : r
          ),
        }));
      },

      sendSalarySlip: (payrollId) => {
        set((state) => ({
          payrollRecords: state.payrollRecords.map((r) =>
            r.id === payrollId
              ? {
                  ...r,
                  slipSentStatus: 'Terkirim ke Email Karyawan' as const,
                  slipSentAt: new Date().toISOString(),
                }
              : r
          ),
        }));
      },

      addDepartmentBudget: (budgetData) => {
        set((state) => {
          const nextId = `bdg-${Date.now()}`;
          const remaining = budgetData.allocatedBudget - budgetData.spentBudget;
          const variance = budgetData.allocatedBudget > 0
            ? Math.round((budgetData.spentBudget / budgetData.allocatedBudget) * 1000) / 10
            : 0;
          const status = variance > 100 ? 'Over Budget' : variance > 80 ? 'Peringatan (>80%)' : 'Aman';

          const newBudget: DepartmentBudget = {
            ...budgetData,
            id: nextId,
            remainingBudget: remaining,
            variancePercentage: variance,
            status,
          };
          return { departmentBudgets: [...state.departmentBudgets, newBudget] };
        });
      },

      updateDepartmentBudget: (id, budgetData) => {
        set((state) => ({
          departmentBudgets: state.departmentBudgets.map((b) => {
            if (b.id !== id) return b;
            const updatedAllocated = budgetData.allocatedBudget ?? b.allocatedBudget;
            const updatedSpent = budgetData.spentBudget ?? b.spentBudget;
            const remaining = updatedAllocated - updatedSpent;
            const variance = updatedAllocated > 0
              ? Math.round((updatedSpent / updatedAllocated) * 1000) / 10
              : 0;
            const status = variance > 100 ? 'Over Budget' : variance > 80 ? 'Peringatan (>80%)' : 'Aman';

            return {
              ...b,
              ...budgetData,
              allocatedBudget: updatedAllocated,
              spentBudget: updatedSpent,
              remainingBudget: remaining,
              variancePercentage: variance,
              status,
            };
          }),
        }));
      },

      adjustDepartmentBudget: (id, allocatedChange) => {
        set((state) => ({
          departmentBudgets: state.departmentBudgets.map((b) => {
            if (b.id !== id) return b;
            const updatedAllocated = Math.max(0, b.allocatedBudget + allocatedChange);
            const remaining = updatedAllocated - b.spentBudget;
            const variance = updatedAllocated > 0
              ? Math.round((b.spentBudget / updatedAllocated) * 1000) / 10
              : 0;
            const status = variance > 100 ? 'Over Budget' : variance > 80 ? 'Peringatan (>80%)' : 'Aman';

            return {
              ...b,
              allocatedBudget: updatedAllocated,
              remainingBudget: remaining,
              variancePercentage: variance,
              status,
            };
          }),
        }));
      },

      deleteDepartmentBudget: (id) => {
        set((state) => ({
          departmentBudgets: state.departmentBudgets.filter((b) => b.id !== id),
        }));
      },

      resetToDemo: () => {
        set({
          bankAccounts: INITIAL_BANK_ACCOUNTS,
          journalEntries: INITIAL_JOURNAL_ENTRIES,
          purchaseRequisitions: INITIAL_PURCHASE_REQUISITIONS,
          purchaseOrders: INITIAL_PURCHASE_ORDERS,
          salesOrders: INITIAL_SALES_ORDERS,
          inventoryItems: INITIAL_INVENTORY_ITEMS,
          fixedAssets: INITIAL_FIXED_ASSETS,
          payrollRecords: INITIAL_PAYROLL_RECORDS,
          departmentBudgets: INITIAL_DEPARTMENT_BUDGETS,
          expenseClaims: INITIAL_EXPENSE_CLAIMS,
        });
      },
    }),
    {
      name: 'ruang-kelana-finance-storage',
    }
  )
);
