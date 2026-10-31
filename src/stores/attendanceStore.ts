import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AttendanceRecord,
  AttendanceCorrectionRequest,
  LocationCoordinates,
  AttendanceWorkType,
  AttendanceStatus,
} from '../types/attendance';
import {
  DEFAULT_OFFICE,
  calculateDistanceInMeters,
  getServerTimestampWIB,
  checkAttendanceWindow,
} from '../utils/attendanceUtils';

interface AttendanceStore {
  records: AttendanceRecord[];
  corrections: AttendanceCorrectionRequest[];
  
  // Actions Karyawan
  clockIn: (params: {
    userId: string;
    userName: string;
    userNik: string;
    userDivision: string;
    workType: AttendanceWorkType;
    location: LocationCoordinates;
    selfiePhoto: string;
    notes?: string;
    customTimeOverride?: Date; // Untuk simulasi/demo jam jika diperlukan
  }) => Promise<{ success: boolean; message: string; record?: AttendanceRecord }>;

  clockOut: (params: {
    userId: string;
    notes: string; // Catatan wajib saat clock-out
    location: LocationCoordinates;
    selfiePhoto: string;
    customTimeOverride?: Date;
  }) => Promise<{ success: boolean; message: string }>;

  submitCorrection: (params: {
    userId: string;
    userName: string;
    userNik: string;
    userDivision: string;
    date: string;
    type: AttendanceCorrectionRequest['type'];
    reason: string;
    proposedClockIn?: string;
    proposedClockOut?: string;
  }) => Promise<{ success: boolean; message: string }>;

  // Actions HR / Admin
  approveCorrection: (correctionId: string, reviewerName: string, notes?: string) => void;
  rejectCorrection: (correctionId: string, reviewerName: string, notes?: string) => void;
  exportAttendanceReport: (monthFilter?: string) => string;
}

// Initial Sample Data for HR Dashboard Demonstration
const SAMPLE_RECORDS: AttendanceRecord[] = [];

const SAMPLE_CORRECTIONS: AttendanceCorrectionRequest[] = [];

