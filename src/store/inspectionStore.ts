/**
 * Inspection Store - Manages the current inspection workflow state
 */

import { create } from 'zustand';
import type { ItemStatus, InspectionType } from '../types';
import {
  saveInspectionDraft,
  clearInspectionDraft,
  DRAFT_INSPECTION_ID,
} from '../services/draftService';
import {
  findPopMasterRecord,
  buildAutoFilledFormData,
} from '../database/popMasterData';
import {
  applySavedPmProfile,
  getCachedPopPmProfile,
  getPopPmProfile,
} from '../services/savedPmProfileService';

interface ChecklistEntry {
  templateItemId: string;
  category: string;
  label: string;
  type: string;
  value: string;
  unit: string;
  status: ItemStatus;
  photoPath: string;
  notes: string;
  order: number;
  minValue: number | null;
  maxValue: number | null;
  options: string[];
  required: boolean;
}

interface InspectionState {
  // Current inspection data
  currentAssetId: string | null;
  inspectionType: InspectionType;
  photos: string[];
  checklistEntries: ChecklistEntry[];
  notes: string;
  signaturePath: string;
  inspectionId: string | null;
  editingInspectionId: string | null;
  originalInspectionDate: number | null;
  activePopId: string | null;
  activePopName: string | null;
  activePopLocation: string | null;
  currentLocation: { lat: number; lng: number; address?: string } | null;

  // Workflow step
  currentStep: number; // 0=select, 1=photo, 2=checklist, 3=review, 4=signature

  // Form Data storage for multiple screens
  formData: Record<string, any>;
  photoTimestamps: Record<string, string>;
  photoCoordinates: Record<string, string>;
  photoCategories: Record<string, string>;

  // Actions
  setAsset: (assetId: string) => void;
  setInspectionType: (type: InspectionType) => void;
  addPhoto: (path: string, customTs?: string, customCoords?: string) => void;
  removePhoto: (index: number) => void;
  addPhotoBySection: (
    section: string,
    path: string,
    customTs?: string,
    customCoords?: string,
  ) => void;
  addCategorizedPhoto: (
    section: string,
    category: string,
    path: string,
    categoryLabel?: string,
    customTs?: string,
    customCoords?: string,
  ) => void;
  removePhotoBySection: (section: string, indexOrUri: number | string) => void;
  getPhotoTimestamp: (path: string) => string;
  getPhotoCoordinates: (path: string) => string;
  getPhotoCategory: (path: string) => string;
  setChecklistEntries: (entries: ChecklistEntry[]) => void;
  updateChecklistEntry: (
    index: number,
    updates: Partial<ChecklistEntry>,
  ) => void;
  setNotes: (notes: string) => void;
  setSignaturePath: (path: string) => void;
  setInspectionId: (id: string) => void;
  setEditingInspectionId: (id: string | null) => void;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setActivePop: (
    id: string | null,
    name?: string,
    location?: string,
    specifications?: string,
  ) => void;
  setCurrentLocation: (
    loc: { lat: number; lng: number; address?: string } | null,
  ) => void;
  updateFormData: (section: string, data: any) => void;
  loadExistingInspection: (inspection: any, asset?: any) => void;
  resetInspection: () => void;
  saveDraftNow: () => Promise<boolean>;
}

const formatTimestamp = () => {
  const now = new Date();
  return `${now.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })} ${now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })} WITA`;
};

const initialState = {
  currentAssetId: null,
  inspectionType: 'preventive' as InspectionType,
  photos: [] as string[],
  checklistEntries: [] as ChecklistEntry[],
  notes: '',
  signaturePath: '',
  inspectionId: null,
  editingInspectionId: null,
  originalInspectionDate: null,
  activePopId: null,
  activePopName: null,
  activePopLocation: null,
  currentLocation: null,
  currentStep: 0,
  formData: {},
  photoTimestamps: {} as Record<string, string>,
  photoCoordinates: {} as Record<string, string>,
  photoCategories: {} as Record<string, string>,
};

let draftTimeout: any = null;
const scheduleAutoSave = (getState: () => InspectionState) => {
  if (draftTimeout) clearTimeout(draftTimeout);
  draftTimeout = setTimeout(() => {
    const s = getState();
    if (s.activePopId) {
      saveInspectionDraft(s).catch(e => console.warn('Auto-save error:', e));
    }
  }, 400);
};

