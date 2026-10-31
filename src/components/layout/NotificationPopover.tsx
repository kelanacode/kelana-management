import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckSquare, FileText, DollarSign, Clock,
  CheckCircle2, AlertTriangle, ArrowRight, X, ExternalLink, MessageSquare
} from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import { useNotesStore, checkNoteAccess, isNoteReadByUser } from '../../stores/notesStore';
import { useChatStore, lastReadOf } from '../../stores/chatStore';
import { checkTaskAccess } from '../../utils/taskAccess';
import { useBudgetRequisitionStore } from '../../stores/budgetRequisitionStore';
import { useAuthStore } from '../../stores/authStore';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const currentUser = session?.user;
  const currentUserId = currentUser?.id;

  const { tasks } = useTaskStore();
  const { notes, markNoteAsRead, selectNote } = useNotesStore();
  const { requisitions } = useBudgetRequisitionStore();
  const chatState = useChatStore();
  const { users } = useAuthStore();

  if (!isOpen) return null;

  // Cek otorisasi Boss / HR / Admin
  const isBossOrHR =
    currentUser?.role === 'CEO' ||
    currentUser?.role === 'Admin' ||
    currentUser?.role === 'HR' ||
    (currentUser?.position || '').toLowerCase().includes('ceo') ||
    (currentUser?.position || '').toLowerCase().includes('hr') ||
    (currentUser?.position || '').toLowerCase().includes('human resource') ||
    (currentUser?.position || '').toLowerCase().includes('direktur');

  // Daftar notifikasi terkini:
  const notifications: {
    id: string;
    title: string;
    description: string;
    time: string;
    type: 'task' | 'task_submission' | 'note' | 'budget' | 'chat';
    isUnread: boolean;
    onClick: () => void;
  }[] = [];

  // 1. Notifikasi Catatan Baru (Notes) yang belum dibaca
  notes
    .filter((n) => checkNoteAccess(n, currentUser))
    .forEach((n) => {
      const isRead = isNoteReadByUser(n, currentUserId);
      if (!isRead) {
        notifications.push({
          id: 'note-notif-' + n.id,
          title: 'Catatan Baru: ' + n.title,
          description: `Dari ${n.authorName || 'Admin'} • Belum dibaca`,
          time: n.updatedAt,
          type: 'note',
          isUnread: true,
          onClick: () => {
            if (currentUserId) markNoteAsRead(n.id, currentUserId);
            selectNote(n.id);
            navigate('/notes');
            onClose();
          },
        });
      }
    });

  // 2. Notifikasi Taks Baru (HANYA untuk akun yang ditugaskan)
  tasks.forEach((t) => {
    if (checkTaskAccess(t, currentUser) && t.status !== 'Completed') {
      const isOpened = t.openedByUserIds?.includes(currentUserId || '');
      notifications.push({
        id: 'task-notif-' + t.id,
        title: '📋 Taks Baru: ' + t.title,
        description: `Tenggat: ${format(parseISO(t.dueDate), 'dd MMM yyyy, HH:mm')} WIB • Status: ${t.status}`,
        time: t.createdAt,
        type: 'task',
        isUnread: !isOpened,
        onClick: () => {
          navigate('/tasks');
          onClose();
        },
      });
    }
  });

  // 3. Notifikasi Yang Sudah Mengerjakan Taks (Khusus Untuk CEO & HR)
  if (isBossOrHR) {
    tasks
      .filter((t) => Boolean(t.submission))
      .forEach((t) => {
        const sub = t.submission!;
        const isNeedsReview = t.status === 'Submitted' || t.status === 'Under Review';
        notifications.push({
          id: 'task-sub-' + t.id,
          title: `📥 Pengumpulan Taks: ${t.title}`,
          description: `Dikerjakan oleh ${sub.submittedByName} • Menunggu penilaian/review`,
          time: sub.submittedAt,
          type: 'task_submission',
          isUnread: isNeedsReview,
          onClick: () => {
            navigate('/tasks');
            onClose();
          },
        });
      });
  }

  // 3. Notifikasi Pengajuan Anggaran (Untuk Bos/Finance atau Pembuat PR)
  requisitions.slice(0, 3).forEach((r) => {
    notifications.push({
      id: 'req-notif-' + r.id,
      title: `Pengajuan PR #${r.requestNumber}`,
      description: `${r.title} • Rp ${r.estimatedAmount.toLocaleString('id-ID')} (${r.status})`,
      time: r.createdAt,
      type: 'budget',
      isUnread: r.status === 'Diajukan (Pending Review)' || r.status === 'Menunggu Persetujuan CEO',
      onClick: () => {
        navigate('/finance');
        onClose();
      },
    });
  });

  // 4. Notifikasi Pesan Chat Masuk (channel & pesan langsung yang bisa diakses user ini)
  chatState.messages
    .filter((m) => m.senderId !== currentUserId && !m.deletedAt)
    .slice(-5)
    .forEach((m) => {
      const room = chatState.rooms.find((r) => r.id === m.roomId);
      const senderName = users.find((u) => u.id === m.senderId)?.name ?? 'Rekan kerja';
      const isUnread =
        new Date(m.createdAt).getTime() > new Date(lastReadOf(chatState.members, m.roomId, chatState.myId)).getTime();
      notifications.push({
        id: 'chat-notif-' + m.id,
        title: room?.type === 'channel' ? `💬 #${room.name}: ${senderName}` : `💬 Pesan Pribadi: ${senderName}`,
        description: m.text ?? (m.fileName ? `📎 ${m.fileName}` : ''),
        time: m.createdAt,
        type: 'chat',
        isUnread,
        onClick: () => {
          chatState.open(m.roomId);
          onClose();
        },
      });
    });

  // Urutkan berdasarkan waktu terbaru
  notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end p-4 md:p-6 bg-black/20 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[85vh] mt-12 animate-in fade-in slide-in-from-top-2 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center">
              <Bell size={16} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                Pemberitahuan
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-600 text-white">
                    {unreadCount} Baru
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-gray-400">Pembaruan sistem, tugas, &amp; dokumen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={16} />
          </button>
        </div>

        {/* List Notifikasi */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/60 p-2">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400 space-y-2">
              <CheckCircle2 size={32} className="mx-auto text-emerald-500 opacity-80" />
              <p className="font-medium text-gray-700 dark:text-gray-300">Tidak ada notifikasi baru</p>
              <p className="text-[11px]">Semua tugas, catatan, dan pengajuan sudah Anda tangani.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={n.onClick}
                className={`p-3 rounded-xl cursor-pointer transition-colors flex items-start gap-3 ${
                  n.isUnread
                    ? 'bg-primary-50/70 dark:bg-primary-950/30 hover:bg-primary-100/60'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="mt-0.5">
                  {n.type === 'note' && (
                    <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950/60 flex items-center justify-center">
                      <FileText size={14} />
                    </div>
                  )}
                  {n.type === 'task' && (
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 flex items-center justify-center">
                      <CheckSquare size={14} />
                    </div>
                  )}
                  {n.type === 'task_submission' && (
                    <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950/60 flex items-center justify-center">
                      <CheckCircle2 size={14} />
                    </div>
                  )}
                  {n.type === 'chat' && (
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/60 flex items-center justify-center">
                      <MessageSquare size={14} />
                    </div>
                  )}
                  {n.type === 'budget' && (
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 flex items-center justify-center">
                      <DollarSign size={14} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-xs font-semibold truncate ${n.isUnread ? 'text-primary-900 dark:text-primary-100' : 'text-gray-800 dark:text-gray-200'}`}>
                      {n.title}
                    </p>
                    {n.isUnread && (
                      <span className="w-2 h-2 rounded-full bg-primary-600 flex-shrink-0 animate-pulse"></span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{n.description}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {format(parseISO(n.time), 'dd MMM, HH:mm', { locale: idLocale })} WIB
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-[11px]">
          <span className="text-gray-400">{notifications.length} notifikasi tercatat</span>
          <button
            onClick={() => {
              navigate('/notes');
              onClose();
            }}
            className="text-primary-600 hover:text-primary-700 font-semibold cursor-pointer flex items-center gap-1"
          >
            Buka Notes <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};
