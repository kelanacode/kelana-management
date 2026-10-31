// Geolocation and Geofencing utilities for Ruang Kelana Attendance

// Wilayah yang diizinkan untuk absensi.
// Lokasi dicocokkan dari nama wilayah hasil GPS; titik pusat & radius dipakai
// sebagai cadangan bila nama wilayah gagal didapat.
export const ATTENDANCE_AREAS = [
  { name: 'Cirebon', pattern: /cirebon/i, latitude: -6.732, longitude: 108.5523, radiusMeters: 30000 },
  { name: 'Bandung', pattern: /bandung/i, latitude: -6.9175, longitude: 107.6191, radiusMeters: 25000 },
  { name: 'Jakarta', pattern: /jakarta/i, latitude: -6.2088, longitude: 106.8456, radiusMeters: 25000 },
];

export const ATTENDANCE_AREA_LABEL = 'Cirebon, Bandung, atau Jakarta';

// Dipertahankan untuk kode lama yang memakai nama area
export const DEFAULT_OFFICE = {
  name: ATTENDANCE_AREA_LABEL,
  latitude: ATTENDANCE_AREAS[0].latitude,
  longitude: ATTENDANCE_AREAS[0].longitude,
  radiusMeters: ATTENDANCE_AREAS[0].radiusMeters,
};

// Wilayah terdekat beserta jaraknya ke pusat kota
export function nearestAttendanceArea(lat: number, lon: number) {
  return ATTENDANCE_AREAS.map((area) => ({
    area,
    distance: calculateDistanceInMeters(lat, lon, area.latitude, area.longitude),
  })).sort((x, y) => x.distance - y.distance)[0];
}

// Wilayah tempat lokasi berada, atau null bila di luar semua wilayah yang diizinkan
export function matchAttendanceArea(lat: number, lon: number, address?: string) {
  const hasPlaceName = !!address && /[a-z]/i.test(address);
  if (hasPlaceName) return ATTENDANCE_AREAS.find((area) => area.pattern.test(address!)) ?? null;
  const nearest = nearestAttendanceArea(lat, lon);
  return nearest.distance <= nearest.area.radiusMeters ? nearest.area : null;
}

export const formatDistance = (meters: number) =>
  meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;

// Reverse geocode coordinates to real street/city name using OpenStreetMap Nominatim
export async function reverseGeocodeCoordinates(lat: number, lon: number): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        signal: controller.signal,
        headers: {
          'Accept-Language': 'id,en',
        },
      }
    );
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error('Geocoding service unavailable');
    const data = await res.json();
    return data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
}

// Fetch public IP address of current device
export async function getDeviceNetworkInfo(): Promise<{ ip: string; isp?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error('IP service error');
    const data = await res.json();
    return { ip: data.ip || '127.0.0.1' };
  } catch {
    return { ip: '192.168.1.104 (Jaringan Lokal)' };
  }
}

// Calculate distance between two coordinates in meters (Haversine Formula)
export function calculateDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Get Server / WIB Formatted Time
export function getServerTimestampWIB(date = new Date()): {
  iso: string;
  timeStr: string;
  dateStr: string;
  hours: number;
  minutes: number;
} {
  // Format WIB (UTC+7)
  const iso = date.toISOString();
  const timeStr = date.toLocaleTimeString('id-ID', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const dateStr = date.toISOString().split('T')[0];
  const hours = date.getHours();
  const minutes = date.getMinutes();

  return { iso, timeStr, dateStr, hours, minutes };
}

// Check whether current time is within allowed windows
// Jam Masuk: 08:00 - 10:00
// Jam Pulang: 16:00 - 23:59
export function checkAttendanceWindow(date = new Date()): {
  canClockIn: boolean;
  canClockOut: boolean;
  isClockInLate: boolean;
  windowMessage: string;
} {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  const clockInStartMin = 8 * 60; // 08:00 (480)
  const clockInEndMin = 10 * 60; // 10:00 (600)
  const clockOutStartMin = 16 * 60; // 16:00 (960)
  const clockOutEndMin = 23 * 60 + 59; // 23:59 (1439)

  const canClockIn = totalMinutes >= clockInStartMin && totalMinutes <= clockInEndMin;
  const canClockOut = totalMinutes >= clockOutStartMin && totalMinutes <= clockOutEndMin;

  // Lewat jam 08:30 dianggap Terlambat dalam rentang 08:00 - 10:00
  const isClockInLate = canClockIn && totalMinutes > 8 * 60 + 30;

  let windowMessage = '';
  if (canClockIn) {
    windowMessage = isClockInLate
      ? '⚠️ Anda dalam sesi Absen Masuk (Status: Terlambat > 08:30 WIB)'
      : '🟢 Sesi Absen Masuk Aktif (08:00 - 10:00 WIB)';
  } else if (canClockOut) {
    windowMessage = '🟢 Sesi Absen Pulang Aktif (16:00 - 23:59 WIB)';
  } else if (totalMinutes < clockInStartMin) {
    windowMessage = '⏳ Sesi Absen Masuk belum dibuka (Buka pukul 08:00 WIB)';
  } else if (totalMinutes > clockInEndMin && totalMinutes < clockOutStartMin) {
    windowMessage = '⏱️ Jam kerja berlangsung. Sesi Absen Pulang dibuka pukul 16:00 WIB';
  } else {
    windowMessage = '🔒 Di luar jam operasional absensi kantor';
  }

  return {
    canClockIn,
    canClockOut,
    isClockInLate,
    windowMessage,
  };
}