export const useInspectionStore = create<InspectionState>()((set, get) => ({
  ...initialState,

  setAsset: assetId => {
    set({ currentAssetId: assetId });
    scheduleAutoSave(get);
  },

  setInspectionType: type => {
    set({ inspectionType: type });
    scheduleAutoSave(get);
  },

  addPhoto: (path, customTs, customCoords) => {
    set(state => {
      const ts = customTs || state.photoTimestamps[path] || formatTimestamp();
      const coords =
        customCoords ||
        state.photoCoordinates[path] ||
        (state.currentLocation
          ? `${state.currentLocation.lat.toFixed(
              5,
            )}, ${state.currentLocation.lng.toFixed(5)}`
          : '');
      const newTimestamps = { ...state.photoTimestamps, [path]: ts };
      const newCoordinates = coords
        ? { ...state.photoCoordinates, [path]: coords }
        : state.photoCoordinates;
      return {
        photos: state.photos.includes(path)
          ? state.photos
          : [...state.photos, path],
        photoTimestamps: newTimestamps,
        photoCoordinates: newCoordinates,
        formData: {
          ...state.formData,
          photoTimestamps: newTimestamps,
          photoCoordinates: newCoordinates,
        },
      };
    });
    scheduleAutoSave(get);
  },

  removePhoto: index => {
    set(state => ({
      photos: state.photos.filter((_, i) => i !== index),
    }));
    scheduleAutoSave(get);
  },

  addPhotoBySection: (section, path, customTs, customCoords) => {
    set(state => {
      const sectionData = state.formData[section] || {};
      const sectionPhotos: string[] = sectionData.photos || [];
      const newSectionPhotos = sectionPhotos.includes(path)
        ? sectionPhotos
        : [...sectionPhotos, path];
      const newPhotos = state.photos.includes(path)
        ? state.photos
        : [...state.photos, path];
      const ts = customTs || state.photoTimestamps[path] || formatTimestamp();
      const coords =
        customCoords ||
        state.photoCoordinates[path] ||
        (state.currentLocation
          ? `${state.currentLocation.lat.toFixed(
              5,
            )}, ${state.currentLocation.lng.toFixed(5)}`
          : '');
      const newTimestamps = { ...state.photoTimestamps, [path]: ts };
      const newCoordinates = coords
        ? { ...state.photoCoordinates, [path]: coords }
        : state.photoCoordinates;
      return {
        photos: newPhotos,
        photoTimestamps: newTimestamps,
        photoCoordinates: newCoordinates,
        formData: {
          ...state.formData,
          photoTimestamps: newTimestamps,
          photoCoordinates: newCoordinates,
          [section]: {
            ...sectionData,
            photos: newSectionPhotos,
          },
        },
      };
    });
    scheduleAutoSave(get);
  },

  addCategorizedPhoto: (
    section,
    category,
    path,
    categoryLabel,
    customTs,
    customCoords,
  ) =>
    set(state => {
      const sectionData = state.formData[section] || {};
      const sectionPhotos: string[] = sectionData.photos || [];
      const newSectionPhotos = sectionPhotos.includes(path)
        ? sectionPhotos
        : [...sectionPhotos, path];
      const newPhotos = state.photos.includes(path)
        ? state.photos
        : [...state.photos, path];
      const ts = customTs || state.photoTimestamps[path] || formatTimestamp();
      const coords =
        customCoords ||
        state.photoCoordinates[path] ||
        (state.currentLocation
          ? `${state.currentLocation.lat.toFixed(
              5,
            )}, ${state.currentLocation.lng.toFixed(5)}`
          : '');
      const newTimestamps = { ...state.photoTimestamps, [path]: ts };
      const newCoordinates = coords
        ? { ...state.photoCoordinates, [path]: coords }
        : state.photoCoordinates;

      const label = categoryLabel || category;
      const newPhotoCategories = {
        ...state.photoCategories,
        ...(state.formData.photoCategories || {}),
        [path]: label,
      };

      const existingCategorized = Array.isArray(sectionData.categorizedPhotos)
        ? sectionData.categorizedPhotos
        : [];
      const filteredCategorized = existingCategorized.filter(
        (item: any) => item.uri !== path,
      );
      const newCategorizedPhotos = [
        ...filteredCategorized,
        {
          uri: path,
          category,
          categoryLabel: label,
          timestamp: ts,
          coordinates: coords,
        },
      ];

      scheduleAutoSave(get);
      return {
        photos: newPhotos,
        photoTimestamps: newTimestamps,
        photoCoordinates: newCoordinates,
        photoCategories: newPhotoCategories,
        formData: {
          ...state.formData,
          photoTimestamps: newTimestamps,
          photoCoordinates: newCoordinates,
          photoCategories: newPhotoCategories,
          [section]: {
            ...sectionData,
            photos: newSectionPhotos,
            photoCategories: newPhotoCategories,
            categorizedPhotos: newCategorizedPhotos,
          },
        },
      };
    }),

  getPhotoTimestamp: (path: string) => {
    if (!path) return '';
    const state = get();
    if (state.photoTimestamps && state.photoTimestamps[path]) {
      return state.photoTimestamps[path];
    }
    const ts = formatTimestamp();
    const newTimestamps = { ...(state.photoTimestamps || {}), [path]: ts };
    set(s => ({
      photoTimestamps: newTimestamps,
      formData: {
        ...s.formData,
        photoTimestamps: newTimestamps,
      },
    }));
    return ts;
  },

  getPhotoCoordinates: (path: string) => {
    if (!path) return '';
    const state = get();
    if (state.photoCoordinates && state.photoCoordinates[path]) {
      return state.photoCoordinates[path];
    }
    const coords = state.currentLocation
      ? `${state.currentLocation.lat.toFixed(
          5,
        )}, ${state.currentLocation.lng.toFixed(5)}`
      : '';
    if (coords) {
      const newCoordinates = {
        ...(state.photoCoordinates || {}),
        [path]: coords,
      };
      set(s => ({
        photoCoordinates: newCoordinates,
        formData: {
          ...s.formData,
          photoCoordinates: newCoordinates,
        },
      }));
    }
    return coords;
  },

  getPhotoCategory: (path: string) => {
    if (!path) return '';
    const state = get();
    if (state.photoCategories && state.photoCategories[path]) {
      return state.photoCategories[path];
    }
    const formCategories = state.formData?.photoCategories || {};
    return formCategories[path] || '';
  },

  removePhotoBySection: (section, target) =>
    set(state => {
      const sectionData = state.formData[section] || {};
      const sectionPhotos: string[] = sectionData.photos || [];
      let targetUri = '';
      let newSectionPhotos = sectionPhotos;

      if (typeof target === 'number') {
        targetUri = sectionPhotos[target];
        newSectionPhotos = sectionPhotos.filter((_, i) => i !== target);
      } else {
        targetUri = target;
        newSectionPhotos = sectionPhotos.filter(u => u !== target);
      }

      let newGlobalPhotos = state.photos;
      if (targetUri) {
        newGlobalPhotos = newGlobalPhotos.filter(u => u !== targetUri);
      }

      const existingCategorized = Array.isArray(sectionData.categorizedPhotos)
        ? sectionData.categorizedPhotos
        : [];
      const newCategorizedPhotos = existingCategorized.filter(
        (item: any) => item.uri !== targetUri,
      );

      const newPhotoCategories = { ...state.photoCategories };
      if (targetUri) {
        delete newPhotoCategories[targetUri];
      }

      scheduleAutoSave(get);
      return {
        photos: newGlobalPhotos,
        photoCategories: newPhotoCategories,
        formData: {
          ...state.formData,
          photoCategories: newPhotoCategories,
          [section]: {
            ...sectionData,
            photos: newSectionPhotos,
            categorizedPhotos: newCategorizedPhotos,
          },
        },
      };
    }),

  setChecklistEntries: entries => {
    set({ checklistEntries: entries });
    scheduleAutoSave(get);
  },

  updateChecklistEntry: (index, updates) => {
    set(state => {
      const entries = [...state.checklistEntries];
      entries[index] = { ...entries[index], ...updates };

      // Auto-determine status for numeric values
      if (updates.value !== undefined && entries[index].type === 'numeric') {
        const numVal = parseFloat(updates.value);
        const { minValue, maxValue } = entries[index];
        if (!isNaN(numVal) && minValue !== null && maxValue !== null) {
          if (numVal >= minValue && numVal <= maxValue) {
            entries[index].status = 'ok';
          } else if (numVal >= minValue * 0.9 && numVal <= maxValue * 1.1) {
            entries[index].status = 'warning';
          } else {
            entries[index].status = 'critical';
          }
        }
      }

      return { checklistEntries: entries };
    });
    scheduleAutoSave(get);
  },

  setNotes: notes => {
    set({ notes });
    scheduleAutoSave(get);
  },

  setSignaturePath: path => set({ signaturePath: path }),

  setInspectionId: id => set({ inspectionId: id }),

  setCurrentStep: step => set({ currentStep: step }),

  nextStep: () =>
    set(state => ({
      currentStep: Math.min(state.currentStep + 1, 4),
    })),

  prevStep: () =>
    set(state => ({ currentStep: Math.max(0, state.currentStep - 1) })),

  setActivePop: (id, name, location, specifications) => {
    const currentActiveId = get().activePopId;
    // Guard: Jika POP yang sama sudah aktif, jangan reset form dan jangan hapus data yang sudah diisi!
    if (currentActiveId && currentActiveId === id && id !== '') {
      set({
        activePopName: name || get().activePopName,
        activePopLocation: location || get().activePopLocation,
      });
      scheduleAutoSave(get);
      return;
    }

    // Guard: jangan reset formData jika sedang mode edit (data sudah di-load oleh loadExistingInspection)
    if (get().editingInspectionId) {
      set({
        activePopId: id,
        activePopName: name || null,
        activePopLocation: location || null,
      });
      scheduleAutoSave(get);
      return;
    }
    const inspectionStartTime = new Date().toISOString();
    let newFormData: any = {
      inspectionStartTime,
      infoPop: {
        timPLN: '',
      },
    };

    const masterRecord = findPopMasterRecord(id) || findPopMasterRecord(name);
    if (masterRecord) {
      newFormData = buildAutoFilledFormData(masterRecord, newFormData);
    } else if (specifications) {
      try {
        const specs = JSON.parse(specifications);
        newFormData = {
          ...newFormData,
          powerSystem: {
            idPelanggan: specs.id_pln || '',
            dayaListrik: specs.daya || '',
            phasaCatuan: specs.phasa || '',
          },
          kwhMeter: {
            idCustomer: specs.id_pln || '',
            daya: specs.daya || '',
            phasa: specs.phasa || '',
          },
          rectifier: {
            rectifiers: [
              {
                id: '1',
                isExpanded: true,
                merk: specs.rectifier_brand || '',
                tipe: '',
                sn: '',
                tipeModul: '',
                jmlModul: specs.rectifier_modul || '',
                jmlSlot: '',
                modules: [],
                mcbs: [
                  {
                    id: '1',
                    merk: '',
                    kapasitas: '',
                    peruntukan: '',
                  },
                ],
                arusBeban: '',
                tegInput: '',
                tegFloating: '',
              },
            ],
          },
          battery: {
            banks: [
              {
                id: '1',
                isExpanded: true,
                merk: specs.battery_brand || '',
                tipe: '',
                kapasitas: specs.battery_kapasitas || '',
                sn: '',
                tahunInstalasi: '',
                suhuBaterai: '',
                cell1: '',
                cell2: '',
                cell3: '',
                cell4: '',
                vTotal: '',
                kondisi: '',
              },
            ],
          },
        };
      } catch (e) {
        console.error('Failed to parse specifications', e);
      }
    }

    // Apply saved static PM profile if available (from previous PM on this POP)
    let savedProfile: any = null;
    if (specifications) {
      try {
        const specs = JSON.parse(specifications);
        if (specs.saved_pm_profile) {
          savedProfile = specs.saved_pm_profile;
        }
      } catch (e) {}
    }

    if (!savedProfile) {
      savedProfile =
        getCachedPopPmProfile(id) || (name ? getCachedPopPmProfile(name) : null);
    }

    if (savedProfile) {
      newFormData = applySavedPmProfile(newFormData, savedProfile);
    }

    set(state => ({
      activePopId: id,
      activePopName: name || null,
      activePopLocation: location || null,
      formData: newFormData,
      photos: [],
      checklistEntries: [],
      notes: '',
      signaturePath: '',
    }));
    scheduleAutoSave(get);

    // Asynchronously verify if DB has saved profile or past completed inspection for this POP
    getPopPmProfile(id, specifications)
      .then(dbProfile => {
        if (dbProfile) {
          set(state => {
            if (state.activePopId === id) {
              return {
                formData: applySavedPmProfile(state.formData, dbProfile),
              };
            }
            return {};
          });
        }
      })
      .catch(() => {});
  },
  setCurrentLocation: loc => {
    set({ currentLocation: loc });
    scheduleAutoSave(get);
  },
  setEditingInspectionId: id => set({ editingInspectionId: id }),

  updateFormData: (section: string, data: any) => {
    set(state => ({
      formData: {
        ...state.formData,
        [section]: {
          ...(state.formData[section] || {}),
          ...data,
        },
      },
    }));
    scheduleAutoSave(get);
  },

  loadExistingInspection: (insp: any, asset?: any) => {
    let parsedForm: any = {};
    if (insp.formData) {
      try {
        parsedForm =
          typeof insp.formData === 'string'
            ? JSON.parse(insp.formData)
            : insp.formData;
      } catch (e) {
        parsedForm = {};
      }
    } else if (insp && typeof insp === 'object' && !Array.isArray(insp)) {
      // Fallback: jika insp sendiri merupakan objek formData
      parsedForm = { ...insp };
    }

    let parsedPhotos: any[] = [];
    if (insp.photos) {
      try {
        parsedPhotos =
          typeof insp.photos === 'string'
            ? JSON.parse(insp.photos)
            : Array.isArray(insp.photos)
            ? insp.photos
            : [];
      } catch (e) {
        parsedPhotos = [];
      }
    } else if (Array.isArray(parsedForm.photos)) {
      parsedPhotos = parsedForm.photos;
    }

    const meta = parsedForm._draftMeta || {};
    const pTimestamps =
      insp.photoTimestamps ||
      meta.photoTimestamps ||
      parsedForm.photoTimestamps ||
      {};
    const pCoordinates =
      insp.photoCoordinates ||
      meta.photoCoordinates ||
      parsedForm.photoCoordinates ||
      {};
    const pCategories =
      insp.photoCategories ||
      meta.photoCategories ||
      parsedForm.photoCategories ||
      {};

    const popId =
      (asset as any)?.assetCode ||
      (asset as any)?.id ||
      insp.assetId ||
      meta.activePopId ||
      parsedForm?.infoPop?.popId ||
      '';
    const popName =
      (asset as any)?.name ||
      insp.popName ||
      meta.activePopName ||
      parsedForm?.infoPop?.namaPop ||
      popId;
    const popLocation =
      (asset as any)?.location ||
      insp.popLocation ||
      meta.activePopLocation ||
      parsedForm?.infoPop?.alamat ||
      '';

    const draftEntries =
      insp.checklistEntries ||
      meta.checklistEntries ||
      parsedForm.checklistEntries ||
      [];

    const isDraftRecord =
      insp.id === DRAFT_INSPECTION_ID ||
      insp.status === 'draft' ||
      !insp.id;

    const finalEditingId = isDraftRecord
      ? (meta.editingInspectionId || insp.editingInspectionId || null)
      : insp.id;
    const finalInspectionId = isDraftRecord ? null : insp.id;

    const loc =
      insp.currentLocation ||
      meta.currentLocation ||
      parsedForm.currentLocation ||
      null;

    set({
      currentAssetId:
        (asset as any)?.id ||
        insp.assetId ||
        meta.currentAssetId ||
        null,
      editingInspectionId: finalEditingId,
      inspectionId: finalInspectionId,
      originalInspectionDate:
        insp.inspectionDate || meta.originalInspectionDate || Date.now(),
      inspectionType: (insp.type as any) || meta.inspectionType || 'preventive',
      photos: parsedPhotos,
      checklistEntries: draftEntries,
      notes: insp.notes || parsedForm.notes || '',
      activePopId: popId,
      activePopName: popName,
      activePopLocation: popLocation,
      currentLocation: loc,
      photoTimestamps: pTimestamps,
      photoCoordinates: pCoordinates,
      photoCategories: pCategories,
      formData: {
        ...parsedForm,
        inspectionStartTime:
          parsedForm.inspectionStartTime ||
          (insp.inspectionDate
            ? new Date(insp.inspectionDate).toISOString()
            : new Date().toISOString()),
        photoTimestamps: pTimestamps,
        photoCoordinates: pCoordinates,
        photoCategories: pCategories,
      },
    });
  },

  resetInspection: () => {
    if (draftTimeout) {
      clearTimeout(draftTimeout);
      draftTimeout = null;
    }
    clearInspectionDraft().catch(e => console.warn('Clear draft error:', e));
    set(initialState);
  },

  saveDraftNow: async () => {
    if (draftTimeout) {
      clearTimeout(draftTimeout);
      draftTimeout = null;
    }
    return await saveInspectionDraft(get());
  },
}));

export type { ChecklistEntry };
