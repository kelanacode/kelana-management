import React, { useState } from 'react';
import {
  Users, CheckCircle2, Clock, AlertTriangle, FileSpreadsheet, Download,
  Filter, Search, ShieldCheck, XCircle, ChevronDown, Check, X, Eye, Calendar,
  TrendingUp, Building, ArrowUpRight
} from 'lucide-react';
import { useAttendanceStore } from '../stores/attendanceStore';
import { useAuthStore } from '../stores/authStore';
import { AttendanceStatus } from '../types/attendance';

export const HRAttendanceDashboard: React.FC = () => {
  const { session } = useAuthStore();
  const { records, corrections, approveCorrection, rejectCorrection, exportAttendanceReport } = useAttendanceStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('Semua Divisi');
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua Status');
  const [dateFilter, setDateFilter] = useState('');

  // Selected photo viewer modal
  const [viewingPhoto, setViewingPhoto] = useState<{ url: string; title: string } | null>(null);

  // Review modal state
  const [reviewingCorrId, setReviewingCorrId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // Stats Calculations for Today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecords = records.filter((r) => r.date === (dateFilter || todayStr));

  const totalHadir = todayRecords.filter((r) => r.status === 'Tepat Waktu').length;
  const totalTerlambat = todayRecords.filter((r) => r.status === 'Terlambat').length;
  const totalAnomali = todayRecords.filter((r) => r.hasAnomaly).length;
  const pendingCorrectionsCount = corrections.filter((c) => c.status === 'Pending').length;

  // Filtered records
  const filteredRecords = records.filter((r) => {
    const matchSearch =
      r.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.userNik.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDiv = selectedDivision === 'Semua Divisi' || r.userDivision === selectedDivision;
    const matchStatus = selectedStatus === 'Semua Status' || r.status === selectedStatus;
    const matchDate = !dateFilter || r.date === dateFilter;

    return matchSearch && matchDiv && matchStatus && matchDate;
  });

  const handleExportCSV = () => {
    const csvData = exportAttendanceReport(dateFilter);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Absensi_HR_Kelana_${dateFilter || 'All'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApprove = (id: string) => {
    approveCorrection(id, session?.user.name || 'HR Manager', reviewNotes);
    setReviewingCorrId(null);
    setReviewNotes('');
  };

  const handleReject = (id: string) => {
    rejectCorrection(id, session?.user.name || 'HR Manager', reviewNotes);
    setReviewingCorrId(null);
    setReviewNotes('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-bold text-xs">
              Portal Khusus HR &amp; Administrator
            </span>
            <span className="text-xs text-gray-400">• Live Attendance Monitor</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard Pengawasan Kehadiran &amp; Rekap Payroll
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Pantau kehadiran real-time seluruh karyawan, verifikasi log anomali geofencing, dan setujui permohonan koreksi/cuti.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="btn-primary py-2.5 px-4 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md rounded-xl flex-shrink-0"
        >
          <FileSpreadsheet size={15} />
          <span>Ekspor Rekap Excel / CSV</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 space-y-1">
          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Hadir Tepat Waktu</span>
          <div className="text-2xl font-bold text-emerald-600">{totalHadir}</div>
          <p className="text-[10px] text-emerald-600 flex items-center gap-0.5">
            <CheckCircle2 size={10} /> Sesuai Jadwal
          </p>
        </div>

        <div className="card p-4 space-y-1">
          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Terlambat (&gt; 08:30)</span>
          <div className="text-2xl font-bold text-amber-500">{totalTerlambat}</div>
          <p className="text-[10px] text-amber-500 flex items-center gap-0.5">
            <Clock size={10} /> Dalam Batas Toleransi
          </p>
        </div>

        <div className="card p-4 space-y-1">
          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Log Anomali Lokasi</span>
          <div className="text-2xl font-bold text-rose-500">{totalAnomali}</div>
          <p className="text-[10px] text-rose-500 flex items-center gap-0.5">
            <AlertTriangle size={10} /> Di Luar Radius Kantor
          </p>
        </div>

        <div className="card p-4 space-y-1">
          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Permohonan Koreksi / Cuti</span>
          <div className="text-2xl font-bold text-primary-600">{pendingCorrectionsCount}</div>
          <p className="text-[10px] text-primary-600 font-semibold">Memerlukan Approval HR</p>
        </div>
      </div>

      {/* Pending Approval Section */}
      {corrections.filter((c) => c.status === 'Pending').length > 0 && (
        <div className="card p-5 border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              <Clock size={16} className="text-amber-500" />
              <span>Pengajuan Koreksi Absensi / Cuti / Izin Menunggu Persetujuan ({corrections.filter((c) => c.status === 'Pending').length})</span>
            </h3>
          </div>

          <div className="space-y-2">
            {corrections
              .filter((c) => c.status === 'Pending')
              .map((corr) => (
                <div
                  key={corr.id}
                  className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-white text-sm">{corr.userName}</span>
                      <span className="text-gray-400 font-mono text-[10px]">{corr.userNik}</span>
                      <span className="px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-bold text-[10px]">
                        {corr.type}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">
                      Tanggal: <span className="font-semibold">{corr.date}</span> • Alasan: "{corr.reason}"
                    </p>
                    {corr.proposedClockIn && (
                      <p className="text-[11px] text-gray-400">
                        Usulan Jam Masuk: {corr.proposedClockIn} | Jam Pulang: {corr.proposedClockOut || '-'}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleApprove(corr.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Check size={12} /> Setujui (Approve)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(corr.id)}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold flex items-center gap-1 cursor-pointer transition-colors border border-rose-200"
                    >
                      <X size={12} /> Tolak (Reject)
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Main Attendance Table & Filters */}
      <div className="card p-6 space-y-4">
        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama karyawan / NIK..."
                className="input pl-8 text-xs py-1.5"
              />
            </div>

            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="input text-xs py-1.5 w-auto"
            >
              <option value="Semua Divisi">Semua Divisi</option>
              <option value="Teknologi & IT">Teknologi & IT</option>
              <option value="Produk & Desain">Produk & Desain</option>
              <option value="Pemasaran & Bisnis">Pemasaran & Bisnis</option>
              <option value="Operasional & HR">Operasional & HR</option>
              <option value="Keuangan & Legal">Keuangan & Legal</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input text-xs py-1.5 w-auto"
            >
              <option value="Semua Status">Semua Status</option>
              <option value="Tepat Waktu">Tepat Waktu</option>
              <option value="Terlambat">Terlambat</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
              <option value="Cuti">Cuti</option>
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="input text-xs py-1.5 w-auto"
              title="Filter Tanggal Tertentu"
            />

            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="text-xs text-primary-600 hover:underline"
              >
                Reset Tanggal
              </button>
            )}
          </div>

          <span className="text-xs text-gray-400">
            Menampilkan {filteredRecords.length} rekaman absensi
          </span>
        </div>

        {/* Live Attendance Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 text-gray-500 font-semibold">
                <th className="p-3">Karyawan</th>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Jam Masuk</th>
                <th className="p-3">Jam Pulang</th>
                <th className="p-3">Status Kehadiran</th>
                <th className="p-3">Lokasi / IP</th>
                <th className="p-3">Foto Biometrik</th>
                <th className="p-3">Catatan Pulang</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    Tidak ada data absensi yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                    <td className="p-3">
                      <div>
                        <span className="font-bold text-gray-900 dark:text-white">{r.userName}</span>
                        <div className="text-[11px] text-gray-400">
                          {r.userNik} • {r.userDivision}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-gray-700 dark:text-gray-300 font-mono">{r.date}</td>
                    <td className="p-3">
                      {r.clockInTime ? (
                        <span className="font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                          {r.clockInTime}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      {r.clockOutTime ? (
                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                          {r.clockOutTime}
                        </span>
                      ) : (
                        <span className="text-amber-500 font-medium">Belum Pulang</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="space-y-0.5">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] inline-block ${
                            r.status === 'Tepat Waktu'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : r.status === 'Terlambat'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          {r.status}
                        </span>
                        {r.hasAnomaly && (
                          <div className="text-[10px] text-rose-500 flex items-center gap-0.5">
                            <AlertTriangle size={10} />
                            <span>{r.anomalyReason}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 max-w-xs truncate text-gray-600 dark:text-gray-400">
                      <div>
                        <span>{r.clockInLocation?.address || 'Kantor'}</span>
                        <div className="text-[10px] text-gray-400">{r.clockInLocation?.ipAddress}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      {r.clockInSelfiePhoto ? (
                        <button
                          type="button"
                          onClick={() =>
                            setViewingPhoto({
                              url: r.clockInSelfiePhoto!,
                              title: `Foto Absensi ${r.userName} (${r.date} - ${r.clockInTime})`,
                            })
                          }
                          className="flex items-center gap-1 px-2 py-1 rounded bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-300 font-semibold hover:underline cursor-pointer"
                        >
                          <Eye size={12} /> Lihat Foto
                        </button>
                      ) : (
                        <span className="text-gray-400 text-[11px]">-</span>
                      )}
                    </td>
                    <td className="p-3 max-w-xs truncate text-gray-500">
                      {r.clockOutNotes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal View Photo Selfie */}
      {viewingPhoto && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setViewingPhoto(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-3xl p-5 max-w-sm w-full space-y-3 shadow-2xl border border-gray-200 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-gray-900 dark:text-white truncate">
                {viewingPhoto.title}
              </h4>
              <button onClick={() => setViewingPhoto(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <img
              src={viewingPhoto.url}
              alt="Bukti Selfie Absensi"
              className="w-full h-64 object-cover rounded-2xl border border-gray-200 dark:border-gray-700"
            />
            <div className="text-center pt-1">
              <span className="text-[11px] text-emerald-600 font-bold flex items-center justify-center gap-1">
                <ShieldCheck size={13} /> Terotentikasi Server Ruang Kelana
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
