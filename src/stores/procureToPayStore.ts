import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { P2PProcurementCase, P2PWorkflowStage, VendorQuote } from '../types/procureToPay';
import { useFinanceStore } from './financeStore';

const generateP2PId = () => 'P2P-2026-' + Math.floor(100 + Math.random() * 900);

interface ProcureToPayStore {
  cases: P2PProcurementCase[];

  // 1. Divisi / Perorangan: Buat Pengajuan Pengadaan Barang
  createPurchaseRequest: (data: {
    title: string;
    type: 'Barang Fisik & ATK' | 'Langganan Software & Cloud' | 'Jasa & Konsultan' | 'Perangkat Keras (Asset)';
    department: string;
    requesterName: string;
    requesterId: string;
    requesterNik?: string;
    requestCategory: 'Divisi' | 'Perorangan (Individu)';
    itemName: string;
    quantity: number;
    unit: string;
    estimatedUnitPrice: number;
    description: string;
    justification: string;
    urgency?: 'Biasa' | 'Penting' | 'Mendesak / Urgent';
    attachmentUrl?: string;
    attachmentFileName?: string;
  }) => P2PProcurementCase;

  // 1b. Approval PR: HR, Finance, dan CEO (Keputusan Tertinggi Mutlak pada CEO)
  // JIKA CEO menyetujui, LANGSUNG PROSES (stage = 'PR Approved') tanpa menunggu yang lain.
  approvePRByRole: (
    caseId: string,
    role: 'Manager' | 'HR' | 'Finance' | 'CEO',
    approverName: string,
    approved: boolean,
    notes?: string
  ) => void;

  // 2. Divisi Pengadaan (Purchasing): Terbitkan PO
  issuePurchaseOrder: (
    caseId: string,
    data: {
      selectedVendor: string;
      selectedVendorContact: string;
      agreedPrice: number;
      paymentTerms: string;
      quotes: VendorQuote[];
      issuedBy: string;
    }
  ) => void;

  // 3. Divisi Gudang / Penerima: Input GR / BAST
  receiveGoodsOrService: (
    caseId: string,
    data: {
      deliveryNoteNumber: string;
      receivedQuantity: number;
      qcStatus: 'Passed (Sesuai)' | 'Partial' | 'Rejected';
      bastNotes: string;
      proofImageUrl?: string;
      proofImageFileName?: string;
      receivedBy: string;
    }
  ) => void;

  // 4. Divisi Finance: 3-Way Matching (PO + GR + Invoice)
  performThreeWayMatching: (
    caseId: string,
    data: {
      vendorInvoiceNumber: string;
      taxInvoiceNumber?: string;
      invoiceAmount: number;
      matchedBy: string;
    }
  ) => boolean;

  // 5. Divisi Finance: Pembayaran & Jurnal Kas
  disbursePayment: (
    caseId: string,
    data: {
      bankAccountId: string;
      paidBy: string;
      paymentReference?: string;
    }
  ) => void;
}

