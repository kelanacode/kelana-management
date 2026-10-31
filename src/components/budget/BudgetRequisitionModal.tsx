import React, { useState } from 'react';
import {
  FileSpreadsheet, Plus, CheckCircle2, Clock, AlertTriangle,
  Send, UserCheck, ShieldCheck, DollarSign, X, Building,
  ArrowRight, Filter, Search, Paperclip, ExternalLink,
  Lock, RotateCcw, Award, CheckSquare, Eye, ChevronRight
} from 'lucide-react';
import { useBudgetRequisitionStore } from '../../stores/budgetRequisitionStore';
import { useFinanceStore } from '../../stores/financeStore';
import { useAuthStore } from '../../stores/authStore';
import { BudgetRequisition, BudgetWorkflowStatus, BudgetRequestType } from '../../types/budgetRequisition';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export const BudgetRequisitionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { session, users } = useAuthStore();
  const {
    requisitions,
    submitRequisition,
    reviewByHR,
    reviewByFinance,
    reviewByCEO,
    disburseRequisition,
    cancelRequisition,
  } = useBudgetRequisitionStore();
  const { departmentBudgets, bankAccounts } = useFinanceStore();

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
    currentRole === 'CEO' ||
    userDivision.toLowerCase().includes('finan') ||
    userDivision.toLowerCase().includes('keuangan');

  const isHR =
    currentRole === 'HR' ||
    currentRole === 'Admin' ||
    currentRole === 'CEO' ||
    userDivision.toLowerCase().includes('hr') ||
    userDivision.toLowerCase().includes('operasional');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'create' | 'list' | 'approvals'>('list');

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<BudgetRequestType>('Pengadaan Barang & Jasa (PR)');
  const [estimatedAmount, setEstimatedAmount] = useState<number>(5000000);
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Selected Requisition for View/Action
  const [selectedReq, setSelectedReq] = useState<BudgetRequisition | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [selectedBankId, setSelectedBankId] = useState(bankAccounts[0]?.id || 'bank-bca');

  if (!isOpen) return null;

  // Sisa anggaran divisi saat ini
  const deptBudget = departmentBudgets.find(
    (b) =>
      b.department.toLowerCase().includes(userDivision.toLowerCase()) ||
      userDivision.toLowerCase().includes(b.department.toLowerCase())
  );
  const remainingBudget = deptBudget ? deptBudget.remainingBudget : 100000000;

  const formatIDR = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const res = submitRequisition({
      title,
      type,
      department: userDivision,
      requesterId: currentUser?.id || 'user',
      requesterName: currentUser?.name || 'Karyawan',
      requesterPosition: currentUser?.position || 'Staff',
      estimatedAmount,
      description,
      purpose,
      vendorName: vendorName || undefined,
      attachmentUrl: attachmentUrl || undefined,
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Pengajuan gagal diproses.');
      return;
    }

    alert('Pengajuan penggunaan anggaran berhasil dikirim! Sistem telah mengunci pagu dana (Encumbrance) dan meneruskan ke HR, Finance, dan CEO untuk disetujui.');
    setTitle('');
    setDescription('');
    setPurpose('');
    setVendorName('');
    setAttachmentUrl('');
    setActiveTab('list');
  };

  // Filtered List based on role
  const displayedRequisitions = requisitions.filter((r) => {
    if (isCEO || isFinance || isHR) return true;
    return r.department.toLowerCase().includes(userDivision.toLowerCase());
  });

  const getStatusBadge = (status: BudgetWorkflowStatus) => {
    switch (status) {
      case 'Draft':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">Draf</span>;
      case 'Diajukan (Pending Review)':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">Diajukan</span>;
      case 'Ditinjau HR & Finance':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">Review HR &amp; Finance</span>;
      case 'Menunggu Persetujuan CEO':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 animate-pulse">Menunggu CEO (Wajib)</span>;
      case 'Disetujui CEO (Approved)':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">Disetujui CEO</span>;
      case 'Realisasi & Pembayaran (Disbursed)':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">Cair &amp; Terbuku</span>;
      case 'Ditolak (Rejected)':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">Ditolak</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-4xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-emerald-700 via-teal-700 to-primary-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <DollarSign size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">
                  Sistem Pengajuan &amp; Persetujuan Anggaran Divisi
                </h3>
                <span className="text-[10px] bg-amber-400 text-amber-950 font-black px-2 py-0.5 rounded-md uppercase">
                  Wajib CEO Approval
                </span>
              </div>
              <p className="text-xs text-emerald-100">
                Divisi: <strong>{userDivision}</strong> • Sisa Pagu Tersedia: <strong>{formatIDR(remainingBudget)}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-6 text-xs font-semibold bg-gray-50/50 dark:bg-gray-850">
          <button
            onClick={() => { setActiveTab('list'); setSelectedReq(null); }}
            className={`py-3 px-4 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'list'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            Daftar Pengajuan Divisi ({displayedRequisitions.length})
          </button>

          <button
            onClick={() => { setActiveTab('create'); setSelectedReq(null); }}
            className={`py-3 px-4 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <Plus size={14} /> + Buat Form Pengajuan Anggaran (PR)
          </button>

          {(isCEO || isFinance || isHR) && (
            <button
              onClick={() => { setActiveTab('approvals'); setSelectedReq(null); }}
              className={`py-3 px-4 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'approvals'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
              }`}
            >
              <ShieldCheck size={14} /> Meja Otorisasi (HR, Finance &amp; CEO)
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* =========================================================================
              TAB 1: FORM PENGAJUAN PENGGUNAAN ANGGARAN (FASE 1 & 2)
              ========================================================================= */}
          {activeTab === 'create' && (
            <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto">
              {/* Encumbrance Banner */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                <Lock className="text-emerald-600 mt-0.5 flex-shrink-0" size={18} />
                <div className="leading-relaxed text-emerald-900 dark:text-emerald-200">
                  <p className="font-bold">Fitur Budget Encumbrance (Penahanan Anggaran) Aktif</p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                    Sistem secara otomatis mengunci dana pengajuan dari pagu divisi <strong>{userDivision}</strong> agar tidak digunakan untuk kebutuhan lain sebelum disetujui resmi oleh <strong>CEO</strong>.
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl flex items-center gap-2">
                  <AlertTriangle size={15} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Judul Pengajuan Anggaran / Pengadaan *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Pengadaan 5 Unit Monitor Desain & Lisensi Figma Enterprise"
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Kategori Penggunaan Anggaran
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as BudgetRequestType)}
                    className="input text-xs"
                  >
                    <option value="Pengadaan Barang & Jasa (PR)">📦 Pengadaan Barang & Jasa (PR)</option>
                    <option value="Perjalanan Dinas & Transport">✈️ Perjalanan Dinas & Transport</option>
                    <option value="Operasional & Konsumsi Tim">🍱 Operasional & Konsumsi Tim</option>
                    <option value="Langganan Software & Cloud">💻 Langganan Software & Cloud</option>
                    <option value="Pelatihan & Sertifikasi HR">🎓 Pelatihan & Sertifikasi HR</option>
                    <option value="Pemasaran & Kampanye Iklan">📢 Pemasaran & Kampanye Iklan</option>
                    <option value="Lainnya">📑 Pengeluaran Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Estimasi Biaya yang Diajukan (IDR) *
                  </label>
                  <input
                    type="number"
                    required
                    min={100000}
                    value={estimatedAmount}
                    onChange={(e) => setEstimatedAmount(Number(e.target.value))}
                    className="input text-xs font-bold text-emerald-600"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    Format: {formatIDR(estimatedAmount)}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Rincian Deskripsi Item / Jasa yang Dibutuhkan *
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Sebutkan spesifikasi barang/jasa, kuantitas, estimasi satuan, dan link penawaran..."
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Tujuan &amp; Manfaat Operasional (Business Justification) *
                  </label>
                  <input
                    type="text"
                    required
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Contoh: Meningkatkan efisiensi kerja tim frontend & render asset"
                    className="input text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Calon Vendor / Pihak Ketiga (Opsional)
                  </label>
                  <input
                    type="text"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="Contoh: PT Trikom Komputindo / AWS Singapore"
                    className="input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Tautan Lampiran Dokumen Penawaran / Surat Pengantar (URL Google Drive / PDF)
                </label>
                <input
                  type="url"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/... invoice atau dokumen penawaran harga"
                  className="input text-xs"
                />
              </div>

              {/* Info Sisa Pagu Simulasi */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center text-[11px]">
                <span className="text-gray-500">Simulasi Sisa Pagu Anggaran {userDivision}:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {formatIDR(remainingBudget)} &rarr; <span className="text-emerald-600">{formatIDR(remainingBudget - estimatedAmount)}</span>
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="btn-secondary text-xs py-2 px-4 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs py-2 px-5 font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Send size={14} /> Ajukan ke HR, Finance &amp; CEO
                </button>
              </div>
            </form>
          )}

          {/* =========================================================================
              TAB 2: DAFTAR PENGAJUAN ANGGARAN & STATUS APPROVAL
              ========================================================================= */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {displayedRequisitions.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-emerald-400 transition-all shadow-xs space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-gray-500 font-bold bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                          {req.requestNumber}
                        </span>
                        {getStatusBadge(req.status)}
                      </div>

                      <h4 className="font-bold text-gray-900 dark:text-white text-sm leading-snug">
                        {req.title}
                      </h4>

                      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                        <span>Divisi: <strong>{req.department}</strong></span>
                        <span className="text-sm font-extrabold text-emerald-600">
                          {formatIDR(req.estimatedAmount)}
                        </span>
                      </div>

                      {/* Approval Chain Indicators */}
                      <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700 grid grid-cols-3 gap-2 text-center text-[10px]">
                        <div className={`p-1.5 rounded-lg border ${
                          req.hrApproval.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : req.hrApproval.status === 'Rejected'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'
                        }`}>
                          <p className="font-bold">1. HR / Ops</p>
                          <p className="text-[9px]">{req.hrApproval.status}</p>
                        </div>

                        <div className={`p-1.5 rounded-lg border ${
                          req.financeApproval.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : req.financeApproval.status === 'Rejected'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'
                        }`}>
                          <p className="font-bold">2. Finance</p>
                          <p className="text-[9px]">{req.financeApproval.status}</p>
                        </div>

                        <div className={`p-1.5 rounded-lg border font-bold ${
                          req.ceoApproval.status === 'Approved'
                            ? 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200'
                            : req.ceoApproval.status === 'Rejected'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}>
                          <p className="flex items-center justify-center gap-0.5">
                            <ShieldCheck size={10} /> 3. CEO (Wajib)
                          </p>
                          <p className="text-[9px]">{req.ceoApproval.status}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">
                        Oleh: {req.requesterName} • {format(parseISO(req.createdAt), 'dd MMM yyyy')}
                      </span>

                      <button
                        onClick={() => setSelectedReq(req)}
                        className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Eye size={12} /> Rincian &amp; Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {displayedRequisitions.length === 0 && (
                <div className="p-8 text-center text-gray-400 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  Belum ada pengajuan anggaran dari divisi Anda. Klik tab "+ Buat Form Pengajuan" untuk mengajukan kebutuhan anggaran.
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              TAB 3: MEJA OTORISASI (APPROVAL DASHBOARD UNTUK HR, FINANCE & CEO)
              ========================================================================= */}
          {activeTab === 'approvals' && (isCEO || isFinance || isHR) && (
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-purple-950 dark:text-purple-200 text-sm flex items-center gap-1.5">
                    <ShieldCheck size={16} /> Meja Otorisasi Anggaran Eksekutif
                  </h4>
                  <p className="text-[11px] text-purple-700 dark:text-purple-300 mt-0.5">
                    Peran Anda saat ini: <strong className="uppercase">{currentUser?.role || 'Staff'}</strong> ({currentUser?.name})
                  </p>
                </div>
                {isCEO && (
                  <span className="px-3 py-1 bg-purple-600 text-white font-black text-[11px] rounded-xl shadow-xs">
                    CEO / Direktur Utama
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {requisitions.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gray-500">{req.requestNumber}</span>
                          <span className="font-bold text-gray-900 dark:text-white text-sm">{req.title}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Pemohon: <strong>{req.requesterName}</strong> ({req.department}) • Nilai: <strong className="text-emerald-600">{formatIDR(req.estimatedAmount)}</strong>
                        </p>
                      </div>
                      <div>{getStatusBadge(req.status)}</div>
                    </div>

                    <div className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-750 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                      <p><strong>Uraian Kebutuhan:</strong> {req.description}</p>
                      <p className="mt-1"><strong>Tujuan:</strong> {req.purpose}</p>
                      {req.vendorName && <p className="mt-1"><strong>Calon Vendor:</strong> {req.vendorName}</p>}
                    </div>

                    {/* Action Panel for Approver */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        {/* HR Review */}
                        {isHR && req.hrApproval.status === 'Pending' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => reviewByHR(req.id, currentUser?.name || 'HR', true, 'Disetujui HR')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 cursor-pointer"
                            >
                              ✓ Setujui HR
                            </button>
                            <button
                              onClick={() => reviewByHR(req.id, currentUser?.name || 'HR', false, 'Ditolak HR')}
                              className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px] hover:bg-rose-100 cursor-pointer"
                            >
                              ✕ Tolak HR
                            </button>
                          </div>
                        )}

                        {/* Finance Review */}
                        {isFinance && req.financeApproval.status === 'Pending' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => reviewByFinance(req.id, currentUser?.name || 'Finance', true, 'Anggaran dikonfirmasi Finance')}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-700 cursor-pointer"
                            >
                              ✓ Verifikasi Finance
                            </button>
                            <button
                              onClick={() => reviewByFinance(req.id, currentUser?.name || 'Finance', false, 'Ditolak Finance')}
                              className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px] hover:bg-rose-100 cursor-pointer"
                            >
                              ✕ Tolak Finance
                            </button>
                          </div>
                        )}

                        {/* MANDATORY CEO APPROVAL */}
                        {isCEO && req.ceoApproval.status === 'Pending' && (
                          <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/50 p-1.5 rounded-xl border border-purple-200 dark:border-purple-800">
                            <span className="text-[10px] font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1">
                              <ShieldCheck size={12} /> Keputusan CEO:
                            </span>
                            <button
                              onClick={() => reviewByCEO(req.id, currentUser?.name || 'CEO', true, 'Persetujuan Final CEO Disahkan')}
                              className="px-3 py-1.5 rounded-lg bg-purple-700 text-white font-black text-[11px] hover:bg-purple-800 shadow-sm cursor-pointer"
                            >
                              ✓ Sahkan &amp; Setujui (CEO)
                            </button>
                            <button
                              onClick={() => reviewByCEO(req.id, currentUser?.name || 'CEO', false, 'Tidak disetujui CEO')}
                              className="px-3 py-1.5 rounded-lg bg-rose-100 text-rose-800 font-bold text-[11px] hover:bg-rose-200 cursor-pointer"
                            >
                              ✕ Tolak (CEO)
                            </button>
                          </div>
                        )}

                        {/* Finance Realization / Disbursement (Fase 4 & 5) */}
                        {isFinance && req.status === 'Disetujui CEO (Approved)' && (
                          <button
                            onClick={() => {
                              disburseRequisition(req.id, currentUser?.name || 'Finance', selectedBankId);
                              alert('Pembayaran berhasil direalisasikan, saldo bank terpotong, dan transaksi otomatis dibukukan ke General Ledger!');
                            }}
                            className="px-3.5 py-1.5 rounded-lg bg-teal-600 text-white font-bold text-[11px] hover:bg-teal-700 flex items-center gap-1 cursor-pointer shadow-sm"
                          >
                            <DollarSign size={13} /> Eksekusi Pencairan (Disbursement)
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => setSelectedReq(req)}
                        className="text-gray-500 hover:text-gray-800 text-[11px] underline"
                      >
                        Lihat Detail Approval Log
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-850">
          <span className="text-[11px] text-gray-500">
            Sistem Anggaran Terpadu Ruang Kelana • Real-Time Budget Encumbrance
          </span>
          <button onClick={onClose} className="btn-secondary text-xs py-2 px-4 cursor-pointer">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
