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

const INITIAL_CASES: P2PProcurementCase[] = [];

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
      name: 'ruang-kelana-procure-to-pay-clean',
    }
  )
);