const INITIAL_CASES: P2PProcurementCase[] = [
  {
    id: 'case-01',
    caseNumber: 'P2P-2026-081',
    title: 'Langganan Tahunan Zoom Enterprise & Figma Organization 2026',
    type: 'Langganan Software & Cloud',
    department: 'Teknologi & IT',
    requesterName: 'Andi Wirawan',
    requesterId: 'user-andi',
    requestCategory: 'Divisi',
    urgency: 'Penting',
    itemName: 'Lisensi Zoom 100 Host & 15 Figma Org Seat',
    quantity: 1,
    unit: 'Paket 1 Tahun',
    estimatedUnitPrice: 42000000,
    totalEstimatedPrice: 42000000,
    description: 'Kebutuhan koordinasi jarak jauh seluruh kantor dan perancangan prototype UI/UX sistem Kelana.',
    justification: 'Lisensi sebelumnya akan habis tanggal 15 November 2026.',
    stage: 'PR Approved',
    managerApproval: { approved: true, by: 'Budi Santoso (VP IT)', timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString() },
    ceoApproval: { approved: true, by: 'CEO Kelana Corporate (Bypass Disetujui)', timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString() },
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'case-02',
    caseNumber: 'P2P-2026-079',
    title: 'Pengadaan 10 Unit Laptop Apple MacBook Pro M3 untuk Engineering',
    type: 'Perangkat Keras (Asset)',
    department: 'Teknologi & IT',
    requesterName: 'Andi Wirawan',
    requesterId: 'user-andi',
    requestCategory: 'Divisi',
    urgency: 'Mendesak / Urgent',
    itemName: 'MacBook Pro M3 Pro 18GB/512GB Space Black',
    quantity: 10,
    unit: 'Unit',
    estimatedUnitPrice: 28500000,
    totalEstimatedPrice: 285000000,
    description: 'Spesifikasi developer untuk build mobile Flutter & microservice backend.',
    justification: 'Penggantian perangkat lama yang berumur lebih dari 3 tahun (Asset Refreshment).',
    stage: 'GR Received',
    ceoApproval: { approved: true, by: 'CEO Kelana Corporate', timestamp: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString() },
    poNumber: 'PO-KELANA-2026-042',
    selectedVendor: 'iBox / PT Erajaya Swasembada Tbk',
    selectedVendorContact: '021-5291-6000 (B2B Enterprise Dept)',
    agreedPrice: 280000000,
    paymentTerms: 'Term of Payment 30 Hari (Net 30)',
    poIssuedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    poIssuedBy: 'Tim Purchasing Kelana',
    grNumber: 'GR-BAST-2026-033',
    deliveryNoteNumber: 'DN-IBOX-88912-JKT',
    receivedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    receivedBy: 'Gudang & GA (Surat Jalan Verified)',
    receivedQuantity: 10,
    qcStatus: 'Passed (Sesuai)',
    bastNotes: 'Semua 10 unit tersegel rapi, nomor seri (Serial Number) terdata lengkap untuk modul Aset Tetap.',
    vendorInvoiceNumber: 'INV/2026/XI/88921-ERA',
    taxInvoiceNumber: '010.002-26.99120199',
    invoiceAmount: 280000000,
    createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  }
];

