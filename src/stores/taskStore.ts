import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CompanyTask, TaskStatus, TaskPriority, TaskTargetType, TaskAttachment } from '../types/task';

const generateId = () => 'task-' + Math.random().toString(36).substring(2, 9);

interface TaskStore {
  tasks: CompanyTask[];
  
  // Actions
  createTask: (data: {
    title: string;
    description: string;
    priority: TaskPriority;
    targetType: TaskTargetType;
    targetDivision?: string;
    assignedToUserIds: string[];
    assignedToNames: string[];
    dueDate: string;
    points: number;
    attachments: TaskAttachment[];
    publishNow: boolean;
    createdByUserId: string;
    createdByName: string;
    createdByRole: string;
  }) => CompanyTask;

  updateTask: (taskId: string, updates: Partial<CompanyTask>) => void;
  deleteTask: (taskId: string) => void;
  publishTask: (taskId: string) => void;

  // Employee actions
  markTaskOpened: (taskId: string, userId: string) => void;
  startTask: (taskId: string, userId: string) => void;
  submitTask: (taskId: string, submission: {
    submittedBy: string;
    submittedByName: string;
    notes: string;
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentFileData?: string;
    attachmentFileType?: string;
    attachmentFileSize?: string;
  }) => void;

  // Review & Decision (CEO / HR)
  reviewDecision: (taskId: string, review: {
    reviewedBy: string;
    reviewedByName: string;
    score?: number;
    feedback: string;
    decision: 'Approve' | 'Revision' | 'Reject';
  }) => void;
}

