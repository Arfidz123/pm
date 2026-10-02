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

    // Burn-in stempel bergaya aplikasi ke foto sebelum diunggah ke Telegram
    let uploadPath = cleanPath;
    if (
      !isPdf &&
      stampOptions &&
      (stampOptions.timestamp ||
        stampOptions.coordinates ||
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

    // Foto tidak memerlukan deskripsi/caption (sesuai permintaan user). Caption hanya untuk PDF.
    const finalCaption = isPdf && caption && caption !== 'CMMS Inspection Media' ? caption : '';

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
 * Mengunggah sekumpulan foto (2 hingga 10 foto) sebagai Telegram Media Group (Album)
 * sehingga foto terkirim bersamaan dalam satu album dan tanpa deskripsi/caption.
 */
export const uploadMediaGroupToTelegram = async (
  items: Array<{ uri: string; stampOptions?: PhotoStampOptions }>,
): Promise<Record<string, string>> => {
  const urlMap: Record<string, string> = {};
  if (!items || items.length === 0) return urlMap;

  if (!telegramConfig.botToken || !telegramConfig.chatId) {
    items.forEach(it => {
      urlMap[it.uri] = it.uri;
    });
    return urlMap;
  }

  // Telegram sendMediaGroup memerlukan minimal 2 foto dan maksimal 10 foto
  if (items.length === 1) {
    const single = items[0];
    const res = await uploadFileToTelegramDetailed(single.uri, '', single.stampOptions);
    if (res.telegramUri || res.downloadUrl) {
      urlMap[single.uri] = res.telegramUri || res.downloadUrl;
    } else {
      urlMap[single.uri] = single.uri;
    }
    return urlMap;
  }

  try {
    const formData = new FormData();
    formData.append('chat_id', telegramConfig.chatId);

    const mediaArray: any[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let cleanPath = item.uri;
      if (Platform.OS === 'android') {
        if (!cleanPath.startsWith('file://') && !cleanPath.startsWith('content://')) {
          cleanPath = `file://${cleanPath}`;
        }
      }

      let uploadPath = cleanPath;
      if (
        item.stampOptions &&
        (item.stampOptions.timestamp ||
          item.stampOptions.coordinates ||
          item.stampOptions.address)
      ) {
        try {
          uploadPath = await stampPhotoWithMetadata(cleanPath, item.stampOptions);
        } catch (e) {
          uploadPath = cleanPath;
        }
      }
      const rawPath = cleanPath.split('?')[0];
      const ext =
        rawPath.substring(rawPath.lastIndexOf('.') + 1).toLowerCase() || 'jpg';
      const mimeType = getMimeType(ext);
      const attachKey = `photo_${i}`;
      const fileName = `img_${Date.now()}_${i}.${ext}`;

      // Foto dikirim tanpa caption/deskripsi sesuai instruksi user
      mediaArray.push({
        type: 'photo',
        media: `attach://${attachKey}`,
      });

      formData.append(attachKey, {
        uri: uploadPath,
        type: mimeType,
        name: fileName,
      } as any);
    }

    formData.append('media', JSON.stringify(mediaArray));

    const response = await fetch(
      `https://api.telegram.org/bot${telegramConfig.botToken}/sendMediaGroup`,
      {
        method: 'POST',
        body: formData,
      },
    );

    const result = await response.json();
    if (result.ok && Array.isArray(result.result)) {
      result.result.forEach((msg: any, idx: number) => {
        if (msg.photo && Array.isArray(msg.photo) && msg.photo.length > 0) {
          const highestRes = msg.photo[msg.photo.length - 1];
          const fileId = highestRes.file_id;
          const origUri = items[idx]?.uri;
          if (origUri && fileId) {
            const telegramUri = `telegram://${fileId}`;
            urlMap[origUri] = telegramUri;
            getTelegramFileUrl(fileId).then(dlUrl => {
              if (dlUrl) {
                resolvedUrlCache.set(fileId, {
                  url: dlUrl,
                  timestamp: Date.now(),
                });
              }
            });
          }
        }
      });
      console.log(
        `[Telegram Storage] Berhasil upload media group album (${items.length} foto)`,
      );
    } else {
      console.warn(
        '[Telegram Storage] sendMediaGroup error, fallback ke upload satuan:',
        result,
      );
      await Promise.all(
        items.map(async it => {
          const res = await uploadFileToTelegramDetailed(it.uri, '', it.stampOptions);
          if (res.telegramUri || res.downloadUrl) {
            urlMap[it.uri] = res.telegramUri || res.downloadUrl;
          }
        }),
      );
    }
  } catch (err) {
    console.warn(
      '[Telegram Storage] Media group exception, fallback ke satuan:',
      err,
    );
    await Promise.all(
      items.map(async it => {
        const res = await uploadFileToTelegramDetailed(it.uri, '', it.stampOptions);
        if (res.telegramUri || res.downloadUrl) {
          urlMap[it.uri] = res.telegramUri || res.downloadUrl;
        }
      }),
    );
  }

  return urlMap;
};

/**
 * Upload multiple files ke Telegram secara efisien dalam album (sendMediaGroup)
 * hingga 10 foto per kelompok agar tidak terkirim satu-satu dan loading sangat cepat.
 */
export const uploadFilesInBatchToTelegram = async (
  localUris: string[],
  captionPrefix: string = '',
  batchSize: number = 10,
  metadataMap?: Record<string, PhotoStampOptions>,
): Promise<Record<string, string>> => {
  const urlMap: Record<string, string> = {};
  const uniqueUris = Array.from(new Set(localUris.filter(Boolean)));

  if (uniqueUris.length === 0) return urlMap;

  const urisToUpload: string[] = [];
  uniqueUris.forEach(uri => {
    if (
      uri.startsWith('http://') ||
      uri.startsWith('https://') ||
      uri.startsWith('telegram://')
    ) {
      urlMap[uri] = uri;
    } else {
      urisToUpload.push(uri);
    }
  });

  if (urisToUpload.length === 0) return urlMap;

  // Bagi foto ke dalam grup album maksimal 10 foto per request (sesuai limit sendMediaGroup Telegram)
  const chunks: Array<Array<{ uri: string; stampOptions?: PhotoStampOptions }>> = [];
  for (let i = 0; i < urisToUpload.length; i += 10) {
    const slice = urisToUpload.slice(i, i + 10);
    chunks.push(
      slice.map(u => ({
        uri: u,
        stampOptions: metadataMap ? metadataMap[u] : undefined,
      })),
    );
  }

  // Upload paralel per 2 kelompok album sekaligus agar proses simpan berlangsung sangat cepat
  for (let i = 0; i < chunks.length; i += 2) {
    const currentBatches = chunks.slice(i, i + 2);
    const results = await Promise.all(
      currentBatches.map(batch => uploadMediaGroupToTelegram(batch)),
    );
    results.forEach(res => {
      Object.assign(urlMap, res);
    });
  }

  return urlMap;
};
