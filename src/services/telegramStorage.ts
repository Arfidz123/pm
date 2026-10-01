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

    // Kirim foto tanpa deskripsi caption (user request)
    let finalCaption = caption;
    if (!caption || caption === 'CMMS Inspection Media') {
      finalCaption = '';
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
            `[Telegram Storage] Berhasil upload ${fileName} -> file_id: ${fileId}`,
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

export const uploadFilesInBatchToTelegram = async (
  localUris: string[],
  captionPrefix: string = '',
  concurrency: number = 2,
  metadataMap?: Record<string, PhotoStampOptions>,
): Promise<Record<string, string>> => {
  const urlMap: Record<string, string> = {};
  const uniqueUris = Array.from(new Set(localUris.filter(Boolean)));

  if (uniqueUris.length === 0) return urlMap;

  // Pisahkan PDF, gambar baru, dan gambar yang sudah terupload
  const pdfUris = uniqueUris.filter(uri => uri.toLowerCase().endsWith('.pdf'));
  const imageUris = uniqueUris.filter(
    uri => !uri.toLowerCase().endsWith('.pdf') && !uri.startsWith('http') && !uri.startsWith('telegram://')
  );
  const alreadyUploadedUris = uniqueUris.filter(
    uri => uri.startsWith('http') || uri.startsWith('telegram://')
  );

  // Masukkan yang sudah terupload
  alreadyUploadedUris.forEach(uri => (urlMap[uri] = uri));

  // 1. Proses PDF secara berurutan
  for (const pdfUri of pdfUris) {
    const res = await uploadFileToTelegramDetailed(pdfUri, captionPrefix);
    if (res.telegramUri || res.downloadUrl) {
      urlMap[pdfUri] = res.telegramUri || res.downloadUrl;
    }
  }

  if (!telegramConfig.botToken || !telegramConfig.chatId) {
    console.log('[Telegram Storage] Bot token / Chat ID belum disetel, file tetap disimpan di lokal.');
    imageUris.forEach(uri => (urlMap[uri] = uri));
    return urlMap;
  }

  // 2. Proses gambar menggunakan sendMediaGroup (maksimal 10 foto per album)
  const chunkSize = 10;
  for (let i = 0; i < imageUris.length; i += chunkSize) {
    const chunk = imageUris.slice(i, i + chunkSize);

    // Lakukan stamping pada semua foto di chunk ini secara paralel agar sangat cepat
    const processedChunk = await Promise.all(
      chunk.map(async (uri) => {
        let cleanPath = uri;
        if (Platform.OS === 'android') {
          if (!cleanPath.startsWith('file://') && !cleanPath.startsWith('content://')) {
            cleanPath = `file://${cleanPath}`;
          }
        }

        let uploadPath = cleanPath;
        const stampOptions = metadataMap ? metadataMap[uri] : undefined;
        if (
          stampOptions &&
          (stampOptions.timestamp ||
            stampOptions.coordinates ||
            stampOptions.label ||
            stampOptions.address)
        ) {
          try {
            uploadPath = await stampPhotoWithMetadata(cleanPath, stampOptions);
          } catch (err) {
            console.warn('[Telegram Storage] Gagal stamp foto, kirim foto asli:', err);
          }
        }

        return { originalUri: uri, uploadPath };
      })
    );

    // Siapkan form data untuk MediaGroup
    const formData = new FormData();
    formData.append('chat_id', telegramConfig.chatId);

    const mediaArray = processedChunk.map((item, index) => {
      const attachName = `photo${index}`;

      const rawPath = item.uploadPath.split('?')[0];
      const ext = rawPath.substring(rawPath.lastIndexOf('.') + 1).toLowerCase() || 'jpg';
      const mimeType = getMimeType(ext);
      const fileName = `${Date.now()}_${index}.${ext}`;

      // Tambahkan file aslinya
      formData.append(attachName, {
        uri: item.uploadPath,
        type: mimeType,
        name: fileName,
      } as any);

      // Definisikan Media Input
      return {
        type: 'photo',
        media: `attach://${attachName}`,
        caption: index === 0 && captionPrefix ? captionPrefix : '', // Caption cuma ditaruh di foto pertama di album
      };
    });

    formData.append('media', JSON.stringify(mediaArray));

    try {
      console.log(`[Telegram Storage] Mengirim MediaGroup (${chunk.length} foto) ke Telegram...`);
      const response = await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMediaGroup`, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (result.ok && result.result && Array.isArray(result.result)) {
        // Petakan hasil ke URI asli
        for (let j = 0; j < result.result.length; j++) {
          const msg = result.result[j];
          if (msg.photo && Array.isArray(msg.photo)) {
            const highestResPhoto = msg.photo[msg.photo.length - 1];
            const fileId = highestResPhoto.file_id;

            if (fileId) {
              const tgUri = `telegram://${fileId}`;
              urlMap[processedChunk[j].originalUri] = tgUri;
              console.log(`[Telegram Storage] Berhasil upload (Album) -> file_id: ${fileId}`);

              // Resolve ke URL asli di background untuk cache
              getTelegramFileUrl(fileId).then(downloadUrl => {
                if (downloadUrl) {
                  resolvedUrlCache.set(fileId, { url: downloadUrl, timestamp: Date.now() });
                }
              });
            }
          }
        }
      } else {
        console.warn('[Telegram Storage] sendMediaGroup API error:', result);
        // Fallback jika MediaGroup gagal (contoh: format foto aneh)
        for (const uri of chunk) {
          const stampOptions = metadataMap ? metadataMap[uri] : undefined;
          const res = await uploadFileToTelegramDetailed(uri, captionPrefix, stampOptions);
          urlMap[uri] = res.telegramUri || res.downloadUrl || uri;
        }
      }
    } catch (err) {
      console.error('[Telegram Storage] Exception in sendMediaGroup:', err);
      // Fallback
      for (const uri of chunk) {
        const stampOptions = metadataMap ? metadataMap[uri] : undefined;
        const res = await uploadFileToTelegramDetailed(uri, captionPrefix, stampOptions);
        urlMap[uri] = res.telegramUri || res.downloadUrl || uri;
      }
    }
  }

  return urlMap;
};
