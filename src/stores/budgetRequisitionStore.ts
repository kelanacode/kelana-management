import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BudgetRequisition, BudgetWorkflowStatus, BudgetRequestType } from '../types/budgetRequisition';
import { useFinanceStore } from './financeStore';

const generateReqId = (dept: string) => {
  const code = dept.substring(0, 2).toUpperCase();
  const rand = Math.floor(100 + Math.random() * 900);
  return `BR-${code}-2026-${rand}`;
};

interface BudgetRequisitionStore {
  requisitions: BudgetRequisition[];

  // Actions
  submitRequisition: (data: {
    title: string;
    type: BudgetRequestType;
    department: string;
    requesterId: string;
    requesterName: string;
    requesterPosition: string;
    estimatedAmount: number;
    description: string;
    purpose: string;
    vendorName?: string;
    attachmentUrl?: string;
    attachmentName?: string;
  }) => { success: boolean; error?: string; requisition?: BudgetRequisition };

  // Approval steps: HR, Finance, and Mandatory CEO
  reviewByHR: (id: string, reviewerName: string, approved: boolean, notes?: string) => void;
  reviewByFinance: (id: string, reviewerName: string, approved: boolean, notes?: string) => void;
  reviewByCEO: (id: string, ceoName: string, approved: boolean, notes?: string) => void;

  // Realisasi & Pencairan (Disbursement)
  disburseRequisition: (id: string, disbursByName: string, bankId: string, proofUrl?: string) => void;
  cancelRequisition: (id: string, reason?: string) => void;
}

const INITIAL_REQUISITIONS: BudgetRequisition[] = [];

