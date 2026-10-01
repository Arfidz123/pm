/**
 * Telegram Cloud Storage Service
 * Unlimited & Free Forever Cloud Storage for CMMS Inspection Photos and PDF Reports
 */

import { Platform } from 'react-native';
import { stampPhotoWithMetadata, PhotoStampOptions } from './imageStampService';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

// Konfigurasi default Telegram Bot & Channel
export const telegramConfig: TelegramConfig = {
  botToken: '8697587330:AAEzhquov9zrxFQvmIvPhxEchwMpsptp2ZE',
  chatId: '-1004478764602', // Channel: Laporan PM
};

/**
 * Set konfigurasi Telegram secara dinamis saat runtime
 */
export const setTelegramConfig = (token: string, chatId: string) => {
  telegramConfig.botToken = token.trim();
  telegramConfig.chatId = chatId.trim();
};

/**
 * Helper untuk menentukan MIME type
 */
const getMimeType = (extension: string): string => {
  switch (extension.toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
};

/**
 * Mendapatkan link download file langsung dari file_id Telegram
 */
export const getTelegramFileUrl = async (
  fileId: string,
  botToken: string = telegramConfig.botToken,
): Promise<string | null> => {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`,
    );
    const data = await res.json();
    if (data.ok && data.result?.file_path) {
      return `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;
    }
    console.warn('Failed to get Telegram file path:', data);
    return null;
  } catch (err) {
    console.warn('Error fetching Telegram file path:', err);
    return null;
  }
};

export interface TelegramUploadResult {
  downloadUrl: string;
  fileId: string | null;
  telegramUri: string | null;
}

const resolvedUrlCache = new Map<string, { url: string; timestamp: number }>();

/**
 * Resolves telegram://<fileId> or expired Telegram URLs to a fresh, active download URL
 */
export const resolveTelegramUri = async (uri: string): Promise<string> => {
  if (!uri) return '';
  const trimmed = uri.trim();

  if (trimmed.startsWith('telegram://')) {
    const fileId = trimmed.replace('telegram://', '');
    const cached = resolvedUrlCache.get(fileId);
    if (cached && Date.now() - cached.timestamp < 45 * 60 * 1000) {
      return cached.url;
    }
    const freshUrl = await getTelegramFileUrl(fileId);
    if (freshUrl) {
      resolvedUrlCache.set(fileId, { url: freshUrl, timestamp: Date.now() });
      return freshUrl;
    }
    return trimmed;
  }


  return trimmed;
};

/**
 * Recursively resolves all telegram://<fileId> URIs in an object or array to active HTTPS URLs
 */
