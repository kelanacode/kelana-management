// Types for Department Budget Requisition & Encumbrance Workflow
// All operational divisions can request budget usage.
// Required final approver: CEO (with review by HR and Finance).

export type BudgetRequestType =
  | 'Pengadaan Barang & Jasa (PR)'
  | 'Perjalanan Dinas & Transport'
  | 'Operasional & Konsumsi Tim'
  | 'Langganan Software & Cloud'
  | 'Pelatihan & Sertifikasi HR'
  | 'Pemasaran & Kampanye Iklan'
  | 'Lainnya';

export type BudgetWorkflowStatus =
  | 'Draft'
  | 'Diajukan (Pending Review)'
  | 'Ditinjau HR & Finance'
  | 'Menunggu Persetujuan CEO'
  | 'Disetujui CEO (Approved)'
  | 'Realisasi & Pembayaran (Disbursed)'
  | 'Ditolak (Rejected)';

export interface BudgetApprovalStep {
  role: 'HR' | 'Finance' | 'CEO';
  name: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  timestamp?: string;
  notes?: string;
}

export interface BudgetRequisition {
  id: string;
  requestNumber: string; // e.g. BR-TI-2026-001
  title: string;
  type: BudgetRequestType;
  department: string; // Divisi pemohon
  requesterId: string;
  requesterName: string;
  requesterPosition: string;
  
  // Cost breakdown
  estimatedAmount: number;
  description: string;
  vendorName?: string;
  purpose: string;
  attachmentUrl?: string;
  attachmentName?: string;

  // Phase 2: Budget Checking & Encumbrance
  isEncumbered: boolean; // Dana ditahan (locked) agar tidak dipakai keperluan lain
  departmentRemainingBefore: number;
  departmentRemainingAfter: number;

  // Phase 3: Approval Chain (Crucial: CEO is MANDATORY final approval)
  status: BudgetWorkflowStatus;
  hrApproval: BudgetApprovalStep;
  financeApproval: BudgetApprovalStep;
  ceoApproval: BudgetApprovalStep; // Wajib menyetujui agar status menjadi 'Disetujui CEO'
  
  // Phase 4: Disbursement
  disbursedAt?: string;
  disbursedBy?: string;
  disbursementProofUrl?: string;
  bankAccountId?: string;

  createdAt: string;
  updatedAt: string;
}
