import { CompanyTask } from '../types/task';

/**
 * Memeriksa apakah suatu tugas berhak dilihat dan dikerjakan oleh user saat ini.
 * 
 * Aturan Otorisasi Ketat:
 * 1. CEO & Admin (atau HR/Director): Memiliki hak supervisi penuh terhadap seluruh tugas perusahaan.
 * 2. Karyawan/Staff biasa:
 *    - HANYA dapat melihat tugas jika:
 *      a. Target tugas adalah 'all' (Seluruh Karyawan).
 *      b. Target tugas adalah 'division' DAN divisinya cocok persis dengan divisi user.
 *      c. Target tugas adalah 'individual' DAN user ID-nya ada dalam assignedToUserIds.
 *    - Jika divisi berbeda (misal tugas untuk Marketing, sedangkan user adalah IT), tugas TIDAK AKAN MUNCUL sama sekali.
 */
export const checkTaskAccess = (
  task: CompanyTask,
  user?: { id?: string; role?: string; division?: string; position?: string } | null
): boolean => {
  if (!user) return false;

  const role = user.role;
  const userDivision = (user.division || '').trim().toLowerCase();
  const position = (user.position || '').trim().toLowerCase();

  // 1. Hak supervisi pimpinan (CEO & Admin / Executive)
  const isSupervisor =
    role === 'CEO' ||
    role === 'Admin' ||
    userDivision.includes('all role') ||
    position.includes('ceo') ||
    position.includes('direktur') ||
    position.includes('chief executive');

  if (isSupervisor) return true;

  // 2. Draft task hanya bisa dilihat oleh pembuatnya
  if (task.status === 'Draft') {
    return task.createdByUserId === user.id;
  }

  // 3. Pencocokan Target Tugas
  // A. Target untuk Seluruh Karyawan
  if (task.targetType === 'all') {
    return true;
  }

  // B. Target untuk Divisi Tertentu
  if (task.targetType === 'division') {
    if (!task.targetDivision) return false;
    const targetDept = task.targetDivision.trim().toLowerCase();
    
    // Pencocokan ketat berbasis nama divisi
    return (
      userDivision === targetDept ||
      userDivision.includes(targetDept) ||
      targetDept.includes(userDivision)
    );
  }

  // C. Target untuk Perorangan / Individu
  if (task.targetType === 'individual') {
    if (!task.assignedToUserIds || task.assignedToUserIds.length === 0) return false;
    return task.assignedToUserIds.includes(user.id || '');
  }

  return false;
};

/**
 * Siapa yang boleh MENGERJAKAN dan MENGUMPULKAN tugas (Mulai Kerjakan, Kumpulkan, Revisi):
 * - Penerima tugas: semua karyawan bila target 'all', anggota divisi bila target 'division',
 *   atau karyawan yang dipilih bila target 'individual'.
 * - CEO & Admin (boleh mengumpulkan mewakili karyawan).
 * Pimpinan lain (HR, direktur) tetap bisa melihat & mereview, tapi tidak mengumpulkan.
 */
export const canWorkOnTask = (
  task: CompanyTask,
  user?: { id?: string; role?: string; division?: string } | null
): boolean => {
  if (!user) return false;
  if (user.role === 'CEO' || user.role === 'Admin') return true;
  if (task.status === 'Draft') return false;

  if (task.targetType === 'all') return true;

  if (task.targetType === 'division') {
    const userDivision = (user.division || '').trim().toLowerCase();
    const targetDept = (task.targetDivision || '').trim().toLowerCase();
    if (!userDivision || !targetDept) return false;
    return userDivision === targetDept || userDivision.includes(targetDept) || targetDept.includes(userDivision);
  }

  if (task.targetType === 'individual') {
    return !!user.id && (task.assignedToUserIds || []).includes(user.id);
  }

  return false;
};
