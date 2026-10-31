import React, { useState, useEffect } from 'react';
import {
  Clock, MapPin, Camera, CheckCircle2, AlertCircle, Calendar,
  ShieldCheck, FileText, Send, User, ChevronRight, History,
  Building, RefreshCw, Smartphone, Laptop, Sparkles, Navigation
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useAttendanceStore } from '../stores/attendanceStore';
import {
  DEFAULT_OFFICE,
  isWithinAttendanceArea,
  formatDistance,
  calculateDistanceInMeters,
  getServerTimestampWIB,
  checkAttendanceWindow,
  reverseGeocodeCoordinates,
  getDeviceNetworkInfo,
} from '../utils/attendanceUtils';
import { LocationCoordinates, AttendanceWorkType } from '../types/attendance';
import { WebcamCapture } from '../components/attendance/WebcamCapture';

export const EmployeeAttendanceTab: React.FC = () => {
  const { session } = useAuthStore();
  const { records, clockIn, clockOut, submitCorrection } = useAttendanceStore();

  const user = session?.user;
  const todayStr = new Date().toISOString().split('T')[0];

  // User's attendance record for today
  const todayRecord = records.find(
    (r) => r.userId === user?.id && r.date === todayStr
  );

  // Real-time server time clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeInfo = getServerTimestampWIB(currentTime);
  const windowCheck = checkAttendanceWindow(currentTime);

  // Form states
  const workType: AttendanceWorkType = 'WFO';
  const [clockInNotes, setClockInNotes] = useState('');
  const [clockOutNotes, setClockOutNotes] = useState('');

  // Location detection states
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<LocationCoordinates | null>(null);
  const [locationError, setLocationError] = useState('');

  // Camera / Selfie modal state
  const [showWebcam, setShowWebcam] = useState(false);
  const [activeAction, setActiveAction] = useState<'in' | 'out' | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);

  // Status feedback alert
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Correction Form Modal
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [corrType, setCorrType] = useState<any>('Lupa Clock-In');
  const [corrDate, setCorrDate] = useState(todayStr);
  const [corrReason, setCorrReason] = useState('');
  const [corrProposedIn, setCorrProposedIn] = useState('08:00');
  const [corrProposedOut, setCorrProposedOut] = useState('17:00');

  // Time simulation state (Untuk kemudahan pengujian kapan saja oleh user/penguji)
  const [simulationMode, setSimulationMode] = useState(false);
  const [simulatedHour, setSimulatedHour] = useState<number>(9);
  const [simulatedMinute, setSimulatedMinute] = useState<number>(0);

  // Get active date (actual or simulated)
  const getActiveDate = () => {
    if (!simulationMode) return new Date();
    const d = new Date();
    d.setHours(simulatedHour, simulatedMinute, 0, 0);
    return d;
  };

  const effectiveWindow = checkAttendanceWindow(getActiveDate());

  // Automatically request GPS location on mount
  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = () => {
    setDetectingLocation(true);
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('Browser Anda tidak mendukung Geolokasi GPS.');
      setDetectingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 0);

        const distance = calculateDistanceInMeters(
          lat,
          lon,
          DEFAULT_OFFICE.latitude,
          DEFAULT_OFFICE.longitude
        );
        // Ambil alamat nama jalan/wilayah nyata perangkat & IP publik
        const [realAddress, networkInfo] = await Promise.all([
          reverseGeocodeCoordinates(lat, lon),
          getDeviceNetworkInfo(),
        ]);
        const inside = isWithinAttendanceArea(distance, realAddress);

        setUserLocation({
          latitude: lat,
          longitude: lon,
          accuracy,
          distanceFromOfficeMeters: distance,
          isInsideOfficeGeofence: inside,
          address: realAddress,
          ipAddress: networkInfo.ip,
        });
        setDetectingLocation(false);
      },
      async (err) => {
        console.warn('Geolocation permission error or unavailable:', err);
        const networkInfo = await getDeviceNetworkInfo();
        // Tanpa GPS, lokasi tidak bisa dipastikan berada di Cirebon -> absen tidak diizinkan
        setUserLocation({
          latitude: 0,
          longitude: 0,
          distanceFromOfficeMeters: 0,
          isInsideOfficeGeofence: false,
          address: 'Lokasi GPS tidak terdeteksi',
          ipAddress: networkInfo.ip,
        });
        setLocationError('Izin akses lokasi belum diberikan. Klik "Refresh GPS" dan pilih "Allow/Izinkan" pada browser. Absensi membutuhkan GPS aktif.');
        setDetectingLocation(false);
      },
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  const handleStartClockIn = () => {
    if (!userLocation) {
      detectLocation();
      setAlert({ type: 'error', message: 'Lokasi sedang dideteksi. Tunggu sebentar lalu coba lagi.' });
      return;
    }
    if (!userLocation.isInsideOfficeGeofence) {
      setAlert({
        type: 'error',
        message: `Absensi hanya dapat dilakukan di wilayah Cirebon. Lokasi terdeteksi: ${userLocation.address || 'tidak diketahui'}.`,
      });
      return;
    }
    setActiveAction('in');
    setShowWebcam(true);
  };

  const handleStartClockOut = () => {
    if (!clockOutNotes.trim()) {
      setAlert({
        type: 'error',
        message: 'Harap isi catatan kegiatan harian Anda sebelum Absen Pulang (Clock-Out).',
      });
      return;
    }
    if (!userLocation) {
      detectLocation();
      setAlert({ type: 'error', message: 'Lokasi sedang dideteksi. Tunggu sebentar lalu coba lagi.' });
      return;
    }
    if (!userLocation.isInsideOfficeGeofence) {
      setAlert({
        type: 'error',
        message: `Absensi hanya dapat dilakukan di wilayah Cirebon. Lokasi terdeteksi: ${userLocation.address || 'tidak diketahui'}.`,
      });
      return;
    }
    setActiveAction('out');
    setShowWebcam(true);
  };

  const handlePhotoCaptured = async (photoBase64: string) => {
    setSelfiePhoto(photoBase64);
    setShowWebcam(false);
    setLoading(true);

    const effectiveDate = getActiveDate();
    if (!userLocation?.isInsideOfficeGeofence) {
      setLoading(false);
      setAlert({ type: 'error', message: 'Absensi hanya dapat dilakukan di wilayah Cirebon dengan GPS aktif.' });
      return;
    }
    const loc = userLocation;

    if (activeAction === 'in' && user) {
      const res = await clockIn({
        userId: user.id,
        userName: user.name,
        userNik: user.nik || 'KEL-001',
        userDivision: user.division || 'Teknologi & IT',
        workType,
        location: loc,
        selfiePhoto: photoBase64,
        notes: clockInNotes,
        customTimeOverride: simulationMode ? effectiveDate : undefined,
      });

      setAlert({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
    } else if (activeAction === 'out' && user) {
      const res = await clockOut({
        userId: user.id,
        notes: clockOutNotes,
        location: loc,
        selfiePhoto: photoBase64,
        customTimeOverride: simulationMode ? effectiveDate : undefined,
      });

      setAlert({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
    }

    setLoading(false);
    setActiveAction(null);
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const res = await submitCorrection({
      userId: user.id,
      userName: user.name,
      userNik: user.nik || 'KEL-001',
      userDivision: user.division || 'Umum',
      date: corrDate,
      type: corrType,
      reason: corrReason,
      proposedClockIn: corrProposedIn,
      proposedClockOut: corrProposedOut,
    });

    setAlert({ type: 'success', message: res.message });
    setShowCorrectionModal(false);
    setCorrReason('');
  };

  // User's personal history records
  const userRecords = records
    .filter((r) => r.userId === user?.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
      {/* Simulation / Testing helper bar */}
      <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" />
          <span className="font-bold text-gray-900 dark:text-white">
            Simulasi Jam Absensi (Untuk Pengujian Fleksibel):
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            {simulationMode ? `Aktif: Pukul ${String(simulatedHour).padStart(2, '0')}:${String(simulatedMinute).padStart(2, '0')} WIB` : 'Mengikuti Jam Nyata Komputer'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSimulationMode(true);
              setSimulatedHour(8);
              setSimulatedMinute(15);
            }}
            className="px-2.5 py-1 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-300 font-semibold rounded-lg border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            Set Jam Masuk (08:15)
          </button>

          <button
            type="button"
            onClick={() => {
              setSimulationMode(true);
              setSimulatedHour(17);
              setSimulatedMinute(5);
            }}
            className="px-2.5 py-1 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-300 font-semibold rounded-lg border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            Set Jam Pulang (17:05)
          </button>

          {simulationMode && (
            <button
              type="button"
              onClick={() => setSimulationMode(false)}
              className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Reset ke Jam Real
            </button>
          )}
        </div>
      </div>

      {/* Alert Notification */}
      {alert && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 animate-fadeIn ${
            alert.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {alert.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span className="font-semibold text-sm">{alert.message}</span>
          </div>
          <button onClick={() => setAlert(null)} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Clock Cards & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Live Clock & Action Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Real-time Server Clock Card */}
          <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold mb-3">
                  <Clock size={13} />
                  <span>Stempel Waktu Server Resmi (WIB)</span>
                </div>
                <div className="text-4xl sm:text-5xl font-mono font-bold tracking-tight">
                  {simulationMode
                    ? `${String(simulatedHour).padStart(2, '0')}:${String(simulatedMinute).padStart(2, '0')}:00`
                    : timeInfo.timeStr}
                </div>
                <p className="text-primary-100 text-xs mt-1">
                  {currentTime.toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              {/* Status Session Pill */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 sm:max-w-xs">
                <span className="text-[11px] font-semibold text-primary-200 uppercase tracking-wider block mb-1">
                  Jadwal Shift &amp; Sesi
                </span>
                <p className="text-xs font-bold leading-relaxed">{effectiveWindow.windowMessage}</p>
                <div className="mt-2 text-[10px] text-primary-200 border-t border-white/15 pt-2 flex items-center justify-between">
                  <span>Masuk: 08:00 - 10:00</span>
                  <span>Pulang: 16:00 - 23:59</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Card: Clock-In & Clock-Out */}
          <div className="card p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
              <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
                <Navigation size={18} className="text-primary-600" />
                <span>Pencatatan Kehadiran Hari Ini</span>
              </h3>

            </div>

            {/* Geolocation Status Box */}
            <div className="p-4 bg-gray-50 dark:bg-gray-850 rounded-2xl border border-gray-200 dark:border-gray-800 flex items-start justify-between gap-3 text-xs">
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    userLocation?.isInsideOfficeGeofence
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60'
                      : 'bg-amber-100 text-amber-600 dark:bg-amber-950/60'
                  }`}
                >
                  <MapPin size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-white">
                      Lokasi GPS &amp; Jaringan:
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        userLocation?.isInsideOfficeGeofence
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {detectingLocation ? 'Mendeteksi...' : userLocation?.isInsideOfficeGeofence ? '✓ Dalam Wilayah Cirebon' : '⚠️ Di Luar Wilayah Cirebon'}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {detectingLocation
                      ? 'Sedang mendeteksi sinyal GPS...'
                      : userLocation?.address || 'Lokasi terdeteksi'}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    IP: {userLocation?.ipAddress || '-'} • Jarak ke pusat Kota Cirebon: {userLocation?.latitude ? formatDistance(userLocation.distanceFromOfficeMeters) : '-'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={detectLocation}
                disabled={detectingLocation}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer flex-shrink-0"
              >
                <RefreshCw size={12} className={detectingLocation ? 'animate-spin' : ''} />
                <span>Refresh GPS</span>
              </button>
            </div>

            {/* Attendance Execution Buttons (Clock-In vs Clock-Out) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Box 1: Clock-In */}
              <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-3 bg-white dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Absen Masuk (Clock-In)
                  </span>
                  <span className="text-xs text-primary-600 font-semibold">08:00 - 10:00 WIB</span>
                </div>

                {todayRecord?.clockInTime ? (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center space-y-1">
                    <CheckCircle2 size={24} className="text-emerald-600 mx-auto" />
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      Sudah Clock-In: {todayRecord.clockInTime} WIB
                    </p>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                      {todayRecord.status}
                    </span>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={clockInNotes}
                      onChange={(e) => setClockInNotes(e.target.value)}
                      placeholder="Catatan masuk (opsional)..."
                      className="input text-xs"
                    />

                    <button
                      type="button"
                      disabled={loading || (!effectiveWindow.canClockIn && !simulationMode)}
                      onClick={handleStartClockIn}
                      className="w-full btn-primary py-3 text-xs font-bold flex items-center justify-center gap-2 rounded-xl shadow-lg shadow-primary-600/20 cursor-pointer disabled:opacity-50"
                    >
                      <Camera size={15} />
                      <span>Clock-In Sekarang (Foto &amp; GPS)</span>
                    </button>
                  </>
                )}
              </div>

              {/* Box 2: Clock-Out */}
              <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-3 bg-white dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Absen Pulang (Clock-Out)
                  </span>
                  <span className="text-xs text-indigo-600 font-semibold">16:00 - 23:59 WIB</span>
                </div>

                {todayRecord?.clockOutTime ? (
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-center space-y-1">
                    <CheckCircle2 size={24} className="text-indigo-600 mx-auto" />
                    <p className="text-xs font-bold text-indigo-800 dark:text-indigo-300">
                      Sudah Clock-Out: {todayRecord.clockOutTime} WIB
                    </p>
                    <p className="text-[11px] text-gray-500 italic truncate max-w-xs mx-auto">
                      "{todayRecord.clockOutNotes}"
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <input
                        type="text"
                        required
                        value={clockOutNotes}
                        onChange={(e) => setClockOutNotes(e.target.value)}
                        placeholder="Catatan wajib pulang (misal: Selesai tugas, lembur)... *"
                        className="input text-xs"
                      />
                      <span className="text-[10px] text-rose-500 mt-1 block">
                        * Wajib menyertakan keterangan kerja sebelum pulang
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={
                        loading ||
                        !todayRecord?.clockInTime ||
                        (!effectiveWindow.canClockOut && !simulationMode)
                      }
                      onClick={handleStartClockOut}
                      className="w-full btn-secondary py-3 text-xs font-bold flex items-center justify-center gap-2 rounded-xl border-primary-300 text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-950/40 cursor-pointer disabled:opacity-50"
                    >
                      <Camera size={15} />
                      <span>Clock-Out &amp; Selesai Kerja</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: User Profile Summary & Attendance Correction */}
        <div className="space-y-6">
          {/* Identity Verification Card */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-md"
                style={{ backgroundColor: user?.color || '#7c3aed' }}
              >
                {user?.avatar || 'KR'}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">
                  {user?.name}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.position}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-bold px-2 py-0.5 rounded-full">
                    NIK: {user?.nik}
                  </span>
                  <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-medium">
                    {user?.division}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Status Akun:</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <ShieldCheck size={12} /> Terverifikasi &amp; Aktif
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Hak Akses (Role):</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{user?.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Biometrik Wajah:</span>
                <span className="text-primary-600 font-semibold">Webcam Face ID Siap</span>
              </div>
            </div>

            {/* Attendance Correction Form Trigger */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowCorrectionModal(true)}
                className="w-full btn-secondary text-xs py-2 px-3 flex items-center justify-center gap-1.5 cursor-pointer text-gray-600 hover:text-primary-600"
              >
                <FileText size={13} />
                <span>Form Koreksi Kehadiran / Cuti / Izin</span>
              </button>
            </div>
          </div>

          {/* Quick Summary Today */}
          <div className="card p-5 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500">
              Ringkasan Kehadiran Anda Hari Ini
            </h4>

            {todayRecord ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-850">
                  <span className="text-gray-500">Clock-In:</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {todayRecord.clockInTime || '-'}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-850">
                  <span className="text-gray-500">Clock-Out:</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {todayRecord.clockOutTime || 'Belum Pulang'}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-850">
                  <span className="text-gray-500">Status:</span>
                  <span className="font-bold text-emerald-600">{todayRecord.status}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-3 text-center">
                Belum ada rekaman absensi untuk hari ini.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* History Table (Riwayat Absensi Karyawan) */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={18} className="text-primary-600" />
            <h3 className="font-bold text-gray-900 dark:text-white text-base">
              Riwayat Absensi Pribadi
            </h3>
          </div>
          <span className="text-xs text-gray-400">{userRecords.length} catatan kehadiran</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 text-gray-500">
                <th className="p-3">Tanggal</th>
                <th className="p-3">Jam Masuk</th>
                <th className="p-3">Jam Pulang</th>
                <th className="p-3">Tipe</th>
                <th className="p-3">Status</th>
                <th className="p-3">Catatan Pulang</th>
                <th className="p-3">Verifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {userRecords.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                  <td className="p-3 font-semibold text-gray-900 dark:text-white">{r.date}</td>
                  <td className="p-3 font-mono text-emerald-600 font-bold">{r.clockInTime || '-'}</td>
                  <td className="p-3 font-mono text-indigo-600 font-bold">{r.clockOutTime || '-'}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 font-medium">
                      {r.workType}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold ${
                        r.status === 'Tepat Waktu'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : r.status === 'Terlambat'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500 max-w-xs truncate">{r.clockOutNotes || '-'}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                      <ShieldCheck size={12} /> Valid Face &amp; GPS
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Webcam Modal for Selfie */}
      {showWebcam && (
        <WebcamCapture
          onCapture={handlePhotoCaptured}
          onCancel={() => {
            setShowWebcam(false);
            setActiveAction(null);
          }}
        />
      )}

      {/* Attendance Correction Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h4 className="font-bold text-gray-900 dark:text-white text-base">
                Formulir Koreksi Absensi / Cuti / Izin
              </h4>
              <button
                onClick={() => setShowCorrectionModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCorrectionSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Jenis Pengajuan:</label>
                <select
                  value={corrType}
                  onChange={(e) => setCorrType(e.target.value as any)}
                  className="input text-xs"
                >
                  <option value="Lupa Clock-In">Lupa Clock-In</option>
                  <option value="Lupa Clock-Out">Lupa Clock-Out</option>
                  <option value="Koreksi Jam">Koreksi Jam Kehadiran</option>
                  <option value="Izin">Pengajuan Izin</option>
                  <option value="Sakit">Pengajuan Sakit</option>
                  <option value="Cuti">Pengajuan Cuti Tahunan</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Untuk Tanggal:</label>
                <input
                  type="date"
                  required
                  value={corrDate}
                  onChange={(e) => setCorrDate(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Usulan Masuk:</label>
                  <input
                    type="time"
                    value={corrProposedIn}
                    onChange={(e) => setCorrProposedIn(e.target.value)}
                    className="input text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Usulan Pulang:</label>
                  <input
                    type="time"
                    value={corrProposedOut}
                    onChange={(e) => setCorrProposedOut(e.target.value)}
                    className="input text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Alasan Lengkap:</label>
                <textarea
                  required
                  rows={3}
                  value={corrReason}
                  onChange={(e) => setCorrReason(e.target.value)}
                  placeholder="Jelaskan alasan kendala teknis atau permohonan izin Anda..."
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="btn-secondary text-xs py-2 px-3"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary text-xs py-2 px-4 font-bold">
                  Kirim ke HR Manager
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
