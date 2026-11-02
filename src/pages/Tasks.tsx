import { DIVISIONS } from '../constants/divisions';
import React, { useState } from 'react';
import {
  CheckSquare, Plus, Filter, Search, Calendar, Clock,
  AlertCircle, CheckCircle2, RotateCcw, Send, FileText,
  ExternalLink, Eye, Award, MessageSquare, ChevronRight,
  TrendingUp, Users, ShieldAlert, Sparkles, Building, Paperclip,
  Check, X, AlertTriangle, ArrowRight, UserCheck, Edit3, Trash2,
  Upload, Download, File, Image as ImageIcon, Link as LinkIcon
} from 'lucide-react';
import { useTaskStore } from '../stores/taskStore';
import { useAuthStore } from '../stores/authStore';
import { CompanyTask, TaskStatus, TaskPriority, TaskTargetType, TaskAttachment } from '../types/task';
import { checkTaskAccess, canWorkOnTask } from '../utils/taskAccess';
import { format, parseISO, isPast, differenceInDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export const TasksPage: React.FC = () => {
  const { session, users } = useAuthStore();
  const {
    tasks,
    createTask,
    updateTask,
    deleteTask,
    publishTask,
    startTask,
    submitTask,
    reviewDecision,
    markTaskOpened,
  } = useTaskStore();

  const currentUser = session?.user;
  const currentRole = currentUser?.role;
  const currentPos = (currentUser?.position || '').toLowerCase();

  // Role Checker: Only CEO and HR (or Admin) can CREATE and ASSIGN tasks
  const canAssignTask =
    currentRole === 'CEO' ||
    currentRole === 'HR' ||
    currentRole === 'Admin' ||
    currentPos.includes('ceo') ||
    currentPos.includes('chief') ||
    currentPos.includes('hr') ||
    currentPos.includes('human resource');

  // Tabs for view:
  // For CEO/HR: 'all', 'create', 'review_pending', 'completed_archive', 'analytics'
  // For Employee: 'my_tasks' (tugas aktif), 'completed_archive' (tugas selesai)
  const [activeTab, setActiveTab] = useState<'my_tasks' | 'all_tasks' | 'create' | 'review' | 'completed_archive' | 'analytics'>(
    canAssignTask ? 'all_tasks' : 'my_tasks'
  );

  const [selectedTask, setSelectedTask] = useState<CompanyTask | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state for creating task (Langkah 1)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [targetType, setTargetType] = useState<TaskTargetType>('all');
  const [targetDivision, setTargetDivision] = useState('Teknologi & IT');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [points, setPoints] = useState(100);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [newAttName, setNewAttName] = useState('');
  const [newAttUrl, setNewAttUrl] = useState('');
  const [newAttType, setNewAttType] = useState<'link' | 'file'>('link');
  const [newAttFileData, setNewAttFileData] = useState<string>('');
  const [newAttFileSize, setNewAttFileSize] = useState<string>('');

  // Submission form state (Langkah 2)
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionName, setSubmissionName] = useState('');
  const [submissionFileData, setSubmissionFileData] = useState<string>('');
  const [submissionFileType, setSubmissionFileType] = useState<string>('');
  const [submissionFileSize, setSubmissionFileSize] = useState<string>('');

  // Editing state for CEO / HR
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Review modal state (Langkah 3)
  const [reviewTask, setReviewTask] = useState<CompanyTask | null>(null);
  const [reviewScore, setReviewScore] = useState<number>(85);
  const [reviewFeedback, setReviewFeedback] = useState<string>('');

  // Filter tasks for Employee vs Manager/CEO
  const userDivision = currentUser?.division || '';
  const userId = currentUser?.id || '';

  // Saring tugas secara ketat sesuai akun & hak akses masing-masing
  // Jika tidak diberikan tugas oleh HR / CEO, maka tugas TIDAK MUNCUL sama sekali.
  // Contoh: Jika tugas ditujukan ke Marketing, maka staf divisi IT tidak dapat melihatnya.
  const accessibleTasks = tasks.filter((t) => checkTaskAccess(t, currentUser));

  // Pemisahan Taks Aktif vs Taks yang Sudah Diselesaikan:
  // "Jika sudah selesai mengerjakan maka akan hilang dari daftar taks yang harus dikerjakan,
  // dan akan tersimpan di daftar taks yang sudah diselesaikan."
  const myPendingTasks = accessibleTasks.filter((t) => t.status !== 'Completed');
  const myCompletedTasks = accessibleTasks.filter((t) => t.status === 'Completed');

  const baseTasksList = () => {
    if (activeTab === 'completed_archive') {
      return canAssignTask ? tasks.filter((t) => t.status === 'Completed') : myCompletedTasks;
    }
    if (activeTab === 'my_tasks') {
      return myPendingTasks;
    }
    if (activeTab === 'all_tasks') {
      // Taks yang sudah selesai pindah ke tab Taks Selesai
      return tasks.filter((t) => t.status !== 'Completed');
    }
    return accessibleTasks;
  };

  const displayedTasks = baseTasksList().filter((t) => {
    if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.assignedToNames.some((n) => n.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Pending reviews
  const pendingReviews = tasks.filter((t) => t.status === 'Submitted' || t.status === 'Under Review');

  // Analytics Calculation
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'Completed').length;
  const overdueTasks = tasks.filter((t) => {
    return isPast(parseISO(t.dueDate)) && t.status !== 'Completed';
  }).length;
  const scoredTasks = tasks.filter((t) => t.review?.score !== undefined);
  const avgScore = scoredTasks.length
    ? Math.round(scoredTasks.reduce((acc, curr) => acc + (curr.review?.score || 0), 0) / scoredTasks.length)
    : 0;

  // Handler Create Task
  const handleCreateSubmit = (e: React.FormEvent, publishNow: boolean) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) {
      alert('Mohon isi judul tugas dan tenggat waktu.');
      return;
    }

    let targetNames: string[] = [];
    let targetIds: string[] = [];

    if (targetType === 'all') {
      targetNames = ['Seluruh Karyawan Kelana'];
      targetIds = ['all'];
    } else if (targetType === 'division') {
      targetNames = [`Divisi ${targetDivision}`];
      targetIds = [targetDivision];
    } else {
      const u = users.find((x) => x.id === selectedUserId);
      targetNames = [u ? `${u.name} (${u.division})` : 'Karyawan Terpilih'];
      targetIds = [selectedUserId];
    }

    if (editingTaskId) {
      updateTask(editingTaskId, {
        title,
        description,
        priority,
        targetType,
        targetDivision: targetType === 'division' ? targetDivision : undefined,
        assignedToUserIds: targetIds,
        assignedToNames: targetNames,
        dueDate,
        points,
        attachments,
        ...(publishNow ? { status: 'Assigned', publishedAt: new Date().toISOString() } : {}),
      });
      alert('Taks berhasil diperbarui!');
      setEditingTaskId(null);
    } else {
      createTask({
        title,
        description,
        priority,
        targetType,
        targetDivision: targetType === 'division' ? targetDivision : undefined,
        assignedToUserIds: targetIds,
        assignedToNames: targetNames,
        dueDate,
        points,
        attachments,
        publishNow,
        createdByUserId: userId,
        createdByName: currentUser?.name || 'Pimpinan',
        createdByRole: currentRole || 'Pimpinan',
      });
    }

    // Reset Form
    setTitle('');
    setDescription('');
    setDueDate('');
    setAttachments([]);
    setEditingTaskId(null);
    setActiveTab(canAssignTask ? 'all_tasks' : 'my_tasks');
  };

  const handleStartEditTask = (task: CompanyTask) => {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description);
    setPriority(task.priority);
    setTargetType(task.targetType);
    setTargetDivision(task.targetDivision || 'Teknologi & IT');
    setSelectedUserId(task.assignedToUserIds[0] || '');
    setDueDate(task.dueDate.slice(0, 16));
    setPoints(task.points);
    setAttachments(task.attachments || []);
    setActiveTab('create');
  };

  const handleDeleteTask = (taskId: string, taskTitle: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus taks "${taskTitle}"? Tindakan ini tidak dapat dibatalkan.`)) {
      deleteTask(taskId);
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('Ukuran file maksimal 15MB!');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSubmissionFileData(base64);
      setSubmissionFileType(file.type);
      setSubmissionFileSize((file.size / 1024).toFixed(1) + ' KB');
      if (!submissionName) {
        setSubmissionName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTaskAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('Ukuran file lampiran maksimal 15MB!');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setNewAttFileData(base64);
      setNewAttFileSize((file.size / 1024).toFixed(1) + ' KB');
      if (!newAttName.trim()) {
        setNewAttName(file.name);
      }
      if (!newAttUrl.trim()) {
        setNewAttUrl(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddAttachment = () => {
    if (newAttType === 'link') {
      if (!newAttUrl.trim()) {
        alert('Mohon masukkan tautan web / link materi!');
        return;
      }
      setAttachments([
        ...attachments,
        {
          id: 'att-' + Date.now(),
          name: newAttName.trim() || newAttUrl.trim(),
          url: newAttUrl.trim(),
          type: 'link',
        },
      ]);
    } else {
      if (!newAttFileData) {
        alert('Mohon pilih/unggah file dokumen terlebih dahulu!');
        return;
      }
      setAttachments([
        ...attachments,
        {
          id: 'att-' + Date.now(),
          name: newAttName.trim() || 'File Dokumen',
          url: 'File Terlampir',
          type: 'file',
          fileData: newAttFileData,
          fileSize: newAttFileSize,
        },
      ]);
    }

    setNewAttName('');
    setNewAttUrl('');
    setNewAttFileData('');
    setNewAttFileSize('');
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'Draft':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Draf</span>;
      case 'Assigned':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">Ditugaskan</span>;
      case 'In Progress':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">Sedang Dikerjakan</span>;
      case 'Submitted':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">Telah Dikirim</span>;
      case 'Under Review':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">Ditinjau Pimpinan</span>;
      case 'Completed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">Disetujui &amp; Selesai</span>;
      case 'Revision Required':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">Revisi</span>;
      case 'Rejected':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">Ditolak (Ulangi Awal)</span>;
      default:
        return null;
    }
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'Urgent':
        return <span className="text-[11px] font-bold text-red-600 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded border border-red-200 dark:border-red-800">URGENT</span>;
      case 'High':
        return <span className="text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">TINGGI</span>;
      case 'Medium':
        return <span className="text-[11px] font-medium text-blue-600 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">SEDANG</span>;
      case 'Low':
        return <span className="text-[11px] font-medium text-gray-600 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded">RENDAH</span>;
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare size={13} />
                Manajemen Taks Kelana Corporate
              </span>
              {canAssignTask && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-amber-950 text-xs font-bold flex items-center gap-1">
                  <Award size={13} /> Hak Kontrol Penuh CEO &amp; HR
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Taks &amp; Penugasan Karyawan
            </h1>
            <p className="text-primary-100 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              {canAssignTask
                ? 'Sebagai CEO / HR, Anda memiliki wewenang penuh untuk menambah, mengedit, mengurangi/menghapus, serta mereview pengumpulan taks seluruh divisi.'
                : 'Pantau daftar taks, pelajari instruksi, dan kumpulkan hasil taks Anda tepat waktu.'}
            </p>
          </div>

          {canAssignTask && (
            <button
              onClick={() => {
                setEditingTaskId(null);
                setTitle('');
                setDescription('');
                setDueDate('');
                setAttachments([]);
                setActiveTab('create');
              }}
              className="bg-white text-primary-700 hover:bg-primary-50 px-5 py-3 rounded-2xl font-bold text-sm shadow-lg flex items-center gap-2 self-start md:self-auto transition-all transform hover:scale-105 cursor-pointer"
            >
              <Plus size={18} />
              + Buat Taks Baru
            </button>
          )}
        </div>
      </div>

      {/* Analytics Mini Cards (Langkah 4: Monitoring) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Tugas Aktif</p>
            <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1">{totalTasks}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
            <FileText size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Menunggu Review</p>
            <p className="text-xl sm:text-2xl font-black text-amber-600 mt-1">{pendingReviews.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Telah Lulus / Selesai</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">{completedTasks}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Melewati Deadline</p>
            <p className="text-xl sm:text-2xl font-black text-red-600 mt-1">{overdueTasks}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-1 flex items-center gap-1 overflow-x-auto text-xs font-semibold">
        {canAssignTask ? (
          <>
            <button
              onClick={() => setActiveTab('all_tasks')}
              className={`py-2 px-4 rounded-xl transition-all cursor-pointer ${
                activeTab === 'all_tasks'
                  ? 'bg-primary-600 text-white shadow-sm font-bold'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
              }`}
            >
              Semua Taks ({tasks.filter((t) => t.status !== 'Completed').length})
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`py-2 px-4 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'review'
                  ? 'bg-primary-600 text-white shadow-sm font-bold'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
              }`}
            >
              Review Pengumpulan
              {pendingReviews.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                  {pendingReviews.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('completed_archive')}
              className={`py-2 px-4 rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'completed_archive'
                  ? 'bg-primary-600 text-white shadow-sm font-bold'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
              }`}
            >
              <CheckCircle2 size={13} className="text-emerald-500" />
              Taks Selesai ({tasks.filter((t) => t.status === 'Completed').length})
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-2 px-4 rounded-xl transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-primary-600 text-white shadow-sm font-bold'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
              }`}
            >
              Monitoring &amp; Skor Performa
            </button>
            <button
              onClick={() => {
                setEditingTaskId(null);
                setTitle('');
                setDescription('');
                setDueDate('');
                setAttachments([]);
                setActiveTab('create');
              }}
              className={`py-2 px-4 rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-primary-600 text-white shadow-sm font-bold'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
              }`}
            >
              <Plus size={14} /> {editingTaskId ? 'Edit Taks' : '+ Buat Taks'}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('my_tasks')}
              className={`py-2 px-4 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'my_tasks'
                  ? 'bg-primary-600 text-white shadow-sm font-bold'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
              }`}
            >
              Daftar Taks yang Harus Dikerjakan ({myPendingTasks.length})
            </button>
            <button
              onClick={() => setActiveTab('completed_archive')}
              className={`py-2 px-4 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'completed_archive'
                  ? 'bg-primary-600 text-white shadow-sm font-bold'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
              }`}
            >
              <CheckCircle2 size={14} className="text-emerald-500" />
              Taks yang Sudah Diselesaikan ({myCompletedTasks.length})
            </button>
          </>
        )}
      </div>

      {/* =========================================================================
          VIEW 1: FORM BUAT TUGAS BARU (Langkah 1 Sisi Bos / HR)
          ========================================================================= */}
      {activeTab === 'create' && canAssignTask && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Plus className="text-primary-600" size={20} />
                {editingTaskId ? 'Edit Rincian Taks' : 'Langkah 1: Pembuatan & Penugasan Taks'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {editingTaskId ? 'Perbarui instruksi, target divisi/karyawan, bobot nilai, atau tenggat waktu taks ini.' : 'Pilih target penerima (seluruh karyawan, per divisi, atau individu), lengkapi instruksi, lampiran pengerjaan (opsional), serta tenggat waktu.'}
              </p>
            </div>
            <button
              onClick={() => {
                setEditingTaskId(null);
                setActiveTab('all_tasks');
              }}
              className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 cursor-pointer"
            >
              Kembali ke Daftar
            </button>
          </div>

          <form onSubmit={(e) => handleCreateSubmit(e, true)} className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                Judul Taks / Materi *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Audit Keamanan Cloud & Deployment API Q4"
                className="input text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                Deskripsi &amp; Instruksi Pengerjaan *
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tuliskan petunjuk pengerjaan langkah-demi-langkah, ekspektasi output, serta kriteria kelulusan..."
                className="input text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Target Penerima Tugas *
                </label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as TaskTargetType)}
                  className="input text-xs"
                >
                  <option value="all">Semua Karyawan Kelana Corporate</option>
                  <option value="division">Spesifik Divisi Tertentu</option>
                  <option value="individual">Individu Karyawan Spesifik</option>
                </select>
              </div>

              {targetType === 'division' && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Pilih Divisi
                  </label>
                  <select
                    value={targetDivision}
                    onChange={(e) => setTargetDivision(e.target.value)}
                    className="input text-xs"
                  >
                    {DIVISIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === 'individual' && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Pilih Karyawan
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="input text-xs"
                    required
                  >
                    <option value="">-- Pilih Nama Karyawan --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.nik} - {u.division})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Tingkat Prioritas
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="input text-xs"
                >
                  <option value="Urgent">Urgent (Segera)</option>
                  <option value="High">Tinggi</option>
                  <option value="Medium">Sedang</option>
                  <option value="Low">Rendah</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Tenggat Waktu (Due Date &amp; Jam) *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="input text-xs"
                />
              </div>
            </div>

            {/* Attachments Section */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <Paperclip size={14} className="text-primary-600" />
                  Lampiran Pengerjaan (Tidak Wajib Diisi)
                </label>
                <span className="text-[11px] text-gray-400 font-normal">
                  Opsional: Referensi panduan/file awal jika ada
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Pilihan HANYA 2: Tautan atau File */}
                  <select
                    value={newAttType}
                    onChange={(e) => {
                      const type = e.target.value as 'link' | 'file';
                      setNewAttType(type);
                      setNewAttUrl('');
                      setNewAttFileData('');
                      setNewAttFileSize('');
                    }}
                    className="input text-xs w-full sm:w-32 font-medium"
                  >
                    <option value="link">Tautan</option>
                    <option value="file">File</option>
                  </select>

                  <input
                    type="text"
                    placeholder={newAttType === 'link' ? "Nama tautan (opsional)" : "Keterangan file (opsional)"}
                    value={newAttName}
                    onChange={(e) => setNewAttName(e.target.value)}
                    className="input text-xs flex-1"
                  />

                  {newAttType === 'link' ? (
                    <input
                      type="url"
                      placeholder="https://drive.google.com/... atau tautan web"
                      value={newAttUrl}
                      onChange={(e) => setNewAttUrl(e.target.value)}
                      className="input text-xs flex-1"
                    />
                  ) : (
                    <div className="flex-1 flex items-center">
                      <input
                        type="file"
                        onChange={handleTaskAttachmentUpload}
                        className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-100 file:text-primary-700 hover:file:bg-primary-200 dark:file:bg-primary-950 dark:file:text-primary-300 cursor-pointer w-full"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    className="btn-primary text-xs py-2 px-4 cursor-pointer font-bold flex items-center justify-center gap-1 shadow-sm flex-shrink-0"
                  >
                    <Plus size={14} /> Tambah
                  </button>
                </div>

                {newAttType === 'file' && newAttFileData && (
                  <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 px-1">
                    ✓ File terpilih: <strong>{newAttName || 'File dokumen'}</strong> ({newAttFileSize})
                  </div>
                )}
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2 pt-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs shadow-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip size={14} className="text-primary-600 flex-shrink-0" />
                        <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">{att.name}</span>
                        <span className="text-gray-400 text-[11px] truncate">({att.url || 'File lokal'})</span>
                        {att.fileSize && (
                          <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded font-mono">
                            {att.fileSize}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachments(attachments.filter((a) => a.id !== att.id))}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        title="Hapus Lampiran"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setEditingTaskId(null);
                  setActiveTab('all_tasks');
                }}
                className="btn-secondary text-xs py-2.5 px-4 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={(e) => handleCreateSubmit(e, false)}
                className="btn-secondary text-xs py-2.5 px-5 cursor-pointer"
              >
                {editingTaskId ? 'Simpan Perubahan (Draf)' : 'Simpan Sebagai Draf'}
              </button>
              <button
                type="submit"
                className="btn-primary text-xs py-2.5 px-6 font-bold flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Send size={15} />
                {editingTaskId ? 'Perbarui & Publish Taks' : 'Publish & Kirim Taks'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: DAFTAR TUGAS (Tampilan Karyawan / Bos)
          ========================================================================= */}
      {(activeTab === 'all_tasks' || activeTab === 'my_tasks' || activeTab === 'completed_archive') && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
              <input
                type="text"
                placeholder="Cari tugas, judul, atau penerima..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter size={14} className="text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input text-xs w-full sm:w-48"
              >
                <option value="ALL">Semua Status</option>
                <option value="Assigned">Assigned (Ditugaskan)</option>
                <option value="In Progress">In Progress (Dikerjakan)</option>
                <option value="Submitted">Submitted (Dikirim)</option>
                <option value="Completed">Completed (Selesai/Lulus)</option>
                <option value="Revision Required">Revision Required</option>
              </select>
            </div>
          </div>

          {/* List of Task Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedTasks.map((task) => {
              const due = parseISO(task.dueDate);
              const isOverdue = isPast(due) && task.status !== 'Completed';
              const daysLeft = differenceInDays(due, new Date());

              return (
                <div
                  key={task.id}
                  className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(task.status)}
                        {getPriorityBadge(task.priority)}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-base leading-snug">
                        {task.title}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    </div>

                    {/* Metadata Target & Creator */}
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400 space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Pemberi Tugas: <strong className="text-gray-700 dark:text-gray-200">{task.createdByName}</strong> ({task.createdByRole})</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Target: <strong className="text-primary-600">{task.assignedToNames.join(', ')}</strong></span>
                      </div>
                    </div>

                    {/* Deadline Reminder */}
                    <div className={`p-2.5 rounded-xl text-xs flex items-center justify-between ${
                      isOverdue
                        ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                        : daysLeft <= 2
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock size={13} />
                        Tenggat: {format(due, 'dd MMMM yyyy, HH:mm', { locale: idLocale })}
                      </span>
                      <span className="font-bold">
                        {isOverdue ? 'Overdue!' : `${daysLeft} hari lagi`}
                      </span>
                    </div>

                    {/* Revision notes if available */}
                    {task.status === 'Revision Required' && task.revisionNotes && (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-800 dark:text-rose-200 space-y-1">
                        <strong className="flex items-center gap-1">
                          <AlertCircle size={13} /> Catatan Revisi dari Pimpinan:
                        </strong>
                        <p>{task.revisionNotes}</p>
                      </div>
                    )}

                    {/* Completed Review Info */}
                    {task.status === 'Completed' && task.review && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs text-emerald-800 dark:text-emerald-200">
                        <div>
                          <strong className="flex items-center gap-1">
                            <CheckCircle2 size={14} className="text-emerald-600" /> Hasil Peninjauan: Disetujui &amp; Selesai
                          </strong>
                          <p className="text-[11px] mt-0.5">{task.review.feedback}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Controls for Employee & Boss */}
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        markTaskOpened(task.id, userId);
                      }}
                      className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye size={14} /> Lihat Detail &amp; Modul
                    </button>

                    <div className="flex items-center gap-1.5">
                      {/* Boss Action: Edit and Delete / Kurangi Taks */}
                      {canAssignTask && (
                        <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-700 pr-1.5 mr-0.5">
                          <button
                            onClick={() => handleStartEditTask(task)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                            title="Edit / Ubah Taks"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id, task.title)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Hapus / Kurangi Taks"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}

                      {/* Employee Action: Start Task (hanya penerima tugas, Admin, CEO) */}
                      {task.status === 'Assigned' && canWorkOnTask(task, currentUser) && (
                        <button
                          onClick={() => startTask(task.id, userId)}
                          className="btn-primary text-xs py-1.5 px-3 font-semibold cursor-pointer"
                        >
                          Mulai Kerjakan
                        </button>
                      )}

                      {/* Employee Action: Submit / Revisi (hanya penerima tugas, Admin, CEO) */}
                      {(task.status === 'In Progress' || task.status === 'Revision Required' || task.status === 'Completed') &&
                        canWorkOnTask(task, currentUser) && (
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            markTaskOpened(task.id, userId);
                          }}
                          className={`${
                            task.status === 'Completed'
                              ? 'bg-amber-600 hover:bg-amber-700 text-white'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          } text-xs py-1.5 px-3 rounded-lg font-semibold flex items-center gap-1 cursor-pointer shadow-sm`}
                        >
                          <Send size={13} /> {task.status === 'Completed' ? 'Revisi Tugas' : 'Kumpulkan Tugas'}
                        </button>
                      )}

                      {/* Boss Action: Review Pending */}
                      {canAssignTask && (task.status === 'Submitted' || task.status === 'Under Review') && (
                        <button
                          onClick={() => {
                            setReviewTask(task);
                            setReviewScore(85);
                            setReviewFeedback('');
                          }}
                          className="bg-amber-500 hover:bg-amber-600 text-white text-xs py-1.5 px-3 rounded-lg font-bold flex items-center gap-1 cursor-pointer shadow-sm"
                        >
                          <Award size={13} /> Beri Nilai / Review
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {displayedTasks.length === 0 && (
              <div className="col-span-full p-12 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 text-center space-y-3">
                <CheckSquare size={36} className="text-gray-300 mx-auto" />
                <h4 className="font-bold text-gray-800 dark:text-gray-200">Tidak ada tugas dalam status ini</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Semua penugasan telah diselesaikan atau belum ada tugas yang dipublish untuk kriteria pencarian ini.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: REVIEW PENDING (Langkah 3 Sisi Bos / HR)
          ========================================================================= */}
      {activeTab === 'review' && canAssignTask && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Award className="text-amber-500" size={18} />
              Review Hasil Kerja &amp; Penilaian Karyawan (Pending Review)
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Tinjau pengumpulan tugas, berikan skor performa (0-100), feedback konstruktif, serta tentukan kelulusan atau revisi.
            </p>
          </div>

          <div className="space-y-4">
            {pendingReviews.map((task) => (
              <div
                key={task.id}
                className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                  <div>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                      {task.targetDivision || 'Semua Divisi'}
                    </span>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base mt-1">
                      {task.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => {
                      setReviewTask(task);
                      setReviewScore(85);
                      setReviewFeedback('');
                    }}
                    className="btn-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5 self-start cursor-pointer shadow-md"
                  >
                    <Award size={14} /> Berikan Nilai &amp; Keputusan
                  </button>
                </div>

                {/* Submission Content */}
                {task.submission ? (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                      <span>Dikumpulkan oleh: <strong className="text-gray-900 dark:text-white">{task.submission.submittedByName}</strong></span>
                      <span>{format(parseISO(task.submission.submittedAt), 'dd MMM yyyy, HH:mm')}</span>
                    </div>

                    <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-200 leading-relaxed">
                      {task.submission.notes}
                    </div>

                    {task.submission.attachmentFileData && (
                      <div className="flex items-center gap-2 pt-1">
                        <Paperclip size={14} className="text-emerald-600" />
                        <span className="font-semibold text-gray-700 dark:text-gray-300">File Dokumen Terlampir:</span>
                        <a
                          href={task.submission.attachmentFileData}
                          download={task.submission.attachmentName || 'hasil-taks-karyawan'}
                          className="text-emerald-600 hover:underline flex items-center gap-1 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800"
                        >
                          <Download size={12} /> Unduh {task.submission.attachmentName || 'File Jawaban'} ({task.submission.attachmentFileSize || 'Dokumen'})
                        </a>
                      </div>
                    )}

                    {task.submission.attachmentUrl && (
                      <div className="flex items-center gap-2 pt-1">
                        <ExternalLink size={14} className="text-primary-600" />
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Tautan Taks Eksternal:</span>
                        <a
                          href={task.submission.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary-600 hover:underline flex items-center gap-1 font-bold"
                        >
                          {task.submission.attachmentName || task.submission.attachmentUrl}
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">Belum ada lampiran jawaban yang dikirim.</p>
                )}
              </div>
            ))}

            {pendingReviews.length === 0 && (
              <div className="p-12 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 text-center space-y-2">
                <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
                <h4 className="font-bold text-gray-900 dark:text-white">Semua Hasil Tugas Telah Dinilai</h4>
                <p className="text-xs text-gray-500">Tidak ada pengumpulan yang menunggu review saat ini.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 4: MONITORING & ANALYTICS (Langkah 4 Sisi Bos / HR)
          ========================================================================= */}
      {activeTab === 'analytics' && canAssignTask && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="text-primary-600" size={18} />
              Langkah 4: Dashboard Analitik Monitoring Performa Karyawan
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Pantau karyawan yang belum membuka instruksi dan tugas yang melewati tenggat waktu.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Tingkat Penyelesaian (Completion Rate)</p>
              <p className="text-3xl font-black text-emerald-900 dark:text-emerald-100 mt-1">
                {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">{completedTasks} dari {totalTasks} tugas selesai</p>
            </div>

            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800">
              <p className="text-xs text-red-700 dark:text-red-300 font-medium">Tugas Terlambat (Overdue)</p>
              <p className="text-3xl font-black text-red-900 dark:text-red-100 mt-1">{overdueTasks}</p>
              <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">Perlu pengingat (Reminder H-1 / H-3)</p>
            </div>
          </div>

          {/* Table Tracking Per Task */}
          <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="p-3 font-bold">Judul Tugas</th>
                  <th className="p-3 font-bold">Target</th>
                  <th className="p-3 font-bold">Status</th>
                  <th className="p-3 font-bold">Dilihat / Dibuka</th>
                  <th className="p-3 font-bold">Tenggat Waktu</th>
                  <th className="p-3 font-bold">Nilai Akhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {tasks.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="p-3 font-semibold text-gray-900 dark:text-white max-w-xs truncate">{t.title}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-300">{t.assignedToNames.join(', ')}</td>
                    <td className="p-3">{getStatusBadge(t.status)}</td>
                    <td className="p-3 text-gray-500">
                      {t.openedByUserIds.length > 0 ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <Check size={12} /> {t.openedByUserIds.length} Karyawan
                        </span>
                      ) : (
                        <span className="text-amber-600 italic">Belum dibuka</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-500">
                      {format(parseISO(t.dueDate), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="p-3">
                      {t.review?.score !== undefined ? (
                        <span className="font-bold text-primary-600">{t.review.score}/100</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DETAIL TUGAS & PENGUMPULAN (Langkah 2 Sisi Karyawan)
          ========================================================================= */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-850">
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedTask.status)}
                {getPriorityBadge(selectedTask.priority)}
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedTask.title}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  Pemberi: <strong>{selectedTask.createdByName}</strong> ({selectedTask.createdByRole}) • Target: {selectedTask.assignedToNames.join(', ')}
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/80 leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {selectedTask.description}
              </div>

              {/* Attachments from Boss */}
              {selectedTask.attachments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Paperclip size={14} className="text-primary-600" />
                    Materi Pelatihan &amp; Dokumen Lampiran:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedTask.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-primary-400 flex items-center justify-between text-gray-800 dark:text-gray-200 transition-colors group"
                      >
                        <div className="truncate">
                          <p className="font-semibold truncate group-hover:text-primary-600">{att.name}</p>
                          <span className="text-[10px] text-gray-400 uppercase">{att.type}</span>
                        </div>
                        <ExternalLink size={13} className="text-gray-400 group-hover:text-primary-600" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Form Submit (Langkah 2: Pengumpulan & Revisi Tugas) */}
              {(selectedTask.status === 'In Progress' || selectedTask.status === 'Revision Required' || selectedTask.status === 'Rejected' || selectedTask.status === 'Completed') &&
                canWorkOnTask(selectedTask, currentUser) && (
                <div className="p-5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl space-y-3.5">
                  <h4 className="font-bold text-indigo-950 dark:text-indigo-200 text-sm flex items-center gap-1.5">
                    <Send size={15} />
                    {selectedTask.status === 'Completed'
                      ? 'Revisi Taks yang Sudah Diselesaikan'
                      : selectedTask.status === 'Rejected'
                      ? 'Tugas Ditolak: Mohon Buat & Kirim Ulang dari Awal'
                      : selectedTask.status === 'Revision Required'
                      ? 'Langkah Revisi: Perbaiki Lampiran Hasil Kerja'
                      : 'Langkah 2: Formulir Pengumpulan Hasil Pengerjaan Taks'}
                  </h4>

                  {selectedTask.status === 'Completed' && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs">
                      <p className="font-semibold mb-0.5">ℹ️ Taks ini telah diselesaikan.</p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                        Karyawan dapat memperbarui/mengirimkan revisi berkas lampiran jika terdapat perbaikan data lanjutan.
                      </p>
                    </div>
                  )}

                  {selectedTask.revisionNotes && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs">
                      <strong className="block mb-1">Catatan dari Pimpinan:</strong>
                      <p>{selectedTask.revisionNotes}</p>
                    </div>
                  )}
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                    <p className="font-semibold flex items-center gap-1.5 mb-0.5">
                      ⚠️ Wajib Melampirkan Bukti Pengerjaan
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      Sebagai yang ditugaskan, Anda <strong>wajib memberikan salah satu lampiran</strong> berupa <strong>File Dokumen/Bukti Kerja</strong> (PDF/Doc/Gambar/ZIP) ataupun <strong>Tautan Link Hasil Kerja</strong> (Google Docs/Drive/Figma/Web).
                    </p>
                  </div>

                  <textarea
                    rows={3}
                    placeholder="Tuliskan ringkasan hasil kerja, kendala yang dihadapi, atau kesimpulan jawaban (opsional)..."
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                    className="input text-xs"
                  />

                  {/* Attachment File Upload Section */}
                  <div className="p-3.5 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-700 space-y-2">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Upload size={14} className="text-indigo-600" />
                        Opsi 1: Unggah File Dokumen / Bukti Pengerjaan (Maks 15MB)
                      </span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                        Wajib Isi Salah Satu (File atau Link)
                      </span>
                    </label>

                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-950 dark:file:text-primary-300 cursor-pointer w-full"
                      />
                    </div>

                    {submissionFileData && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
                        <span className="flex items-center gap-1.5 font-medium truncate">
                          <CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" />
                          File terunggah: <strong>{submissionName}</strong> ({submissionFileSize})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSubmissionFileData('');
                            setSubmissionFileType('');
                            setSubmissionFileSize('');
                          }}
                          className="text-red-500 hover:text-red-700 cursor-pointer"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Attachment Link Section */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <LinkIcon size={14} className="text-indigo-600" />
                        Opsi 2: Tautan Link Hasil Pengerjaan (Google Drive/Docs/Figma/Web)
                      </span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                        Wajib Isi Salah Satu (File atau Link)
                      </span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nama/Judul Dokumen (Misal: Laporan Final Q4)"
                        value={submissionName}
                        onChange={(e) => setSubmissionName(e.target.value)}
                        className="input text-xs"
                      />
                      <input
                        type="url"
                        placeholder="https://drive.google.com/... atau tautan link tugas"
                        value={submissionUrl}
                        onChange={(e) => setSubmissionUrl(e.target.value)}
                        className="input text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        // Validasi ketat: Yang ditugaskan WAJIB memberikan salah satu lampiran berupa link atau file
                        const hasFile = Boolean(submissionFileData);
                        const hasLink = Boolean(submissionUrl && submissionUrl.trim().length > 0);

                        if (!hasFile && !hasLink) {
                          alert('Wajib melampirkan bukti pengerjaan! Mohon unggah File dokumen bukti kerja ATAU masukkan Tautan Link pengerjaan (Google Drive/Docs/Web).');
                          return;
                        }

                        submitTask(selectedTask.id, {
                          submittedBy: userId,
                          submittedByName: currentUser?.name || 'Karyawan',
                          notes: submissionNotes || (hasFile ? `File dilampirkan: ${submissionName}` : `Link dilampirkan: ${submissionUrl}`),
                          attachmentUrl: submissionUrl || undefined,
                          attachmentName: submissionName || (hasFile ? 'File Hasil Pengerjaan' : 'Tautan Hasil Pengerjaan'),
                          attachmentFileData: submissionFileData || undefined,
                          attachmentFileType: submissionFileType || undefined,
                          attachmentFileSize: submissionFileSize || undefined,
                        });
                        setSelectedTask(null);
                        setSubmissionNotes('');
                        setSubmissionUrl('');
                        setSubmissionName('');
                        setSubmissionFileData('');
                        setSubmissionFileType('');
                        setSubmissionFileSize('');
                        alert('Taks beserta lampiran pengerjaan berhasil dikirim! Menunggu peninjauan pimpinan (CEO/HR).');
                      }}
                      className="btn-primary text-xs py-2 px-5 font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <Send size={14} /> Submit Taks Sekarang
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                onClick={() => setSelectedTask(null)}
                className="btn-secondary text-xs py-2 px-4 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: PENILAIAN & KEPUTUSAN BOS (Langkah 3)
          ========================================================================= */}
      {reviewTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="text-amber-500" size={20} />
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Langkah 3: Peninjauan &amp; Keputusan Pimpinan
                </h3>
              </div>
              <button
                onClick={() => setReviewTask(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <p className="text-gray-500">Tugas yang Ditinjau:</p>
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">{reviewTask.title}</h4>
                <p className="text-gray-500 text-[11px] mt-0.5">
                  Dikumpulkan oleh: <strong className="text-primary-600">{reviewTask.submission?.submittedByName || 'Karyawan'}</strong>
                </p>
              </div>

              {reviewTask.submission?.notes && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                  <p className="font-bold text-[11px] text-gray-500 mb-1">Catatan dari Karyawan:</p>
                  <p>{reviewTask.submission.notes}</p>
                </div>
              )}

              <div>
                <label className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Umpan Balik / Catatan Evaluasi (Feedback) *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Berikan apresiasi, instruksi revisi, atau alasan penolakan jika harus dibuat ulang dari awal..."
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  className="input text-xs"
                />
              </div>

              {/* Tiga Pilihan Keputusan Pimpinan: Revisi, Disetujui & Selesai, dan Ditolak */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-2.5">
                {/* 1. Tombol Revisi */}
                <button
                  type="button"
                  onClick={() => {
                    if (!reviewFeedback.trim()) {
                      alert('Mohon tuliskan catatan instruksi revisi untuk karyawan.');
                      return;
                    }
                    reviewDecision(reviewTask.id, {
                      reviewedBy: userId,
                      reviewedByName: currentUser?.name || 'Pimpinan',
                      feedback: reviewFeedback,
                      decision: 'Revision',
                    });
                    setReviewTask(null);
                    alert('Status tugas diubah menjadi "Revisi". Karyawan dapat memperbaiki lampiran tugas.');
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 font-bold flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                >
                  <RotateCcw size={14} /> Revisi
                </button>

                {/* 2. Tombol Ditolak (Ulangi dari Awal) */}
                <button
                  type="button"
                  onClick={() => {
                    if (!reviewFeedback.trim()) {
                      alert('Mohon tuliskan alasan penolakan agar karyawan dapat membuat ulang dari awal.');
                      return;
                    }
                    if (window.confirm('Apakah Anda yakin ingin menolak hasil pengerjaan ini? Karyawan harus membuat dan mengumpulkan ulang tugas dari awal.')) {
                      reviewDecision(reviewTask.id, {
                        reviewedBy: userId,
                        reviewedByName: currentUser?.name || 'Pimpinan',
                        feedback: reviewFeedback,
                        decision: 'Reject',
                      });
                      setReviewTask(null);
                      alert('Status tugas "Ditolak". Berkas tugas sebelumnya telah direset agar dibuat ulang dari awal.');
                    }
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 font-bold flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  title="Ditolak: Mirip revisi, tetapi pengumpulan tugas harus dibuat ulang dari awal"
                >
                  <X size={14} /> Ditolak (Buat Ulang)
                </button>

                {/* 3. Tombol Disetujui & Selesai */}
                <button
                  type="button"
                  onClick={() => {
                    reviewDecision(reviewTask.id, {
                      reviewedBy: userId,
                      reviewedByName: currentUser?.name || 'Pimpinan',
                      feedback: reviewFeedback || 'Pekerjaan disetujui dengan sangat baik.',
                      decision: 'Approve',
                    });
                    setReviewTask(null);
                    alert('Tugas dinyatakan "Disetujui & Selesai"!');
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md text-xs"
                >
                  <CheckCircle2 size={14} /> Disetujui &amp; Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
