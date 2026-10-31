import React, { useState, useRef } from 'react';
import {
  ShoppingCart, Plus, CheckCircle2, Clock, Truck, ShieldCheck,
  FileCheck2, DollarSign, Building, AlertCircle, X, ChevronRight,
  ExternalLink, Layers, ArrowRight, UserCheck, Check, Package,
  FileText, Search, Filter, HelpCircle, Paperclip, UploadCloud,
  FileUp, Trash2, File, Camera, Image as ImageIcon
} from 'lucide-react';
import { useProcureToPayStore } from '../../stores/procureToPayStore';
import { useFinanceStore } from '../../stores/financeStore';
import { useAuthStore } from '../../stores/authStore';
import { P2PProcurementCase, P2PWorkflowStage, VendorQuote } from '../../types/procureToPay';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export const ProcureToPayModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { session, users } = useAuthStore();
  const {
    cases,
    createPurchaseRequest,
    approvePRByRole,
    issuePurchaseOrder,
    receiveGoodsOrService,
    performThreeWayMatching,
    disbursePayment,
  } = useProcureToPayStore();
  const { bankAccounts, departmentBudgets } = useFinanceStore();

  const currentUser = session?.user;
  const currentRole = currentUser?.role;
  const currentPos = (currentUser?.position || '').toLowerCase();
  const userDivision = currentUser?.division || 'Teknologi & IT';

  const isCEO =
    currentRole === 'CEO' ||
    userDivision.includes('all role') ||
    currentPos.includes('ceo') ||
    currentPos.includes('direktur') ||
    currentPos.includes('chief executive');

  const isFinance =
    currentRole === 'Finance' ||
    currentRole === 'Admin' ||
    userDivision.toLowerCase().includes('finan') ||
    userDivision.toLowerCase().includes('keuangan');

  const isHR =
    currentRole === 'HR' ||
    currentRole === 'Admin' ||
    userDivision.toLowerCase().includes('hr') ||
    userDivision.toLowerCase().includes('operasional');

  // Tabs for 4 Modules:
  // 1: User / All Departments (PR Requisition)
  // 2: Purchasing / Procurement (PO & Vendor Sourcing)
  // 3: Warehouse / Receiving / GA (Goods Receipt & BAST)
  // 4: Finance & Accounting (3-Way Matching & Bank Disbursement)
  const [activeTab, setActiveTab] = useState<'1_pr' | '2_po' | '3_gr' | '4_finance'>('1_pr');

  // Selected case for action modal
  const [selectedCase, setSelectedCase] = useState<P2PProcurementCase | null>(null);

  // Form State for Phase 1: Create PR (Divisi atau Perorangan)
  const [isCreatingPR, setIsCreatingPR] = useState(false);
  const [prTitle, setPrTitle] = useState('');
  const [prRequestCategory, setPrRequestCategory] = useState<'Divisi' | 'Perorangan (Individu)'>('Divisi');
  const [prUrgency, setPrUrgency] = useState<'Biasa' | 'Penting' | 'Mendesak / Urgent'>('Biasa');
  const [prAttachmentSource, setPrAttachmentSource] = useState<'device' | 'url'>('device');
  const [prAttachmentUrl, setPrAttachmentUrl] = useState('');
  const [prAttachmentFileName, setPrAttachmentFileName] = useState('');
  const [prAttachmentFileSize, setPrAttachmentFileSize] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [prType, setPrType] = useState<any>('Langganan Software & Cloud');
  const [prItemName, setPrItemName] = useState('');
  const [prQuantity, setPrQuantity] = useState(1);
  const [prUnit, setPrUnit] = useState('Lisensi 1 Tahun');
  const [prUnitPrice, setPrUnitPrice] = useState(15000000);
  const [prDescription, setPrDescription] = useState('');
  const [prJustification, setPrJustification] = useState('');

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handleDeviceFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPrAttachmentFileName(file.name);
    setPrAttachmentFileSize(formatFileSize(file.size));

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setPrAttachmentUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveDeviceFile = () => {
    setPrAttachmentUrl('');
    setPrAttachmentFileName('');
    setPrAttachmentFileSize('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Approval Dialog State
  const [reviewCase, setReviewCase] = useState<{ id: string; role: 'Manager' | 'HR' | 'Finance' | 'CEO'; isApprove: boolean } | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // Form State for Phase 2: Issue PO (Purchasing)
  const [vendorName, setVendorName] = useState('');
  const [vendorContact, setVendorContact] = useState('');
  const [agreedPrice, setAgreedPrice] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Hari');

  // Form State for Phase 3: Goods Receipt (Warehouse/User)
  const [deliveryNote, setDeliveryNote] = useState('');
  const [receivedQty, setReceivedQty] = useState(1);
  const [qcStatus, setQcStatus] = useState<'Passed (Sesuai)' | 'Partial' | 'Rejected'>('Passed (Sesuai)');
  const [bastNotes, setBastNotes] = useState('');
  const [bastProofImage, setBastProofImage] = useState('');
  const [bastProofImageName, setBastProofImageName] = useState('');
  const [bastProofImageSize, setBastProofImageSize] = useState('');
  const bastImageInputRef = useRef<HTMLInputElement | null>(null);
  const [viewingImageModal, setViewingImageModal] = useState<{ url: string; title: string } | null>(null);

  const handleBastImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBastProofImageName(file.name);
    setBastProofImageSize(formatFileSize(file.size));

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setBastProofImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBastImage = () => {
    setBastProofImage('');
    setBastProofImageName('');
    setBastProofImageSize('');
    if (bastImageInputRef.current) {
      bastImageInputRef.current.value = '';
    }
  };

  // Form State for Phase 4: 3-Way Matching & Payment (Finance)
  const [vendorInvoice, setVendorInvoice] = useState('');
  const [taxInvoice, setTaxInvoice] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState(0);
  const [selectedBankId, setSelectedBankId] = useState(bankAccounts[0]?.id || 'bank-bca');

  if (!isOpen) return null;

  const formatIDR = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const handleCreatePR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prTitle || !prItemName) return;

    createPurchaseRequest({
      title: prTitle,
      type: prType,
      department: userDivision,
      requesterName: currentUser?.name || 'Karyawan',
      requesterId: currentUser?.id || 'user',
      requesterNik: (currentUser as any)?.nik || 'KEL-001',
      requestCategory: prRequestCategory,
      itemName: prItemName,
      quantity: prQuantity,
      unit: prUnit,
      estimatedUnitPrice: prUnitPrice,
      description: prDescription,
      justification: prJustification,
      urgency: prUrgency,
      attachmentUrl: prAttachmentUrl || undefined,
      attachmentFileName: prAttachmentFileName || (prAttachmentUrl ? 'Dokumen_Pendukung.pdf' : undefined),
    });

    alert(`Permintaan pengadaan (${prRequestCategory}) berhasil dibuat dan diteruskan ke HR, Finance, dan CEO! (Keputusan tertinggi mutlak pada CEO)`);
    setIsCreatingPR(false);
    setPrTitle('');
    setPrItemName('');
    setPrDescription('');
    setPrJustification('');
    setPrAttachmentUrl('');
    setPrAttachmentFileName('');
  };

  const getStageBadge = (stage: P2PWorkflowStage) => {
    switch (stage) {
      case 'PR Created':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">1. Menunggu Approval PR</span>;
      case 'PR Approved':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">2. Siap Buat PO (Purchasing)</span>;
      case 'PO Issued':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">3. PO Terbit (Menunggu Barang/Aktif)</span>;
      case 'GR Received':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">4. BAST/GR Masuk (Perlu 3-Way Match)</span>;
      case '3-Way Matched':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">5. 3-Way Cocok (Siap Bayar)</span>;
      case 'Paid & Completed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">✓ Selesai &amp; Lunas</span>;
      case 'Rejected':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">Ditolak</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-5xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-sm">
              <ShoppingCart size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight">
                  Procure-to-Pay (P2P): Pembelian Barang &amp; Langganan Perusahaan
                </h3>
                <span className="text-[10px] bg-amber-400 text-amber-950 font-black px-2 py-0.5 rounded-md uppercase">
                  Bypass CEO Active
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                Alur Kerja 4 Divisi: Peminta (PR) &rarr; Purchasing (PO) &rarr; Gudang/Receiving (GR/BAST) &rarr; Finance (3-Way Matching &amp; Bayar)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* 4 Tabs Modules (Sesuai Struktur Divisi Perusahaan) */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 text-xs font-semibold bg-gray-50/70 dark:bg-gray-850 overflow-x-auto">
          <button
            onClick={() => { setActiveTab('1_pr'); setSelectedCase(null); }}
            className={`py-3.5 px-4 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === '1_pr'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 flex items-center justify-center text-[10px] font-bold">1</span>
            Modul Divisi Peminta (PR / Requisition)
          </button>

          <button
            onClick={() => { setActiveTab('2_po'); setSelectedCase(null); }}
            className={`py-3.5 px-4 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === '2_po'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200 flex items-center justify-center text-[10px] font-bold">2</span>
            Modul Pengadaan (Purchasing / PO)
          </button>

          <button
            onClick={() => { setActiveTab('3_gr'); setSelectedCase(null); }}
            className={`py-3.5 px-4 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === '3_gr'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200 flex items-center justify-center text-[10px] font-bold">3</span>
            Modul Gudang &amp; Penerima (GR / BAST)
          </button>

          <button
            onClick={() => { setActiveTab('4_finance'); setSelectedCase(null); }}
            className={`py-3.5 px-4 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === '4_finance'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200 flex items-center justify-center text-[10px] font-bold">4</span>
            Modul Finance (3-Way Match &amp; Bayar)
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* =========================================================================
              MODUL 1: DIVISI PEMINTA (USER / ALL DEPARTMENTS)
              ========================================================================= */}
          {activeTab === '1_pr' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50 dark:bg-blue-950/40 p-4 rounded-2xl border border-blue-200 dark:border-blue-800">
                <div>
                  <h4 className="font-bold text-blue-950 dark:text-blue-200 text-sm flex items-center gap-1.5">
                    <FileText size={16} /> Modul Pengajuan Pengadaan Barang / Langganan (Divisi &amp; Perorangan)
                  </h4>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                    Karyawan dapat mengajukan kebutuhan pengadaan barang atau lisensi atas nama <strong>Divisi</strong> maupun <strong>Perorangan</strong>.
                    <br />
                    Pengajuan akan diverifikasi oleh <strong>HR</strong> dan <strong>Finance</strong>, dengan <strong>Keputusan Tertinggi &amp; Mutlak berada pada CEO</strong>.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreatingPR(!isCreatingPR)}
                  className="btn-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5 self-start cursor-pointer shadow-md"
                >
                  <Plus size={14} /> {isCreatingPR ? 'Batal' : '+ Ajukan Pengadaan Baru'}
                </button>
              </div>

              {isCreatingPR && (
                <form onSubmit={handleCreatePR} className="p-5 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4 animate-fadeIn">
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
                    Formulir Permintaan Pengadaan Barang / Jasa (Requisition Form)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                        Jenis Pemohon *
                      </label>
                      <select
                        value={prRequestCategory}
                        onChange={(e) => setPrRequestCategory(e.target.value as any)}
                        className="input text-xs font-bold text-primary-600"
                      >
                        <option value="Divisi">🏢 Atas Nama Divisi ({userDivision})</option>
                        <option value="Perorangan (Individu)">👤 Perorangan (Individu: {currentUser?.name})</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                        Tingkat Urgensi
                      </label>
                      <select
                        value={prUrgency}
                        onChange={(e) => setPrUrgency(e.target.value as any)}
                        className="input text-xs"
                      >
                        <option value="Biasa">Biasa (Reguler)</option>
                        <option value="Penting">Penting</option>
                        <option value="Mendesak / Urgent">🔥 Mendesak / Urgent</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                        Kategori Barang / Layanan
                      </label>
                      <select
                        value={prType}
                        onChange={(e) => setPrType(e.target.value)}
                        className="input text-xs"
                      >
                        <option value="Barang Fisik & ATK">📦 Barang Fisik &amp; ATK Kantor</option>
                        <option value="Langganan Software & Cloud">💻 Langganan Software &amp; Cloud (SaaS)</option>
                        <option value="Perangkat Keras (Asset)">🖥️ Perangkat Keras / Aset Inventaris</option>
                        <option value="Jasa & Konsultan">🤝 Jasa &amp; Konsultan Pihak Ketiga</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                      Judul Permintaan Pengadaan *
                    </label>
                    <input
                      type="text"
                      required
                      value={prTitle}
                      onChange={(e) => setPrTitle(e.target.value)}
                      placeholder="Contoh: Pengadaan Meja Kerja Ergonomis & Kursi Kantor"
                      className="input text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                        Nama Barang / Spesifikasi Layanan *
                      </label>
                      <input
                        type="text"
                        required
                        value={prItemName}
                        onChange={(e) => setPrItemName(e.target.value)}
                        placeholder="Contoh: Akun Zoom Enterprise 100 Host"
                        className="input text-xs"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                        Jumlah (Qty) *
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={prQuantity}
                        onChange={(e) => setPrQuantity(Number(e.target.value))}
                        className="input text-xs"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                        Satuan Unit
                      </label>
                      <input
                        type="text"
                        value={prUnit}
                        onChange={(e) => setPrUnit(e.target.value)}
                        placeholder="Unit / Bulan / Lisensi"
                        className="input text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                        Estimasi Harga Satuan (IDR) *
                      </label>
                      <input
                        type="number"
                        min={10000}
                        value={prUnitPrice}
                        onChange={(e) => setPrUnitPrice(Number(e.target.value))}
                        className="input text-xs font-bold text-emerald-600"
                      />
                      <span className="text-[10px] text-gray-400 mt-0.5 block">
                        Total Estimasi: <strong className="text-emerald-600">{formatIDR(prQuantity * prUnitPrice)}</strong>
                      </span>
                    </div>

                    <div>
                      <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                        Alasan / Urgensi Kebutuhan (Justification) *
                      </label>
                      <input
                        type="text"
                        required
                        value={prJustification}
                        onChange={(e) => setPrJustification(e.target.value)}
                        placeholder="Kenapa barang/layanan ini dibutuhkan divisi/perorangan Anda..."
                        className="input text-xs"
                      />
                    </div>
                  </div>

                  {/* Lampiran Dokumen: Upload dari Perangkat atau Tautan Eksternal */}
                  <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="font-semibold text-gray-700 dark:text-gray-300 block">
                        Lampiran Dokumen / Berkas Penawaran Vendor (Opsional)
                      </label>
                      
                      {/* Pilihan Sumber Lampiran */}
                      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-750 p-0.5 rounded-lg text-[11px] self-start">
                        <button
                          type="button"
                          onClick={() => setPrAttachmentSource('device')}
                          className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                            prAttachmentSource === 'device'
                              ? 'bg-white dark:bg-gray-850 text-primary-600 dark:text-primary-400 shadow-xs'
                              : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                          }`}
                        >
                          <UploadCloud size={12} /> Dari Perangkat Ini
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrAttachmentSource('url')}
                          className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                            prAttachmentSource === 'url'
                              ? 'bg-white dark:bg-gray-850 text-primary-600 dark:text-primary-400 shadow-xs'
                              : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                          }`}
                        >
                          <ExternalLink size={12} /> Tautan / URL Online
                        </button>
                      </div>
                    </div>

                    {prAttachmentSource === 'device' ? (
                      <div>
                        {/* Hidden Input File */}
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleDeviceFileUpload}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip"
                          className="hidden"
                        />

                        {!prAttachmentFileName ? (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-primary-200 dark:border-primary-800/80 hover:border-primary-400 dark:hover:border-primary-600 rounded-2xl p-4 text-center cursor-pointer transition-all bg-primary-50/30 dark:bg-primary-950/20 hover:bg-primary-50/60 group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                              <Paperclip size={18} />
                            </div>
                            <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                              Klik untuk Memilih File Dokumen dari Perangkat Anda
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              Format didukung: PDF, Word (.docx), Excel (.xlsx), atau Gambar Penawaran/Kwitansi (Maks. 15 MB)
                            </p>
                          </div>
                        ) : (
                          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3 animate-fadeIn">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                                <FileText size={18} />
                              </div>
                              <div className="truncate">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-xs text-gray-900 dark:text-white truncate">
                                    {prAttachmentFileName}
                                  </p>
                                  <span className="text-[9px] font-bold bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.2 rounded">
                                    {prAttachmentFileSize || 'File Lokal'}
                                  </span>
                                </div>
                                <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                                  ✓ File berhasil diambil dari perangkat &amp; siap dikirim bersama PR
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-2.5 py-1 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 text-[11px] font-semibold hover:bg-gray-50 cursor-pointer"
                              >
                                Ganti File
                              </button>
                              <button
                                type="button"
                                onClick={handleRemoveDeviceFile}
                                className="p-1 rounded-lg hover:bg-rose-100 text-rose-500 transition-colors cursor-pointer"
                                title="Hapus Dokumen"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 animate-fadeIn">
                        <input
                          type="text"
                          value={prAttachmentFileName}
                          onChange={(e) => setPrAttachmentFileName(e.target.value)}
                          placeholder="Nama Dokumen (misal: Brosur_Penawaran_Vendor.pdf)"
                          className="input text-xs"
                        />
                        <input
                          type="url"
                          value={prAttachmentUrl}
                          onChange={(e) => setPrAttachmentUrl(e.target.value)}
                          placeholder="https://drive.google.com/... atau link penawaran"
                          className="input text-xs"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => setIsCreatingPR(false)}
                      className="btn-secondary text-xs py-2 px-4"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="btn-primary text-xs py-2 px-5 font-bold"
                    >
                      Kirim Dokumen Purchase Request (PR)
                    </button>
                  </div>
                </form>
              )}

              {/* Daftar Kasus P2P */}
              <div className="space-y-4">
                {cases.map((c) => (
                  <div
                    key={c.id}
                    className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs space-y-3.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                            {c.caseNumber}
                          </span>
                          <span className="font-bold text-gray-900 dark:text-white text-sm">{c.title}</span>
                          
                          {/* Badge Kategori Pemohon: Divisi vs Perorangan */}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                              c.requestCategory === 'Perorangan (Individu)'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            }`}
                          >
                            {c.requestCategory === 'Perorangan (Individu)' ? '👤 Pengajuan Perorangan' : '🏢 Pengajuan Divisi'}
                          </span>

                          {/* Badge Urgensi */}
                          {c.urgency && (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                c.urgency === 'Mendesak / Urgent'
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse'
                                  : c.urgency === 'Penting'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                              }`}
                            >
                              {c.urgency === 'Mendesak / Urgent' ? '🔥 ' : ''}{c.urgency}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 mt-1.5">
                          <span>
                            Pemohon: <strong className="text-gray-800 dark:text-gray-200">{c.requesterName}</strong>
                            {c.requesterNik ? ` (NIK: ${c.requesterNik})` : ''} • Divisi: <strong>{c.department}</strong>
                          </span>
                          <span>
                            Estimasi Anggaran: <strong className="text-emerald-600 font-bold">{formatIDR(c.totalEstimatedPrice)}</strong>
                          </span>
                        </div>

                        {/* Lampiran Dokumen jika ada */}
                        {c.attachmentUrl && (
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] text-gray-500 flex items-center gap-1 font-medium">
                              <Paperclip size={12} className="text-primary-600" /> Dokumen Lampiran:
                            </span>
                            <a
                              href={c.attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              download={c.attachmentFileName || 'Dokumen_Pengadaan'}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary-50 dark:bg-primary-950/50 hover:bg-primary-100 dark:hover:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-semibold text-[11px] border border-primary-200 dark:border-primary-800 transition-colors shadow-2xs"
                              title="Buka / Unduh Lampiran Dokumen"
                            >
                              <FileText size={12} />
                              <span className="truncate max-w-[200px]">{c.attachmentFileName || 'Lihat Dokumen'}</span>
                              <ExternalLink size={10} className="opacity-70" />
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="self-start">{getStageBadge(c.stage)}</div>
                    </div>

                    {/* Rincian Item */}
                    <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-xl text-xs space-y-1 text-gray-700 dark:text-gray-300">
                      <div className="flex justify-between items-center">
                        <span><strong>Barang/Layanan:</strong> {c.itemName} ({c.quantity} {c.unit} @ {formatIDR(c.estimatedUnitPrice)})</span>
                        <span className="font-semibold text-gray-500">Kategori: {c.type}</span>
                      </div>
                      {c.justification && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                          "Alasan: {c.justification}"
                        </p>
                      )}
                    </div>

                    {/* Status Approval Bar 3 Pilar: HR, Finance, CEO */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
                      {/* 1. HR & People Ops */}
                      <div className={`p-2.5 rounded-xl border ${
                        c.hrApproval?.approved
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800'
                          : c.hrApproval?.approved === false
                          ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
                          : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                      }`}>
                        <div className="flex items-center justify-between font-bold">
                          <span>1. HR &amp; People Ops</span>
                          <span>{c.hrApproval?.approved ? '✓ Disetujui' : c.hrApproval?.approved === false ? '✕ Ditolak' : 'Menunggu'}</span>
                        </div>
                        {c.hrApproval?.by && (
                          <p className="text-[10px] mt-0.5 opacity-90">Oleh: {c.hrApproval.by}</p>
                        )}
                        {c.hrApproval?.notes && (
                          <p className="text-[10px] italic mt-0.5 text-emerald-700 dark:text-emerald-300">"{c.hrApproval.notes}"</p>
                        )}
                      </div>

                      {/* 2. Finance & Accounting */}
                      <div className={`p-2.5 rounded-xl border ${
                        c.financeApproval?.approved
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800'
                          : c.financeApproval?.approved === false
                          ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
                          : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                      }`}>
                        <div className="flex items-center justify-between font-bold">
                          <span>2. Finance &amp; Accounting</span>
                          <span>{c.financeApproval?.approved ? '✓ Disetujui' : c.financeApproval?.approved === false ? '✕ Ditolak' : 'Menunggu'}</span>
                        </div>
                        {c.financeApproval?.by && (
                          <p className="text-[10px] mt-0.5 opacity-90">Oleh: {c.financeApproval.by}</p>
                        )}
                        {c.financeApproval?.notes && (
                          <p className="text-[10px] italic mt-0.5 text-emerald-700 dark:text-emerald-300">"{c.financeApproval.notes}"</p>
                        )}
                      </div>

                      {/* 3. CEO (Keputusan Tertinggi & Mutlak) */}
                      <div className={`p-2.5 rounded-xl border ${
                        c.ceoApproval?.approved
                          ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-300 text-purple-900 dark:bg-purple-950/50 dark:border-purple-800 dark:text-purple-200'
                          : c.ceoApproval?.approved === false
                          ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
                          : 'bg-amber-50/80 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
                      }`}>
                        <div className="flex items-center justify-between font-extrabold">
                          <span className="flex items-center gap-1">
                            <ShieldCheck size={13} className="text-purple-600" /> 3. CEO (Keputusan Tertinggi)
                          </span>
                          <span>{c.ceoApproval?.approved ? '★ Disahkan CEO' : c.ceoApproval?.approved === false ? '✕ Ditolak CEO' : 'Menunggu CEO'}</span>
                        </div>
                        {c.ceoApproval?.approved ? (
                          <p className="text-[10px] mt-0.5 text-purple-700 dark:text-purple-300 font-semibold">
                            ✓ Bypass Mutlak Aktif: Langsung disahkan untuk penerbitan PO
                          </p>
                        ) : (
                          <p className="text-[10px] mt-0.5 text-amber-700 dark:text-amber-300">
                            Persetujuan CEO bersifat mutlak &amp; mengikat tertinggi
                          </p>
                        )}
                        {c.ceoApproval?.notes && (
                          <p className="text-[10px] italic mt-0.5 text-purple-800 dark:text-purple-300">"{c.ceoApproval.notes}"</p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons for Approvers */}
                    {c.stage === 'PR Created' && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <span className="text-[11px] text-gray-500">
                          Panel Tindakan Approval ({currentUser?.name} - {currentUser?.role || 'Staff'}):
                        </span>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* HR Review Button */}
                          {isHR && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setReviewCase({ id: c.id, role: 'HR', isApprove: true })}
                                className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[11px] cursor-pointer"
                              >
                                Setujui sbg HR
                              </button>
                              <button
                                onClick={() => setReviewCase({ id: c.id, role: 'HR', isApprove: false })}
                                className="px-2 py-1.5 rounded-lg bg-gray-50 hover:bg-rose-50 text-gray-600 hover:text-rose-600 border border-gray-200 text-[11px] cursor-pointer"
                              >
                                Tolak
                              </button>
                            </div>
                          )}

                          {/* Finance Review Button */}
                          {isFinance && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setReviewCase({ id: c.id, role: 'Finance', isApprove: true })}
                                className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px] cursor-pointer"
                              >
                                Setujui sbg Finance
                              </button>
                              <button
                                onClick={() => setReviewCase({ id: c.id, role: 'Finance', isApprove: false })}
                                className="px-2 py-1.5 rounded-lg bg-gray-50 hover:bg-rose-50 text-gray-600 hover:text-rose-600 border border-gray-200 text-[11px] cursor-pointer"
                              >
                                Tolak
                              </button>
                            </div>
                          )}

                          {/* CEO SUPER BYPASS APPROVAL */}
                          {isCEO && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setReviewCase({ id: c.id, role: 'CEO', isApprove: true })}
                                className="px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                              >
                                <ShieldCheck size={14} /> ★ Setujui Langsung (CEO Keputusan Tertinggi)
                              </button>
                              <button
                                onClick={() => setReviewCase({ id: c.id, role: 'CEO', isApprove: false })}
                                className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs cursor-pointer"
                              >
                                Tolak PR
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Dialog Catatan Approval / Penolakan */}
              {reviewCase && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-60 p-4">
                  <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-800 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                        <ShieldCheck size={18} className="text-primary-600" />
                        Konfirmasi {reviewCase.isApprove ? 'Persetujuan' : 'Penolakan'} PR ({reviewCase.role})
                      </h4>
                      <button onClick={() => setReviewCase(null)} className="text-gray-400 hover:text-gray-600">
                        <X size={16} />
                      </button>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {reviewCase.role === 'CEO' && reviewCase.isApprove
                        ? 'Sebagai CEO dengan hak keputusan tertinggi, persetujuan Anda akan langsung mengesahkan PR ini menjadi siap diproses PO oleh divisi purchasing tanpa hambatan!'
                        : `Berikan catatan resmi verifikasi Anda untuk pengajuan pengadaan ini:`}
                    </p>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Catatan / Catatan Verifikasi (Opsional):
                      </label>
                      <textarea
                        rows={3}
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Contoh: Anggaran disetujui, segera hubungi vendor prioritas..."
                        className="input text-xs w-full"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <button
                        type="button"
                        onClick={() => { setReviewCase(null); setReviewNotes(''); }}
                        className="btn-secondary text-xs py-2 px-4"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          approvePRByRole(
                            reviewCase.id,
                            reviewCase.role,
                            currentUser?.name || reviewCase.role,
                            reviewCase.isApprove,
                            reviewNotes || undefined
                          );
                          alert(
                            reviewCase.role === 'CEO' && reviewCase.isApprove
                              ? '★ Keputusan tertinggi CEO disahkan! Dokumen PR langsung disetujui dan dialihkan ke Modul Purchasing.'
                              : `Status verifikasi ${reviewCase.role} berhasil disimpan.`
                          );
                          setReviewCase(null);
                          setReviewNotes('');
                        }}
                        className={`text-xs py-2 px-4 rounded-xl font-bold text-white shadow-sm cursor-pointer ${
                          reviewCase.isApprove
                            ? reviewCase.role === 'CEO' ? 'bg-purple-700 hover:bg-purple-800' : 'bg-emerald-600 hover:bg-emerald-700'
                            : 'bg-rose-600 hover:bg-rose-700'
                        }`}
                      >
                        {reviewCase.isApprove ? `Konfirmasi Setujui (${reviewCase.role})` : `Tolak Pengajuan`}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              MODUL 2: DIVISI PENGADAAN (PROCUREMENT / PURCHASING)
              ========================================================================= */}
          {activeTab === '2_po' && (
            <div className="space-y-4">
              <div className="bg-purple-50 dark:bg-purple-950/40 p-4 rounded-2xl border border-purple-200 dark:border-purple-800">
                <h4 className="font-bold text-purple-950 dark:text-purple-200 text-sm flex items-center gap-1.5">
                  <Package size={16} /> Modul Purchase Order (PO) &amp; Vendor Sourcing
                </h4>
                <p className="text-[11px] text-purple-700 dark:text-purple-300 mt-0.5">
                  Tugas Purchasing: Memeriksa PR yang sudah di-approve, meminta RFQ vendor pembanding, bernegosiasi harga &amp; ToP, lalu menerbitkan Purchase Order resmi.
                </p>
              </div>

              <div className="space-y-3">
                {cases.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs">{c.caseNumber}</span>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">{c.title}</h4>
                      </div>
                      {getStageBadge(c.stage)}
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-xl text-xs space-y-1">
                      <p><strong>Item:</strong> {c.itemName} ({c.quantity} {c.unit})</p>
                      <p><strong>Pagu Estimasi PR:</strong> {formatIDR(c.totalEstimatedPrice)}</p>
                      {c.poNumber && (
                        <p className="text-purple-700 dark:text-purple-300 font-bold">
                          Nomor PO: {c.poNumber} • Vendor: {c.selectedVendor} ({formatIDR(c.agreedPrice || 0)})
                        </p>
                      )}
                    </div>

                    {/* Jika PR Approved -> Purchasing siap terbitkan PO */}
                    {c.stage === 'PR Approved' && (
                      <div className="p-4 bg-purple-50/50 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800 space-y-3">
                        <p className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1">
                          <Plus size={14} /> Terbitkan Purchase Order (PO) Resmi ke Vendor
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            placeholder="Nama Vendor Terpilih (misal: PT Erajaya Tbk)"
                            value={vendorName}
                            onChange={(e) => setVendorName(e.target.value)}
                            className="input text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Kontak / Email Vendor"
                            value={vendorContact}
                            onChange={(e) => setVendorContact(e.target.value)}
                            className="input text-xs"
                          />
                          <input
                            type="number"
                            placeholder="Harga Kesepakatan (IDR)"
                            value={agreedPrice || c.totalEstimatedPrice}
                            onChange={(e) => setAgreedPrice(Number(e.target.value))}
                            className="input text-xs font-bold text-purple-700"
                          />
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => {
                              if (!vendorName.trim()) {
                                alert('Mohon isi nama vendor pilihan.');
                                return;
                              }
                              issuePurchaseOrder(c.id, {
                                selectedVendor: vendorName,
                                selectedVendorContact: vendorContact || '021-500-xxx',
                                agreedPrice: agreedPrice || c.totalEstimatedPrice,
                                paymentTerms: paymentTerms,
                                quotes: [],
                                issuedBy: currentUser?.name || 'Purchasing',
                              });
                              alert('Purchase Order (PO) resmi berhasil diterbitkan ke vendor!');
                              setVendorName('');
                            }}
                            className="btn-primary text-xs py-2 px-4 font-bold cursor-pointer"
                          >
                            Terbitkan &amp; Kirim PO ke Vendor
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================================
              MODUL 3: DIVISI GUDANG & PENERIMA (RECEIVING / BAST / GA)
              ========================================================================= */}
          {activeTab === '3_gr' && (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-800">
                <h4 className="font-bold text-amber-950 dark:text-amber-200 text-sm flex items-center gap-1.5">
                  <Truck size={16} /> Modul Goods Receipt (GR) &amp; Berita Acara Serah Terima (BAST)
                </h4>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                  Tugas Gudang/User: Menerima fisik barang atau konfirmasi langganan SaaS telah aktif, memeriksa kesesuaian Surat Jalan (Delivery Note), dan menginput GR/BAST ke dalam sistem.
                </p>
              </div>

              <div className="space-y-3">
                {cases.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-xs text-amber-600">{c.poNumber || c.caseNumber}</span>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white mt-0.5">{c.title}</h4>
                      </div>
                      {getStageBadge(c.stage)}
                    </div>

                    {c.grNumber && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-xs space-y-2 border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                            <CheckCircle2 size={14} className="text-emerald-600" />
                            Dokumen GR/BAST Resmi: {c.grNumber}
                          </p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                            QC: {c.qcStatus || 'Passed'}
                          </span>
                        </div>

                        <p className="text-gray-700 dark:text-gray-300">
                          Surat Jalan: <strong>{c.deliveryNoteNumber}</strong> • Jumlah Diterima: <strong>{c.receivedQuantity || c.quantity} {c.unit}</strong> • Penerima: <strong>{c.receivedBy || 'Staff'}</strong>
                        </p>

                        {c.bastNotes && (
                          <p className="text-gray-600 dark:text-gray-400 italic text-[11px]">
                            Catatan BAST: "{c.bastNotes}"
                          </p>
                        )}

                        {/* Tampilan Bukti Gambar Serah Terima Fisik Barang */}
                        {c.proofImageUrl && (
                          <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-3">
                            <div
                              onClick={() => setViewingImageModal({ url: c.proofImageUrl!, title: `Bukti Serah Terima: ${c.title}` })}
                              className="relative group cursor-pointer overflow-hidden rounded-xl border border-emerald-300 dark:border-emerald-700 w-16 h-16 flex-shrink-0 bg-black/5 shadow-xs"
                            >
                              <img
                                src={c.proofImageUrl}
                                alt="Bukti Serah Terima"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                <Search size={14} />
                              </div>
                            </div>

                            <div className="text-[11px]">
                              <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                                <ImageIcon size={12} className="text-emerald-600" /> Bukti Gambar Serah Terima
                              </p>
                              <p className="text-gray-500 truncate max-w-xs">{c.proofImageFileName || 'Foto_Barang_Fisik.jpg'}</p>
                              <button
                                type="button"
                                onClick={() => setViewingImageModal({ url: c.proofImageUrl!, title: `Bukti Serah Terima: ${c.title}` })}
                                className="text-emerald-700 dark:text-emerald-300 hover:underline font-semibold text-[10px] flex items-center gap-0.5 mt-0.5 cursor-pointer"
                              >
                                Klik untuk Perbesar Gambar &rarr;
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Jika PO Issued -> Siap Terima Barang / Input GR */}
                    {c.stage === 'PO Issued' && (
                      <div className="p-4 bg-amber-50/50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-3">
                        <p className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                          <CheckCircle2 size={14} /> Input Penerimaan Barang / Aktivasi Layanan (GR / BAST)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            placeholder="Nomor Surat Jalan / Delivery Note"
                            value={deliveryNote}
                            onChange={(e) => setDeliveryNote(e.target.value)}
                            className="input text-xs"
                          />
                          <input
                            type="number"
                            placeholder="Jumlah Diterima Sesuai"
                            value={receivedQty || c.quantity}
                            onChange={(e) => setReceivedQty(Number(e.target.value))}
                            className="input text-xs"
                          />
                          <select
                            value={qcStatus}
                            onChange={(e) => setQcStatus(e.target.value as any)}
                            className="input text-xs"
                          >
                            <option value="Passed (Sesuai)">Passed (Sesuai Spesifikasi)</option>
                            <option value="Partial">Sebagian Diterima</option>
                            <option value="Rejected">Ditolak / Rusak</option>
                          </select>
                        </div>

                        <textarea
                          rows={2}
                          placeholder="Catatan Berita Acara Serah Terima (Kondisi barang / Akun lisensi aktif)..."
                          value={bastNotes}
                          onChange={(e) => setBastNotes(e.target.value)}
                          className="input text-xs"
                        />

                        {/* Bagian Upload Bukti Gambar Serah Terima */}
                        <div className="space-y-1.5 pt-1">
                          <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                            <Camera size={13} className="text-amber-600" />
                            Upload Bukti Gambar Serah Terima (Foto Fisik Barang / Screenshot Aktivasi)
                          </label>

                          <input
                            type="file"
                            ref={bastImageInputRef}
                            accept="image/*"
                            onChange={handleBastImageUpload}
                            className="hidden"
                          />

                          {!bastProofImage ? (
                            <div
                              onClick={() => bastImageInputRef.current?.click()}
                              className="border-2 border-dashed border-amber-300 dark:border-amber-700/80 hover:border-amber-500 rounded-2xl p-3.5 text-center cursor-pointer transition-all bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/80 group"
                            >
                              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 flex items-center justify-center mx-auto mb-1 group-hover:scale-110 transition-transform">
                                <Camera size={16} />
                              </div>
                              <p className="text-xs font-bold text-amber-950 dark:text-amber-200">
                                Klik untuk Memilih &amp; Upload Foto Bukti Serah Terima dari Perangkat
                              </p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                Format: JPG, PNG, WebP (Foto fisik barang tiba di gudang, kondisi packing, atau bukti akun aktif)
                              </p>
                            </div>
                          ) : (
                            <div className="p-3 bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 rounded-2xl flex items-center justify-between gap-3 shadow-xs animate-fadeIn">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={bastProofImage}
                                  alt="Preview Bukti"
                                  className="w-12 h-12 rounded-xl object-cover border border-amber-200 flex-shrink-0"
                                />
                                <div className="truncate text-xs">
                                  <p className="font-bold text-gray-900 dark:text-white truncate">
                                    {bastProofImageName}
                                  </p>
                                  <p className="text-[10px] text-emerald-600 font-semibold">
                                    ✓ Foto siap dilampirkan ({bastProofImageSize || 'Foto Perangkat'})
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => bastImageInputRef.current?.click()}
                                  className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-semibold cursor-pointer"
                                >
                                  Ganti Foto
                                </button>
                                <button
                                  type="button"
                                  onClick={handleRemoveBastImage}
                                  className="p-1 rounded-lg hover:bg-rose-100 text-rose-500 cursor-pointer"
                                  title="Hapus Foto"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => {
                              if (!deliveryNote.trim()) {
                                alert('Mohon isi nomor surat jalan vendor.');
                                return;
                              }
                              receiveGoodsOrService(c.id, {
                                deliveryNoteNumber: deliveryNote,
                                receivedQuantity: receivedQty || c.quantity,
                                qcStatus: qcStatus,
                                bastNotes: bastNotes || 'Barang dan layanan diterima dengan baik dan terverifikasi.',
                                proofImageUrl: bastProofImage || undefined,
                                proofImageFileName: bastProofImageName || undefined,
                                receivedBy: currentUser?.name || 'Gudang & GA',
                              });
                              alert('Dokumen GR/BAST dan Bukti Gambar berhasil diterbitkan! Dokumen diteruskan ke Divisi Finance untuk 3-Way Matching.');
                              setDeliveryNote('');
                              setBastNotes('');
                              handleRemoveBastImage();
                            }}
                            className="btn-primary text-xs py-2 px-5 font-bold bg-amber-600 hover:bg-amber-700 cursor-pointer shadow-md"
                          >
                            Sahkan GR &amp; Terbitkan BAST
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================================
              MODUL 4: DIVISI KEUANGAN & AKUNTANSI (FINANCE & AP)
              ========================================================================= */}
          {activeTab === '4_finance' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                <h4 className="font-bold text-emerald-950 dark:text-emerald-200 text-sm flex items-center gap-1.5">
                  <DollarSign size={16} /> Modul Accounts Payable (AP) &amp; 3-Way Matching
                </h4>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Tugas Finance: Melakukan verifikasi <strong>3-Way Matching</strong> [PO + GR/BAST + Invoice Vendor]. Jika ketiga dokumen cocok, tagihan sah untuk dibayarkan dan dibukukan ke General Ledger.
                </p>
              </div>

              <div className="space-y-3">
                {cases.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-xs">{c.caseNumber}</span>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">{c.title}</h4>
                      </div>
                      {getStageBadge(c.stage)}
                    </div>

                    {/* Dokumen 3-Way Matching Overview */}
                    <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-gray-400 text-[10px] font-bold">1. PURCHASE ORDER (PO)</p>
                        <p className="font-bold text-purple-600">{c.poNumber || 'Belum Terbit'}</p>
                        <p className="text-[11px]">Nominal: {formatIDR(c.agreedPrice || c.totalEstimatedPrice)}</p>
                      </div>

                      <div className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-gray-400 text-[10px] font-bold">2. GOODS RECEIPT (GR/BAST)</p>
                        <p className="font-bold text-amber-600">{c.grNumber || 'Menunggu Barang'}</p>
                        <p className="text-[11px]">Surat Jalan: {c.deliveryNoteNumber || '-'}</p>
                      </div>

                      <div className="p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-gray-400 text-[10px] font-bold">3. VENDOR INVOICE (FAKTUR)</p>
                        <p className="font-bold text-emerald-600">{c.vendorInvoiceNumber || 'Input Tagihan'}</p>
                        <p className="text-[11px]">Nilai: {formatIDR(c.invoiceAmount || c.agreedPrice || c.totalEstimatedPrice)}</p>
                      </div>
                    </div>

                    {/* Jika GR Received -> Lakukan 3-Way Matching */}
                    {c.stage === 'GR Received' && (
                      <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-3">
                        <p className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1">
                          <FileCheck2 size={14} /> Verifikasi 3-Way Matching Tagihan Vendor
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            placeholder="Nomor Faktur / Invoice Vendor"
                            value={vendorInvoice}
                            onChange={(e) => setVendorInvoice(e.target.value)}
                            className="input text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Nomor Faktur Pajak (e-Faktur)"
                            value={taxInvoice}
                            onChange={(e) => setTaxInvoice(e.target.value)}
                            className="input text-xs"
                          />
                          <input
                            type="number"
                            placeholder="Total Tagihan Invoice (IDR)"
                            value={invoiceAmount || c.agreedPrice || c.totalEstimatedPrice}
                            onChange={(e) => setInvoiceAmount(Number(e.target.value))}
                            className="input text-xs font-bold text-emerald-600"
                          />
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => {
                              if (!vendorInvoice.trim()) {
                                alert('Mohon isi nomor faktur invoice vendor.');
                                return;
                              }
                              const ok = performThreeWayMatching(c.id, {
                                vendorInvoiceNumber: vendorInvoice,
                                taxInvoiceNumber: taxInvoice,
                                invoiceAmount: invoiceAmount || c.agreedPrice || c.totalEstimatedPrice,
                                matchedBy: currentUser?.name || 'Finance Lead',
                              });
                              if (ok) {
                                alert('3-Way Matching BERHASIL & COCOK! Tagihan diverifikasi valid dan siap dibayarkan.');
                                setVendorInvoice('');
                              } else {
                                alert('Nominal invoice tidak cocok dengan Purchase Order!');
                              }
                            }}
                            className="btn-primary text-xs py-2 px-4 font-bold bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                          >
                            ✓ Verifikasi 3-Way Matching
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Jika 3-Way Matched -> Eksekusi Pembayaran Bank */}
                    {c.stage === '3-Way Matched' && (
                      <div className="p-4 bg-teal-50 dark:bg-teal-950/40 rounded-2xl border border-teal-200 dark:border-teal-800 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <p className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1">
                              <DollarSign size={14} /> Siap Dibayarkan ke Vendor: {c.selectedVendor}
                            </p>
                            <p className="text-[11px] text-teal-700 dark:text-teal-300">
                              Nominal Tagihan Sah: <strong className="text-sm">{formatIDR(c.invoiceAmount || c.agreedPrice || c.totalEstimatedPrice)}</strong>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedBankId}
                              onChange={(e) => setSelectedBankId(e.target.value)}
                              className="input text-xs w-48"
                            >
                              {bankAccounts.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.bankName} ({formatIDR(b.balance)})
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                disbursePayment(c.id, {
                                  bankAccountId: selectedBankId,
                                  paidBy: currentUser?.name || 'Finance',
                                });
                                alert('Pembayaran vendor berhasil ditransfer! Saldo bank dan sisa anggaran divisi telah diperbarui secara otomatis di General Ledger.');
                              }}
                              className="btn-primary text-xs py-2 px-4 font-bold bg-teal-600 hover:bg-teal-700 cursor-pointer shadow-md"
                            >
                              Bayar &amp; Posting Jurnal
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-850">
          <span className="text-[11px] text-gray-500">
            Sistem Procure-to-Pay (P2P) Ruang Kelana • Integrasi 3-Way Matching &amp; Auto-General Ledger
          </span>
          <button onClick={onClose} className="btn-secondary text-xs py-2 px-4 cursor-pointer">
            Tutup
          </button>
        </div>
      </div>

      {/* Lightbox / Preview Bukti Gambar BAST */}
      {viewingImageModal && (
        <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-2xl w-full p-4 border border-gray-200 dark:border-gray-800 shadow-2xl space-y-3 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
              <h4 className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-2">
                <Camera size={15} className="text-amber-600" />
                {viewingImageModal.title}
              </h4>
              <button
                onClick={() => setViewingImageModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-black/5 flex items-center justify-center">
              <img
                src={viewingImageModal.url}
                alt="Bukti Serah Terima Fisik Barang"
                className="max-h-[68vh] w-auto object-contain rounded-xl"
              />
            </div>
            <div className="flex justify-end pt-1">
              <a
                href={viewingImageModal.url}
                download="Bukti_Serah_Terima_BAST"
                className="btn-primary text-xs py-1.5 px-4 font-bold flex items-center gap-1.5"
              >
                <FileUp size={13} /> Unduh Bukti Gambar
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