export const resolveAllTelegramUrisInObject = async <T>(obj: T): Promise<T> => {
  if (!obj) return obj;

  if (typeof obj === 'string') {
    if (obj.startsWith('telegram://')) {
      const resolved = await resolveTelegramUri(obj);
      return resolved as unknown as T;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    const resolvedArray = await Promise.all(
      obj.map(item => resolveAllTelegramUrisInObject(item)),
    );
    return resolvedArray as unknown as T;
  }

  if (typeof obj === 'object') {
    const resolvedObj: any = {};
    const keys = Object.keys(obj);
    await Promise.all(
      keys.map(async key => {
        resolvedObj[key] = await resolveAllTelegramUrisInObject(
          (obj as any)[key],
        );
      }),
    );
    return resolvedObj as T;
  }

  return obj;
};

/**
 * Detailed upload function that returns downloadUrl, fileId, and telegramUri
 */
export const uploadFileToTelegramDetailed = async (
  localUri: string,
  caption: string = 'CMMS Inspection Media',
  stampOptions?: PhotoStampOptions,
): Promise<TelegramUploadResult> => {
  if (!localUri) return { downloadUrl: '', fileId: null, telegramUri: null };

  if (localUri.startsWith('http://') || localUri.startsWith('https://')) {
    return { downloadUrl: localUri, fileId: null, telegramUri: localUri };
  }

  if (!telegramConfig.botToken || !telegramConfig.chatId) {
    console.log(
      '[Telegram Storage] Bot token / Chat ID belum disetel, file tetap disimpan di lokal.',
    );
    return { downloadUrl: localUri, fileId: null, telegramUri: null };
  }

  try {
    let cleanPath = localUri;
    if (Platform.OS === 'android') {
      if (
        !cleanPath.startsWith('file://') &&
        !cleanPath.startsWith('content://')
      ) {
        cleanPath = `file://${cleanPath}`;
      }
    }

    const rawPath = cleanPath.split('?')[0];
    const ext =
      rawPath.substring(rawPath.lastIndexOf('.') + 1).toLowerCase() || 'jpg';
    const isPdf = ext === 'pdf';
    const mimeType = getMimeType(ext);
    const fileName = `${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}.${ext}`;

    // Burn-in timestamp & metadata ke foto sebelum diunggah jika ada stampOptions
    let uploadPath = cleanPath;
    if (
      !isPdf &&
      stampOptions &&
      (stampOptions.timestamp ||
        stampOptions.coordinates ||
        stampOptions.label ||
        stampOptions.address)
    ) {
      try {
        uploadPath = await stampPhotoWithMetadata(cleanPath, stampOptions);
      } catch (stampErr) {
        console.warn('[Telegram Storage] Gagal stamp foto, kirim foto asli:', stampErr);
      }
    }

    const endpoint = isPdf
      ? `https://api.telegram.org/bot${telegramConfig.botToken}/sendDocument`
      : `https://api.telegram.org/bot${telegramConfig.botToken}/sendPhoto`;

    console.log(
      `[Telegram Storage] Memulai upload: ${uploadPath} ke endpoint: ${endpoint}`,
    );

    // Format caption Telegram yang informatif jika stampOptions diberikan
    let finalCaption = caption;
    if (
      (!caption || caption === 'CMMS Inspection Media') &&
      stampOptions &&
      (stampOptions.timestamp ||
        stampOptions.coordinates ||
        stampOptions.label ||
        stampOptions.address)
    ) {
      const parts: string[] = [];
      if (stampOptions.timestamp) parts.push(`🗓️ Waktu: ${stampOptions.timestamp}`);
      if (stampOptions.coordinates) parts.push(`📍 Koordinat: ${stampOptions.coordinates}`);
      if (stampOptions.address) parts.push(`🏢 Lokasi: ${stampOptions.address}`);
      finalCaption = parts.join('\n');
    }

    const formData = new FormData();
    formData.append('chat_id', telegramConfig.chatId);
    if (finalCaption) {
      formData.append('caption', finalCaption);
    }

    const fileField = isPdf ? 'document' : 'photo';
    formData.append(fileField, {
      uri: uploadPath,
      type: mimeType,
      name: fileName,
    } as any);

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.ok && result.result) {
      let fileId = '';
      if (isPdf && result.result.document) {
        fileId = result.result.document.file_id;
      } else if (result.result.photo && Array.isArray(result.result.photo)) {
        const highestResPhoto =
          result.result.photo[result.result.photo.length - 1];
        fileId = highestResPhoto.file_id;
      }

      if (fileId) {
        const downloadUrl = await getTelegramFileUrl(fileId);
        const telegramUri = `telegram://${fileId}`;
        if (downloadUrl) {
          resolvedUrlCache.set(fileId, {
            url: downloadUrl,
            timestamp: Date.now(),
          });
          console.log(
            `[Telegram Storage] Berhasil upload ${fileName} ➜ file_id: ${fileId}`,
          );
        }
        return {
          downloadUrl: downloadUrl || localUri,
          fileId,
          telegramUri,
        };
      }
    } else {
      console.warn('[Telegram Storage] Upload API error:', result);
    }

    return { downloadUrl: localUri, fileId: null, telegramUri: null };
  } catch (error) {
    console.warn('[Telegram Storage] Upload exception:', error);
    return { downloadUrl: localUri, fileId: null, telegramUri: null };
  }
};

/**
 * Mengunggah file (Foto / PDF) ke Channel Telegram dan mengembalikan link download
 */
export const uploadFileToTelegram = async (
  localUri: string,
  caption: string = 'CMMS Inspection Media',
  stampOptions?: PhotoStampOptions,
): Promise<string | null> => {
  const result = await uploadFileToTelegramDetailed(localUri, caption, stampOptions);
  return result.telegramUri || result.downloadUrl || localUri;
};

/**
 * Upload multiple files ke Telegram dengan concurrency control dan auto-stamping
 */
export const uploadFilesInBatchToTelegram = async (
  localUris: string[],
  captionPrefix: string = '',
  concurrency: number = 2,
  metadataMap?: Record<string, PhotoStampOptions>,
): Promise<Record<string, string>> => {
  const urlMap: Record<string, string> = {};
  const uniqueUris = Array.from(new Set(localUris.filter(Boolean)));

  if (uniqueUris.length === 0) return urlMap;

  for (let i = 0; i < uniqueUris.length; i += concurrency) {
    const chunk = uniqueUris.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async uri => {
        if (
          uri.startsWith('http://') ||
          uri.startsWith('https://') ||
          uri.startsWith('telegram://')
        ) {
          urlMap[uri] = uri;
          return;
        }
        const stampOptions = metadataMap ? metadataMap[uri] : undefined;
        const res = await uploadFileToTelegramDetailed(uri, captionPrefix, stampOptions);
        if (res.telegramUri || res.downloadUrl) {
          urlMap[uri] = res.telegramUri || res.downloadUrl;
        }
      }),
    );
  }

  return urlMap;
};
