// Types for Full Procure-to-Pay (P2P) Enterprise Workflow
// Alur 5 Langkah: [User] PR -> [Purchasing] PO & Vendor -> [Gudang/User] GR/BAST -> [Finance] 3-Way Matching -> [Finance] Pembayaran

export type P2PWorkflowStage =
  | 'PR Created' // Fase 1: Divisi Peminta
  | 'PR Approved' // Disetujui (Manajer/HR/Finance ATAU langsung Disetujui CEO bypass)
  | 'PO Issued' // Fase 2: Purchasing menerbitkan PO resmi
  | 'GR Received' // Fase 3: Gudang/User konfirmasi barang/langganan aktif (BAST)
  | '3-Way Matched' // Fase 4: Finance cocokkan PO + GR + Invoice
  | 'Paid & Completed' // Fase 5: Finance membayar & memotong rekening bank
  | 'Rejected';

export interface VendorQuote {
  id: string;
  vendorName: string;
  pricePerUnit: number;
  totalPrice: number;
  deliveryDays: number;
  paymentTerms: string; // misal "Net 30", "Cash on Delivery", "DP 50%"
  isRecommended?: boolean;
}

export interface P2PProcurementCase {
  id: string;
  caseNumber: string; // e.g. P2P-2026-081
  title: string;
  type: 'Barang Fisik & ATK' | 'Langganan Software & Cloud' | 'Jasa & Konsultan' | 'Perangkat Keras (Asset)';
  department: string;
  requesterName: string;
  requesterId: string;
  requesterNik?: string;
  requestCategory: 'Divisi' | 'Perorangan (Individu)';
  itemName: string;
  quantity: number;
  unit: string; // Unit, Bulan, Lisensi, Pcs
  estimatedUnitPrice: number;
  totalEstimatedPrice: number;
  description: string;
  justification: string;
  urgency: 'Biasa' | 'Penting' | 'Mendesak / Urgent';
  attachmentUrl?: string;
  attachmentFileName?: string;
  
  // Tahap 1: Approval PR
  // Diteruskan ke HR, Finance, dan CEO (Keputusan Tertinggi & Mutlak pada CEO)
  managerApproval?: { approved: boolean; by?: string; timestamp?: string; notes?: string };
  hrApproval?: { approved: boolean; by?: string; timestamp?: string; notes?: string };
  financeApproval?: { approved: boolean; by?: string; timestamp?: string; notes?: string };
  ceoApproval?: { approved: boolean; by?: string; timestamp?: string; notes?: string }; // Keputusan Tertinggi
  stage: P2PWorkflowStage;

  // Tahap 2: Purchasing / Procurement
  poNumber?: string;
  selectedVendor?: string;
  selectedVendorContact?: string;
  agreedPrice?: number;
  quotes?: VendorQuote[];
  poIssuedAt?: string;
  poIssuedBy?: string;
  paymentTerms?: string;

  // Tahap 3: Gudang / Receiving / BAST
  grNumber?: string;
  deliveryNoteNumber?: string; // Surat Jalan
  receivedAt?: string;
  receivedBy?: string;
  receivedQuantity?: number;
  qcStatus?: 'Passed (Sesuai)' | 'Partial' | 'Rejected';
  bastNotes?: string;
  proofImageUrl?: string; // Bukti gambar foto fisik barang / screenshot serah terima
  proofImageFileName?: string;

  // Tahap 4: Finance 3-Way Matching
  vendorInvoiceNumber?: string;
  taxInvoiceNumber?: string;
  invoiceAmount?: number;
  threeWayMatched?: boolean;
  matchedBy?: string;
  matchedAt?: string;

  // Tahap 5: Pembayaran & Bank
  paidAt?: string;
  paidBy?: string;
  paidAmount?: number;
  bankAccountId?: string;
  paymentReference?: string;

  createdAt: string;
  updatedAt: string;
}
