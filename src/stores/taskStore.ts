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

const INITIAL_TASKS: CompanyTask[] = [];

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
      name: 'ruang-kelana-company-tasks-clean',
    }
  )
);