const INITIAL_TASKS: CompanyTask[] = [
  {
    id: 'task-001',
    title: 'Pelatihan Keamanan Siber & Tata Kelola Data Perusahaan 2026',
    description: 'Seluruh karyawan wajib menyelesaikan modul kesadaran keamanan data, pencegahan phishing, dan kepatuhan NDA Kelana Corporate.',
    priority: 'High',
    status: 'Assigned',
    targetType: 'all',
    assignedToUserIds: ['all'],
    assignedToNames: ['Seluruh Karyawan Kelana'],
    createdByUserId: 'user-admin',
    createdByName: 'Admin Kantor Kelana',
    createdByRole: 'HR / Admin',
    createdAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    points: 100,
    attachments: [
      {
        id: 'att-1',
        name: 'Modul-SOP-Data-Security.pdf',
        type: 'file',
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
      },
      {
        id: 'att-2',
        name: 'Video Pembelajaran Cyber Awareness (YouTube)',
        type: 'link',
        url: 'https://www.youtube.com'
      }
    ],
    openedByUserIds: ['user-admin'],
  },
  {
    id: 'task-002',
    title: 'Laporan Audit Kesiapan Infrastruktur & Cloud Q4',
    description: 'Divisi Teknologi & IT diminta menyusun audit load testing server, keamanan database, dan cadangan pemulihan bencana (Disaster Recovery).',
    priority: 'Urgent',
    status: 'In Progress',
    targetType: 'division',
    targetDivision: 'Teknologi & IT',
    assignedToUserIds: ['user-andi'],
    assignedToNames: ['Andi Wirawan (Teknologi & IT)'],
    createdByUserId: 'user-ceo',
    createdByName: 'CEO Kelana Corporate',
    createdByRole: 'CEO',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    points: 100,
    attachments: [
      {
        id: 'att-3',
        name: 'Template Checklist Audit Server (GDocs)',
        type: 'link',
        url: 'https://docs.google.com'
      }
    ],
    openedByUserIds: ['user-andi'],
  },
  {
    id: 'task-003',
    title: 'Penyusunan Rencana Kampanye Marketing Digital November 2026',
    description: 'Kirimkan proposal konten media sosial, alokasi budget iklan Meta & Google, serta proyeksi konversi prospek leads.',
    priority: 'Medium',
    status: 'Submitted',
    targetType: 'division',
    targetDivision: 'Pemasaran & Bisnis',
    assignedToUserIds: ['user-mkt'],
    assignedToNames: ['Divisi Pemasaran & Bisnis'],
    createdByUserId: 'user-ceo',
    createdByName: 'CEO Kelana Corporate',
    createdByRole: 'CEO',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    points: 95,
    attachments: [],
    openedByUserIds: ['user-mkt'],
    submission: {
      submittedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      submittedBy: 'user-mkt',
      submittedByName: 'Rina (Marketing Lead)',
      notes: 'Berikut draf proposal strategi pemasaran kami. Target ROI 3.5x dengan fokus channel LinkedIn dan IG.',
      attachmentUrl: 'https://docs.google.com/presentation',
      attachmentName: 'Deck-Marketing-Strategy-Nov2026.pdf',
    }
  }
];

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: INITIAL_TASKS,

      createTask: (data) => {
        const newTask: CompanyTask = {
          id: generateId(),
          title: data.title,
          description: data.description,
          priority: data.priority,
          status: data.publishNow ? 'Assigned' : 'Draft',
          targetType: data.targetType,
          targetDivision: data.targetDivision,
          assignedToUserIds: data.assignedToUserIds,
          assignedToNames: data.assignedToNames,
          dueDate: data.dueDate,
          points: data.points || 100,
          attachments: data.attachments || [],
          createdByUserId: data.createdByUserId,
          createdByName: data.createdByName,
          createdByRole: data.createdByRole,
          createdAt: new Date().toISOString(),
          publishedAt: data.publishNow ? new Date().toISOString() : undefined,
          openedByUserIds: [],
        };

        set((state) => ({
          tasks: [newTask, ...state.tasks],
        }));

        return newTask;
      },

      updateTask: (taskId, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
        }));
      },

      deleteTask: (taskId) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== taskId),
        }));
      },

      publishTask: (taskId) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: 'Assigned',
                  publishedAt: new Date().toISOString(),
                }
              : t
          ),
        }));
      },

      markTaskOpened: (taskId, userId) => {
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== taskId) return t;
            const opened = new Set(t.openedByUserIds || []);
            opened.add(userId);
            return {
              ...t,
              openedByUserIds: Array.from(opened),
            };
          }),
        }));
      },

      startTask: (taskId, userId) => {
        set((state) => ({
          tasks: state.tasks.map((t): CompanyTask => {
            if (t.id !== taskId) return t;
            const opened = new Set(t.openedByUserIds || []);
            opened.add(userId);
            return {
              ...t,
              status: 'In Progress',
              startedAt: t.startedAt || new Date().toISOString(),
              openedByUserIds: Array.from(opened),
            };
          }),
        }));
      },

      submitTask: (taskId, submission) => {
        set((state) => ({
          tasks: state.tasks.map((t): CompanyTask =>
            t.id === taskId
              ? {
                  ...t,
                  status: 'Submitted',
                  submission: {
                    ...submission,
                    submittedAt: new Date().toISOString(),
                  },
                }
              : t
          ),
        }));
      },

      reviewDecision: (taskId, review) => {
        set((state) => ({
          tasks: state.tasks.map((t): CompanyTask => {
            if (t.id !== taskId) return t;
            let newStatus: TaskStatus = 'Completed';
            if (review.decision === 'Revision') {
              newStatus = 'Revision Required';
            } else if (review.decision === 'Reject') {
              newStatus = 'Rejected';
            }

            return {
              ...t,
              status: newStatus,
              revisionNotes: review.decision !== 'Approve' ? review.feedback : undefined,
              // Jika ditolak, submission direset agar karyawan harus mengulang dari awal
              submission: review.decision === 'Reject' ? undefined : t.submission,
              review: {
                reviewedAt: new Date().toISOString(),
                reviewedBy: review.reviewedBy,
                reviewedByName: review.reviewedByName,
                score: review.score,
                feedback: review.feedback,
                decision: review.decision,
                certificateUrl: review.decision === 'Approve' ? 'CERT-KELANA-' + Math.floor(100000 + Math.random() * 900000) : undefined
              },
            };
          }),
        }));
      },
    }),
    {
      name: 'ruang-kelana-company-tasks',
    }
  )
);
