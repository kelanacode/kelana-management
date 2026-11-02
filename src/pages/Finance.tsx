import { DIVISIONS } from '../constants/divisions';
import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building2,
  ShoppingCart,
  Receipt,
  Boxes,
  Briefcase,
  Users,
  PieChart,
  FileBarChart2,
  Plus,
  CheckCircle2,
  Clock,
  ArrowRight,
  Send,
  CreditCard,
  AlertCircle,
  Truck,
  Check,
  X,
  FileText,
  BadgeAlert,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Wallet,
  ShieldCheck,
  Filter,
  Pencil,
  Trash2,
  Minus,
  Sparkles,
  ArrowRightLeft,
  Mail,
  Paperclip,
  Download,
  Eye,
  Printer,
  CheckCheck,
  ExternalLink,
} from 'lucide-react';
import { useFinanceStore } from '../stores/financeStore';
import { useAuthStore } from '../stores/authStore';
import { useAttendanceStore } from '../stores/attendanceStore';
import { useProcureToPayStore } from '../stores/procureToPayStore';
import { FinanceTab, FixedAsset, PayrollRecord } from '../types/finance';
import { ProcureToPayModal } from '../components/procurement/ProcureToPayModal';
import { printSalarySlip } from '../utils/salarySlipHelper';

const formatIDR = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const FinancePage: React.FC = () => {
  const { session, users } = useAuthStore();
  const finance = useFinanceStore();
  const attendance = useAttendanceStore();
  const p2pStore = useProcureToPayStore();

  const currentUser = session?.user;
  const currentRole = currentUser?.role;
  const currentPos = (currentUser?.position || '').toLowerCase();
  const isCEO =
    currentRole === 'CEO' ||
    (currentUser?.division || '').toLowerCase().includes('all role') ||
    currentPos.includes('ceo') ||
    currentPos.includes('direktur');
  const isFinance =
    currentRole === 'Finance' ||
    currentRole === 'Admin' ||
    currentRole === 'CEO' ||
    (currentUser?.division || '').toLowerCase().includes('finan');

  const [activeTab, setActiveTab] = useState<FinanceTab>('accounting');
  const [activeWorkflow, setActiveWorkflow] = useState<'A' | 'B' | 'C'>('A');

  // Daftar Pilihan Divisi & Periode Gaji Resmi
  const DIVISION_OPTIONS: string[] = [...DIVISIONS];

  const PERIOD_OPTIONS = [
    'Januari 2026',
    'Februari 2026',
    'Maret 2026',
    'April 2026',
    'Mei 2026',
    'Juni 2026',
    'Juli 2026',
    'Agustus 2026',
    'September 2026',
    'Oktober 2026',
    'November 2026',
    'Desember 2026',
  ];

  // Helper kalkulasi PPh 21 Otomatis (Tarif Efektif Rata-Rata / TER PP 58/2023 & UU HPP Kategori A - PTKP TK/0)
  const calculateAutoPPH21 = (grossIncome: number): number => {
    if (grossIncome <= 5400000) return 0;
    if (grossIncome <= 5650000) return Math.round(grossIncome * 0.0025);
    if (grossIncome <= 5950000) return Math.round(grossIncome * 0.005);
    if (grossIncome <= 6300000) return Math.round(grossIncome * 0.0075);
    if (grossIncome <= 6750000) return Math.round(grossIncome * 0.01);
    if (grossIncome <= 7500000) return Math.round(grossIncome * 0.0125);
    if (grossIncome <= 8550000) return Math.round(grossIncome * 0.015);
    if (grossIncome <= 9650000) return Math.round(grossIncome * 0.02);
    if (grossIncome <= 10050000) return Math.round(grossIncome * 0.0225);
    if (grossIncome <= 10350000) return Math.round(grossIncome * 0.025);
    if (grossIncome <= 10700000) return Math.round(grossIncome * 0.03);
    if (grossIncome <= 11050000) return Math.round(grossIncome * 0.035);
    if (grossIncome <= 11600000) return Math.round(grossIncome * 0.04);
    if (grossIncome <= 12500000) return Math.round(grossIncome * 0.05);
    if (grossIncome <= 13750000) return Math.round(grossIncome * 0.06);
    if (grossIncome <= 15100000) return Math.round(grossIncome * 0.07);
    if (grossIncome <= 16950000) return Math.round(grossIncome * 0.08);
    if (grossIncome <= 19750000) return Math.round(grossIncome * 0.09);
    if (grossIncome <= 24150000) return Math.round(grossIncome * 0.10);
    return Math.round(grossIncome * 0.12);
  };

  // Helper kalkulasi Potongan Absen Otomatis dari catatan absensi
  const calculateAutoAttendanceDeduction = (userNik: string, basicSalary: number): number => {
    // Cari semua record absensi berdasarkan NIK
    const userRecords = attendance.records.filter((r) => r.userNik === userNik);
    let totalDeduction = 0;
    const dailyRate = Math.round(basicSalary / 22); // Estimasi 22 hari kerja per bulan
    const lateDeduction = 50000; // Denda terlambat Rp 50.000 per kejadian

    userRecords.forEach((rec) => {
      if ((rec.status as string) === 'Terlambat') {
        totalDeduction += lateDeduction;
      } else if ((rec.status as string) === 'Alpa' || (rec.status as string) === 'Belum Absen') {
        totalDeduction += dailyRate;
      }
    });

    return totalDeduction;
  };

  // Modal / Form states
  const [showP2PModal, setShowP2PModal] = useState(false);
  const [showPRModal, setShowPRModal] = useState(false);
  const [showSOModal, setShowSOModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showJEModal, setShowJEModal] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [editingBank, setEditingBank] = useState<{ id: string; bankName: string; accountNumber: string; balance: number } | null>(null);
  const [adjustingBank, setAdjustingBank] = useState<{ id: string; bankName: string; type: 'add' | 'subtract'; amount: number; description: string } | null>(null);

  // Inventory Modal states
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);
  const [editingInventory, setEditingInventory] = useState<{
    id: string;
    sku: string;
    name: string;
    category: string;
    stock: number;
    minStock: number;
    unit: string;
    valuationPerUnit: number;
    warehouseLocation: string;
  } | null>(null);
  const [adjustingInventory, setAdjustingInventory] = useState<{
    sku: string;
    name: string;
    type: 'add' | 'subtract';
    amount: number;
    reason: string;
  } | null>(null);

  const [inventoryForm, setInventoryForm] = useState({
    sku: '',
    name: '',
    category: 'Hardware & IT',
    stock: 1,
    minStock: 2,
    unit: 'Unit',
    valuationPerUnit: 0,
    warehouseLocation: 'Gudang Utama Lantai 2',
  });

  // Fixed Asset Modal states
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);
  const [depreciatingAsset, setDepreciatingAsset] = useState<{
    id: string;
    assetCode: string;
    name: string;
    amount: number;
    description: string;
  } | null>(null);

  const [assetForm, setAssetForm] = useState<{
    assetCode: string;
    name: string;
    category: 'Elektronik & Komputer' | 'Kendaraan' | 'Furnitur Kantor' | 'Gedung / Properti';
    location: string;
    purchaseDate: string;
    acquisitionCost: number;
    usefulLifeYears: number;
    initialDepreciation: number;
    condition: 'Sangat Baik' | 'Baik' | 'Perlu Servis';
    assignedTo: string;
  }>({
    assetCode: '',
    name: '',
    category: 'Elektronik & Komputer',
    location: 'Kantor Utama Ruang Kelana',
    purchaseDate: new Date().toISOString().split('T')[0],
    acquisitionCost: 0,
    usefulLifeYears: 4,
    initialDepreciation: 0,
    condition: 'Sangat Baik',
    assignedTo: '',
  });

  // HRIS & Payroll Modal states
  const [showAddPayrollModal, setShowAddPayrollModal] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<PayrollRecord | null>(null);
  const [selectedSlipRecord, setSelectedSlipRecord] = useState<PayrollRecord | null>(null);
  const [attachingProofRecord, setAttachingProofRecord] = useState<PayrollRecord | null>(null);
  const [proofInputUrl, setProofInputUrl] = useState('');

  const [payrollForm, setPayrollForm] = useState({
    employeeNik: 'KEL-004',
    employeeName: '',
    division: 'Teknologi & IT',
    position: 'Fullstack Developer',
    period: 'Oktober 2026',
    basicSalary: 10000000,
    allowances: 1500000,
    attendanceDeductions: 0,
    taxPPH21: 500000,
    paymentStatus: 'Approved' as const,
    notes: '',
  });

  // Simple Mode vs Standard Mode for General Ledger
  const [isSimpleAccountingMode, setIsSimpleAccountingMode] = useState(true);

  // Budget Modal States (Untuk Tambah, Edit, dan Kurangi / Sesuaikan Anggaran)
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<{
    id: string;
    department: string;
    year: number;
    allocatedBudget: number;
    spentBudget: number;
  } | null>(null);
  const [adjustingBudget, setAdjustingBudget] = useState<{
    id: string;
    department: string;
    type: 'add' | 'subtract';
    amount: number;
    reason: string;
  } | null>(null);

  const [budgetForm, setBudgetForm] = useState({
    department: 'Teknologi & IT',
    year: 2026,
    allocatedBudget: 150000000,
    spentBudget: 0,
  });

  // Chart of Accounts (COA) Preset Options
  const standardAccounts = [
    { code: '1010', name: 'Kas & Bank BCA Operasional', category: 'Aset Lancar' },
    { code: '1020', name: 'Kas & Bank Mandiri Payroll', category: 'Aset Lancar' },
    { code: '1030', name: 'Petty Cash / Kas Kecil Kantor', category: 'Aset Lancar' },
    { code: '1120', name: 'Piutang Usaha (AR)', category: 'Aset Lancar' },
    { code: '1310', name: 'Persediaan Barang & Stok Gudang', category: 'Aset Lancar' },
    { code: '1510', name: 'Aset Tetap & Peralatan Kantor', category: 'Aset Tetap' },
    { code: '2010', name: 'Utang Usaha / Vendor (AP)', category: 'Kewajiban' },
    { code: '2020', name: 'Utang Pajak & Payroll', category: 'Kewajiban' },
    { code: '3010', name: 'Modal Disetor & Ekuitas Pemilik', category: 'Ekuitas' },
    { code: '4010', name: 'Pendapatan Layanan Workspace Enterprise', category: 'Pendapatan' },
    { code: '4020', name: 'Pendapatan Penjualan Produk & Jasa Lain', category: 'Pendapatan' },
    { code: '6001', name: 'Beban Gaji & Kompensasi Karyawan', category: 'Beban Operasional' },
    { code: '6010', name: 'Beban Server, Cloud & Infrastruktur IT', category: 'Beban Operasional' },
    { code: '6020', name: 'Beban Sewa Gedung & Listrik Kantor', category: 'Beban Operasional' },
    { code: '6030', name: 'Beban Pemasaran, Iklan & Promosi', category: 'Beban Operasional' },
    { code: '6090', name: 'Beban Operasional Umum & ATK', category: 'Beban Operasional' },
  ];

  // Bank Form State
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountNumber: '',
    accountHolder: 'PT Ruang Kelana Nusantara',
    balance: 0,
    currency: 'IDR',
  });

  // Form inputs
  const [prForm, setPrForm] = useState({
    requesterName: session?.user.name || 'Staff Ruang Kelana',
    department: session?.user.division || 'Teknologi & IT',
    itemName: '',
    category: 'Peralatan Kantor',
    quantity: 1,
    unit: 'Unit',
    estimatedPrice: 0,
    reason: '',
  });

  // Paket & Durasi Pricing Data sesuai Price List Kelana
  const PACKAGES_CONFIG = {
    photostrip: {
      name: 'Photostrip (Format strip vertikal • 6 x 15 cm)',
      durations: [
        { label: '2 jam', hours: 2, originalPrice: 2500000, price: 1800000 },
        { label: '3 jam', hours: 3, originalPrice: 2900000, price: 2300000 },
        { label: '4 jam', hours: 4, originalPrice: 3300000, price: 2750000 },
        { label: '5 jam', hours: 5, originalPrice: 3500000, price: 3200000 },
      ],
    },
    postcard: {
      name: 'Postcard (4R) (Pilihan layout foto postcard beberapa komposisi)',
      durations: [
        { label: '2 jam', hours: 2, originalPrice: 2450000, price: 2050000 },
        { label: '3 jam', hours: 3, originalPrice: 2900000, price: 2550000 },
        { label: '4 jam', hours: 4, originalPrice: 3300000, price: 2750000 },
        { label: '5 jam', hours: 5, originalPrice: 4100000, price: 3400000 },
      ],
    },
  };

  const [soForm, setSoForm] = useState({
    customerCompany: '', // Nama Klien
    customerName: '', // Nama PIC Klien
    packageType: 'photostrip' as 'photostrip' | 'postcard' | 'custom',
    durationIndex: 0, // default 2 jam untuk paket preset
    customPackageName: '', // Nama paket custom
    customDuration: '', // Durasi custom (misal: "6 jam", "Full Day 8 jam")
    customPrice: 0, // Total harga custom
    totalPrice: 1800000,
  });

  const [claimForm, setClaimForm] = useState({
    claimantName: session?.user.name || 'Staff Ruang Kelana',
    department: session?.user.division || 'Operasional',
    description: '',
    category: 'Petty Cash' as const,
    amount: 0,
  });

  const [jeForm, setJeForm] = useState<{
    description: string;
    reference: string;
    accountDebit: string;
    accountCredit: string;
    amount: number;
    category: 'Kas/Bank' | 'Utang' | 'Piutang' | 'Biaya Operasional' | 'Pendapatan' | 'Aset Tetap';
  }>({
    description: '',
    reference: '',
    accountDebit: '6090 - Beban Operasional Umum & ATK',
    accountCredit: '1010 - Kas & Bank BCA Operasional',
    amount: 0,
    category: 'Biaya Operasional',
  });

  // Role verification: Admin, Finance, CEO or division Financial
  const user = session?.user;
  const isAuthorized =
    user?.role === 'Admin' ||
    user?.role === 'Finance' ||
    (user?.role as any) === 'CEO' ||
    user?.position?.toLowerCase().includes('ceo') ||
    user?.division?.toLowerCase().includes('finan');

  if (!isAuthorized) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center mt-12 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={36} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Akses Terbatas Sistem Keuangan</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
          Modul Finance ERP hanya dapat diakses oleh karyawan dengan Divisi <strong>Financial</strong>, atau Role <strong>Admin, Finance, dan CEO</strong>.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300">
          Akun Anda: {user?.name} ({user?.division} - Role: {user?.role})
        </div>
      </div>
    );
  }

  // Summary Metrics
  const totalCashBank = finance.bankAccounts.reduce((acc, b) => acc + b.balance, 0);
  const totalReceivables = finance.salesOrders
    .filter((s) => s.paymentStatus !== 'Paid (Mekari/Bank)')
    .reduce((acc, s) => acc + s.totalAmount, 0);
  const totalPayables = finance.purchaseOrders
    .filter((p) => p.paymentStatus !== 'Lunas')
    .reduce((acc, p) => acc + p.totalAmount, 0);
  const totalInventoryValue = finance.inventoryItems.reduce((acc, i) => acc + i.totalValuation, 0);

  // Procure to Pay handler
  const handleCreatePR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prForm.itemName || prForm.estimatedPrice <= 0) return;
    finance.createPurchaseRequisition({
      ...prForm,
      totalAmount: prForm.quantity * prForm.estimatedPrice,
    });
    setShowPRModal(false);
    setPrForm({
      requesterName: session?.user.name || '',
      department: session?.user.division || '',
      itemName: '',
      category: 'Peralatan Kantor',
      quantity: 1,
      unit: 'Unit',
      estimatedPrice: 0,
      reason: '',
    });
  };

  // Order to Cash handler
  const handleCreateSO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!soForm.customerCompany || !soForm.customerName) return;

    let fullItemName = '';
    let finalAmount = 0;

    if (soForm.packageType === 'custom') {
      if (!soForm.customPackageName || soForm.customPrice <= 0) return;
      fullItemName = `Paket Custom: ${soForm.customPackageName} • Durasi: ${soForm.customDuration || 'Fleksibel'}`;
      finalAmount = soForm.customPrice;
    } else {
      const selectedPkg = PACKAGES_CONFIG[soForm.packageType];
      const selectedDur = selectedPkg.durations[soForm.durationIndex] || selectedPkg.durations[0];
      fullItemName = `Paket ${soForm.packageType === 'photostrip' ? 'Photostrip' : 'Postcard (4R)'} - Durasi ${selectedDur.label}`;
      finalAmount = selectedDur.price;
    }

    finance.createSalesOrder({
      customerCompany: soForm.customerCompany,
      customerName: soForm.customerName,
      itemName: fullItemName,
      quantity: 1,
      unitPrice: finalAmount,
      totalAmount: finalAmount,
    });

    setShowSOModal(false);
    setSoForm({
      customerCompany: '',
      customerName: '',
      packageType: 'photostrip',
      durationIndex: 0,
      customPackageName: '',
      customDuration: '',
      customPrice: 0,
      totalPrice: PACKAGES_CONFIG.photostrip.durations[0].price,
    });
  };

  // Claim handler
  const handleCreateClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimForm.description || claimForm.amount <= 0) return;
    finance.submitExpenseClaim(claimForm);
    setShowClaimModal(false);
    setClaimForm({
      claimantName: session?.user.name || '',
      department: session?.user.division || '',
      description: '',
      category: 'Petty Cash',
      amount: 0,
    });
  };

  // Manual JE handler
  const handleCreateJE = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jeForm.description || jeForm.amount <= 0) return;
    finance.addJournalEntry({
      ...jeForm,
      status: 'Posted',
      createdBy: session?.user.name || 'Finance User',
    });
    setShowJEModal(false);
    setJeForm({
      description: '',
      reference: '',
      accountDebit: '6090 - Beban Operasional Umum',
      accountCredit: '1010 - Bank BCA Operasional',
      amount: 0,
      category: 'Biaya Operasional',
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-7xl mx-auto space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-primary-950 p-6 rounded-2xl text-white shadow-md">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2 border border-emerald-400/30">
            <DollarSign size={13} />
            Enterprise ERP Finance & Accounting
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Sistem Keuangan & Operasional</h1>
          <p className="text-sm text-emerald-100/80 mt-1">
            Terhubung otomatis dari hulu ke hilir: Procure to Pay, Order to Cash, hingga Buku Besar & Rekonsiliasi Bank.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowP2PModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-lg flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
          >
            <ShoppingCart size={15} />
            Procure-to-Pay (P2P Workflow)
          </button>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 text-right">
            <p className="text-xs text-emerald-200">Total Kas & Bank Aktif</p>
            <p className="text-lg font-bold text-white">{formatIDR(totalCashBank)}</p>
          </div>
        </div>
      </div>

      {/* Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
            <Wallet size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Kas & Bank Tersedia</p>
            <p className="text-base font-bold text-gray-900 dark:text-white">{formatIDR(totalCashBank)}</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
              <CheckCircle2 size={11} /> 2 Akun Bank Terealisasi
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Piutang Usaha (AR)</p>
            <p className="text-base font-bold text-gray-900 dark:text-white">{formatIDR(totalReceivables)}</p>
            <p className="text-[11px] text-blue-600 font-medium mt-0.5 flex items-center gap-1">
              <Clock size={11} /> Menunggu Pelunasan Klien
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl">
            <TrendingDown size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Utang Usaha (AP)</p>
            <p className="text-base font-bold text-gray-900 dark:text-white">{formatIDR(totalPayables)}</p>
            <p className="text-[11px] text-amber-600 font-medium mt-0.5 flex items-center gap-1">
              <AlertCircle size={11} /> Vendor Terjadwal
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-xl">
            <Boxes size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Valuasi Stok & Aset</p>
            <p className="text-base font-bold text-gray-900 dark:text-white">{formatIDR(totalInventoryValue)}</p>
            <p className="text-[11px] text-purple-600 font-medium mt-0.5 flex items-center gap-1">
              <Boxes size={11} /> {finance.inventoryItems.length} SKU Aktif Gudang
            </p>
          </div>
        </div>
      </div>

      {/* Visual Automated Workflow Pipeline Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <RefreshCw size={17} className="text-emerald-600" />
              Alur Kerja Otomatis Keuangan ERP (End-to-End Workflow)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Pilih alur kerja untuk melihat status siklus transaksi otomatis dari hulu ke hilir
            </p>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
            <button
              onClick={() => setActiveWorkflow('A')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeWorkflow === 'A'
                  ? 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              A. Procure to Pay
            </button>
            <button
              onClick={() => setActiveWorkflow('B')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeWorkflow === 'B'
                  ? 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              B. Order to Cash
            </button>
            <button
              onClick={() => setActiveWorkflow('C')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeWorkflow === 'C'
                  ? 'bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
              }`}
            >
              C. Expense Management
            </button>
          </div>
        </div>

        {/* Workflow Diagram & Steps */}
        <div className="mt-4">
          {activeWorkflow === 'A' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                  <div className="font-bold text-emerald-800 dark:text-emerald-300 mb-1 flex items-center justify-between">
                    <span>1. Pengajuan PR</span>
                    <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px]">1</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-[11px]">User mengajukan Purchase Requisition barang/jasa.</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                  <div className="font-bold text-emerald-800 dark:text-emerald-300 mb-1 flex items-center justify-between">
                    <span>2. Approval</span>
                    <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px]">2</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-[11px]">Manajer/Direksi memvalidasi limit anggaran.</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                  <div className="font-bold text-emerald-800 dark:text-emerald-300 mb-1 flex items-center justify-between">
                    <span>3. PO Terbit</span>
                    <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px]">3</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-[11px]">Sistem otomatis terbitkan Purchase Order ke Vendor.</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                  <div className="font-bold text-emerald-800 dark:text-emerald-300 mb-1 flex items-center justify-between">
                    <span>4. Goods Receipt</span>
                    <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px]">4</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-[11px]">Stok masuk gudang & Utang (AP) otomatis tercatat.</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                  <div className="font-bold text-emerald-800 dark:text-emerald-300 mb-1 flex items-center justify-between">
                    <span>5. Verifikasi & Bayar</span>
                    <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px]">5</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-[11px]">Finance mencocokkan invoice vendor & pelunasan kas.</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                <span>Total PR Berjalan: <strong>{finance.purchaseRequisitions.length} pengajuan</strong></span>
                <button
                  onClick={() => setShowPRModal(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Plus size={14} /> + Buat Purchase Requisition (PR)
                </button>
              </div>
            </div>
          )}

          {activeWorkflow === 'B' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
                  <div className="font-bold text-blue-800 dark:text-blue-300 mb-1 flex items-center justify-between">
                    <span>1. Sales Order (SO)</span>
                    <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-[10px]">1</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-[11px]">Tim sales mencatat pesanan pelanggan & verifikasi alokasi stok.</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
                  <div className="font-bold text-blue-800 dark:text-blue-300 mb-1 flex items-center justify-between">
                    <span>2. Pengiriman & Invoice</span>
                    <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-[10px]">2</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-[11px]">Barang/layanan diserahkan, invoice terbit, Piutang (AR) terdaftar.</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
                  <div className="font-bold text-blue-800 dark:text-blue-300 mb-1 flex items-center justify-between">
                    <span>3. Rekonsiliasi Pelunasan</span>
                    <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-[10px]">3</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-[11px]">Pelanggan bayar via Bank/Mekari Pay, kas bertambah, jurnal seimbang.</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                <span>Total Sales Order: <strong>{finance.salesOrders.length} transaksi</strong></span>
                <button
                  onClick={() => setShowSOModal(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Plus size={14} /> + Buat Sales Order (SO)
                </button>
              </div>
            </div>
          )}

          {activeWorkflow === 'C' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60">
                  <div className="font-bold text-purple-800 dark:text-purple-300 mb-1 flex items-center justify-between">
                    <span>1. Input Beban / Klaim</span>
                    <span className="w-5 h-5 rounded-full bg-purple-200 text-purple-800 flex items-center justify-center text-[10px]">1</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-[11px]">Karyawan mengajukan klaim biaya petty cash/transportasi kerja.</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60">
                  <div className="font-bold text-purple-800 dark:text-purple-300 mb-1 flex items-center justify-between">
                    <span>2. Otorisasi Atasan / Finance</span>
                    <span className="w-5 h-5 rounded-full bg-purple-200 text-purple-800 flex items-center justify-center text-[10px]">2</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-[11px]">Verifikasi nota dan persetujuan klaim secara cepat.</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60">
                  <div className="font-bold text-purple-800 dark:text-purple-300 mb-1 flex items-center justify-between">
                    <span>3. Jurnal Otomatis Real-time</span>
                    <span className="w-5 h-5 rounded-full bg-purple-200 text-purple-800 flex items-center justify-center text-[10px]">3</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-[11px]">Debit akun beban terkait, kredit kas/bank, sinkron ke Laba Rugi.</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                <span>Pengajuan Klaim: <strong>{finance.expenseClaims.length} klaim tercatat</strong></span>
                <button
                  onClick={() => setShowClaimModal(true)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Plus size={14} /> + Ajukan Klaim Beban Operasional
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 8 Core Modules Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-none">
        <div className="flex gap-2 min-w-max pb-1">
          {[
            { id: 'accounting', label: '1. Akuntansi & Kas', icon: DollarSign },
            { id: 'procurement', label: '2. Pengadaan (PR/PO)', icon: ShoppingCart },
            { id: 'sales', label: '3. Penjualan & Invoice', icon: Receipt },
            { id: 'inventory', label: '4. Inventori & Gudang', icon: Boxes },
            { id: 'assets', label: '5. Aset Tetap', icon: Building2 },
            { id: 'payroll', label: '6. HRIS & Payroll', icon: Users },
            { id: 'budgeting', label: '7. Anggaran Departemen', icon: PieChart },
            { id: 'reports', label: '8. Laporan & BI', icon: FileBarChart2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as FinanceTab)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
                  isActive
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Display */}

      {/* 1. AKUNTANSI & KAS */}
      {activeTab === 'accounting' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rekonsiliasi Bank */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                    <CreditCard size={17} className="text-emerald-600" />
                    Rekening Kas & Bank Terhubung
                  </h3>
                  <p className="text-[11px] text-gray-500">Kelola akun bank, setor/tarik saldo, dan hapus rekening</p>
                </div>
                <button
                  onClick={() => {
                    setBankForm({
                      bankName: '',
                      accountNumber: '',
                      accountHolder: 'PT Ruang Kelana Nusantara',
                      balance: 0,
                      currency: 'IDR',
                    });
                    setShowAddBankModal(true);
                  }}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
                >
                  <Plus size={13} /> + Rekening
                </button>
              </div>

              <div className="space-y-3">
                {finance.bankAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 hover:border-emerald-200 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-gray-800 dark:text-gray-200">{acc.bankName}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditingBank({ id: acc.id, bankName: acc.bankName, accountNumber: acc.accountNumber, balance: acc.balance })}
                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit nama/nomor rekening"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Hapus rekening ${acc.bankName}?`)) {
                              finance.deleteBankAccount(acc.id);
                            }
                          }}
                          className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-gray-400 hover:text-rose-600 transition-colors"
                          title="Hapus rekening"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{acc.accountNumber}</p>

                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                      <span className="text-[11px] text-gray-500">Saldo Buku:</span>
                      <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {formatIDR(acc.balance)}
                      </span>
                    </div>

                    {/* Quick Adjust +/- Balance */}
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between gap-1 text-[11px]">
                      <span className="text-gray-400 text-[10px]">Sesuaikan Saldo:</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setAdjustingBank({ id: acc.id, bankName: acc.bankName, type: 'add', amount: 1000000, description: '' })}
                          className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 font-bold flex items-center gap-0.5"
                          title="Tambah Saldo (Setoran Masuk)"
                        >
                          <Plus size={11} /> Tambah
                        </button>
                        <button
                          onClick={() => setAdjustingBank({ id: acc.id, bankName: acc.bankName, type: 'subtract', amount: 1000000, description: '' })}
                          className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-200 font-bold flex items-center gap-0.5"
                          title="Kurangi Saldo (Tarik Kas)"
                        >
                          <Minus size={11} /> Kurangi
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs">
                💡 Rekonsiliasi otomatis aktif mencocokkan mutasi kas harian dengan penerimaan invoice dan pengeluaran PO.
              </div>
            </div>

            {/* General Ledger / Buku Besar */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText size={17} className="text-emerald-600" />
                    Jurnal Umum & Buku Besar (General Ledger)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Semua mutasi otomatis terposting real-time sesuai kaidah akuntansi Debit/Kredit
                  </p>
                </div>
                <button
                  onClick={() => setShowJEModal(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Plus size={14} /> + Jurnal Manual
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-600 dark:text-gray-400 uppercase font-semibold border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="py-2.5 px-3">No. Jurnal</th>
                      <th className="py-2.5 px-3">Tanggal & Deskripsi</th>
                      <th className="py-2.5 px-3">Akun Debit</th>
                      <th className="py-2.5 px-3">Akun Kredit</th>
                      <th className="py-2.5 px-3 text-right">Nominal</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 font-medium">
                    {finance.journalEntries.map((je) => (
                      <tr key={je.id} className="hover:bg-gray-50 dark:hover:bg-gray-750/50">
                        <td className="py-3 px-3 font-mono text-emerald-600 font-bold">{je.entryNumber}</td>
                        <td className="py-3 px-3">
                          <p className="text-gray-900 dark:text-white font-semibold">{je.description}</p>
                          <p className="text-[10px] text-gray-400">
                            {je.date} • Ref: {je.reference}
                          </p>
                        </td>
                        <td className="py-3 px-3 text-gray-700 dark:text-gray-300 font-mono text-[11px]">{je.accountDebit}</td>
                        <td className="py-3 px-3 text-gray-700 dark:text-gray-300 font-mono text-[11px]">{je.accountCredit}</td>
                        <td className="py-3 px-3 text-right font-bold text-gray-900 dark:text-white">{formatIDR(je.amount)}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                            {je.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. PENGADAAN (PROCUREMENT / PURCHASING) */}
      {activeTab === 'procurement' && (
        <div className="space-y-6">
          {/* Banner Integrasi P2P Real-time */}
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-4 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0">
                <ShoppingCart size={20} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm">Integrasi Sistem Pengadaan Barang &amp; Langganan (P2P)</h4>
                  <span className="text-[10px] bg-emerald-400 text-emerald-950 font-black px-2 py-0.5 rounded-full uppercase">
                    Aktif &amp; Terhubung
                  </span>
                </div>
                <p className="text-xs text-blue-100 mt-0.5">
                  Permintaan dari seluruh divisi &amp; perorangan otomatis tersinkronisasi ke sistem finance (PR &rarr; PO &rarr; GR/BAST &rarr; 3-Way Match &amp; Bayar).
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowP2PModal(true)}
              className="px-4 py-2 bg-white text-indigo-900 hover:bg-blue-50 font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition-transform hover:scale-105"
            >
              <Boxes size={14} /> Buka Modul Alur P2P 4 Divisi
            </button>
          </div>

          {/* PR Section */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-3">
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <ShoppingCart size={17} className="text-emerald-600" />
                  Daftar Purchase Requisition (PR)
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    {p2pStore.cases.length + finance.purchaseRequisitions.length} Permintaan
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Permintaan pembelian barang/jasa dari seluruh departemen dan perorangan (Keputusan Tertinggi pada CEO)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowP2PModal(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Plus size={14} /> + Buat PR Baru (P2P)
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-600 dark:text-gray-400 uppercase font-semibold border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="py-2.5 px-3">No. PR</th>
                    <th className="py-2.5 px-3">Pemohon &amp; Divisi</th>
                    <th className="py-2.5 px-3">Item / Kebutuhan &amp; Lampiran</th>
                    <th className="py-2.5 px-3">Jumlah</th>
                    <th className="py-2.5 px-3 text-right">Total Est.</th>
                    <th className="py-2.5 px-3 text-center">Status Approval</th>
                    <th className="py-2.5 px-3 text-center">Aksi Otorisasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 font-medium">
                  {/* Data PR yang terintegrasi langsung dari Modul P2P */}
                  {p2pStore.cases.map((c) => (
                    <tr key={c.id} className="hover:bg-blue-50/40 dark:hover:bg-gray-750/50 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 block">
                          {c.caseNumber}
                        </span>
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold mt-0.5 ${
                            c.requestCategory === 'Perorangan (Individu)'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          }`}
                        >
                          {c.requestCategory === 'Perorangan (Individu)' ? '👤 Perorangan' : '🏢 Divisi'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <p className="font-bold text-gray-900 dark:text-white">{c.requesterName}</p>
                        <p className="text-[10px] text-gray-500">
                          {c.department}
                          {c.requesterNik ? ` • NIK: ${c.requesterNik}` : ''}
                        </p>
                        <p className="text-[9px] text-gray-400 mt-0.5">
                          {c.createdAt ? c.createdAt.split('T')[0] : '2026-10-30'}
                        </p>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-gray-900 dark:text-white">{c.itemName}</span>
                          {c.urgency && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                c.urgency === 'Mendesak / Urgent'
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                                  : c.urgency === 'Penting'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {c.urgency === 'Mendesak / Urgent' ? '🔥 ' : ''}{c.urgency}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 italic mt-0.5 line-clamp-1">
                          "{c.justification || c.description}"
                        </p>

                        {/* Lampiran Dokumen dari Perangkat atau Link */}
                        {c.attachmentUrl && (
                          <div className="mt-1">
                            <a
                              href={c.attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              download={c.attachmentFileName || 'Dokumen_Lampiran'}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 hover:text-primary-800 text-[10px] font-semibold border border-primary-200 dark:border-primary-800 transition-colors"
                              title="Buka / Unduh Lampiran dari Perangkat"
                            >
                              <Paperclip size={10} />
                              <span className="truncate max-w-[130px]">{c.attachmentFileName || 'Lampiran Berkas'}</span>
                              <ExternalLink size={9} />
                            </a>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-gray-700 dark:text-gray-300">
                        {c.quantity} {c.unit}
                      </td>

                      <td className="py-3 px-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatIDR(c.totalEstimatedPrice)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {c.stage === 'PR Created' ? (
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 inline-block">
                              Menunggu Approval
                            </span>
                            <div className="flex items-center justify-center gap-1 text-[9px]">
                              <span className={c.hrApproval?.approved ? 'text-emerald-600 font-bold' : 'text-gray-400'}>
                                {c.hrApproval?.approved ? '✓ HR' : 'HR: -'}
                              </span>
                              <span>•</span>
                              <span className={c.financeApproval?.approved ? 'text-emerald-600 font-bold' : 'text-gray-400'}>
                                {c.financeApproval?.approved ? '✓ Fin' : 'Fin: -'}
                              </span>
                              <span>•</span>
                              <span className={c.ceoApproval?.approved ? 'text-purple-600 font-black' : 'text-amber-600 font-semibold'}>
                                {c.ceoApproval?.approved ? '★ CEO' : 'CEO: -'}
                              </span>
                            </div>
                          </div>
                        ) : c.stage === 'PR Approved' ? (
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 inline-block">
                              ✓ Disetujui (Siap PO)
                            </span>
                            {c.ceoApproval?.approved && (
                              <p className="text-[9px] text-purple-600 font-bold">★ Disahkan CEO (Bypass)</p>
                            )}
                          </div>
                        ) : c.stage === 'Rejected' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 inline-block">
                            ✕ Ditolak
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 inline-block">
                            {c.stage}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {c.stage === 'PR Created' ? (
                          <div className="flex flex-col gap-1 items-center justify-center">
                            <div className="flex items-center gap-1">
                              {/* Opsi Approval Finance */}
                              {isFinance && (
                                <button
                                  onClick={() => {
                                    p2pStore.approvePRByRole(c.id, 'Finance', currentUser?.name || 'Finance Lead', true, 'Disetujui oleh tim Finance');
                                    alert('PR telah disetujui oleh tim Finance!');
                                  }}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                                  title="Setujui sebagai Finance"
                                >
                                  <Check size={11} /> Setujui Finance
                                </button>
                              )}

                              {/* Opsi Approval Mutlak CEO */}
                              {isCEO && (
                                <button
                                  onClick={() => {
                                    p2pStore.approvePRByRole(c.id, 'CEO', currentUser?.name || 'CEO', true, 'Persetujuan Mutlak CEO');
                                    alert('★ Keputusan Tertinggi CEO Aktif! PR langsung disahkan seketika tanpa perlu menunggu divisi lain.');
                                  }}
                                  className="px-2 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded text-[10px] font-black flex items-center gap-0.5 shadow-xs cursor-pointer"
                                  title="Keputusan Tertinggi & Mutlak CEO"
                                >
                                  <ShieldCheck size={11} /> ★ CEO Bypass
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  p2pStore.approvePRByRole(c.id, isCEO ? 'CEO' : 'Finance', currentUser?.name || 'Reviewer', false, 'Ditolak');
                                }}
                                className="px-1.5 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded text-[10px] font-bold cursor-pointer"
                                title="Tolak PR"
                              >
                                <X size={11} />
                              </button>
                            </div>

                            <button
                              onClick={() => setShowP2PModal(true)}
                              className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                            >
                              Buka Detail P2P
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowP2PModal(true)}
                            className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-[10px] cursor-pointer"
                          >
                            Kelola di P2P &rarr;
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Data PR internal finance lainnya jika ada */}
                  {finance.purchaseRequisitions.map((pr) => (
                    <tr key={pr.id} className="hover:bg-gray-50 dark:hover:bg-gray-750/50">
                      <td className="py-3 px-3 font-mono font-bold text-emerald-600">{pr.prNumber}</td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-gray-900 dark:text-white">{pr.requesterName}</p>
                        <p className="text-[10px] text-gray-400">{pr.department} • {pr.date}</p>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-medium text-gray-800 dark:text-gray-200">{pr.itemName}</p>
                        <p className="text-[10px] text-gray-400 italic">"{pr.reason}"</p>
                      </td>
                      <td className="py-3 px-3 text-gray-700 dark:text-gray-300">
                        {pr.quantity} {pr.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-gray-900 dark:text-white">
                        {formatIDR(pr.totalAmount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            pr.status === 'Approved'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : pr.status === 'Rejected'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {pr.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {pr.status === 'Pending Approval' ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => finance.approvePurchaseRequisition(pr.id, session?.user.name || 'Manajer Finance')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                              title="Setujui dan otomatis terbitkan PO"
                            >
                              <Check size={12} /> Setujui &amp; Buat PO
                            </button>
                            <button
                              onClick={() => finance.rejectPurchaseRequisition(pr.id)}
                              className="px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded text-[11px] font-semibold cursor-pointer"
                            >
                              <X size={12} /> Tolak
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400">
                            {pr.approvedBy ? `Disetujui oleh: ${pr.approvedBy}` : '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PO Section (Terintegrasi P2P & Finance) */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-3">
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <Truck size={17} className="text-emerald-600" />
                  Purchase Orders (PO) &amp; Penerimaan Barang (Goods Receipt)
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {p2pStore.cases.filter((c) => c.poNumber || c.stage !== 'PR Created').length + finance.purchaseOrders.length} PO Terdaftar
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Setelah barang diterima staf gudang/user (GR/BAST), sistem otomatis membukukan Utang Usaha (AP) &amp; siap diverifikasi 3-Way Matching.
                </p>
              </div>
              <button
                onClick={() => setShowP2PModal(true)}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
              >
                <Plus size={14} /> Terbitkan PO di Modul Purchasing
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-600 dark:text-gray-400 uppercase font-semibold border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="py-2.5 px-3">No. PO</th>
                    <th className="py-2.5 px-3">Vendor Rekanan</th>
                    <th className="py-2.5 px-3">Item Dipesan</th>
                    <th className="py-2.5 px-3 text-right">Nilai Tagihan</th>
                    <th className="py-2.5 px-3 text-center">Status Penerimaan</th>
                    <th className="py-2.5 px-3 text-center">Status Pembayaran</th>
                    <th className="py-2.5 px-3 text-center">Tindakan Workflow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 font-medium">
                  {/* PO yang terintegrasi dari Modul P2P */}
                  {p2pStore.cases
                    .filter((c) => c.poNumber || c.stage === 'PO Issued' || c.stage === 'GR Received' || c.stage === '3-Way Matched' || c.stage === 'Paid & Completed')
                    .map((c) => (
                      <tr key={'p2p-po-' + c.id} className="hover:bg-purple-50/30 dark:hover:bg-gray-750/50 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-purple-600 dark:text-purple-400">
                          {c.poNumber || 'PO-PROSES'}
                          <span className="block text-[10px] text-gray-400 font-normal">Ref: {c.caseNumber}</span>
                        </td>

                        <td className="py-3 px-3">
                          <p className="font-bold text-gray-900 dark:text-white">{c.selectedVendor || 'Vendor Terpilih'}</p>
                          <p className="text-[10px] text-gray-500">{c.selectedVendorContact || '-'}</p>
                        </td>

                        <td className="py-3 px-3">
                          <p className="font-semibold text-gray-900 dark:text-white">{c.itemName}</p>
                          <p className="text-[10px] text-gray-500">
                            {c.quantity} {c.unit} • Pemohon: {c.requesterName}
                          </p>
                        </td>

                        <td className="py-3 px-3 text-right font-extrabold text-gray-900 dark:text-white">
                          {formatIDR(c.agreedPrice || c.totalEstimatedPrice)}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.stage === 'PO Issued'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            }`}
                          >
                            {c.stage === 'PO Issued' ? 'Belum Diterima (Menunggu Barang)' : '✓ Sudah Diterima (GR/BAST)'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.stage === 'Paid & Completed'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : c.stage === '3-Way Matched'
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {c.stage === 'Paid & Completed' ? '✓ Lunas' : c.stage === '3-Way Matched' ? '3-Way Cocok (Siap Bayar)' : 'Belum Dibayar'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => setShowP2PModal(true)}
                            className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-[10px] font-bold shadow-xs cursor-pointer"
                          >
                            Proses di P2P &rarr;
                          </button>
                        </td>
                      </tr>
                    ))}

                  {/* Data PO internal finance lainnya */}
                  {finance.purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-750/50">
                      <td className="py-3 px-3 font-mono font-bold text-blue-600">
                        {po.poNumber}
                        {po.prNumber && <span className="block text-[10px] text-gray-400 font-normal">Ref: {po.prNumber}</span>}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-gray-900 dark:text-white">{po.vendorName}</p>
                        <p className="text-[10px] text-gray-400">{po.vendorContact}</p>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-medium text-gray-800 dark:text-gray-200">{po.itemName}</p>
                        <p className="text-[10px] text-gray-400">{po.quantity} Unit • Tgl Pesan: {po.orderDate}</p>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-gray-900 dark:text-white">
                        {formatIDR(po.totalAmount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            po.goodsReceiptStatus === 'Sudah Diterima (Gudang)'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {po.goodsReceiptStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            po.paymentStatus === 'Lunas'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {po.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {po.goodsReceiptStatus === 'Belum Diterima' ? (
                          <button
                            onClick={() => finance.receiveGoods(po.id)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 mx-auto cursor-pointer"
                            title="Konfirmasi barang fisik tiba di gudang dan catat AP"
                          >
                            <Boxes size={12} /> Terima Barang di Gudang
                          </button>
                        ) : po.paymentStatus !== 'Lunas' ? (
                          <button
                            onClick={() => finance.payPurchaseOrder(po.id, finance.bankAccounts[0]?.id || '')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 mx-auto cursor-pointer"
                            title="Bayar tagihan utang vendor melalui Bank"
                          >
                            <CreditCard size={12} /> Bayar Vendor (Kas Keluar)
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-bold flex items-center justify-center gap-1">
                            <CheckCircle2 size={13} /> Selesai &amp; Lunas
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. PENJUALAN & PENAGIHAN (SALES & INVOICING) */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <Receipt size={17} className="text-emerald-600" />
                  Order to Cash (Sales Orders & Penagihan Faktur)
                </h3>
                <p className="text-xs text-gray-500">
                  Pembuatan Sales Order (SO), penerbitan Invoice resmi, hingga pelunasan & rekonsiliasi payment gateway (Mekari Pay / Bank).
                </p>
              </div>
              <button
                onClick={() => setShowSOModal(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Plus size={14} /> + Buat Sales Order (SO)
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-600 dark:text-gray-400 uppercase font-semibold border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="py-2.5 px-3">No. SO</th>
                    <th className="py-2.5 px-3">Klien & Perusahaan</th>
                    <th className="py-2.5 px-3">Layanan / Produk</th>
                    <th className="py-2.5 px-3 text-right">Nilai Kontrak</th>
                    <th className="py-2.5 px-3">No. Invoice Resmi</th>
                    <th className="py-2.5 px-3 text-center">Status Pembayaran</th>
                    <th className="py-2.5 px-3 text-center">Aksi Siklus Penjualan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {finance.salesOrders.map((so) => (
                    <tr key={so.id} className="hover:bg-gray-50 dark:hover:bg-gray-750/50">
                      <td className="py-3 px-3 font-mono font-bold text-blue-600">{so.soNumber}</td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-gray-900 dark:text-white">{so.customerCompany}</p>
                        <p className="text-[10px] text-gray-400">PIC: {so.customerName}</p>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-medium text-gray-800 dark:text-gray-200">{so.itemName}</p>
                        <p className="text-[10px] text-gray-400">{so.quantity} Paket/Lisensi</p>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-gray-900 dark:text-white">
                        {formatIDR(so.totalAmount)}
                      </td>
                      <td className="py-3 px-3">
                        {so.invoiceNumber ? (
                          <div>
                            <span className="font-mono text-emerald-600 font-bold">{so.invoiceNumber}</span>
                            <span className="block text-[10px] text-gray-400">{so.invoiceDate}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Belum Diterbitkan</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            so.paymentStatus === 'Paid (Mekari/Bank)'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {so.paymentStatus}
                        </span>
                        {so.paymentMethod && (
                          <span className="block text-[9px] text-gray-400 mt-0.5">{so.paymentMethod}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {so.status === 'Confirmed' ? (
                          <button
                            onClick={() => finance.shipAndInvoiceSalesOrder(so.id)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 mx-auto"
                            title="Kirim layanan & terbitkan faktur invoice resmi"
                          >
                            <Send size={12} /> Kirim & Terbitkan Faktur
                          </button>
                        ) : so.paymentStatus !== 'Paid (Mekari/Bank)' ? (
                          <button
                            onClick={() => finance.reconcileSalesPayment(so.id, finance.bankAccounts[0]?.id || '', 'Mekari Pay Gateway')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 mx-auto"
                            title="Rekonsiliasi pelunasan transfer klien ke rekening bank"
                          >
                            <CheckCircle2 size={12} /> Rekonsiliasi Pelunasan
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-bold flex items-center justify-center gap-1">
                            <CheckCircle2 size={13} /> Lunas & Selesai
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. INVENTORI & GUDANG */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <Boxes size={17} className="text-emerald-600" />
                  Kontrol Stok & Valuasi Persediaan Real-time
                </h3>
                <p className="text-xs text-gray-500">
                  Pelacakan kuantitas stok barang, batas minimum, mutasi masuk/keluar, dan total valuasi perolehan aset lancar
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs text-gray-400">Total Nilai Persediaan:</span>
                  <p className="font-bold text-base text-emerald-600">{formatIDR(totalInventoryValue)}</p>
                </div>
                <button
                  onClick={() => {
                    setInventoryForm({
                      sku: `SKU-${Date.now().toString().slice(-4)}`,
                      name: '',
                      category: 'Hardware & IT',
                      stock: 1,
                      minStock: 2,
                      unit: 'Unit',
                      valuationPerUnit: 0,
                      warehouseLocation: 'Gudang Utama Lantai 2',
                    });
                    setShowAddInventoryModal(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Plus size={14} /> + Tambah Inventaris
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-600 dark:text-gray-400 uppercase font-semibold border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="py-2.5 px-3">SKU Barang</th>
                    <th className="py-2.5 px-3">Nama Produk & Kategori</th>
                    <th className="py-2.5 px-3">Lokasi Gudang</th>
                    <th className="py-2.5 px-3 text-center">Stok Fisik</th>
                    <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                    <th className="py-2.5 px-3 text-right">Total Valuasi</th>
                    <th className="py-2.5 px-3 text-center">Mutasi Cepat</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {finance.inventoryItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-750/50 group">
                      <td className="py-3 px-3 font-mono font-bold text-gray-700 dark:text-gray-300">{item.sku}</td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-[10px] text-gray-400">{item.category}</p>
                      </td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-300">{item.warehouseLocation}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-bold px-2 py-0.5 rounded ${
                            item.stock <= item.minStock
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {item.stock} {item.unit}
                        </span>
                        {item.stock <= item.minStock && (
                          <span className="block text-[9px] text-rose-500 font-semibold mt-0.5">Stok Rendah!</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-gray-700 dark:text-gray-300">
                        {formatIDR(item.valuationPerUnit)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-gray-900 dark:text-white">
                        {formatIDR(item.totalValuation)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setAdjustingInventory({ sku: item.sku, name: item.name, type: 'add', amount: 1, reason: '' })}
                            className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold flex items-center gap-1 text-[11px]"
                            title="Tambah Stok (Restok Barang Masuk)"
                          >
                            <Plus size={12} /> Tambah
                          </button>
                          <button
                            onClick={() => setAdjustingInventory({ sku: item.sku, name: item.name, type: 'subtract', amount: 1, reason: '' })}
                            className="px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 font-bold flex items-center gap-1 text-[11px]"
                            title="Kurang Stok (Pengambilan Barang Keluar)"
                          >
                            <Minus size={12} /> Kurang
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingInventory({ ...item })}
                            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit Data Inventaris"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Yakin ingin menghapus item inventaris "${item.name}" (${item.sku})?`)) {
                                finance.deleteInventoryItem(item.id);
                              }
                            }}
                            className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-gray-400 hover:text-rose-600 transition-colors"
                            title="Hapus Inventaris"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. ASET TETAP (FIXED ASSETS) */}
      {activeTab === 'assets' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <Building2 size={17} className="text-emerald-600" />
                  Manajemen & Penyusutan Aset Tetap (Fixed Assets)
                </h3>
                <p className="text-xs text-gray-500">
                  Pencatatan perolehan, alokasi penanggung jawab, akumulasi depresiasi garis lurus, dan nilai buku saat ini
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs text-gray-400">Total Nilai Buku Aset:</span>
                  <p className="font-bold text-base text-emerald-600">
                    {formatIDR(finance.fixedAssets.reduce((acc, a) => acc + a.bookValue, 0))}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setAssetForm({
                      assetCode: `AST-${Date.now().toString().slice(-4)}`,
                      name: '',
                      category: 'Elektronik & Komputer',
                      location: 'Kantor Utama Ruang Kelana',
                      purchaseDate: new Date().toISOString().split('T')[0],
                      acquisitionCost: 0,
                      usefulLifeYears: 4,
                      initialDepreciation: 0,
                      condition: 'Sangat Baik',
                      assignedTo: '',
                    });
                    setShowAddAssetModal(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Plus size={14} /> + Tambah Aset Tetap
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-600 dark:text-gray-400 uppercase font-semibold border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="py-2.5 px-3">Kode Aset</th>
                    <th className="py-2.5 px-3">Nama Aset & Kategori</th>
                    <th className="py-2.5 px-3">Lokasi / Penanggung Jawab</th>
                    <th className="py-2.5 px-3 text-right">Harga Perolehan</th>
                    <th className="py-2.5 px-3 text-right">Akum. Depresiasi</th>
                    <th className="py-2.5 px-3 text-right">Nilai Buku (Book Value)</th>
                    <th className="py-2.5 px-3 text-center">Kondisi</th>
                    <th className="py-2.5 px-3 text-center">Penyusutan Nilai</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {finance.fixedAssets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-750/50 group">
                      <td className="py-3 px-3 font-mono font-bold text-purple-600">{asset.assetCode}</td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-gray-900 dark:text-white">{asset.name}</p>
                        <p className="text-[10px] text-gray-400">{asset.category} • Beli: {asset.purchaseDate}</p>
                      </td>
                      <td className="py-3 px-3">
                        <p className="text-gray-800 dark:text-gray-200">{asset.location}</p>
                        <p className="text-[10px] text-gray-400">PIC: {asset.assignedTo || 'Kantor Umum'}</p>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-gray-700 dark:text-gray-300">
                        {formatIDR(asset.acquisitionCost)}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-rose-600">
                        -{formatIDR(asset.accumulatedDepreciation)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-600">
                        {formatIDR(asset.bookValue)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          {asset.condition}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => {
                            // Hitung depresiasi tahunan / bulanan garis lurus sebagai acuan
                            const yearlyDepr = Math.round(asset.acquisitionCost / (asset.usefulLifeYears || 4));
                            setDepreciatingAsset({
                              id: asset.id,
                              assetCode: asset.assetCode,
                              name: asset.name,
                              amount: yearlyDepr,
                              description: `Penyusutan Tahunan ${asset.name} (${asset.assetCode})`,
                            });
                          }}
                          className="px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 font-bold flex items-center gap-1 text-[11px] mx-auto"
                          title="Susutkan Nilai Aset (Kurangi Nilai Buku)"
                        >
                          <Minus size={12} /> Susutkan Nilai
                        </button>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingAsset({ ...asset })}
                            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit Data Aset Tetap"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Yakin ingin menghapus aset tetap "${asset.name}" (${asset.assetCode})?`)) {
                                finance.deleteFixedAsset(asset.id);
                              }
                            }}
                            className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-gray-400 hover:text-rose-600 transition-colors"
                            title="Hapus Aset Tetap"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. HRIS & PAYROLL BRIDGE */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <Users size={17} className="text-emerald-600" />
                  Penggajian Karyawan & Integrasi Beban Keuangan (HRIS & Payroll)
                </h3>
                <p className="text-xs text-gray-500">
                  Kelola data gaji, potong absen/pajak, lampirkan bukti transfer bank, dan kirim slip gaji ke karyawan
                </p>
              </div>
              <button
                onClick={() => {
                  const defaultBasic = 8000000;
                  const defaultAllow = 1500000;
                  const defaultNik = `KEL-00${finance.payrollRecords.length + 1}`;
                  const autoTax = calculateAutoPPH21(defaultBasic + defaultAllow);
                  const autoDeduction = calculateAutoAttendanceDeduction(defaultNik, defaultBasic);

                  setPayrollForm({
                    employeeNik: defaultNik,
                    employeeName: '',
                    division: 'Teknologi & IT',
                    position: 'Staff Karyawan',
                    period: 'Oktober 2026',
                    basicSalary: defaultBasic,
                    allowances: defaultAllow,
                    attendanceDeductions: autoDeduction,
                    taxPPH21: autoTax,
                    paymentStatus: 'Approved',
                    notes: '',
                  });
                  setShowAddPayrollModal(true);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Plus size={14} /> + Tambah Data Gaji
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-600 dark:text-gray-400 uppercase font-semibold border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="py-2.5 px-3">NIK & Nama Karyawan</th>
                    <th className="py-2.5 px-3">Divisi & Jabatan</th>
                    <th className="py-2.5 px-3 text-right">Gaji Pokok</th>
                    <th className="py-2.5 px-3 text-right">Tunjangan</th>
                    <th className="py-2.5 px-3 text-right">Potongan (Absen/Pajak)</th>
                    <th className="py-2.5 px-3 text-right">Gaji Bersih (THP)</th>
                    <th className="py-2.5 px-3 text-center">Status Pembayaran</th>
                    <th className="py-2.5 px-3 text-center">Slip Gaji & Bukti Transfer</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {finance.payrollRecords.map((pay) => (
                    <tr key={pay.id} className="hover:bg-gray-50 dark:hover:bg-gray-750/50 group">
                      <td className="py-3 px-3">
                        <p className="font-semibold text-gray-900 dark:text-white">{pay.employeeName}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{pay.employeeNik} • {pay.period}</p>
                      </td>
                      <td className="py-3 px-3">
                        <p className="text-gray-800 dark:text-gray-200">{pay.position}</p>
                        <p className="text-[10px] text-gray-400">{pay.division}</p>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-gray-700 dark:text-gray-300">
                        {formatIDR(pay.basicSalary)}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-emerald-600">
                        +{formatIDR(pay.allowances)}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-rose-600">
                        -{formatIDR(pay.attendanceDeductions + pay.taxPPH21)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-gray-900 dark:text-white">
                        {formatIDR(pay.netSalary)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {pay.paymentStatus === 'Disbursed (Posted to GL)' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center justify-center gap-1">
                            <CheckCheck size={12} /> Disbursed via Bank
                          </span>
                        ) : (
                          <button
                            onClick={() => finance.disbursePayrollRecord(pay.id, finance.bankAccounts[1]?.id || finance.bankAccounts[0]?.id || '')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 mx-auto"
                            title="Salurkan gaji dan otomatis buat jurnal beban di General Ledger"
                          >
                            <CreditCard size={12} /> Salurkan Gaji
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Tombol Lihat & Cetak Slip Gaji */}
                          <button
                            onClick={() => setSelectedSlipRecord(pay)}
                            className="px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold flex items-center gap-1 text-[11px]"
                            title="Buka Slip Gaji Resmi"
                          >
                            <Eye size={12} /> Slip Gaji
                          </button>

                          {/* Tombol Lampirkan / Lihat Bukti Transfer */}
                          <button
                            onClick={() => {
                              setAttachingProofRecord(pay);
                              setProofInputUrl(pay.paymentProofUrl || '');
                            }}
                            className={`px-2 py-1 rounded font-bold flex items-center gap-1 text-[11px] ${
                              pay.paymentProofUrl
                                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            title={pay.paymentProofUrl ? 'Lihat/Ganti Bukti Transfer' : 'Lampirkan Bukti Transfer'}
                          >
                            <Paperclip size={12} /> {pay.paymentProofUrl ? 'Bukti Ada' : 'Lampirkan'}
                          </button>

                          {/* Tombol Kirim Slip Gaji ke Karyawan */}
                          <button
                            onClick={() => {
                              finance.sendSalarySlip(pay.id);
                              alert(`Slip gaji dan bukti transfer berhasil dikirim ke email karyawan ${pay.employeeName}!`);
                            }}
                            className={`px-2 py-1 rounded font-bold flex items-center gap-1 text-[11px] ${
                              pay.slipSentStatus === 'Terkirim ke Email Karyawan'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            }`}
                            title="Kirimkan slip gaji otomatis ke karyawan"
                          >
                            <Mail size={12} /> {pay.slipSentStatus === 'Terkirim ke Email Karyawan' ? 'Terkirim' : 'Kirim'}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingPayroll({ ...pay })}
                            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit Data Gaji & Potongan"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Yakin ingin menghapus data gaji karyawan ${pay.employeeName} (${pay.period})?`)) {
                                finance.deletePayrollRecord(pay.id);
                              }
                            }}
                            className="p-1.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950 text-gray-400 hover:text-rose-600 transition-colors"
                            title="Hapus Data Gaji"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. ANGGARAN & PERENCANAAN (BUDGETING) */}
      {activeTab === 'budgeting' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <PieChart size={17} className="text-emerald-600" />
                  Alokasi Anggaran Departemen & Analisis Varian 2026
                </h3>
                <p className="text-xs text-gray-500">
                  Pemantauan pagu anggaran tiap divisi agar tidak melampaui batas toleransi pengeluaran.
                </p>
              </div>

              {/* Tombol Tambah Anggaran - Khusus Finance, CEO, & Admin */}
              <button
                type="button"
                onClick={() => setShowAddBudgetModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors self-start sm:self-auto"
              >
                <Plus size={15} /> Tambah Anggaran Divisi
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {finance.departmentBudgets.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-gray-900 dark:text-white">{b.department}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          b.status === 'Aman'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : b.status === 'Over Budget'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                        }`}
                      >
                        {b.status} ({b.variancePercentage}%)
                      </span>

                      {/* Tombol Aksi Anggaran: Tambah/Kurang, Edit, Hapus */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Tambah Nominal Anggaran"
                          onClick={() => setAdjustingBudget({ id: b.id, department: b.department, type: 'add', amount: 10000000, reason: '' })}
                          className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center hover:bg-emerald-100 transition-colors"
                        >
                          <Plus size={13} />
                        </button>
                        <button
                          type="button"
                          title="Kurangi Nominal Anggaran"
                          onClick={() => setAdjustingBudget({ id: b.id, department: b.department, type: 'subtract', amount: 5000000, reason: '' })}
                          className="w-6 h-6 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 flex items-center justify-center hover:bg-rose-100 transition-colors"
                        >
                          <Minus size={13} />
                        </button>
                        <button
                          type="button"
                          title="Edit Anggaran Divisi"
                          onClick={() => setEditingBudget({
                            id: b.id,
                            department: b.department,
                            year: b.year,
                            allocatedBudget: b.allocatedBudget,
                            spentBudget: b.spentBudget,
                          })}
                          className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center hover:bg-blue-100 transition-colors"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          title="Hapus Anggaran Divisi"
                          onClick={() => {
                            if (confirm(`Apakah Anda yakin ingin menghapus alokasi anggaran divisi "${b.department}"?`)) {
                              finance.deleteDepartmentBudget(b.id);
                            }
                          }}
                          className="w-6 h-6 rounded-md bg-gray-100 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-red-950/50 flex items-center justify-center transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        b.variancePercentage > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, b.variancePercentage)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 text-gray-500">
                    <div>
                      <span>Terealisasi: </span>
                      <strong className="text-gray-800 dark:text-gray-200">{formatIDR(b.spentBudget)}</strong>
                    </div>
                    <div>
                      <span>Sisa Anggaran: </span>
                      <strong className="text-emerald-600 font-semibold">{formatIDR(b.remainingBudget)}</strong>
                    </div>
                    <div>
                      <span>Pagu Anggaran: </span>
                      <strong className="text-gray-800 dark:text-gray-200">{formatIDR(b.allocatedBudget)}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 8. LAPORAN & INTELIJEN BISNIS (REPORTING & BI) */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Laporan Laba Rugi Sederhana Realtime */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <FileBarChart2 size={17} className="text-emerald-600" />
                Laporan Laba Rugi (Income Statement) - Oktober 2026
              </h3>

              <div className="space-y-2 text-xs divide-y divide-gray-100 dark:divide-gray-700">
                <div className="pt-2">
                  <p className="font-bold text-emerald-700 dark:text-emerald-400 uppercase text-[11px]">Pendapatan Usaha</p>
                  <div className="flex justify-between py-1 text-gray-700 dark:text-gray-300">
                    <span>Pendapatan Layanan Workspace Enterprise</span>
                    <span className="font-semibold">{formatIDR(165000000)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-gray-700 dark:text-gray-300">
                    <span>Total Pendapatan Bersih</span>
                    <span className="font-bold text-emerald-600">{formatIDR(165000000)}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="font-bold text-rose-700 dark:text-rose-400 uppercase text-[11px]">Beban Operasional & Karyawan</p>
                  <div className="flex justify-between py-1 text-gray-700 dark:text-gray-300">
                    <span>Beban Gaji & Kompensasi Karyawan</span>
                    <span className="font-semibold">{formatIDR(41120000)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-gray-700 dark:text-gray-300">
                    <span>Beban Server & Cloud Hosting</span>
                    <span className="font-semibold">{formatIDR(14500000)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-gray-700 dark:text-gray-300">
                    <span>Beban Pengadaan & Operasional</span>
                    <span className="font-semibold">{formatIDR(22500000)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-gray-700 dark:text-gray-300">
                    <span>Total Beban Operasional</span>
                    <span className="font-bold text-rose-600">({formatIDR(78120000)})</span>
                  </div>
                </div>

                <div className="pt-3 flex justify-between items-center text-sm font-bold bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl">
                  <span className="text-gray-900 dark:text-white">Laba Bersih Operasional (Net Profit)</span>
                  <span className="text-emerald-600 text-base">{formatIDR(165000000 - 78120000)}</span>
                </div>
              </div>
            </div>

            {/* Neraca Ringkas (Balance Sheet) */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 size={17} className="text-blue-600" />
                Neraca Keuangan Ringkas (Balance Sheet)
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                  <p className="font-bold text-gray-900 dark:text-white mb-1">ASET (AKTIVA)</p>
                  <div className="flex justify-between py-0.5 text-gray-600 dark:text-gray-300">
                    <span>Kas & Setara Bank</span>
                    <span className="font-medium">{formatIDR(totalCashBank)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-gray-600 dark:text-gray-300">
                    <span>Piutang Usaha (AR)</span>
                    <span className="font-medium">{formatIDR(totalReceivables)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-gray-600 dark:text-gray-300">
                    <span>Persediaan Gudang</span>
                    <span className="font-medium">{formatIDR(totalInventoryValue)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-gray-600 dark:text-gray-300">
                    <span>Aset Tetap (Nilai Buku Bersih)</span>
                    <span className="font-medium">{formatIDR(526770834)}</span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-1 flex justify-between font-bold text-emerald-600">
                    <span>Total Aktiva</span>
                    <span>{formatIDR(totalCashBank + totalReceivables + totalInventoryValue + 526770834)}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                  <p className="font-bold text-gray-900 dark:text-white mb-1">KEWAJIBAN & EKUITAS (PASIVA)</p>
                  <div className="flex justify-between py-0.5 text-gray-600 dark:text-gray-300">
                    <span>Utang Usaha (AP)</span>
                    <span className="font-medium">{formatIDR(totalPayables)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-gray-600 dark:text-gray-300">
                    <span>Modal Disetor & Laba Ditahan</span>
                    <span className="font-medium">{formatIDR(totalCashBank + totalReceivables + totalInventoryValue + 526770834 - totalPayables)}</span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-1 flex justify-between font-bold text-blue-600">
                    <span>Total Pasiva</span>
                    <span>{formatIDR(totalCashBank + totalReceivables + totalInventoryValue + 526770834)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal PR Baru */}
      {showPRModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <ShoppingCart size={18} className="text-emerald-600" />
                Form Pengajuan Purchase Requisition (PR)
              </h3>
              <button onClick={() => setShowPRModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreatePR} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Nama Barang / Jasa</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Lisensi JetBrains 5 User, Kursi Ergonomis"
                  value={prForm.itemName}
                  onChange={(e) => setPrForm({ ...prForm, itemName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Jumlah</label>
                  <input
                    type="number"
                    min="1"
                    value={prForm.quantity}
                    onChange={(e) => setPrForm({ ...prForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Satuan</label>
                  <input
                    type="text"
                    value={prForm.unit}
                    onChange={(e) => setPrForm({ ...prForm, unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Estimasi Harga Satuan (Rp)</label>
                <input
                  type="number"
                  min="1000"
                  placeholder="5000000"
                  value={prForm.estimatedPrice || ''}
                  onChange={(e) => setPrForm({ ...prForm, estimatedPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Alasan Kebutuhan Pembelian</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Tuliskan justifikasi operasional..."
                  value={prForm.reason}
                  onChange={(e) => setPrForm({ ...prForm, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPRModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Send size={13} /> Kirim Pengajuan PR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Aset Tetap Baru */}
      {showAddAssetModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 size={18} className="text-emerald-600" />
                Tambah Aset Tetap Baru
              </h3>
              <button onClick={() => setShowAddAssetModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!assetForm.assetCode || !assetForm.name || assetForm.acquisitionCost <= 0) return;
                finance.addFixedAsset(assetForm);
                setShowAddAssetModal(false);
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Kode Aset</label>
                  <input
                    type="text"
                    required
                    placeholder="AST-SRV-02"
                    value={assetForm.assetCode}
                    onChange={(e) => setAssetForm({ ...assetForm, assetCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Kategori Aset</label>
                  <select
                    value={assetForm.category}
                    onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="Elektronik & Komputer">Elektronik & Komputer</option>
                    <option value="Kendaraan">Kendaraan</option>
                    <option value="Furnitur Kantor">Furnitur Kantor</option>
                    <option value="Gedung / Properti">Gedung / Properti</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Nama Aset Tetap</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Server Dell PowerEdge R750"
                  value={assetForm.name}
                  onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Lokasi Fisik Aset</label>
                  <input
                    type="text"
                    required
                    placeholder="Server Room Lt. 3"
                    value={assetForm.location}
                    onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">PIC / Penanggung Jawab</label>
                  <input
                    type="text"
                    placeholder="Tim DevOps IT / Budi"
                    value={assetForm.assignedTo}
                    onChange={(e) => setAssetForm({ ...assetForm, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Tanggal Perolehan (Beli)</label>
                  <input
                    type="date"
                    required
                    value={assetForm.purchaseDate}
                    onChange={(e) => setAssetForm({ ...assetForm, purchaseDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Umur Ekonomis (Tahun)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={assetForm.usefulLifeYears}
                    onChange={(e) => setAssetForm({ ...assetForm, usefulLifeYears: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Harga Perolehan Beli (Rp)</label>
                  <input
                    type="number"
                    min="100000"
                    required
                    placeholder="50000000"
                    value={assetForm.acquisitionCost || ''}
                    onChange={(e) => setAssetForm({ ...assetForm, acquisitionCost: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Akumulasi Depresiasi Awal</label>
                  <input
                    type="number"
                    min="0"
                    value={assetForm.initialDepreciation || ''}
                    placeholder="0"
                    onChange={(e) => setAssetForm({ ...assetForm, initialDepreciation: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-rose-600 font-semibold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Kondisi Aset Fisik</label>
                <select
                  value={assetForm.condition}
                  onChange={(e) => setAssetForm({ ...assetForm, condition: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="Sangat Baik">Sangat Baik</option>
                  <option value="Baik">Baik</option>
                  <option value="Perlu Servis">Perlu Servis</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddAssetModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Check size={13} /> Simpan Aset Tetap
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Aset Tetap */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Pencil size={18} className="text-blue-600" />
                Edit Data Aset Tetap
              </h3>
              <button onClick={() => setEditingAsset(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                finance.updateFixedAsset(editingAsset.id, {
                  assetCode: editingAsset.assetCode,
                  name: editingAsset.name,
                  category: editingAsset.category,
                  location: editingAsset.location,
                  assignedTo: editingAsset.assignedTo,
                  acquisitionCost: editingAsset.acquisitionCost,
                  usefulLifeYears: editingAsset.usefulLifeYears,
                  accumulatedDepreciation: editingAsset.accumulatedDepreciation,
                  condition: editingAsset.condition,
                });
                setEditingAsset(null);
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Kode Aset</label>
                  <input
                    type="text"
                    required
                    value={editingAsset.assetCode}
                    onChange={(e) => setEditingAsset({ ...editingAsset, assetCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Kategori</label>
                  <select
                    value={editingAsset.category}
                    onChange={(e) => setEditingAsset({ ...editingAsset, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="Elektronik & Komputer">Elektronik & Komputer</option>
                    <option value="Kendaraan">Kendaraan</option>
                    <option value="Furnitur Kantor">Furnitur Kantor</option>
                    <option value="Gedung / Properti">Gedung / Properti</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Nama Aset</label>
                <input
                  type="text"
                  required
                  value={editingAsset.name}
                  onChange={(e) => setEditingAsset({ ...editingAsset, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Lokasi Fisik</label>
                  <input
                    type="text"
                    required
                    value={editingAsset.location}
                    onChange={(e) => setEditingAsset({ ...editingAsset, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Penanggung Jawab (PIC)</label>
                  <input
                    type="text"
                    value={editingAsset.assignedTo || ''}
                    onChange={(e) => setEditingAsset({ ...editingAsset, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Harga Perolehan (Rp)</label>
                  <input
                    type="number"
                    min="100000"
                    required
                    value={editingAsset.acquisitionCost}
                    onChange={(e) => setEditingAsset({ ...editingAsset, acquisitionCost: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Akum. Depresiasi (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingAsset.accumulatedDepreciation}
                    onChange={(e) => setEditingAsset({ ...editingAsset, accumulatedDepreciation: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-rose-600 font-semibold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Kondisi Aset</label>
                <select
                  value={editingAsset.condition}
                  onChange={(e) => setEditingAsset({ ...editingAsset, condition: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="Sangat Baik">Sangat Baik</option>
                  <option value="Baik">Baik</option>
                  <option value="Perlu Servis">Perlu Servis</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAsset(null)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Check size={13} /> Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Penyusutan Nilai Aset (Depresiasi / Mengurangi Nilai Buku) */}
      {depreciatingAsset && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Minus size={18} className="text-rose-600" />
                Penyusutan Nilai Aset (Depresiasi)
              </h3>
              <button onClick={() => setDepreciatingAsset(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Aset Target: <strong>{depreciatingAsset.name}</strong> ({depreciatingAsset.assetCode})
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (depreciatingAsset.amount <= 0) return;
                finance.depreciateFixedAsset(
                  depreciatingAsset.id,
                  depreciatingAsset.amount,
                  depreciatingAsset.description || `Penyusutan Beban Depresiasi Aset ${depreciatingAsset.name}`
                );
                setDepreciatingAsset(null);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">
                  Nominal Beban Penyusutan (Rp)
                </label>
                <input
                  type="number"
                  min="1000"
                  required
                  value={depreciatingAsset.amount}
                  onChange={(e) => setDepreciatingAsset({ ...depreciatingAsset, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-rose-600 font-bold"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">
                  Keterangan Jurnal Penyusutan
                </label>
                <input
                  type="text"
                  placeholder="Misal: Beban depresiasi semester II 2026"
                  value={depreciatingAsset.description}
                  onChange={(e) => setDepreciatingAsset({ ...depreciatingAsset, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[11px] border border-amber-200 dark:border-amber-800/60">
                💡 Sistem otomatis membuat jurnal pengeluaran beban depresiasi di General Ledger dan mengurangi Nilai Buku aset.
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDepreciatingAsset(null)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Check size={13} /> Proses Penyusutan Aset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Data Payroll Baru */}
      {showAddPayrollModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-xl w-full p-6 shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Users size={18} className="text-emerald-600" />
                Tambah Data Penggajian Karyawan Baru
              </h3>
              <button onClick={() => setShowAddPayrollModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!payrollForm.employeeName || payrollForm.basicSalary <= 0) return;
                finance.addPayrollRecord(payrollForm);
                setShowAddPayrollModal(false);
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">NIK Karyawan</label>
                  <input
                    type="text"
                    required
                    value={payrollForm.employeeNik}
                    onChange={(e) => setPayrollForm({ ...payrollForm, employeeNik: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Nama Lengkap Karyawan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={payrollForm.employeeName}
                    onChange={(e) => setPayrollForm({ ...payrollForm, employeeName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Divisi</label>
                  <select
                    value={payrollForm.division}
                    onChange={(e) => setPayrollForm({ ...payrollForm, division: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {DIVISION_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Jabatan (Position)</label>
                  <input
                    type="text"
                    required
                    value={payrollForm.position}
                    onChange={(e) => setPayrollForm({ ...payrollForm, position: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Periode Gaji</label>
                  <select
                    value={payrollForm.period}
                    onChange={(e) => setPayrollForm({ ...payrollForm, period: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
                  >
                    {PERIOD_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Gaji Pokok (Rp)</label>
                  <input
                    type="number"
                    min="100000"
                    required
                    value={payrollForm.basicSalary}
                    onChange={(e) => {
                      const newBasic = Number(e.target.value);
                      const gross = newBasic + payrollForm.allowances;
                      const autoTax = calculateAutoPPH21(gross);
                      const autoDeduction = calculateAutoAttendanceDeduction(payrollForm.employeeNik, newBasic);
                      setPayrollForm({
                        ...payrollForm,
                        basicSalary: newBasic,
                        taxPPH21: autoTax,
                        attendanceDeductions: autoDeduction,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold"
                  />
                </div>
              </div>

              {/* Komponen Gaji: Tunjangan */}
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Tunjangan (+)</label>
                <input
                  type="number"
                  min="0"
                  value={payrollForm.allowances}
                  onChange={(e) => {
                    const newAllow = Number(e.target.value);
                    const gross = payrollForm.basicSalary + newAllow;
                    const autoTax = calculateAutoPPH21(gross);
                    setPayrollForm({
                      ...payrollForm,
                      allowances: newAllow,
                      taxPPH21: autoTax,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-emerald-600 font-semibold"
                />
              </div>

              {/* Baris Potongan: Rapi 2 Kolom dengan Badge yang Elegan */}
              <div className="p-3.5 rounded-xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/80 space-y-2.5">
                <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Komponen Potongan Gaji (Deductions)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-gray-600 dark:text-gray-300 font-medium">Potongan Absen (-)</label>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-semibold">
                        Otomatis HR
                      </span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={payrollForm.attendanceDeductions}
                      onChange={(e) => setPayrollForm({ ...payrollForm, attendanceDeductions: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800/60 bg-white dark:bg-gray-700 text-rose-600 font-semibold"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-gray-600 dark:text-gray-300 font-medium">Pajak PPh 21 (-)</label>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-semibold">
                        TER PP 58/2023
                      </span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={payrollForm.taxPPH21}
                      onChange={(e) => setPayrollForm({ ...payrollForm, taxPPH21: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-white dark:bg-gray-700 text-rose-600 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Preview Gaji Bersih */}
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400 font-medium">Estimasi Take Home Pay (Gaji Bersih):</span>
                <span className="font-bold text-sm text-emerald-600">
                  {formatIDR(
                    Math.max(
                      0,
                      payrollForm.basicSalary +
                        payrollForm.allowances -
                        payrollForm.attendanceDeductions -
                        payrollForm.taxPPH21
                    )
                  )}
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPayrollModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Check size={13} /> Simpan Data Gaji
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Payroll (Termasuk Pengurangan / Potongan) */}
      {editingPayroll && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Pencil size={18} className="text-blue-600" />
                Edit Data Gaji & Potongan Karyawan
              </h3>
              <button onClick={() => setEditingPayroll(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                finance.updatePayrollRecord(editingPayroll.id, {
                  employeeName: editingPayroll.employeeName,
                  division: editingPayroll.division,
                  position: editingPayroll.position,
                  period: editingPayroll.period,
                  basicSalary: editingPayroll.basicSalary,
                  allowances: editingPayroll.allowances,
                  attendanceDeductions: editingPayroll.attendanceDeductions,
                  taxPPH21: editingPayroll.taxPPH21,
                  notes: editingPayroll.notes,
                });
                setEditingPayroll(null);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <p className="text-gray-500">
                  Karyawan: <strong>{editingPayroll.employeeName}</strong> ({editingPayroll.employeeNik})
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Divisi</label>
                  <select
                    value={editingPayroll.division}
                    onChange={(e) => setEditingPayroll({ ...editingPayroll, division: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {DIVISION_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Periode Gaji</label>
                  <select
                    value={editingPayroll.period}
                    onChange={(e) => setEditingPayroll({ ...editingPayroll, period: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
                  >
                    {PERIOD_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Gaji Pokok (Rp)</label>
                  <input
                    type="number"
                    min="100000"
                    required
                    value={editingPayroll.basicSalary}
                    onChange={(e) => {
                      const newBasic = Number(e.target.value);
                      const gross = newBasic + editingPayroll.allowances;
                      const autoTax = calculateAutoPPH21(gross);
                      const autoDeduction = calculateAutoAttendanceDeduction(editingPayroll.employeeNik, newBasic);
                      setEditingPayroll({
                        ...editingPayroll,
                        basicSalary: newBasic,
                        taxPPH21: autoTax,
                        attendanceDeductions: autoDeduction,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Tunjangan (+)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingPayroll.allowances}
                    onChange={(e) => {
                      const newAllow = Number(e.target.value);
                      const gross = editingPayroll.basicSalary + newAllow;
                      const autoTax = calculateAutoPPH21(gross);
                      setEditingPayroll({
                        ...editingPayroll,
                        allowances: newAllow,
                        taxPPH21: autoTax,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-emerald-600 font-semibold"
                  />
                </div>
              </div>

              {/* Bagian Pengurangan / Potongan */}
              <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-2">
                <p className="font-bold text-rose-800 dark:text-rose-300 text-[11px] flex items-center gap-1">
                  <Minus size={13} /> Pengurangan Gaji (Potongan Terkait Kehadiran & Pajak):
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Potongan Keterlambatan / Alpa (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editingPayroll.attendanceDeductions}
                      onChange={(e) => setEditingPayroll({ ...editingPayroll, attendanceDeductions: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-800 bg-white dark:bg-gray-700 text-rose-600 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">Potongan Pajak PPh 21 (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editingPayroll.taxPPH21}
                      onChange={(e) => setEditingPayroll({ ...editingPayroll, taxPPH21: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-800 bg-white dark:bg-gray-700 text-rose-600 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Total THP Real-time */}
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400 font-medium">Gaji Bersih Akhir (Take Home Pay):</span>
                <span className="font-bold text-sm text-emerald-600">
                  {formatIDR(
                    Math.max(
                      0,
                      editingPayroll.basicSalary +
                        editingPayroll.allowances -
                        editingPayroll.attendanceDeductions -
                        editingPayroll.taxPPH21
                    )
                  )}
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPayroll(null)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Check size={13} /> Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lampirkan Bukti Transfer */}
      {attachingProofRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Paperclip size={18} className="text-purple-600" />
                Lampiran Bukti Transfer Gaji
              </h3>
              <button onClick={() => setAttachingProofRecord(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Karyawan: <strong>{attachingProofRecord.employeeName}</strong> • Nominal:{' '}
              <strong className="text-emerald-600">{formatIDR(attachingProofRecord.netSalary)}</strong>
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!proofInputUrl) return;
                finance.attachPaymentProof(attachingProofRecord.id, proofInputUrl);
                setAttachingProofRecord(null);
              }}
              className="space-y-3 text-xs"
            >
              {/* Opsi Upload File Gambar Langsung dari Komputer */}
              <div className="space-y-1.5">
                <label className="block text-gray-700 dark:text-gray-300 font-medium">
                  Pilih / Unggah File Gambar Bukti Transfer:
                </label>
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors cursor-pointer text-center group">
                  <Paperclip className="text-purple-600 mb-1 group-hover:scale-110 transition-transform" size={22} />
                  <span className="font-semibold text-purple-700 dark:text-purple-300 text-xs">
                    Klik untuk Memilih File Gambar dari Komputer / HP
                  </span>
                  <span className="text-[10px] text-gray-400 mt-0.5">Mendukung format PNG, JPG, JPEG, WEBP</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if (typeof reader.result === 'string') {
                            setProofInputUrl(reader.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>

              <div className="flex items-center gap-2 my-2">
                <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                <span className="text-[10px] uppercase font-bold text-gray-400">atau tempel link URL / template</span>
                <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
              </div>

              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">
                  URL Bukti Transfer / Resi Bank
                </label>
                <input
                  type="text"
                  placeholder="https://... atau tempel URL screenshot bukti transfer"
                  value={proofInputUrl.startsWith('data:image') ? '[File Gambar Dipilih dari Komputer]' : proofInputUrl}
                  onChange={(e) => setProofInputUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Contoh Cepat Template Bukti */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setProofInputUrl('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500')}
                  className="px-2 py-1 rounded bg-purple-50 text-purple-700 text-[10px] font-semibold hover:bg-purple-100"
                >
                  Gunakan Template Resi Mandiri/BCA
                </button>
              </div>

              {/* Preview Gambar jika ada */}
              {proofInputUrl && (
                <div className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <p className="text-[10px] text-gray-400 mb-1">Preview Bukti Transfer:</p>
                  <img
                    src={proofInputUrl}
                    alt="Bukti Transfer"
                    className="max-h-40 mx-auto rounded-lg object-contain shadow-xs"
                    onError={(e) => {
                      (e.target as any).style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAttachingProofRecord(null)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Check size={13} /> Simpan Bukti Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tampilan Slip Gaji Resmi (Siap Cetak & Kirim) */}
      {selectedSlipRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header Slip Gaji */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <img
                  src="/kelana-logo.png"
                  alt="Kelana Logo"
                  className="w-10 h-10 object-contain rounded-lg border border-emerald-100 dark:border-emerald-900 bg-white p-0.5 shadow-xs"
                  onError={(e) => {
                    // Fallback jika image gagal load
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div>
                  <h3 className="font-extrabold text-base tracking-tight text-gray-900 dark:text-white flex items-center gap-1.5">
                    Kelana Corporate
                  </h3>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
                    SLIP GAJI KARYAWAN RESMI (CONFIDENTIAL)
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedSlipRecord(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {/* Informasi Karyawan */}
            <div className="grid grid-cols-2 gap-3 text-xs p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
              <div>
                <p className="text-gray-400 text-[10px]">Nama Karyawan:</p>
                <p className="font-bold text-gray-900 dark:text-white">{selectedSlipRecord.employeeName}</p>
                <p className="text-[11px] font-mono text-gray-500 mt-0.5">{selectedSlipRecord.employeeNik}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-[10px]">Periode Penggajian:</p>
                <p className="font-bold text-emerald-600">{selectedSlipRecord.period}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{selectedSlipRecord.position} - {selectedSlipRecord.division}</p>
              </div>
            </div>

            {/* Rincian Penghasilan & Potongan */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              {/* Kolom Pemasukan */}
              <div className="space-y-2 border-r border-gray-100 dark:border-gray-700 pr-2">
                <p className="font-bold text-emerald-700 dark:text-emerald-400 border-b pb-1">A. PENGHASILAN (EARNINGS)</p>
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>Gaji Pokok:</span>
                  <span className="font-medium">{formatIDR(selectedSlipRecord.basicSalary)}</span>
                </div>
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>Tunjangan Operasional:</span>
                  <span className="font-medium">{formatIDR(selectedSlipRecord.allowances)}</span>
                </div>
                <div className="border-t pt-1 flex justify-between font-bold text-emerald-800 dark:text-emerald-300">
                  <span>Total Penghasilan:</span>
                  <span>{formatIDR(selectedSlipRecord.basicSalary + selectedSlipRecord.allowances)}</span>
                </div>
              </div>

              {/* Kolom Potongan */}
              <div className="space-y-2 pl-2">
                <p className="font-bold text-rose-700 dark:text-rose-400 border-b pb-1">B. POTONGAN (DEDUCTIONS)</p>
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>Potongan Absensi / Alpa:</span>
                  <span className="font-medium">-{formatIDR(selectedSlipRecord.attendanceDeductions)}</span>
                </div>
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>Pajak Penghasilan PPh 21:</span>
                  <span className="font-medium">-{formatIDR(selectedSlipRecord.taxPPH21)}</span>
                </div>
                <div className="border-t pt-1 flex justify-between font-bold text-rose-800 dark:text-rose-300">
                  <span>Total Potongan:</span>
                  <span>-{formatIDR(selectedSlipRecord.attendanceDeductions + selectedSlipRecord.taxPPH21)}</span>
                </div>
              </div>
            </div>

            {/* Box THP Bersih */}
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">GAJI BERSIH DITERIMA (TAKE HOME PAY)</span>
                <p className="text-[10px] text-gray-500 mt-0.5">Status: {selectedSlipRecord.paymentStatus}</p>
              </div>
              <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
                {formatIDR(selectedSlipRecord.netSalary)}
              </span>
            </div>

            {/* Catatan Validasi Slip Gaji Resmi (Bukti gambar sengaja ditiadakan pada slip gaji) */}
            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 flex items-center justify-between">
              <span>Status Pembayaran: <strong className="text-emerald-600">Disbursed (Tervalidasi Kelana Corporate)</strong></span>
              <span className="text-[10px] text-gray-400 font-mono">DOC: SLP-KC-{selectedSlipRecord.employeeNik}</span>
            </div>

            {/* Tombol Aksi Cetak & Kirim ke Karyawan */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
              <span className="text-[11px] text-gray-400">
                {selectedSlipRecord.slipSentStatus === 'Terkirim ke Email Karyawan'
                  ? '✅ Sudah dikirim ke email karyawan'
                  : '⚠️ Belum dikirim ke email karyawan'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const emp = users.find((u) => u.nik === selectedSlipRecord.employeeNik);
                    printSalarySlip({
                      ...selectedSlipRecord,
                      employeeSignature: emp?.digitalSignature,
                    });
                  }}
                  className="px-3.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold flex items-center gap-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-xs cursor-pointer"
                  title="Cetak Slip Gaji ke format PDF resmi perusahaan"
                >
                  <Printer size={13} className="text-emerald-600" /> Cetak Slip (PDF)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    finance.sendSalarySlip(selectedSlipRecord.id);
                    alert(`Slip gaji & lampiran bukti transfer berhasil dikirim ke email karyawan ${selectedSlipRecord.employeeName}!`);
                    setSelectedSlipRecord(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1 text-xs shadow-sm"
                >
                  <Mail size={13} /> Kirim ke Karyawan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal Tambah Anggaran Divisi Baru */}
      {showAddBudgetModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <PieChart size={18} className="text-emerald-600" />
                Tambah Alokasi Anggaran Divisi
              </h3>
              <button onClick={() => setShowAddBudgetModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                finance.addDepartmentBudget(budgetForm);
                setShowAddBudgetModal(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Departemen / Divisi</label>
                <select
                  value={budgetForm.department}
                  onChange={(e) => setBudgetForm({ ...budgetForm, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {DIVISION_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Tahun Anggaran</label>
                  <input
                    type="number"
                    required
                    value={budgetForm.year}
                    onChange={(e) => setBudgetForm({ ...budgetForm, year: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Pagu Anggaran (Rp)</label>
                  <input
                    type="number"
                    min="100000"
                    step="1000"
                    required
                    value={budgetForm.allocatedBudget}
                    onChange={(e) => setBudgetForm({ ...budgetForm, allocatedBudget: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Realisasi Pengeluaran Awal (Rp)</label>
                <input
                  type="number"
                  min="0"
                  step="500000"
                  required
                  value={budgetForm.spentBudget}
                  onChange={(e) => setBudgetForm({ ...budgetForm, spentBudget: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex justify-between items-center text-xs">
                <span className="text-gray-600 dark:text-gray-300 font-medium">Sisa Pagu Anggaran Bersih:</span>
                <span className="font-bold text-emerald-600">
                  {formatIDR(Math.max(0, budgetForm.allocatedBudget - budgetForm.spentBudget))}
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBudgetModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Check size={13} /> Simpan Anggaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Alokasi Anggaran */}
      {editingBudget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Pencil size={18} className="text-blue-600" />
                Edit Anggaran: {editingBudget.department}
              </h3>
              <button onClick={() => setEditingBudget(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                finance.updateDepartmentBudget(editingBudget.id, {
                  department: editingBudget.department,
                  year: editingBudget.year,
                  allocatedBudget: editingBudget.allocatedBudget,
                  spentBudget: editingBudget.spentBudget,
                });
                setEditingBudget(null);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Departemen / Divisi</label>
                <select
                  value={editingBudget.department}
                  onChange={(e) => setEditingBudget({ ...editingBudget, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {DIVISION_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Tahun Anggaran</label>
                  <input
                    type="number"
                    required
                    value={editingBudget.year}
                    onChange={(e) => setEditingBudget({ ...editingBudget, year: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Pagu Anggaran (Rp)</label>
                  <input
                    type="number"
                    min="100000"
                    step="1000"
                    required
                    value={editingBudget.allocatedBudget}
                    onChange={(e) => setEditingBudget({ ...editingBudget, allocatedBudget: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Terealisasi (Rp)</label>
                <input
                  type="number"
                  min="0"
                  step="500000"
                  required
                  value={editingBudget.spentBudget}
                  onChange={(e) => setEditingBudget({ ...editingBudget, spentBudget: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBudget(null)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Check size={13} /> Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah / Kurangi Nominal Pagu Anggaran */}
      {adjustingBudget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                {adjustingBudget.type === 'add' ? (
                  <>
                    <Plus size={18} className="text-emerald-600" />
                    Tambah Pagu: {adjustingBudget.department}
                  </>
                ) : (
                  <>
                    <Minus size={18} className="text-rose-600" />
                    Kurangi Pagu: {adjustingBudget.department}
                  </>
                )}
              </h3>
              <button onClick={() => setAdjustingBudget(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const delta = adjustingBudget.type === 'add' ? adjustingBudget.amount : -adjustingBudget.amount;
                finance.adjustDepartmentBudget(adjustingBudget.id, delta);
                setAdjustingBudget(null);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">
                  Nominal {adjustingBudget.type === 'add' ? 'Penambahan' : 'Pengurangan'} (Rp)
                </label>
                <input
                  type="number"
                  min="500000"
                  step="500000"
                  required
                  value={adjustingBudget.amount}
                  onChange={(e) => setAdjustingBudget({ ...adjustingBudget, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">
                  Keterangan / Alasan Penyesuaian
                </label>
                <input
                  type="text"
                  placeholder="Misal: Penyesuaian kuartal / efisiensi operasional"
                  value={adjustingBudget.reason}
                  onChange={(e) => setAdjustingBudget({ ...adjustingBudget, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustingBudget(null)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 rounded-lg text-white font-semibold flex items-center gap-1.5 ${
                    adjustingBudget.type === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <Check size={13} /> Konfirmasi {adjustingBudget.type === 'add' ? 'Tambah' : 'Kurangi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Tambah Rekening Bank */}
      {showAddBankModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <CreditCard size={18} className="text-emerald-600" />
                Tambah Rekening Kas & Bank
              </h3>
              <button onClick={() => setShowAddBankModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!bankForm.bankName || !bankForm.accountNumber) return;
                finance.addBankAccount(bankForm);
                setShowAddBankModal(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Nama Bank / Akun Kas</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Bank BNI Operasional, Kas Kecil"
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Nomor Rekening</label>
                <input
                  type="text"
                  required
                  placeholder="123-456-7890"
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Atas Nama</label>
                <input
                  type="text"
                  value={bankForm.accountHolder}
                  onChange={(e) => setBankForm({ ...bankForm, accountHolder: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Saldo Awal (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={bankForm.balance || ''}
                  onChange={(e) => setBankForm({ ...bankForm, balance: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBankModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Check size={13} /> Simpan Rekening
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Rekening Bank */}
      {editingBank && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Pencil size={18} className="text-blue-600" />
                Edit Rekening: {editingBank.bankName}
              </h3>
              <button onClick={() => setEditingBank(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingBank.bankName || !editingBank.accountNumber) return;
                finance.updateBankAccount(editingBank.id, {
                  bankName: editingBank.bankName,
                  accountNumber: editingBank.accountNumber,
                  balance: editingBank.balance,
                });
                setEditingBank(null);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Nama Bank / Akun Kas</label>
                <input
                  type="text"
                  required
                  value={editingBank.bankName}
                  onChange={(e) => setEditingBank({ ...editingBank, bankName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Nomor Rekening</label>
                <input
                  type="text"
                  required
                  value={editingBank.accountNumber}
                  onChange={(e) => setEditingBank({ ...editingBank, accountNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Saldo (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={editingBank.balance}
                  onChange={(e) => setEditingBank({ ...editingBank, balance: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold"
                />
                <p className="text-[10px] text-gray-400 mt-1">Untuk setor/tarik yang tercatat di jurnal, gunakan tombol + / − pada kartu rekening.</p>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBank(null)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Check size={13} /> Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Setor / Tarik Saldo Bank */}
      {adjustingBank && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                {adjustingBank.type === 'add' ? (
                  <>
                    <ArrowDownLeft size={18} className="text-emerald-600" />
                    Setor ke {adjustingBank.bankName}
                  </>
                ) : (
                  <>
                    <ArrowUpRight size={18} className="text-rose-600" />
                    Tarik dari {adjustingBank.bankName}
                  </>
                )}
              </h3>
              <button onClick={() => setAdjustingBank(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (adjustingBank.amount <= 0) return;
                const delta = adjustingBank.type === 'add' ? adjustingBank.amount : -adjustingBank.amount;
                finance.adjustBankBalance(adjustingBank.id, delta, adjustingBank.description || undefined);
                setAdjustingBank(null);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">
                  Nominal {adjustingBank.type === 'add' ? 'Setoran' : 'Penarikan'} (Rp)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustingBank.amount}
                  onChange={(e) => setAdjustingBank({ ...adjustingBank, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Keterangan (opsional)</label>
                <input
                  type="text"
                  placeholder="Misal: Setoran modal, penarikan kas kecil"
                  value={adjustingBank.description}
                  onChange={(e) => setAdjustingBank({ ...adjustingBank, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <p className="text-[10px] text-gray-400">Mutasi ini otomatis dicatat sebagai jurnal Kas/Bank.</p>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustingBank(null)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 rounded-lg text-white font-semibold flex items-center gap-1.5 ${
                    adjustingBank.type === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <Check size={13} /> Konfirmasi {adjustingBank.type === 'add' ? 'Setor' : 'Tarik'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Jurnal Umum Manual */}
      {showJEModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <FileText size={18} className="text-emerald-600" />
                Input Jurnal Umum Manual
              </h3>
              <button onClick={() => setShowJEModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateJE} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Deskripsi Transaksi</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Pembayaran sewa kantor bulan November"
                  value={jeForm.description}
                  onChange={(e) => setJeForm({ ...jeForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">No. Referensi</label>
                  <input
                    type="text"
                    placeholder="INV-001 / BKK-001"
                    value={jeForm.reference}
                    onChange={(e) => setJeForm({ ...jeForm, reference: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Kategori</label>
                  <select
                    value={jeForm.category}
                    onChange={(e) => setJeForm({ ...jeForm, category: e.target.value as typeof jeForm.category })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {['Kas/Bank', 'Utang', 'Piutang', 'Biaya Operasional', 'Pendapatan', 'Aset Tetap'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Akun Debit</label>
                <input
                  type="text"
                  required
                  value={jeForm.accountDebit}
                  onChange={(e) => setJeForm({ ...jeForm, accountDebit: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Akun Kredit</label>
                <input
                  type="text"
                  required
                  value={jeForm.accountCredit}
                  onChange={(e) => setJeForm({ ...jeForm, accountCredit: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={jeForm.amount || ''}
                  onChange={(e) => setJeForm({ ...jeForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowJEModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Check size={13} /> Posting Jurnal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sales Order Baru */}
      {showSOModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Receipt size={18} className="text-blue-600" />
                Buat Sales Order (SO) Baru
              </h3>
              <button onClick={() => setShowSOModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateSO} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Nama Klien</label>
                  <input
                    type="text"
                    required
                    placeholder="PT / Nama Acara"
                    value={soForm.customerCompany}
                    onChange={(e) => setSoForm({ ...soForm, customerCompany: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Nama PIC Klien</label>
                  <input
                    type="text"
                    required
                    value={soForm.customerName}
                    onChange={(e) => setSoForm({ ...soForm, customerName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Paket</label>
                <select
                  value={soForm.packageType}
                  onChange={(e) =>
                    setSoForm({ ...soForm, packageType: e.target.value as typeof soForm.packageType, durationIndex: 0 })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="photostrip">{PACKAGES_CONFIG.photostrip.name}</option>
                  <option value="postcard">{PACKAGES_CONFIG.postcard.name}</option>
                  <option value="custom">Paket Custom</option>
                </select>
              </div>
              {soForm.packageType === 'custom' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Nama Paket Custom</label>
                    <input
                      type="text"
                      required
                      value={soForm.customPackageName}
                      onChange={(e) => setSoForm({ ...soForm, customPackageName: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Durasi</label>
                    <input
                      type="text"
                      placeholder="Misal: 6 jam"
                      value={soForm.customDuration}
                      onChange={(e) => setSoForm({ ...soForm, customDuration: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Total Harga (Rp)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={soForm.customPrice || ''}
                      onChange={(e) => setSoForm({ ...soForm, customPrice: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Durasi</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PACKAGES_CONFIG[soForm.packageType].durations.map((d, idx) => (
                      <button
                        key={d.label}
                        type="button"
                        onClick={() => setSoForm({ ...soForm, durationIndex: idx })}
                        className={`p-2 rounded-lg border text-left ${
                          soForm.durationIndex === idx
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                            : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="font-semibold text-gray-900 dark:text-white">{d.label}</div>
                        <div className="text-[10px] text-gray-400 line-through">{formatIDR(d.originalPrice)}</div>
                        <div className="font-bold text-blue-600">{formatIDR(d.price)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSOModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Send size={13} /> Buat Sales Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Klaim Beban Operasional */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Wallet size={18} className="text-purple-600" />
                Klaim Beban Operasional
              </h3>
              <button onClick={() => setShowClaimModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateClaim} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Nama Pengaju</label>
                  <input
                    type="text"
                    required
                    value={claimForm.claimantName}
                    onChange={(e) => setClaimForm({ ...claimForm, claimantName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Divisi</label>
                  <select
                    value={claimForm.department}
                    onChange={(e) => setClaimForm({ ...claimForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {!DIVISION_OPTIONS.includes(claimForm.department) && claimForm.department && (
                      <option value={claimForm.department}>{claimForm.department}</option>
                    )}
                    {DIVISION_OPTIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Deskripsi Pengeluaran</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Bensin & tol ke lokasi event"
                  value={claimForm.description}
                  onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Kategori</label>
                  <select
                    value={claimForm.category}
                    onChange={(e) => setClaimForm({ ...claimForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {['Petty Cash', 'Transport & Perjalanan', 'Konsumsi & Meeting', 'Langganan Software', 'Operasional'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Nominal (Rp)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={claimForm.amount || ''}
                    onChange={(e) => setClaimForm({ ...claimForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Send size={13} /> Ajukan Klaim
                </button>
              </div>
            </form>

            <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
              <h4 className="font-bold text-xs text-gray-700 dark:text-gray-200 mb-2">
                Daftar Klaim ({finance.expenseClaims.length})
              </h4>
              {finance.expenseClaims.length === 0 ? (
                <p className="text-xs text-gray-400">Belum ada klaim.</p>
              ) : (
                <div className="space-y-2">
                  {finance.expenseClaims.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-white truncate">
                          {c.claimNumber} • {c.description}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {c.claimantName} ({c.department}) • {c.category} • {c.submissionDate}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-gray-800 dark:text-gray-200">{formatIDR(c.amount)}</span>
                        {c.status === 'Pending Approval' ? (
                          <>
                            <button
                              type="button"
                              disabled={finance.bankAccounts.length === 0}
                              onClick={() =>
                                finance.approveAndReimburseExpenseClaim(
                                  c.id,
                                  session?.user.name || 'Finance',
                                  finance.bankAccounts[0]?.id || ''
                                )
                              }
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded text-[10px] font-bold flex items-center gap-0.5"
                              title="Setujui & cairkan dari rekening utama"
                            >
                              <Check size={11} /> Setujui
                            </button>
                            <button
                              type="button"
                              onClick={() => finance.rejectExpenseClaim(c.id)}
                              className="px-1.5 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded text-[10px] font-bold"
                              title="Tolak klaim"
                            >
                              <X size={11} />
                            </button>
                          </>
                        ) : (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              c.status === 'Rejected'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {c.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Item Persediaan */}
      {(showAddInventoryModal || editingInventory) && (() => {
        const isEdit = !!editingInventory;
        const form = editingInventory ?? inventoryForm;
        const setForm = (patch: Partial<typeof inventoryForm>) =>
          isEdit
            ? setEditingInventory({ ...editingInventory!, ...patch })
            : setInventoryForm({ ...inventoryForm, ...patch });
        const close = () => (isEdit ? setEditingInventory(null) : setShowAddInventoryModal(false));
        return (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                  <Boxes size={18} className="text-emerald-600" />
                  {isEdit ? `Edit Item: ${editingInventory!.name}` : 'Tambah Item Persediaan'}
                </h3>
                <button onClick={close} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!form.name) return;
                  const { sku, name, category, stock, minStock, unit, valuationPerUnit, warehouseLocation } = form;
                  const data = { sku, name, category, stock, minStock, unit, valuationPerUnit, warehouseLocation };
                  if (isEdit) {
                    finance.updateInventoryItem(editingInventory!.id, data);
                  } else {
                    finance.addInventoryItem(data);
                  }
                  close();
                }}
                className="space-y-3 text-xs"
              >
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">SKU</label>
                    <input
                      type="text"
                      required
                      value={form.sku}
                      onChange={(e) => setForm({ sku: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Nama Barang</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Kategori</label>
                    <input
                      type="text"
                      value={form.category}
                      onChange={(e) => setForm({ category: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Lokasi Gudang</label>
                    <input
                      type="text"
                      value={form.warehouseLocation}
                      onChange={(e) => setForm({ warehouseLocation: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Stok</label>
                    <input
                      type="number"
                      min="0"
                      value={form.stock}
                      onChange={(e) => setForm({ stock: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Stok Minimum</label>
                    <input
                      type="number"
                      min="0"
                      value={form.minStock}
                      onChange={(e) => setForm({ minStock: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Satuan</label>
                    <input
                      type="text"
                      value={form.unit}
                      onChange={(e) => setForm({ unit: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Harga Perolehan per Satuan (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.valuationPerUnit || ''}
                    onChange={(e) => setForm({ valuationPerUnit: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Total nilai: <strong>{formatIDR(form.stock * form.valuationPerUnit)}</strong>
                  </p>
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={close}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
                  >
                    <Check size={13} /> {isEdit ? 'Simpan Perubahan' : 'Tambah Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Modal Penyesuaian Stok */}
      {adjustingInventory && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                {adjustingInventory.type === 'add' ? (
                  <Plus size={18} className="text-emerald-600" />
                ) : (
                  <Minus size={18} className="text-rose-600" />
                )}
                {adjustingInventory.type === 'add' ? 'Stok Masuk' : 'Stok Keluar'}: {adjustingInventory.name}
              </h3>
              <button onClick={() => setAdjustingInventory(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (adjustingInventory.amount <= 0) return;
                const delta = adjustingInventory.type === 'add' ? adjustingInventory.amount : -adjustingInventory.amount;
                finance.adjustInventoryStock(adjustingInventory.sku, delta, adjustingInventory.reason);
                setAdjustingInventory(null);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Jumlah</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustingInventory.amount}
                  onChange={(e) => setAdjustingInventory({ ...adjustingInventory, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-semibold"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Alasan</label>
                <input
                  type="text"
                  placeholder="Misal: Pembelian baru, dipakai event, rusak"
                  value={adjustingInventory.reason}
                  onChange={(e) => setAdjustingInventory({ ...adjustingInventory, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustingInventory(null)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 rounded-lg text-white font-semibold flex items-center gap-1.5 ${
                    adjustingInventory.type === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <Check size={13} /> Konfirmasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Procure-to-Pay (P2P) Full Workflow Modal */}
      <ProcureToPayModal
        isOpen={showP2PModal}
        onClose={() => setShowP2PModal(false)}
      />
      </div>
    </div>
  );
};
