// Types for Ruang Kelana Attendance System (Sistem Absensi Karyawan & HR)

export type AttendanceWorkType = 'WFO' | 'WFH' | 'Dinas Luar';
export type AttendanceStatus = 'Tepat Waktu' | 'Terlambat' | 'Alpa' | 'Izin' | 'Sakit' | 'Cuti';
export type CorrectionStatus = 'Pending' | 'Approved' | 'Rejected';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  isInsideOfficeGeofence: boolean;
  distanceFromOfficeMeters: number;
  ipAddress?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userNik: string;
  userDivision: string;
  date: string; // YYYY-MM-DD
  
  // Clock-In (Jam Masuk: 08:00 - 10:00)
  clockInTime?: string; // HH:mm:ss WIB (Server Timestamp)
  clockInTimestamp?: string; // ISO String
  clockInLocation?: LocationCoordinates;
  clockInSelfiePhoto?: string; // Base64 data URL
  clockInNotes?: string;
  
  // Clock-Out (Jam Pulang: 16:00 - 23:59)
  clockOutTime?: string; // HH:mm:ss WIB (Server Timestamp)
  clockOutTimestamp?: string; // ISO String
  clockOutLocation?: LocationCoordinates;
  clockOutSelfiePhoto?: string; // Base64 data URL
  clockOutNotes?: string; // Catatan wajib saat clock-out (tugas luar, lembur, dll.)

  workType: AttendanceWorkType;
  status: AttendanceStatus;
  
  // Anomali flags untuk audit HR
  hasAnomaly?: boolean;
  anomalyReason?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceCorrectionRequest {
  id: string;
  userId: string;
  userName: string;
  userNik: string;
  userDivision: string;
  date: string;
  type: 'Lupa Clock-In' | 'Lupa Clock-Out' | 'Koreksi Jam' | 'Izin' | 'Sakit' | 'Cuti';
  proposedClockIn?: string;
  proposedClockOut?: string;
  reason: string;
  attachmentUrl?: string;
  status: CorrectionStatus;
  reviewedBy?: string;
  reviewNotes?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface OfficeGeofenceConfig {
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number; // Misal 100 meter
  allowedIpSubnet?: string;
  clockInStart: string; // "08:00"
  clockInEnd: string; // "10:00"
  clockOutStart: string; // "16:00"
  clockOutEnd: string; // "23:59"
}
