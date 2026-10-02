import database from '../database';
import Inspection from '../database/models/Inspection';
import Asset from '../database/models/Asset';
import { Q } from '@nozbe/watermelondb';
import { POP_SEED_DATA } from '../database/popSeedData';
import {
  bulkSeedAssetsToFirestore,
  fetchInspectionsFromFirestore,
  FirestoreAsset,
  FirestoreInspection,
  saveInspectionToFirestore,
  upsertAssetToFirestore,
} from './firestoreDb';
import {
  uploadFileToTelegram,
  uploadFilesInBatchToTelegram,
} from './telegramStorage';
import { getCurrentFormattedTimestamp } from '../utils/helpers';

/**
 * Recursively collects all image URIs from an object (formData or arrays)
 */
export const collectAllPhotoUrisFromObject = (obj: any): string[] => {
  const uris: string[] = [];
  if (!obj) return uris;

  if (typeof obj === 'string') {
    const trimmed = obj.trim();
    if (
      trimmed.startsWith('file://') ||
      trimmed.startsWith('content://') ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('telegram://')
    ) {
      uris.push(trimmed);
    }
    return uris;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      uris.push(...collectAllPhotoUrisFromObject(item));
    }
    return uris;
  }

  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      uris.push(...collectAllPhotoUrisFromObject((obj as any)[key]));
    }
    return uris;
  }

  return uris;
};

/**
 * Resolves exact timestamp, coordinates, and address from the application when the photo was captured
 */
