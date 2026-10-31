// Spesifikasi tabel data aplikasi Ruang Kelana.
// Sumber tunggal untuk migrasi SQL dan peta kolom di src/lib/dbSchema.ts.
// Jalankan `node supabase/generate.mjs` setelah mengubah file ini.
//
// Format field: 'namaCamelCase:tipe'. Tipe: s=text (default), n=numeric,
// b=boolean, j=jsonb, ts=timestamptz. Kolom `id` (text, primary key) otomatis.

export const TABLES = [
  // ---------- Keuangan ----------
  {
    table: 'bank_accounts', store: 'finance', key: 'bankAccounts',
    fields: ['bankName', 'accountNumber', 'accountHolder', 'balance:n', 'currency'],
  },
  {
    table: 'journal_entries', store: 'finance', key: 'journalEntries',
    fields: ['entryNumber', 'date', 'description', 'reference', 'accountDebit', 'accountCredit', 'amount:n', 'category', 'status', 'createdBy'],
  },
  {
    table: 'purchase_requisitions', store: 'finance', key: 'purchaseRequisitions',
    fields: ['prNumber', 'requesterName', 'department', 'itemName', 'category', 'quantity:n', 'unit', 'estimatedPrice:n', 'totalAmount:n', 'reason', 'status', 'date', 'approvedBy', 'approvalDate'],
  },
  {
    table: 'purchase_orders', store: 'finance', key: 'purchaseOrders',
    fields: ['poNumber', 'prNumber', 'vendorName', 'vendorContact', 'itemName', 'quantity:n', 'unitPrice:n', 'totalAmount:n', 'status', 'orderDate', 'expectedDelivery', 'goodsReceiptStatus', 'paymentStatus'],
  },
  {
    table: 'sales_orders', store: 'finance', key: 'salesOrders',
    fields: ['soNumber', 'customerName', 'customerCompany', 'itemName', 'quantity:n', 'unitPrice:n', 'totalAmount:n', 'status', 'orderDate', 'invoiceNumber', 'invoiceDate', 'paymentStatus', 'paymentMethod'],
  },
  {
    table: 'inventory_items', store: 'finance', key: 'inventoryItems',
    fields: ['sku', 'name', 'category', 'stock:n', 'minStock:n', 'unit', 'valuationPerUnit:n', 'totalValuation:n', 'warehouseLocation', 'lastUpdated'],
  },
  {
    table: 'fixed_assets', store: 'finance', key: 'fixedAssets',
    fields: ['assetCode', 'name', 'category', 'location', 'purchaseDate', 'acquisitionCost:n', 'usefulLifeYears:n', 'accumulatedDepreciation:n', 'bookValue:n', 'condition', 'assignedTo'],
  },
  {
    table: 'payroll_records', store: 'finance', key: 'payrollRecords',
    fields: ['employeeNik', 'employeeName', 'division', 'position', 'period', 'basicSalary:n', 'allowances:n', 'attendanceDeductions:n', 'taxPPH21:n', 'netSalary:n', 'paymentStatus', 'disbursementDate', 'paymentProofUrl', 'slipSentStatus', 'slipSentAt', 'notes'],
  },
  {
    table: 'department_budgets', store: 'finance', key: 'departmentBudgets',
    fields: ['department', 'year:n', 'allocatedBudget:n', 'spentBudget:n', 'remainingBudget:n', 'variancePercentage:n', 'status'],
  },
  {
    table: 'expense_claims', store: 'finance', key: 'expenseClaims',
    fields: ['claimNumber', 'claimantName', 'department', 'description', 'category', 'amount:n', 'receiptImage', 'status', 'submissionDate', 'approvedBy'],
  },
  {
    table: 'budget_requisitions', store: 'budgetRequisition', key: 'requisitions',
    fields: ['requestNumber', 'title', 'type', 'department', 'requesterId', 'requesterName', 'requesterPosition', 'estimatedAmount:n', 'description', 'vendorName', 'purpose', 'attachmentUrl', 'attachmentName', 'isEncumbered:b', 'departmentRemainingBefore:n', 'departmentRemainingAfter:n', 'status', 'hrApproval:j', 'financeApproval:j', 'ceoApproval:j', 'disbursedAt', 'disbursedBy', 'disbursementProofUrl', 'bankAccountId', 'createdAt:ts', 'updatedAt:ts'],
  },
  {
    table: 'p2p_cases', store: 'procureToPay', key: 'cases',
    fields: ['caseNumber', 'title', 'type', 'department', 'requesterName', 'requesterId', 'requesterNik', 'requestCategory', 'itemName', 'quantity:n', 'unit', 'estimatedUnitPrice:n', 'totalEstimatedPrice:n', 'description', 'justification', 'urgency', 'attachmentUrl', 'attachmentFileName', 'managerApproval:j', 'hrApproval:j', 'financeApproval:j', 'ceoApproval:j', 'stage', 'poNumber', 'selectedVendor', 'selectedVendorContact', 'agreedPrice:n', 'quotes:j', 'poIssuedAt', 'poIssuedBy', 'paymentTerms', 'grNumber', 'deliveryNoteNumber', 'receivedAt', 'receivedBy', 'receivedQuantity:n', 'qcStatus', 'bastNotes', 'proofImageUrl', 'proofImageFileName', 'vendorInvoiceNumber', 'taxInvoiceNumber', 'invoiceAmount:n', 'threeWayMatched:b', 'matchedBy', 'matchedAt', 'paidAt', 'paidBy', 'paidAmount:n', 'bankAccountId', 'paymentReference', 'createdAt:ts', 'updatedAt:ts'],
  },

  // ---------- Tugas, Absensi, Kalender ----------
  {
    table: 'company_tasks', store: 'task', key: 'tasks',
    fields: ['title', 'description', 'priority', 'status', 'targetType', 'targetDivision', 'assignedToUserIds:j', 'assignedToNames:j', 'createdByUserId', 'createdByName', 'createdByRole', 'createdAt:ts', 'publishedAt', 'dueDate', 'points:n', 'attachments:j', 'startedAt', 'submission:j', 'review:j', 'revisionNotes', 'openedByUserIds:j'],
  },
  {
    table: 'attendance_records', store: 'attendance', key: 'records',
    fields: ['userId', 'userName', 'userNik', 'userDivision', 'date', 'clockInTime', 'clockInTimestamp', 'clockInLocation:j', 'clockInSelfiePhoto', 'clockInNotes', 'clockOutTime', 'clockOutTimestamp', 'clockOutLocation:j', 'clockOutSelfiePhoto', 'clockOutNotes', 'workType', 'status', 'hasAnomaly:b', 'anomalyReason', 'createdAt:ts', 'updatedAt:ts'],
  },
  {
    table: 'attendance_corrections', store: 'attendance', key: 'corrections',
    fields: ['userId', 'userName', 'userNik', 'userDivision', 'date', 'type', 'proposedClockIn', 'proposedClockOut', 'reason', 'attachmentUrl', 'status', 'reviewedBy', 'reviewNotes', 'reviewedAt', 'createdAt:ts'],
  },
  {
    table: 'event_reminders', store: 'reminder', key: 'reminders',
    fields: ['title', 'date', 'isAllDay:b', 'startTime', 'endTime', 'location', 'reminderMinutes:n', 'notes', 'attachmentUrl', 'division', 'dismissed:b', 'snoozedUntil', 'createdAt:ts', 'updatedAt:ts'],
  },

  // ---------- Board / Kanban ----------
  {
    table: 'boards', store: 'board', key: 'boards',
    fields: ['title', 'description', 'emoji', 'createdAt:ts', 'updatedAt:ts'],
  },
  {
    table: 'board_columns', store: 'board', key: 'columns',
    fields: ['title', 'boardId', 'color', 'order:n'],
  },
  {
    table: 'board_cards', store: 'board', key: 'cards',
    fields: ['title', 'description', 'columnId', 'boardId', 'assignees:j', 'labels:j', 'deadline', 'priority', 'comments:j', 'createdAt:ts', 'updatedAt:ts', 'order:n'],
  },

  // ---------- Catatan, Wiki, Database, Drive ----------
  {
    table: 'notes', store: 'notes', key: 'notes',
    fields: ['title', 'content', 'tags:j', 'comments:j', 'paperSize', 'createdAt:ts', 'updatedAt:ts', 'emoji', 'authorId', 'authorName', 'authorDivision', 'shareScope', 'targetDivisions:j', 'targetUserIds:j', 'targetUserNames:j', 'readRecords:j', 'color', 'isPinned:b'],
  },
  {
    table: 'wiki_pages', store: 'wiki', key: 'pages',
    fields: ['title', 'content', 'emoji', 'parentId', 'children:j', 'paperSize', 'comments:j', 'createdAt:ts', 'updatedAt:ts'],
  },
  {
    // Tabel buatan pengguna: kolom & baris dinamis, jadi disimpan sebagai jsonb.
    table: 'workspace_tables', store: 'database', key: 'tables',
    fields: ['name', 'emoji', 'category', 'description', 'fields:j', 'rows:j', 'spreadsheetUrl', 'gdocsUrl', 'lastSyncedAt', 'createdAt:ts'],
  },
  {
    table: 'workspace_documents', store: 'database', key: 'documents',
    fields: ['title', 'emoji', 'category', 'description', 'content', 'author', 'department', 'version', 'status', 'paperSize', 'comments:j', 'gdocsUrl', 'lastSyncedAt', 'createdAt:ts', 'updatedAt:ts'],
  },
  {
    table: 'drive_items', store: 'googleDrive', key: 'items',
    fields: ['name', 'type', 'mimeType', 'size', 'updatedAt', 'url', 'author', 'division', 'tags:j', 'isStarred:b'],
  },

  // ---------- Tim ----------
  // Chat ada di migrasi tersendiri (chat_rooms, chat_room_members, chat_room_messages).
  {
    table: 'activities', store: 'app', key: 'activities',
    fields: ['memberId', 'action', 'target', 'timestamp:ts'],
  },
];

// Profil karyawan (terhubung ke auth.users). Password tidak disimpan di sini.
export const PROFILE_FIELDS = [
  'name', 'email', 'username', 'nik', 'division', 'position', 'role', 'status', 'avatar', 'color',
  'twoFactorEnabled:b', 'lastLogin:ts', 'createdAt:ts', 'invitedBy',
  'photoUrl', 'phone', 'altEmail', 'emergencyContactName', 'emergencyContactRelation', 'emergencyContactPhone',
  'managerName', 'bio', 'bankName', 'bankAccountNumber', 'bankAccountHolder',
  'digitalSignature', 'signatureDate', 'workStatus', 'statusCustomMessage',
  'googleCalendarEmail', 'calendarSyncGoogle:b', 'googleDriveConnected:b', 'googleDriveEmail', 'googleDriveFolderUrl',
];
