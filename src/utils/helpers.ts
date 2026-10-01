/**
 * Utility helpers for the CMMS App
 */

/**
 * Format a timestamp to Indonesian locale date string
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format a timestamp to short date
 */
export function formatShortDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a timestamp with time
 */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get relative time string (e.g., "2 jam lalu")
 */
export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) {
    return formatShortDate(timestamp);
  }
  if (days > 0) {
    return `${days} hari lalu`;
  }
  if (hours > 0) {
    return `${hours} jam lalu`;
  }
  if (minutes > 0) {
    return `${minutes} menit lalu`;
  }
  return 'Baru saja';
}

/**
 * Category icon mapping (emoji)
 */
export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    hvac: '❄️',
    cooling: '🧊',
    electrical: '⚡',
    plumbing: '🔧',
    other: '🔩',
  };
  return icons[category] || '🔩';
}

/**
 * Status color mapping
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ok: '#2ECC71',
    warning: '#F39C12',
    critical: '#E74C3C',
    na: '#7F8C9B',
    active: '#2ECC71',
    inactive: '#7F8C9B',
    maintenance: '#F39C12',
    completed: '#2ECC71',
    in_progress: '#3498DB',
    draft: '#7F8C9B',
    reviewed: '#9B59B6',
  };
  return colors[status] || '#7F8C9B';
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Validate numeric value against min/max range
 */
export function validateNumericRange(
  value: number,
  min: number | null,
  max: number | null,
): 'ok' | 'warning' | 'critical' {
  if (min === null || max === null) return 'ok';
  if (value >= min && value <= max) return 'ok';
  if (value >= min * 0.9 && value <= max * 1.1) return 'warning';
  return 'critical';
}

/**
 * Extract clean POP ID (e.g. "POP_1KDI10022_BTNX" -> "POP_1KDI10022")
 * Takes parts up to the second underscore.
 */
export function cleanPopId(code: string): string {
  if (!code) return '';
  const parts = code.split('_');
  if (parts.length >= 2) {
    return `${parts[0]}_${parts[1]}`;
  }
  return code;
}

/**
 * Extract clean POP Name (e.g. "POP_1KDI001_KENDARI AREA PLN" -> "KENDARI AREA PLN")
 * Returns text after the second underscore if present, or strips "POP_xxx_" prefix.
 */
export function cleanPopName(codeOrName: string): string {
  if (!codeOrName) return '';
  const parts = codeOrName.split('_');
  if (parts.length >= 3) {
    return parts.slice(2).join('_').trim();
  }
  if (codeOrName.match(/^POP_[a-zA-Z0-9]+_/i)) {
    return codeOrName.replace(/^POP_[a-zA-Z0-9]+_/i, '').trim();
  }
  return codeOrName;
}

/**
 * Clean inspector name (replaces "Inspector" or empty with "Teknisi")
 */
export function cleanInspectorName(name?: string): string {
  if (!name || !name.trim() || name.trim().toLowerCase() === 'inspector') {
    return 'Teknisi';
  }
  return name.trim();
}

/**
 * Request runtime camera permission on Android
 */
export async function requestCameraPermission(): Promise<boolean> {
  const { PermissionsAndroid, Platform } = require('react-native');
  if (Platform.OS === 'android') {
    try {
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );
      if (hasPermission) return true;

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Izin Kamera',
          message: 'Aplikasi memerlukan akses kamera untuk mengambil foto POP.',
          buttonNeutral: 'Nanti',
          buttonNegative: 'Batal',
          buttonPositive: 'Izinkan',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Camera permission error:', err);
      return false;
    }
  }
  return true;
}

/**
 * Request runtime location permission on Android
 */
export async function requestLocationPermission(): Promise<boolean> {
  const { PermissionsAndroid, Platform } = require('react-native');
  if (Platform.OS === 'android') {
    try {
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      if (hasPermission) return true;

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Izin GPS / Lokasi',
          message:
            'Aplikasi memerlukan izin lokasi GPS untuk menentukan posisi POP terdekat.',
          buttonNeutral: 'Nanti',
          buttonNegative: 'Batal',
          buttonPositive: 'Izinkan',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Location permission error:', err);
      return false;
    }
  }
  return true;
}