export const useBudgetRequisitionStore = create<BudgetRequisitionStore>()(
  persist(
    (set, get) => ({
      requisitions: INITIAL_REQUISITIONS,

      submitRequisition: (data) => {
        const financeState = useFinanceStore.getState();
        const budgets = financeState.departmentBudgets;

        // Fase 2: Pemeriksaan Anggaran Otomatis (Budget Checking & Encumbrance)
        const deptBudget = budgets.find(
          (b) =>
            b.department.toLowerCase().includes(data.department.toLowerCase()) ||
            data.department.toLowerCase().includes(b.department.toLowerCase())
        );

        const currentRemaining = deptBudget ? deptBudget.remainingBudget : 50000000;

        if (data.estimatedAmount > currentRemaining) {
          return {
            success: false,
            error: `Pengajuan melebihi sisa pagu anggaran divisi Anda! Sisa pagu: Rp ${currentRemaining.toLocaleString('id-ID')}, sedangkan estimasi biaya: Rp ${data.estimatedAmount.toLocaleString('id-ID')}.`,
          };
        }

        const newReq: BudgetRequisition = {
          id: 'req-' + Math.random().toString(36).substring(2, 9),
          requestNumber: generateReqId(data.department),
          title: data.title,
          type: data.type,
          department: data.department,
          requesterId: data.requesterId,
          requesterName: data.requesterName,
          requesterPosition: data.requesterPosition,
          estimatedAmount: data.estimatedAmount,
          description: data.description,
          purpose: data.purpose,
          vendorName: data.vendorName,
          attachmentUrl: data.attachmentUrl,
          attachmentName: data.attachmentName,
          isEncumbered: true, // Otomatis mengunci dana
          departmentRemainingBefore: currentRemaining,
          departmentRemainingAfter: currentRemaining - data.estimatedAmount,
          status: 'Diajukan (Pending Review)',
          hrApproval: {
            role: 'HR',
            name: 'HR / People Ops',
            status: 'Pending',
          },
          financeApproval: {
            role: 'Finance',
            name: 'Finance & Accounting',
            status: 'Pending',
          },
          ceoApproval: {
            role: 'CEO',
            name: 'CEO Kelana Corporate',
            status: 'Pending',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          requisitions: [newReq, ...state.requisitions],
        }));

        return { success: true, requisition: newReq };
      },

      reviewByHR: (id, reviewerName, approved, notes) => {
        set((state) => ({
          requisitions: state.requisitions.map((req) => {
            if (req.id !== id) return req;
            const updatedHR = {
              ...req.hrApproval,
              name: reviewerName,
              status: approved ? ('Approved' as const) : ('Rejected' as const),
              timestamp: new Date().toISOString(),
              notes,
            };
            const newStatus: BudgetWorkflowStatus = !approved
              ? 'Ditolak (Rejected)'
              : req.financeApproval.status === 'Approved'
              ? 'Menunggu Persetujuan CEO'
              : 'Ditinjau HR & Finance';

            return {
              ...req,
              hrApproval: updatedHR,
              status: newStatus,
              isEncumbered: approved ? req.isEncumbered : false,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      reviewByFinance: (id, reviewerName, approved, notes) => {
        set((state) => ({
          requisitions: state.requisitions.map((req) => {
            if (req.id !== id) return req;
            const updatedFinance = {
              ...req.financeApproval,
              name: reviewerName,
              status: approved ? ('Approved' as const) : ('Rejected' as const),
              timestamp: new Date().toISOString(),
              notes,
            };
            const newStatus: BudgetWorkflowStatus = !approved
              ? 'Ditolak (Rejected)'
              : req.hrApproval.status === 'Approved'
              ? 'Menunggu Persetujuan CEO'
              : 'Ditinjau HR & Finance';

            return {
              ...req,
              financeApproval: updatedFinance,
              status: newStatus,
              isEncumbered: approved ? req.isEncumbered : false,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      // MANDATORY APPROVAL BY CEO
      reviewByCEO: (id, ceoName, approved, notes) => {
        set((state) => ({
          requisitions: state.requisitions.map((req) => {
            if (req.id !== id) return req;
            const updatedCEO = {
              ...req.ceoApproval,
              name: ceoName,
              status: approved ? ('Approved' as const) : ('Rejected' as const),
              timestamp: new Date().toISOString(),
              notes,
            };

            return {
              ...req,
              ceoApproval: updatedCEO,
              status: approved ? 'Disetujui CEO (Approved)' : 'Ditolak (Rejected)',
              isEncumbered: approved ? req.isEncumbered : false,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      // Realisasi Pembayaran & Pencatatan Transaksi ke Buku Besar
      disburseRequisition: (id, disbursByName, bankId, proofUrl) => {
        const req = get().requisitions.find((r) => r.id === id);
        if (!req) return;

        // Potong anggaran divisi secara resmi di Finance Store
        const finance = useFinanceStore.getState();
        const deptBudget = finance.departmentBudgets.find(
          (b) =>
            b.department.toLowerCase().includes(req.department.toLowerCase()) ||
            req.department.toLowerCase().includes(b.department.toLowerCase())
        );

        if (deptBudget) {
          const newSpent = deptBudget.spentBudget + req.estimatedAmount;
          finance.updateDepartmentBudget(deptBudget.id, {
            spentBudget: newSpent,
          });
        }

        // Potong saldo rekening bank
        finance.adjustBankBalance(bankId, -req.estimatedAmount, `Realisasi Anggaran: ${req.title} (${req.requestNumber})`);

        // Tambahkan Jurnal Pengeluaran
        finance.addJournalEntry({
          description: `Beban Operasional Anggaran: ${req.title} (${req.department})`,
          reference: req.requestNumber,
          accountDebit: `Beban Divisi ${req.department}`,
          accountCredit: 'Kas / Bank Operasional',
          amount: req.estimatedAmount,
          category: 'Biaya Operasional',
          status: 'Posted',
          createdBy: disbursByName,
        });

        set((state) => ({
          requisitions: state.requisitions.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: 'Realisasi & Pembayaran (Disbursed)',
                  disbursedAt: new Date().toISOString(),
                  disbursedBy: disbursByName,
                  disbursementProofUrl: proofUrl,
                  bankAccountId: bankId,
                  updatedAt: new Date().toISOString(),
                }
              : r
          ),
        }));
      },

      cancelRequisition: (id, reason) => {
        set((state) => ({
          requisitions: state.requisitions.map((req) =>
            req.id === id
              ? {
                  ...req,
                  status: 'Ditolak (Rejected)',
                  isEncumbered: false,
                  updatedAt: new Date().toISOString(),
                  ceoApproval: {
                    ...req.ceoApproval,
                    status: 'Rejected',
                    notes: reason || 'Dibatalkan oleh pemohon',
                  },
                }
              : req
          ),
        }));
      },
    }),
    {
      name: 'ruang-kelana-budget-requisitions-clean',
    }
  )
);
