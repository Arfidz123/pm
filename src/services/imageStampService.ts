import { Platform, NativeModules } from 'react-native';

export interface PhotoStampOptions {
  timestamp?: string;
  coordinates?: string;
  address?: string;
}

/**
 * Membakar (burn-in) stempel waktu, koordinat, dan lokasi langsung ke dalam file foto
 * menggunakan Android Native Canvas sebelum diunggah ke Telegram.
 * 
 * Menghasilkan file gambar JPEG baru di cache dengan badge stempel permanen.
 */
export const stampPhotoWithMetadata = async (
  uri: string,
  options: PhotoStampOptions = {},
): Promise<string> => {
  if (!uri) return uri;

  const cleanUri = uri.trim();

  // Lewati jika sudah link cloud / URL online / telegram:// atau sudah dicap sebelumnya
  if (
    cleanUri.startsWith('http://') ||
    cleanUri.startsWith('https://') ||
    cleanUri.startsWith('telegram://') ||
    cleanUri.includes('stamp_')
  ) {
    return cleanUri;
  }

  // Jika tidak ada metadata apa pun yang ingin dicap, kembalikan uri asli
  if (
    !options.timestamp &&
    !options.coordinates &&
    !options.address
  ) {
    return cleanUri;
  }

  // Pada Android, gunakan Native Module
  if (Platform.OS === 'android' && NativeModules.PdfDownloader?.stampPhoto) {
    try {
      const stampedPath: string = await NativeModules.PdfDownloader.stampPhoto(
        cleanUri,
        {
          timestamp: options.timestamp || '',
          coordinates: options.coordinates || '',
          address: options.address || '',
          label: '',
        },
      );
      if (stampedPath && stampedPath.length > 0) {
        return stampedPath;
      }
    } catch (err) {
      console.warn('[ImageStamp] Gagal menstempel foto, fallback ke foto asli:', err);
    }
  }

  return cleanUri;
};