export const getPhotoMetadataForUri = (
  uri: string,
  formData: any,
  defaultPopName?: string,
): { timestamp: string; coordinates?: string; address?: string } => {
  if (!uri || !formData) {
    return { timestamp: '' };
  }

  const clean = uri.split('?')[0].trim();
  const rawPath = clean.replace(/^file:\/\//, '');

  const getFilename = (p: string) => {
    if (!p) return '';
    const withoutQuery = p.split('?')[0].trim();
    const slashIdx = Math.max(
      withoutQuery.lastIndexOf('/'),
      withoutQuery.lastIndexOf('\\'),
    );
    return slashIdx >= 0 ? withoutQuery.substring(slashIdx + 1) : withoutQuery;
  };

  const targetFilename = getFilename(uri);

  const pts = formData.photoTimestamps || {};
  const pcs = formData.photoCoordinates || {};

  // 1. Match from photoTimestamps by direct path or filename
  let ts =
    pts[uri] ||
    pts[clean] ||
    pts[rawPath] ||
    pts[`file://${rawPath}`] ||
    '';

  if (!ts && targetFilename) {
    for (const [k, v] of Object.entries(pts)) {
      if (typeof v === 'string' && getFilename(k) === targetFilename) {
        ts = v;
        break;
      }
    }
  }

  let coords =
    pcs[uri] ||
    pcs[clean] ||
    pcs[rawPath] ||
    pcs[`file://${rawPath}`] ||
    '';

  if (!coords && targetFilename) {
    for (const [k, v] of Object.entries(pcs)) {
      if (typeof v === 'string' && getFilename(k) === targetFilename) {
        coords = v;
        break;
      }
    }
  }

  // 2. Match from categorizedPhotos across all inspection sections
  const sections = [
    'dokumentasi',
    'kwhMeter',
    'rectifier',
    'battery',
    'mechanicalElect',
    'powerSystem',
  ];

  for (const sec of sections) {
    const secData = formData[sec];
    if (secData && Array.isArray(secData.categorizedPhotos)) {
      const found = secData.categorizedPhotos.find((c: any) => {
        if (!c || !c.uri) return false;
        const cClean = c.uri.split('?')[0].trim();
        const cRaw = cClean.replace(/^file:\/\//, '');
        return (
          c.uri === uri ||
          cClean === clean ||
          cRaw === rawPath ||
          c.uri === clean ||
          c.uri === rawPath ||
          (targetFilename && getFilename(c.uri) === targetFilename)
        );
      });
      if (found) {
        if (!ts && (found.timestamp || found.dateStr)) {
          ts = found.timestamp || found.dateStr;
        }
        if (!coords && found.coordinates) {
          coords = found.coordinates;
        }
      }
    }
  }

  // 3. Fallback for timestamp: inspectionStartTime (time inspection was started in app)
  if (!ts && formData.inspectionStartTime) {
    const d = new Date(formData.inspectionStartTime);
    if (!isNaN(d.getTime())) {
      ts = `${d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })} ${d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })} WITA`;
    }
  }

  // 4. Fallback for coordinates
  if (!coords) {
    coords =
      formData.infoPop?.koordinat ||
      (formData.currentLocation
        ? `${formData.currentLocation.lat?.toFixed(5)}, ${formData.currentLocation.lng?.toFixed(5)}`
        : '');
  }

  // 5. Address: prioritize infoPop.alamat exactly like the app screens and preview modal
  const address =
    (formData.infoPop?.alamat && formData.infoPop?.alamat.trim() !== ''
      ? formData.infoPop?.alamat.trim()
      : null) ||
    formData.activePopLocation ||
    formData.currentLocation?.address ||
    defaultPopName ||
    '';

  return {
    timestamp: ts,
    coordinates: coords || undefined,
    address: address || undefined,
  };
};

/**
 * Recursively replaces local photo URIs in an object with their mapped Telegram Cloud URIs
 */
export const replacePhotoUrisInObject = <T>(
  obj: T,
  urlMap: Record<string, string>,
): T => {
  if (!obj) return obj;

  if (typeof obj === 'string') {
    const trimmed = obj.trim();
    if (urlMap[trimmed]) return urlMap[trimmed] as unknown as T;
    const cleanStr = trimmed.split('?')[0];
    if (urlMap[cleanStr]) return urlMap[cleanStr] as unknown as T;
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item =>
      replacePhotoUrisInObject(item, urlMap),
    ) as unknown as T;
  }

  if (typeof obj === 'object') {
    const updatedObj: any = {};
    for (const key of Object.keys(obj)) {
      updatedObj[key] = replacePhotoUrisInObject((obj as any)[key], urlMap);
    }
    return updatedObj as T;
  }

  return obj;
};

/**
 * Uploads the inspection PDF report and individual photos to Telegram (if not already uploaded)
 * and returns the remote Telegram download URLs and updated form data.
 */
export const processInspectionMediaForCloud = async (data: {
  pdfPath?: string;
  popName?: string;
  popId?: string;
  photos?: string[];
  formData?: any;
}): Promise<{
  remotePdfPath: string;
  remotePhotos: string[];
  updatedFormData: any;
}> => {
  let remotePdfPath = data.pdfPath || '';
  let remotePhotos: string[] = data.photos || [];

  // Collect photo URIs from photos array AND nested formData properties
  const allPhotoUris = Array.from(
    new Set([
      ...remotePhotos,
      ...collectAllPhotoUrisFromObject(data.formData),
    ]),
  );

  // 1. Upload single PDF to Telegram if not already uploaded
  if (
    remotePdfPath &&
    !remotePdfPath.startsWith('http://') &&
    !remotePdfPath.startsWith('https://') &&
    !remotePdfPath.startsWith('telegram://') &&
    (remotePdfPath.startsWith('file://') ||
      remotePdfPath.startsWith('/') ||
      remotePdfPath.startsWith('content://'))
  ) {
    try {
      const caption = `📄 Laporan PM: ${data.popName || 'POP'} (${data.popId || ''
        })\n📅 Tanggal: ${new Date().toLocaleDateString('id-ID')}`;
      const uploadedPdf = await uploadFileToTelegram(remotePdfPath, caption);
      if (
        uploadedPdf &&
        (uploadedPdf.startsWith('http://') ||
          uploadedPdf.startsWith('https://') ||
          uploadedPdf.startsWith('telegram://'))
      ) {
        remotePdfPath = uploadedPdf;
      }
    } catch (pdfErr) {
      console.warn('PDF upload to Telegram warning:', pdfErr);
    }
  }

  // 2. Upload photos to Telegram (batch upload with Telegram file_id URIs & burned-in timestamp)
  let photoUrlMap: Record<string, string> = {};
  const metadataMap: Record<string, any> = {};

  if (allPhotoUris.length > 0) {
    try {
      const defaultPopName =
        data.popName || data.formData?.infoPop?.namaPop || '';

      allPhotoUris.forEach(uri => {
        metadataMap[uri] = getPhotoMetadataForUri(
          uri,
          data.formData,
          defaultPopName,
        );
      });

      photoUrlMap = await uploadFilesInBatchToTelegram(
        allPhotoUris,
        '',
        10,
        metadataMap,
      );
      remotePhotos = remotePhotos.map(p => photoUrlMap[p] || p);
    } catch (photoErr) {
      console.warn('Photos upload to Telegram warning:', photoErr);
    }
  }

  const updatedFormData = replacePhotoUrisInObject(
    data.formData || {},
    photoUrlMap,
  );

  // Copy photoTimestamps and photoCoordinates to the new telegram:// URIs
  if (updatedFormData.photoTimestamps) {
    Object.entries(photoUrlMap).forEach(([localUri, teleUri]) => {
      if (teleUri) {
        const meta = metadataMap[localUri];
        if (meta && meta.timestamp) {
          updatedFormData.photoTimestamps[teleUri] = meta.timestamp;
        } else if (updatedFormData.photoTimestamps[localUri]) {
          updatedFormData.photoTimestamps[teleUri] = updatedFormData.photoTimestamps[localUri];
        }
      }
    });
  }
  if (updatedFormData.photoCoordinates) {
    Object.entries(photoUrlMap).forEach(([localUri, teleUri]) => {
      if (teleUri) {
        const meta = metadataMap[localUri];
        if (meta && meta.coordinates) {
          updatedFormData.photoCoordinates[teleUri] = meta.coordinates;
        } else if (updatedFormData.photoCoordinates[localUri]) {
          updatedFormData.photoCoordinates[teleUri] = updatedFormData.photoCoordinates[localUri];
        }
      }
    });
  }

  return {
    remotePdfPath,
    remotePhotos,
    updatedFormData,
  };
};


/**
 * Sync unsynced local inspections from WatermelonDB to Firebase Cloud Firestore
 * Only uploads the PDF report once to Telegram and syncs structured form data to Firestore
 */
export const syncInspectionsToFirebase = async () => {
  try {
    const unsyncedInspections = await database
      .get<Inspection>('inspections')
      .query(
        Q.and(
          Q.where('status', 'completed'),
          Q.or(Q.where('is_synced', false), Q.where('is_synced', null)),
        ),
      )
      .fetch();

    if (unsyncedInspections.length === 0) {
      return { syncedCount: 0 };
    }

    console.log(
      `Found ${unsyncedInspections.length} unsynced inspections to sync to Cloud`,
    );
    let syncedCount = 0;

    for (const inspection of unsyncedInspections) {
      let parsedFormData: any = {};
      if (inspection.formData) {
        try {
          parsedFormData =
            typeof inspection.formData === 'string'
              ? JSON.parse(inspection.formData)
              : inspection.formData;
        } catch (e) {
          parsedFormData = inspection.formData;
        }
      }

      let parsedPhotos: string[] = [];
      if (inspection.photos) {
        try {
          const res =
            typeof inspection.photos === 'string'
              ? JSON.parse(inspection.photos)
              : inspection.photos;
          parsedPhotos = Array.isArray(res) ? res : [];
        } catch (e) {
          parsedPhotos = [];
        }
      }

      const popName =
        parsedFormData?.infoPop?.namaPop ||
        parsedFormData?.infoPop?.popName ||
        inspection.assetId;

      // Upload single PDF & photos to Telegram if not already uploaded
      const { remotePdfPath, remotePhotos, updatedFormData } =
        await processInspectionMediaForCloud({
          pdfPath: inspection.pdfPath,
          popName,
          popId: inspection.assetId,
          photos: parsedPhotos,
          formData: parsedFormData,
        });

      // Ensure referenced asset exists in Firestore
      if (inspection.assetId) {
        try {
          await upsertAssetToFirestore({
            id: inspection.assetId,
            asset_code: inspection.assetId,
            name: popName || inspection.assetId,
            status: 'active',
          });
        } catch (assetErr) {
          console.warn('Auto asset upsert warning in Firestore:', assetErr);
        }
      }

      const payload: FirestoreInspection = {
        id: inspection.id,
        asset_id: inspection.assetId,
        inspector_name: inspection.inspectorName || 'Teknisi',
        inspection_date: new Date(
          inspection.inspectionDate || Date.now(),
        ).toISOString(),
        type: inspection.type || 'PM',
        status: inspection.status || 'completed',
        notes: inspection.notes || '',
        form_data: updatedFormData || parsedFormData || {},
        pdf_path: remotePdfPath || inspection.pdfPath || '',
        photos:
          remotePhotos && remotePhotos.length > 0 ? remotePhotos : parsedPhotos,
        is_synced: true,
        created_at: new Date(inspection.createdAt || Date.now()).toISOString(),
        updated_at: new Date(inspection.updatedAt || Date.now()).toISOString(),
      };

      try {
        await saveInspectionToFirestore(payload);
      } catch (fsErr) {
        console.warn('Firestore save notice during bulk sync:', fsErr);
      }

      const isRemotePdf =
        remotePdfPath &&
        (remotePdfPath.startsWith('http://') ||
          remotePdfPath.startsWith('https://') ||
          remotePdfPath.startsWith('telegram://'));

      await database.write(async () => {
        await inspection.update(i => {
          i.isSynced = true;
          if (isRemotePdf) {
            i.pdfPath = remotePdfPath;
          }
          if (remotePhotos && remotePhotos.length > 0) {
            i.photos = JSON.stringify(remotePhotos);
          }
          if (updatedFormData) {
            i.formData = JSON.stringify(updatedFormData);
          }
        });
      });
      syncedCount++;
      console.log(
        `Successfully synced inspection ${inspection.id} to Telegram & Firestore`,
      );
    }

    return { syncedCount };
  } catch (error) {
    console.error('Firebase sync failed:', error);
    throw error;
  }
};

/**
 * Seed or sync POP assets to Firebase Firestore
 */
export const syncAssetsToFirebase = async () => {
  try {
    const localAssets = await database.get<Asset>('assets').query().fetch();

    let assetsToSync: FirestoreAsset[] = [];
    if (localAssets.length > 0) {
      assetsToSync = localAssets.map(asset => ({
        id: asset.id,
        asset_code: asset.assetCode,
        name: asset.name,
        category: asset.category,
        location: asset.location,
        latitude: asset.latitude,
        longitude: asset.longitude,
        manufacturer: asset.manufacturer,
        model: asset.assetModel,
        serial_number: asset.serialNumber,
        install_date: asset.installDate
          ? new Date(asset.installDate).toISOString()
          : null,
        qr_code: asset.qrCode,
        photo_path: asset.photoPath,
        specifications: asset.specifications
          ? typeof asset.specifications === 'string'
            ? JSON.parse(asset.specifications)
            : asset.specifications
          : {},
        checklist_template_id: asset.checklistTemplateId,
        status: asset.status || 'active',
      }));
    } else {
      assetsToSync = POP_SEED_DATA.map(item => ({
        id: item.id,
        asset_code: item.asset_code,
        name: item.name,
        category: item.category,
        location: item.location,
        latitude: item.latitude,
        longitude: item.longitude,
        specifications: item.specifications
          ? JSON.parse(item.specifications)
          : {},
        status: 'active',
      }));
    }

    await bulkSeedAssetsToFirestore(assetsToSync);
    console.log(
      `Successfully synced ${assetsToSync.length} assets to Firebase Firestore`,
    );
    return { assetCount: assetsToSync.length };
  } catch (error) {
    console.error('Sync assets to Firebase failed:', error);
    throw error;
  }
};

/**
 * Fetch inspections from Firebase Firestore and synchronize with local DB.
 * Automatically removes local inspections if they have been deleted from Firestore.
 */
export const restoreInspectionsFromFirebase = async () => {
  try {
    const remoteInspections = await fetchInspectionsFromFirestore();
    const inspectionCollection = database.get<Inspection>('inspections');

    // 1. If remote Firestore is empty (user deleted all inspections in console)
    if (!remoteInspections || remoteInspections.length === 0) {
      const allSyncedLocal = await inspectionCollection
        .query(
          Q.and(
            Q.where('status', 'completed'),
            Q.where('is_synced', true),
          ),
        )
        .fetch();
      if (allSyncedLocal.length > 0) {
        await database.write(async () => {
          for (const local of allSyncedLocal) {
            if (local.status === 'draft' || local.id === 'active_inspection_draft') {
              continue;
            }
            await local.destroyPermanently();
          }
        });
        console.log(
          `[Sync] Pruned ${allSyncedLocal.length} local records (Firestore collection is empty)`,
        );
        return { restoredCount: allSyncedLocal.length };
      }
      return { restoredCount: 0 };
    }

    let restoredCount = 0;
    const remoteIdSet = new Set(remoteInspections.map(r => r.id));

    await database.write(async () => {
      // 2. Prune any local completed synced records that no longer exist in Firestore (never prune drafts)
      const allSyncedLocal = await inspectionCollection
        .query(
          Q.and(
            Q.where('status', 'completed'),
            Q.where('is_synced', true),
          ),
        )
        .fetch();

      for (const local of allSyncedLocal) {
        if (local.status === 'draft' || local.id === 'active_inspection_draft') {
          continue;
        }
        if (!remoteIdSet.has(local.id)) {
          await local.destroyPermanently();
          restoredCount++;
        }
      }

      // 3. Upsert active remote records
      for (const remote of remoteInspections) {
        const existing = await inspectionCollection
          .query(Q.where('id', remote.id))
          .fetch();

        if (existing.length === 0) {
          await inspectionCollection.create(i => {
            i._raw.id = remote.id;
            i.assetId = remote.asset_id;
            i.inspectorName = remote.inspector_name || '';
            i.inspectionDate = remote.inspection_date
              ? new Date(remote.inspection_date).getTime()
              : Date.now();
            i.type = (remote.type || 'PM') as any;
            i.status = (remote.status || 'completed') as any;
            i.notes = remote.notes || '';
            i.pdfPath = remote.pdf_path || '';
            i.photos = remote.photos ? JSON.stringify(remote.photos) : '[]';
            i.formData = remote.form_data
              ? JSON.stringify(remote.form_data)
              : '{}';
            i.isSynced = true;
          });
          restoredCount++;
        } else {
          // Update existing local record with latest remote Firestore data
          const localInsp = existing[0];
          await localInsp.update(i => {
            if (remote.asset_id) i.assetId = remote.asset_id;
            if (remote.inspector_name) i.inspectorName = remote.inspector_name;
            if (remote.notes !== undefined) i.notes = remote.notes;
            if (remote.pdf_path) i.pdfPath = remote.pdf_path;
            if (remote.photos) i.photos = JSON.stringify(remote.photos);
            if (remote.form_data) i.formData = JSON.stringify(remote.form_data);
            i.isSynced = true;
          });
        }
      }
    });

    return { restoredCount };
  } catch (error) {
    console.error('Error restoring inspections from Firebase:', error);
    return { restoredCount: 0 };
  }
};

/**
 * Directly save inspection to Firebase Cloud Firestore & Telegram Storage (Called once on Simpan)
 */
export const saveInspectionDirectlyToFirebase = async (inspectionData: {
  id: string;
  assetId: string;
  inspectorName?: string;
  inspectionDate?: number;
  type?: string;
  status?: string;
  pdfPath?: string;
  formData?: any;
  photos?: string[];
  notes?: string;
}) => {
  try {
    const popName =
      inspectionData.formData?.infoPop?.namaPop ||
      inspectionData.formData?.infoPop?.popName ||
      inspectionData.assetId;

    // Upload single PDF & photos to Telegram once
    const { remotePdfPath, remotePhotos, updatedFormData } =
      await processInspectionMediaForCloud({
        pdfPath: inspectionData.pdfPath,
        popName,
        popId: inspectionData.assetId,
        photos: inspectionData.photos,
        formData: inspectionData.formData,
      });

    const isCloudSuccess = Boolean(
      remotePdfPath &&
      (remotePdfPath.startsWith('http://') ||
        remotePdfPath.startsWith('https://') ||
        remotePdfPath.startsWith('telegram://')),
    );

    // Ensure referenced asset exists in Firestore
    if (inspectionData.assetId) {
      try {
        await upsertAssetToFirestore({
          id: inspectionData.assetId,
          asset_code: inspectionData.assetId,
          name: popName || inspectionData.assetId,
          status: 'active',
        });
      } catch (assetErr) {
        console.warn('Auto asset upsert warning in Firestore:', assetErr);
      }
    }

    const payload: FirestoreInspection = {
      id: inspectionData.id,
      asset_id: inspectionData.assetId,
      inspector_name: inspectionData.inspectorName || 'Teknisi',
      inspection_date: new Date(
        inspectionData.inspectionDate || Date.now(),
      ).toISOString(),
      type: inspectionData.type || 'PM',
      status: inspectionData.status || 'completed',
      notes: inspectionData.notes || '',
      form_data: updatedFormData || inspectionData.formData || {},
      pdf_path: remotePdfPath || inspectionData.pdfPath || '',
      photos:
        remotePhotos && remotePhotos.length > 0
          ? remotePhotos
          : inspectionData.photos || [],
      is_synced: true,
      created_at: new Date(
        inspectionData.inspectionDate || Date.now(),
      ).toISOString(),
      updated_at: new Date().toISOString(),
    };

    let isFirestoreSaved = false;
    try {
      await saveInspectionToFirestore(payload);
      isFirestoreSaved = true;
    } catch (firestoreErr) {
      console.warn(
        'Firestore save notice (Telegram PDF upload succeeded):',
        firestoreErr,
      );
    }

    const isSyncedSuccess = isCloudSuccess || isFirestoreSaved;

    console.log(
      `Saved inspection ${inspectionData.id} directly with Telegram PDF & Photos (Synced: ${isSyncedSuccess})`,
    );
    return {
      data: payload,
      remotePdfPath,
      remotePhotos,
      isSynced: isSyncedSuccess,
    };
  } catch (err) {
    console.error('saveInspectionDirectlyToFirebase failed:', err);
    throw err;
  }
};

