/**
 * Draft Service
 * Manages auto-saving, restoring, and discarding local draft inspections in WatermelonDB SQLite.
 * Ensures field technicians never lose their filled data even if the app crashes, restarts,
 * or is killed by the OS.
 */

import database from '../database';
import { Inspection, Asset } from '../database/models';
import { Q } from '@nozbe/watermelondb';
import { cleanPopName, cleanPopId } from '../utils/helpers';

export const DRAFT_INSPECTION_ID = 'active_inspection_draft';

export interface DraftInspectionData {
  id: string;
  assetId: string;
  popName: string;
  popLocation: string;
  savedAt: number;
  formattedTime: string;
  inspectionDate: number;
  type: string;
  photos: string[];
  notes: string;
  formData: Record<string, any>;
  photoTimestamps: Record<string, string>;
  photoCoordinates: Record<string, string>;
  photoCategories: Record<string, string>;
  checklistEntries: any[];
  currentLocation: { lat: number; lng: number; address?: string } | null;
  editingInspectionId: string | null;
}

/**
 * Format timestamp to readable Indonesian time string
 */
export const formatDraftTime = (timestamp: number): string => {
  const d = new Date(timestamp);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const timeStr = d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isToday) {
    return `Hari ini, ${timeStr}`;
  }

  const dateStr = d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
  });
  return `${dateStr} ${timeStr}`;
};

/**
 * Save current inspection state to local SQLite database as a draft
 */
export const saveInspectionDraft = async (
  state: any,
): Promise<boolean> => {
  try {
    if (!state.activePopId) {
      return false;
    }

    const {
      activePopId,
      activePopName,
      activePopLocation,
      currentAssetId,
      currentLocation,
      inspectionType,
      editingInspectionId,
      originalInspectionDate,
      formData,
      photos,
      photoTimestamps,
      photoCoordinates,
      photoCategories,
      checklistEntries,
      notes,
    } = state;

    const savedAt = Date.now();

    // Prepare complete draft bundle
    const draftPayload = {
      ...formData,
      _draftMeta: {
        activePopId,
        activePopName,
        activePopLocation,
        currentAssetId,
        currentLocation,
        inspectionType: inspectionType || 'preventive',
        editingInspectionId: editingInspectionId || null,
        originalInspectionDate: originalInspectionDate || savedAt,
        photoTimestamps: photoTimestamps || {},
        photoCoordinates: photoCoordinates || {},
        photoCategories: photoCategories || {},
        checklistEntries: checklistEntries || [],
        savedAt,
      },
    };

    const inspectionsCollection = database.get<Inspection>('inspections');

    // Find existing draft record if any
    let existingDraft: Inspection | null = null;
    try {
      existingDraft = await inspectionsCollection.find(DRAFT_INSPECTION_ID);
    } catch (e) {
      // Record doesn't exist yet, which is fine
    }

    if (!existingDraft) {
      try {
        const drafts = await inspectionsCollection
          .query(Q.where('status', 'draft'))
          .fetch();
        if (drafts.length > 0) {
          existingDraft = drafts[0];
        }
      } catch (e) {}
    }

    await database.write(async () => {
      if (existingDraft) {
        await existingDraft.update(insp => {
          insp.assetId = activePopId || 'draft';
          insp.inspectorName = 'Teknisi';
          insp.inspectionDate = originalInspectionDate || savedAt;
          insp.type = (inspectionType as any) || 'preventive';
          insp.status = 'draft' as any;
          insp.photos = JSON.stringify(photos || []);
          insp.notes = notes || '';
          insp.formData = JSON.stringify(draftPayload);
          insp.isSynced = false;
        });
      } else {
        await inspectionsCollection.create(insp => {
          (insp as any)._raw.id = DRAFT_INSPECTION_ID;
          insp.assetId = activePopId || 'draft';
          insp.inspectorName = 'Teknisi';
          insp.inspectionDate = originalInspectionDate || savedAt;
          insp.type = (inspectionType as any) || 'preventive';
          insp.status = 'draft' as any;
          insp.photos = JSON.stringify(photos || []);
          insp.notes = notes || '';
          insp.signaturePath = '';
          insp.pdfPath = '';
          insp.formData = JSON.stringify(draftPayload);
          insp.isSynced = false;
        });
      }
    });

    console.log(`[DraftService] Auto-saved draft for ${activePopId} at ${new Date(savedAt).toLocaleTimeString()}`);
    return true;
  } catch (error) {
    console.warn('[DraftService] Failed to auto-save draft:', error);
    return false;
  }
};