export const useAttendanceStore = create<AttendanceStore>()(
  persist(
    (set, get) => ({
      records: SAMPLE_RECORDS,
      corrections: SAMPLE_CORRECTIONS,

      clockIn: async ({
        userId,
        userName,
        userNik,
        userDivision,
        workType,
        location,
        selfiePhoto,
        notes,
        customTimeOverride,
      }) => {
        const { records } = get();
        const now = customTimeOverride || new Date();
        const { iso, timeStr, dateStr } = getServerTimestampWIB(now);
        const windowCheck = checkAttendanceWindow(now);

        // 1. Cek rentang jam masuk (08:00 - 10:00)
        // Jika dalam simulasi atau jam normal:
        if (!windowCheck.canClockIn && !customTimeOverride) {
          return {
            success: false,
            message: 'Gagal Absen: Sesi Clock-In hanya dibuka pada pukul 08:00 - 10:00 WIB.',
          };
        }

        // Cek apakah sudah clock-in hari ini
        const existingRecord = records.find((r) => r.userId === userId && r.date === dateStr);
        if (existingRecord && existingRecord.clockInTime) {
          return {
            success: false,
            message: `Anda sudah melakukan Clock-In hari ini pada pukul ${existingRecord.clockInTime} WIB.`,
          };
        }

        // 2. Absensi hanya dari wilayah yang diizinkan (Cirebon, Bandung, Jakarta)
        if (!location.isInsideOfficeGeofence) {
          return {
            success: false,
            message: `Absen ditolak: lokasi Anda di luar wilayah ${DEFAULT_OFFICE.name}.`,
          };
        }
        let hasAnomaly = false;
        let anomalyReason = '';

        // 3. Tentukan status kehadiran (Tepat Waktu vs Terlambat)
        const isLate = windowCheck.isClockInLate;
        const status: AttendanceStatus = isLate ? 'Terlambat' : 'Tepat Waktu';
        if (isLate && !hasAnomaly) {
          hasAnomaly = true;
          anomalyReason = 'Terlambat masuk kerja (di atas 08:30 WIB)';
        }

        const newRecord: AttendanceRecord = {
          id: 'att-' + Date.now(),
          userId,
          userName,
          userNik,
          userDivision,
          date: dateStr,
          clockInTime: timeStr,
          clockInTimestamp: iso,
          clockInLocation: location,
          clockInSelfiePhoto: selfiePhoto,
          clockInNotes: notes,
          workType,
          status,
          hasAnomaly,
          anomalyReason: anomalyReason || undefined,
          createdAt: iso,
          updatedAt: iso,
        };

        set({
          records: [newRecord, ...records.filter((r) => !(r.userId === userId && r.date === dateStr))],
        });

        return {
          success: true,
          message: `Absen Masuk Berhasil! Pukul ${timeStr} WIB (${status})`,
          record: newRecord,
        };
      },

      clockOut: async ({ userId, notes, location, selfiePhoto, customTimeOverride }) => {
        if (!location.isInsideOfficeGeofence) {
          return {
            success: false,
            message: `Absen pulang ditolak: lokasi Anda di luar wilayah ${DEFAULT_OFFICE.name}.`,
          };
        }
        const { records } = get();
        const now = customTimeOverride || new Date();
        const { iso, timeStr, dateStr } = getServerTimestampWIB(now);
        const windowCheck = checkAttendanceWindow(now);

        // 1. Validasi Catatan Wajib saat Clock-Out
        if (!notes || notes.trim().length < 3) {
          return {
            success: false,
            message: 'Catatan kerja / keterangan wajib diisi sebelum Clock-Out (misal: "Tugas harian selesai", "Kerja lembur", dll).',
          };
        }

        // 2. Validasi rentang jam pulang (16:00 - 23:59)
        if (!windowCheck.canClockOut && !customTimeOverride) {
          return {
            success: false,
            message: 'Gagal Absen: Sesi Clock-Out hanya dibuka pada pukul 16:00 - 23:59 WIB.',
          };
        }

        // 3. Cari record hari ini
        const todayRecord = records.find((r) => r.userId === userId && r.date === dateStr);
        if (!todayRecord || !todayRecord.clockInTime) {
          return {
            success: false,
            message: 'Anda belum melakukan Clock-In (Absen Masuk) untuk hari ini!',
          };
        }

        if (todayRecord.clockOutTime) {
          return {
            success: false,
            message: `Anda sudah melakukan Clock-Out hari ini pada pukul ${todayRecord.clockOutTime} WIB.`,
          };
        }

        const updatedRecord: AttendanceRecord = {
          ...todayRecord,
          clockOutTime: timeStr,
          clockOutTimestamp: iso,
          clockOutLocation: location,
          clockOutSelfiePhoto: selfiePhoto,
          clockOutNotes: notes.trim(),
          updatedAt: iso,
        };

        set({
          records: records.map((r) => (r.id === todayRecord.id ? updatedRecord : r)),
        });

        return {
          success: true,
          message: `Absen Pulang Berhasil! Pukul ${timeStr} WIB. Selamat beristirahat!`,
        };
      },

      submitCorrection: async (params) => {
        const { corrections } = get();
        const newCorrection: AttendanceCorrectionRequest = {
          id: 'corr-' + Date.now(),
          ...params,
          status: 'Pending',
          createdAt: new Date().toISOString(),
        };

        set({
          corrections: [newCorrection, ...corrections],
        });

        return {
          success: true,
          message: 'Pengajuan koreksi kehadiran berhasil dikirim ke tim HR.',
        };
      },

      approveCorrection: (correctionId, reviewerName, notes) => {
        const { corrections, records } = get();
        const corr = corrections.find((c) => c.id === correctionId);
        if (!corr) return;

        const updatedCorrections = corrections.map((c) =>
          c.id === correctionId
            ? {
                ...c,
                status: 'Approved' as const,
                reviewedBy: reviewerName,
                reviewNotes: notes,
                reviewedAt: new Date().toISOString(),
              }
            : c
        );

        // Update / create record in attendance
        let recordToUpdate = records.find((r) => r.userId === corr.userId && r.date === corr.date);
        let updatedRecords = [...records];

        if (recordToUpdate) {
          updatedRecords = records.map((r) =>
            r.id === recordToUpdate?.id
              ? {
                  ...r,
                  clockInTime: corr.proposedClockIn || r.clockInTime,
                  clockOutTime: corr.proposedClockOut || r.clockOutTime,
                  status: (corr.type === 'Cuti' ? 'Cuti' : corr.type === 'Sakit' ? 'Sakit' : corr.type === 'Izin' ? 'Izin' : 'Tepat Waktu') as AttendanceStatus,
                  hasAnomaly: false,
                }
              : r
          );
        } else {
          const newRec: AttendanceRecord = {
            id: 'att-corr-' + Date.now(),
            userId: corr.userId,
            userName: corr.userName,
            userNik: corr.userNik,
            userDivision: corr.userDivision,
            date: corr.date,
            clockInTime: corr.proposedClockIn || '08:00:00',
            clockOutTime: corr.proposedClockOut || '17:00:00',
            workType: 'WFO',
            status: (corr.type === 'Cuti' ? 'Cuti' : corr.type === 'Sakit' ? 'Sakit' : corr.type === 'Izin' ? 'Izin' : 'Tepat Waktu') as AttendanceStatus,
            clockInNotes: `Koreksi disetujui HR: ${corr.reason}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          updatedRecords = [newRec, ...records];
        }

        set({ corrections: updatedCorrections, records: updatedRecords });
      },

      rejectCorrection: (correctionId, reviewerName, notes) => {
        const { corrections } = get();
        set({
          corrections: corrections.map((c) =>
            c.id === correctionId
              ? {
                  ...c,
                  status: 'Rejected' as const,
                  reviewedBy: reviewerName,
                  reviewNotes: notes,
                  reviewedAt: new Date().toISOString(),
                }
              : c
          ),
        });
      },

      exportAttendanceReport: (monthFilter) => {
        const { records } = get();
        const filtered = monthFilter
          ? records.filter((r) => r.date.startsWith(monthFilter))
          : records;

        const headers = [
          'ID Absensi',
          'Tanggal',
          'NIK',
          'Nama Karyawan',
          'Divisi',
          'Tipe Kerja',
          'Jam Masuk (Clock-In)',
          'Lokasi Masuk',
          'Jam Pulang (Clock-Out)',
          'Catatan Pulang',
          'Status Kehadiran',
          'Anomali',
        ];

        const rows = filtered.map((r) => [
          r.id,
          r.date,
          r.userNik,
          `"${r.userName}"`,
          `"${r.userDivision}"`,
          r.workType,
          r.clockInTime || '-',
          `"${r.clockInLocation?.address || '-'}"`,
          r.clockOutTime || '-',
          `"${r.clockOutNotes || '-'}"`,
          r.status,
          r.hasAnomaly ? `"${r.anomalyReason}"` : 'Normal',
        ]);

        const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
        return csvContent;
      },
    }),
    {
      name: 'ruang-kelana-attendance-clean',
    }
  )
);
