// Types for Assignment & Task Lifecycle System
// Roles with creation privilege: CEO & HR / Admin
// All roles can execute & complete tasks assigned to them

export type TaskStatus =
  | 'Draft'
  | 'Assigned'
  | 'In Progress'
  | 'Submitted'
  | 'Under Review'
  | 'Completed'
  | 'Revision Required'
  | 'Rejected';

export type TaskTargetType = 'individual' | 'division' | 'all';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface TaskAttachment {
  id: string;
  name: string;
  type: 'link' | 'file';
  url: string;
  fileData?: string;
  fileSize?: string;
}

export interface TaskSubmission {
  submittedAt: string;
  submittedBy: string;
  submittedByName: string;
  notes: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentFileData?: string; // Base64 data file or blob preview
  attachmentFileType?: string;
  attachmentFileSize?: string;
}

export interface TaskReview {
  reviewedAt: string;
  reviewedBy: string;
  reviewedByName: string;
  score?: number; // Opsional
  feedback: string;
  decision: 'Approve' | 'Revision' | 'Reject';
  certificateUrl?: string;
}

export interface CompanyTask {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  
  // Target Assignment
  targetType: TaskTargetType;
  targetDivision?: string; // e.g. "Teknologi & IT", "HR & GA", etc.
  assignedToUserIds: string[]; // User IDs targeted
  assignedToNames: string[];
  
  // Creators & metadata
  createdByUserId: string;
  createdByName: string;
  createdByRole: string; // "CEO" or "HR" / "Admin"
  createdAt: string;
  publishedAt?: string;
  
  // Specifications
  dueDate: string; // ISO string
  points: number; // Bobot nilai (e.g. 100)
  attachments: TaskAttachment[];
  
  // Progress & Review
  startedAt?: string;
  submission?: TaskSubmission;
  review?: TaskReview;
  revisionNotes?: string;
  
  // Tracking
  openedByUserIds: string[];
}