/**
 * Retrieve the active draft inspection if one exists in SQLite
 */
export const getInspectionDraft = async (): Promise<DraftInspectionData | null> => {
  try {
    const inspectionsCollection = database.get<Inspection>('inspections');

    let draftRecord: Inspection | null = null;

    // 1. Try find by exact ID
    try {
      draftRecord = await inspectionsCollection.find(DRAFT_INSPECTION_ID);
    } catch (e) {
      // Try querying by status
    }

    // 2. Fallback query by status 'draft'
    if (!draftRecord) {
      const drafts = await inspectionsCollection
        .query(Q.where('status', 'draft'))
        .fetch();
      if (drafts.length > 0) {
        drafts.sort((a, b) => (b.inspectionDate || 0) - (a.inspectionDate || 0));
        draftRecord = drafts[0];
      }
    }

    if (!draftRecord) {
      return null;
    }

    let parsedForm: any = {};
    if (draftRecord.formData) {
      try {
        parsedForm =
          typeof draftRecord.formData === 'string'
            ? JSON.parse(draftRecord.formData)
            : draftRecord.formData;
      } catch (e) {
        parsedForm = {};
      }
    }

    const meta = parsedForm._draftMeta || {};
    const popId = meta.activePopId || draftRecord.assetId || '';

    // If popId is empty or just generic 'draft' with no actual content
    if (!popId || popId === 'draft') {
      return null;
    }

    let parsedPhotos: string[] = [];
    if (draftRecord.photos) {
      try {
        const res =
          typeof draftRecord.photos === 'string'
            ? JSON.parse(draftRecord.photos)
            : draftRecord.photos;
        parsedPhotos = Array.isArray(res) ? res : [];
      } catch (e) {
        parsedPhotos = [];
      }
    }

    const savedAt = meta.savedAt || draftRecord.inspectionDate || Date.now();

    return {
      id: draftRecord.id,
      assetId: popId,
      popName: meta.activePopName || cleanPopName(parsedForm?.infoPop?.namaPop || popId),
      popLocation: meta.activePopLocation || parsedForm?.infoPop?.alamat || '',
      savedAt,
      formattedTime: formatDraftTime(savedAt),
      inspectionDate: draftRecord.inspectionDate || savedAt,
      type: draftRecord.type || meta.inspectionType || 'preventive',
      photos: parsedPhotos,
      notes: draftRecord.notes || '',
      formData: parsedForm,
      photoTimestamps: meta.photoTimestamps || parsedForm.photoTimestamps || {},
      photoCoordinates: meta.photoCoordinates || parsedForm.photoCoordinates || {},
      photoCategories: meta.photoCategories || parsedForm.photoCategories || {},
      checklistEntries: meta.checklistEntries || [],
      currentLocation: meta.currentLocation || parsedForm.currentLocation || null,
      editingInspectionId: meta.editingInspectionId || null,
    };
  } catch (error) {
    console.warn('[DraftService] Error getting inspection draft:', error);
    return null;
  }
};

/**
 * Permanently delete any active draft inspection from SQLite
 */
export const clearInspectionDraft = async (): Promise<void> => {
  try {
    const inspectionsCollection = database.get<Inspection>('inspections');

    // Find all draft records
    const drafts = await inspectionsCollection
      .query(Q.or(Q.where('id', DRAFT_INSPECTION_ID), Q.where('status', 'draft')))
      .fetch();

    if (drafts.length > 0) {
      await database.write(async () => {
        for (const draft of drafts) {
          await draft.destroyPermanently();
        }
      });
      console.log(`[DraftService] Cleared ${drafts.length} draft inspection(s)`);
    }
  } catch (error) {
    console.warn('[DraftService] Error clearing draft inspection:', error);
  }
};