/**
 * Reverse geocode latitude and longitude to full address string
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: { 'User-Agent': 'CMMSApp/1.0 (Android)' },
        signal: controller.signal,
      },
    );
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const a = data.address;
        const street =
          a.road || a.pedestrian || a.path || a.building || a.amenity || '';
        const village =
          a.village ||
          a.suburb ||
          a.neighbourhood ||
          a.hamlet ||
          a.quarter ||
          '';
        const district = a.city_district || a.subdistrict || a.county || '';
        const city = a.city || a.town || a.regency || '';

        const parts = [street, village, district, city].filter(Boolean);
        if (parts.length > 0) return parts.join(', ');
      }
      if (data && data.display_name) {
        return data.display_name;
      }
    }
  } catch (e) {
    try {
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 4000);
      const res2 = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=id`,
        { signal: controller2.signal },
      );
      clearTimeout(timeoutId2);
      if (res2.ok) {
        const data2 = await res2.json();
        const parts = [
          data2.locality || data2.city,
          data2.principalSubdivision,
          data2.countryName,
        ].filter(Boolean);
        if (parts.length > 0) return parts.join(', ');
      }
    } catch (e2) {
      console.warn('Reverse geocoding failed:', e2);
    }
  }
  return null;
}

/**
 * Fetch high accuracy real-time GPS location + Reverse Geocoded Full Address
 */
export async function fetchCurrentLocation(): Promise<{
  lat: number;
  lng: number;
  address?: string;
} | null> {
  const Geolocation = require('@react-native-community/geolocation').default;
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) return null;

  const getPos = (highAcc: boolean) =>
    new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (pos: any) =>
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err: any) => reject(err),
        { enableHighAccuracy: highAcc, timeout: 8000, maximumAge: 0 },
      );
    });

  try {
    let coords: { lat: number; lng: number; address?: string } | null = null;
    try {
      coords = await getPos(true);
    } catch (e1) {
      coords = await getPos(false);
    }

    if (coords) {
      const address = await reverseGeocode(coords.lat, coords.lng);
      if (address) {
        coords.address = address;
      }
    }
    return coords;
  } catch (e2) {
    console.warn('GPS location fetch error:', e2);
    return null;
  }
}

/**
 * Fetch real-time GPS coordinate string (lat, lng) with high accuracy
 */
export async function getLiveCoordinatesString(): Promise<string | null> {
  const Geolocation = require('@react-native-community/geolocation').default;
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) return null;

  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      (pos: any) => {
        resolve(
          `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(
            5,
          )}`,
        );
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 3500, maximumAge: 0 },
    );
  });
}

/**
 * Get current Indonesian timestamp string for photos
 */
export function getCurrentFormattedTimestamp(): string {
  const now = new Date();
  return `${now.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })} ${now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })} WITA`;
}

/**
 * Share PDF file using native Android FileProvider intent or fallback Share.share
 */
export async function sharePdfFile(
  filePath: string,
  title?: string,
  message?: string,
): Promise<void> {
  const { Platform, NativeModules, Share } = require('react-native');
  if (!filePath) {
    throw new Error('Path PDF tidak valid');
  }

  // On Android, use native PdfDownloader which handles local files, remote URLs, and telegram:// URIs
  if (Platform.OS === 'android' && NativeModules.PdfDownloader?.sharePdf) {
    await NativeModules.PdfDownloader.sharePdf(
      filePath,
      title || 'Bagikan PDF',
      message || '',
    );
    return;
  }

  let targetUrl = filePath;
  if (targetUrl.startsWith('telegram://')) {
    try {
      const { resolveTelegramUri } = require('../services/telegramStorage');
      const resolved = await resolveTelegramUri(targetUrl);
      if (resolved) {
        targetUrl = resolved;
      }
    } catch (e) {}
  }

  await Share.share({
    url: targetUrl,
    title: title || 'Bagikan PDF',
    message: message ? `${message}\n${targetUrl}` : targetUrl,
  });
}

/**
 * Formats image URI for React Native Image & WebView on Android
 */
export const formatImageUri = (uri?: string): string => {
  if (!uri) return '';
  const cleanUri = uri.trim();
  if (
    cleanUri.startsWith('http://') ||
    cleanUri.startsWith('https://') ||
    cleanUri.startsWith('data:') ||
    cleanUri.startsWith('file://') ||
    cleanUri.startsWith('content://')
  ) {
    return cleanUri;
  }
  return `file://${cleanUri}`;
};