export const useProcureToPayStore = create<ProcureToPayStore>()(
  persist(
    (set, get) => ({
      cases: INITIAL_CASES,

      createPurchaseRequest: (data) => {
        const total = data.quantity * data.estimatedUnitPrice;
        const newCase: P2PProcurementCase = {
          id: 'case-' + Math.random().toString(36).substring(2, 9),
          caseNumber: generateP2PId(),
          title: data.title,
          type: data.type,
          department: data.department,
          requesterName: data.requesterName,
          requesterId: data.requesterId,
          requesterNik: data.requesterNik,
          requestCategory: data.requestCategory || 'Divisi',
          itemName: data.itemName,
          quantity: data.quantity,
          unit: data.unit,
          estimatedUnitPrice: data.estimatedUnitPrice,
          totalEstimatedPrice: total,
          description: data.description,
          justification: data.justification,
          urgency: data.urgency || 'Biasa',
          attachmentUrl: data.attachmentUrl,
          attachmentFileName: data.attachmentFileName,
          stage: 'PR Created',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({ cases: [newCase, ...state.cases] }));
        return newCase;
      },

      approvePRByRole: (caseId, role, approverName, approved, notes) => {
        set((state) => ({
          cases: state.cases.map((c) => {
            if (c.id !== caseId) return c;

            const now = new Date().toISOString();
            const updated = { ...c };

            if (!approved) {
              return {
                ...updated,
                stage: 'Rejected',
                updatedAt: now,
                ...(role === 'CEO' ? { ceoApproval: { approved: false, by: approverName, timestamp: now, notes } } : {}),
                ...(role === 'HR' ? { hrApproval: { approved: false, by: approverName, timestamp: now, notes } } : {}),
                ...(role === 'Finance' ? { financeApproval: { approved: false, by: approverName, timestamp: now, notes } } : {}),
              };
            }

            if (role === 'CEO') {
              // KEPUTUSAN TERTINGGI: JIKA CEO MENYETUJUI, LANGSUNG PROSES (stage = 'PR Approved')
              // tanpa menunggu HR ataupun Finance.
              updated.ceoApproval = { approved: true, by: approverName, timestamp: now, notes: notes || 'Persetujuan Final CEO' };
              updated.stage = 'PR Approved';
            } else if (role === 'HR') {
              updated.hrApproval = { approved: true, by: approverName, timestamp: now, notes: notes || 'Diverifikasi HR' };
            } else if (role === 'Finance') {
              updated.financeApproval = { approved: true, by: approverName, timestamp: now, notes: notes || 'Diverifikasi Finance' };
            }

            // Jika HR + Finance sudah menyetujui, siap menunggu keputusan final CEO
            updated.updatedAt = now;
            return updated;
          }),
        }));
      },

      issuePurchaseOrder: (caseId, data) => {
        set((state) => ({
          cases: state.cases.map((c) => {
            if (c.id !== caseId) return c;
            const now = new Date().toISOString();
            return {
              ...c,
              stage: 'PO Issued',
              poNumber: 'PO-KELANA-2026-' + Math.floor(100 + Math.random() * 900),
              selectedVendor: data.selectedVendor,
              selectedVendorContact: data.selectedVendorContact,
              agreedPrice: data.agreedPrice,
              paymentTerms: data.paymentTerms,
              quotes: data.quotes,
              poIssuedAt: now,
              poIssuedBy: data.issuedBy,
              updatedAt: now,
            };
          }),
        }));
      },

      receiveGoodsOrService: (caseId, data) => {
        set((state) => ({
          cases: state.cases.map((c) => {
            if (c.id !== caseId) return c;
            const now = new Date().toISOString();
            return {
              ...c,
              stage: 'GR Received',
              grNumber: 'GR-BAST-2026-' + Math.floor(100 + Math.random() * 900),
              deliveryNoteNumber: data.deliveryNoteNumber,
              receivedQuantity: data.receivedQuantity,
              qcStatus: data.qcStatus,
              bastNotes: data.bastNotes,
              proofImageUrl: data.proofImageUrl,
              proofImageFileName: data.proofImageFileName,
              receivedBy: data.receivedBy,
              receivedAt: now,
              updatedAt: now,
            };
          }),
        }));
      },

      performThreeWayMatching: (caseId, data) => {
        const c = get().cases.find((x) => x.id === caseId);
        if (!c) return false;

        // Validasi 3-Way Matching: PO Agreed Price vs Invoice Amount
        const isMatched = Math.abs((c.agreedPrice || c.totalEstimatedPrice) - data.invoiceAmount) < 1;

        if (isMatched) {
          set((state) => ({
            cases: state.cases.map((item) =>
              item.id === caseId
                ? {
                    ...item,
                    stage: '3-Way Matched',
                    vendorInvoiceNumber: data.vendorInvoiceNumber,
                    taxInvoiceNumber: data.taxInvoiceNumber,
                    invoiceAmount: data.invoiceAmount,
                    threeWayMatched: true,
                    matchedBy: data.matchedBy,
                    matchedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }
                : item
            ),
          }));
          return true;
        }
        return false;
      },

      disbursePayment: (caseId, data) => {
        const c = get().cases.find((x) => x.id === caseId);
        if (!c) return;

        const amountToPay = c.invoiceAmount || c.agreedPrice || c.totalEstimatedPrice;
        const finance = useFinanceStore.getState();

        // Potong rekening bank operasional
        finance.adjustBankBalance(
          data.bankAccountId,
          -amountToPay,
          `Pembayaran Vendor: ${c.selectedVendor || 'Vendor'} (${c.caseNumber} - ${c.poNumber || 'PO'})`
        );

        // Catat Jurnal Pembukuan Otomatis
        finance.addJournalEntry({
          description: `Pelunasan Pembelian / Langganan: ${c.title} (${c.selectedVendor})`,
          reference: c.poNumber || c.caseNumber,
          accountDebit: `Beban Operasional Divisi ${c.department}`,
          accountCredit: 'Kas / Bank Operasional',
          amount: amountToPay,
          category: 'Biaya Operasional',
          status: 'Posted',
          createdBy: data.paidBy,
        });

        // Potong sisa anggaran divisi
        const deptBudget = finance.departmentBudgets.find(
          (b) =>
            b.department.toLowerCase().includes(c.department.toLowerCase()) ||
            c.department.toLowerCase().includes(b.department.toLowerCase())
        );
        if (deptBudget) {
          finance.updateDepartmentBudget(deptBudget.id, {
            spentBudget: deptBudget.spentBudget + amountToPay,
          });
        }

        set((state) => ({
          cases: state.cases.map((item) =>
            item.id === caseId
              ? {
                  ...item,
                  stage: 'Paid & Completed',
                  paidAt: new Date().toISOString(),
                  paidBy: data.paidBy,
                  paidAmount: amountToPay,
                  bankAccountId: data.bankAccountId,
                  paymentReference: data.paymentReference || 'TRF-PAY-' + Math.floor(100000 + Math.random() * 900000),
                  updatedAt: new Date().toISOString(),
                }
              : item
          ),
        }));
      },
    }),
    {
      name: 'ruang-kelana-procure-to-pay',
    }
  )
);
