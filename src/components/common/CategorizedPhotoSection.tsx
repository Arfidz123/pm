import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import {
  Camera,
  Image as ImageIcon,
  Trash2,
  CheckCircle2,
  Folder,
  FolderCheck,
  ChevronRight,
} from 'lucide-react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import { DynamicPhotoCard } from './DynamicPhotoCard';
import { ImagePreviewModal } from './ImagePreviewModal';
import { showAlert } from './CustomAlert';
import { useInspectionStore } from '../../store/inspectionStore';
import {
  requestCameraPermission,
  getLiveCoordinatesString,
  getCurrentFormattedTimestamp,
} from '../../utils/helpers';
import { stampPhotoWithMetadata } from '../../services/imageStampService';

export interface PhotoCategoryConfig {
  key: string;
  label: string;
  description?: string;
}

interface CategorizedPhotoSectionProps {
  sectionKey: string; // 'rectifier' | 'kwhMeter' | 'battery' | 'dokumentasi'
  categories: PhotoCategoryConfig[];
  title?: string;
  addressStr?: string;
  coordsStr?: string;
  selectedFolderKey?: string | null;
  onSelectFolder?: (folderKey: string | null) => void;
  onFolderInfoChange?: (info: {
    key: string | null;
    label: string | null;
    count: number;
  }) => void;
}

export const CategorizedPhotoSection: React.FC<
  CategorizedPhotoSectionProps
> = ({
  sectionKey,
  categories,
  title = 'Foto Dokumentasi',
  addressStr,
  coordsStr,
  selectedFolderKey: controlledFolderKey,
  onSelectFolder,
  onFolderInfoChange,
}) => {
  const {
    formData,
    addCategorizedPhoto,
    removePhotoBySection,
    getPhotoTimestamp,
    getPhotoCoordinates,
    getPhotoCategory,
  } = useInspectionStore();

  // null = Folder Grid View, string = Inside Folder Content View
  const [internalFolderKey, setInternalFolderKey] = useState<string | null>(
    null,
  );
  const selectedFolderKey =
    controlledFolderKey !== undefined ? controlledFolderKey : internalFolderKey;

  const handleSetSelectedFolderKey = (key: string | null) => {
    if (onSelectFolder) {
      onSelectFolder(key);
    } else {
      setInternalFolderKey(key);
    }
  };

  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false);
  const [loadingText, setLoadingText] = useState('Memproses foto...');

  const sectionData = formData[sectionKey] || {};

  // Section photos logic:
  // For Dokumentasi: contains its own photos + any 'Foto Lainnya' from other modules
  const sectionPhotos: string[] = useMemo(() => {
    const list = [...(sectionData.photos || [])];

    if (sectionKey === 'dokumentasi') {
      const otherSections = [
        'rectifier',
        'kwhMeter',
        'battery',
        'mechanicalElect',
        'powerSystem',
      ];
      const storeCats = formData.photoCategories || {};

      otherSections.forEach(sec => {
        const otherSecData = formData[sec] || {};
        const otherPhotos: string[] = otherSecData.photos || [];
        const otherCategorized: Array<{
          uri: string;
          category: string;
          categoryLabel: string;
        }> = otherSecData.categorizedPhotos || [];

        otherPhotos.forEach(uri => {
          if (!uri || list.includes(uri)) return;

          const catItem = otherCategorized.find(c => c.uri === uri);
          const rawCat =
            catItem?.category || storeCats[uri] || getPhotoCategory(uri) || '';
          const isLainnya =
            rawCat.toLowerCase() === 'lainnya' ||
            rawCat.toLowerCase().includes('foto lainnya') ||
            rawCat.toLowerCase() === 'other';

          // Strictly ONLY include if it is 'lainnya'
          if (isLainnya) {
            list.push(uri);
          }
        });
      });
    }

    return list;
  }, [sectionData.photos, sectionKey, formData, getPhotoCategory]);

  const categorizedList: Array<{
    uri: string;
    category: string;
    categoryLabel: string;
    timestamp?: string;
    coordinates?: string;
  }> = sectionData.categorizedPhotos || [];

  // Map each photo URI to its category
  const photoCategoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    const storeCats = formData.photoCategories || {};
    categorizedList.forEach(item => {
      if (item.uri) map[item.uri] = item.category;
    });

    sectionPhotos.forEach(uri => {
      if (!map[uri]) {
        const catVal = storeCats[uri] || getPhotoCategory(uri);
        if (catVal) {
          const matched = categories.find(
            c =>
              c.key.toLowerCase() === catVal.toLowerCase() ||
              c.label.toLowerCase() === catVal.toLowerCase(),
          );
          if (matched) {
            map[uri] = matched.key;
          } else {
            const isLainnya =
              catVal.toLowerCase() === 'lainnya' ||
              catVal.toLowerCase().includes('foto lainnya') ||
              catVal.toLowerCase() === 'other';
            if (isLainnya) {
              map[uri] = 'lainnya';
            } else {
              map[uri] = catVal;
            }
          }
        }
      }
    });
    return map;
  }, [
    categorizedList,
    formData.photoCategories,
    sectionPhotos,
    categories,
    getPhotoCategory,
  ]);

  // Count photos per category & latest photo per category
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    const latestPhoto: Record<string, string | null> = {};

    categories.forEach(cat => {
      counts[cat.key] = 0;
      latestPhoto[cat.key] = null;
    });

    sectionPhotos.forEach(uri => {
      const catKey = photoCategoryMap[uri] || categories[0]?.key || 'lainnya';
      counts[catKey] = (counts[catKey] || 0) + 1;
      latestPhoto[catKey] = uri; // last one
    });

    return { counts, latestPhoto };
  }, [categories, sectionPhotos, photoCategoryMap]);

  // Current active category config when a folder is opened
  const activeCategory = useMemo(() => {
    if (!selectedFolderKey) return null;
    return categories.find(c => c.key === selectedFolderKey) || categories[0];
  }, [categories, selectedFolderKey]);

  // Photos to display inside the currently opened folder
  const displayedPhotos = useMemo(() => {
    if (!selectedFolderKey) return [];
    return sectionPhotos
      .map(uri => {
        const catKey = photoCategoryMap[uri] || 'lainnya';
        const catConfig = categories.find(c => c.key === catKey);
        return {
          uri,
          category: catKey,
          categoryLabel: catConfig ? catConfig.label : catKey,
        };
      })
      .filter(item => item.category === selectedFolderKey);
  }, [sectionPhotos, photoCategoryMap, selectedFolderKey, categories]);

  // Sync folder info to parent when inside a folder or photos change
  React.useEffect(() => {
    if (onFolderInfoChange) {
      onFolderInfoChange({
        key: selectedFolderKey,
        label: activeCategory ? activeCategory.label : null,
        count: displayedPhotos.length,
      });
    }
  }, [
    selectedFolderKey,
    activeCategory,
    displayedPhotos.length,
    onFolderInfoChange,
  ]);

  const handleTakePhoto = async () => {
    if (!selectedFolderKey) return;
    const targetCatKey = selectedFolderKey;
    const targetCat = categories.find(c => c.key === targetCatKey);
    const targetCatLabel = targetCat ? targetCat.label : 'Foto';

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      showAlert({
        type: 'error',
        title: 'Izin Kamera Ditolak',
        message: 'Aplikasi memerlukan izin kamera untuk mengambil foto.',
      });
      return;
    }

    launchCamera(
      {
        mediaType: 'photo',
        cameraType: 'back',
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.7,
        saveToPhotos: false,
        includeBase64: false,
      },
      async response => {
        if (response.didCancel) return;
        if (response.errorCode) {
          showAlert({
            type: 'error',
            title: 'Kamera Error',
            message:
              response.errorMessage ||
              'Gagal membuka kamera pada perangkat ini',
          });
          return;
        }
        if (response.assets && response.assets.length > 0) {
          const uri = response.assets[0].uri;
          if (uri) {
            setIsLoadingPhoto(true);
            setLoadingText('Menyematkan lokasi & waktu...');
            try {
              const liveCoords = await getLiveCoordinatesString();
              const photoTs = getCurrentFormattedTimestamp();
              const effectiveCoords = liveCoords || coordsStr;
              const effectiveAddr = addressStr;

              let finalUri = uri;
              try {
                finalUri = await stampPhotoWithMetadata(uri, {
                  timestamp: photoTs,
                  coordinates: effectiveCoords || undefined,
                  address: effectiveAddr || undefined,
                });
              } catch (stampErr) {
                console.warn('Gagal stamp foto kamera:', stampErr);
              }

              addCategorizedPhoto(
                sectionKey,
                targetCatKey,
                finalUri,
                targetCatLabel,
                photoTs,
                effectiveCoords || undefined,
              );
            } catch (err) {
              console.error('Error processing camera photo:', err);
            } finally {
              setIsLoadingPhoto(false);
            }
          }
        }
      },
    );
  };

  const handlePickGallery = () => {
    if (!selectedFolderKey) return;
    const targetCatKey = selectedFolderKey;
    const targetCat = categories.find(c => c.key === targetCatKey);
    const targetCatLabel = targetCat ? targetCat.label : 'Foto';

    launchImageLibrary(
      {
        mediaType: 'photo',
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.7,
        selectionLimit: 5,
        includeBase64: false,
      },
      async response => {
        if (response.didCancel) return;
        if (response.errorCode) {
          showAlert({
            type: 'error',
            title: 'Galeri Error',
            message: response.errorMessage || 'Gagal membuka galeri',
          });
          return;
        }
        if (response.assets && response.assets.length > 0) {
          setIsLoadingPhoto(true);
          setLoadingText('Menyimpan foto galeri...');
          try {
            const liveCoords = await getLiveCoordinatesString();
            const photoTs = getCurrentFormattedTimestamp();
            const effectiveCoords = liveCoords || coordsStr;
            const effectiveAddr = addressStr;

            for (const asset of response.assets) {
              if (asset.uri) {
                let finalUri = asset.uri;
                try {
                  finalUri = await stampPhotoWithMetadata(asset.uri, {
                    timestamp: photoTs,
                    coordinates: effectiveCoords || undefined,
                    address: effectiveAddr || undefined,
                  });
                } catch (stampErr) {
                  console.warn('Gagal stamp foto galeri:', stampErr);
                }

                addCategorizedPhoto(
                  sectionKey,
                  targetCatKey,
                  finalUri,
                  targetCatLabel,
                  photoTs,
                  effectiveCoords || undefined,
                );
              }
            }
          } catch (err) {
            console.error('Error processing gallery photo:', err);
          } finally {
            setIsLoadingPhoto(false);
          }
        }
      },
    );
  };

  const handleDeletePhoto = (uri: string, label: string) => {
    showAlert({
      type: 'warning',
      title: 'Hapus Foto',
      message: `Apakah Anda yakin ingin menghapus ${label}?`,
      buttons: [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            let targetSec = sectionKey;
            if (sectionKey === 'dokumentasi') {
              const dokPhotos = formData.dokumentasi?.photos || [];
              if (!dokPhotos.includes(uri)) {
                const otherSections = [
                  'rectifier',
                  'kwhMeter',
                  'battery',
                  'mechanicalElect',
                  'powerSystem',
                ];
                for (const sec of otherSections) {
                  const secPhotos = formData[sec]?.photos || [];
                  if (secPhotos.includes(uri)) {
                    targetSec = sec;
                    break;
                  }
                }
              }
            }
            removePhotoBySection(targetSec, uri);
          },
        },
      ],
    });
  };

  return (
    <View style={styles.container}>
      {/* VIEW 1: FOLDER GRID VIEW */}
      {selectedFolderKey === null ? (
        <View style={styles.folderViewContainer}>
          {/* 2-Column Folder Grid */}
          <View style={styles.folderGrid}>
            {categories.map(cat => {
              const count = categoryStats.counts[cat.key] || 0;
              const isCompleted = count >= 2;
              const previewUri = categoryStats.latestPhoto[cat.key];

              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.folderCard,
                    isCompleted && styles.folderCardCompleted,
                  ]}
                  onPress={() => handleSetSelectedFolderKey(cat.key)}
                  activeOpacity={0.75}
                >
                  {/* Ikon Folder Besar dengan Badge Counter */}
                  <View style={styles.folderIconContainer}>
                    <View
                      style={[
                        styles.folderIconBadge,
                        isCompleted && styles.folderIconBadgeCompleted,
                      ]}
                    >
                      {isCompleted ? (
                        <FolderCheck
                          size={44}
                          color={Colors.success}
                          strokeWidth={1.8}
                        />
                      ) : (
                        <Folder
                          size={44}
                          color={count > 0 ? Colors.primary : '#60a5fa'}
                          strokeWidth={1.8}
                        />
                      )}
                    </View>

                    {/* Badge Notifikasi Jumlah Foto (hanya jika ada foto) */}
                    {count > 0 && (
                      <View
                        style={[
                          styles.folderBadgeCircle,
                          isCompleted && styles.folderBadgeCircleCompleted,
                        ]}
                      >
                        <Text style={styles.folderBadgeCircleText}>
                          {count}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Nama Kategori (Menggantikan posisi "belum ada foto") */}
                  <View style={styles.folderCardContent}>
                    <Text style={styles.folderCategoryTitle} numberOfLines={2}>
                      {cat.label}
                    </Text>

                    {/* Baris Informasi Foto Halus */}
                    <View style={styles.folderMetaRow}>
                      {previewUri ? (
                        <Image
                          source={{ uri: previewUri }}
                          style={styles.thumbnailImg}
                        />
                      ) : null}
                      <Text
                        style={[
                          styles.folderCountText,
                          isCompleted && styles.folderCountTextCompleted,
                        ]}
                      >
                        {count > 0 ? `${count} Foto Tersimpan` : '0 Foto'}
                      </Text>
                      <ChevronRight
                        size={14}
                        color={Colors.textMuted}
                        style={{ marginLeft: 2 }}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : (
        /* VIEW 2: INSIDE FOLDER CONTENT VIEW */
        <View style={styles.folderContentContainer}>
          {/* Photo Grid Inside Folder */}
          <View style={styles.photoGrid}>
            {displayedPhotos.map((item, index) => (
              <DynamicPhotoCard
                key={`${item.uri}_${index}`}
                uri={item.uri}
                onPress={() => setSelectedPhoto(item.uri)}
                onDelete={() => handleDeletePhoto(item.uri, item.categoryLabel)}
                dateStr={getPhotoTimestamp(item.uri)}
                coordsStr={getPhotoCoordinates(item.uri) || coordsStr}
                addressStr={addressStr}
                label={item.categoryLabel}
              />
            ))}

            {/* Loading Card in Grid while processing */}
            {isLoadingPhoto && (
              <View style={styles.photoUploadBoxWrapper}>
                <View style={styles.photoUploadBoxLoading}>
                  <ActivityIndicator
                    size="large"
                    color={Colors.primary}
                    style={{ marginBottom: 6 }}
                  />
                  <Text style={styles.photoLoadingTitle}>Memproses...</Text>
                  <Text style={styles.photoLoadingSubtitle}>{loadingText}</Text>
                </View>
              </View>
            )}

            {/* Upload Buttons */}
            <TouchableOpacity
              style={styles.photoUploadBoxWrapper}
              onPress={handleTakePhoto}
              activeOpacity={0.7}
              disabled={isLoadingPhoto}
            >
              <View style={styles.photoUploadBoxAdd}>
                <Camera
                  color={Colors.primary}
                  size={26}
                  style={{ marginBottom: 4 }}
                />
                <Text style={styles.photoUploadText}>Kamera</Text>
                {activeCategory && (
                  <Text style={styles.photoUploadSubText} numberOfLines={1}>
                    {activeCategory.label}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.photoUploadBoxWrapper}
              onPress={handlePickGallery}
              activeOpacity={0.7}
              disabled={isLoadingPhoto}
            >
              <View style={styles.photoUploadBoxAdd}>
                <ImageIcon
                  color={Colors.textMuted}
                  size={26}
                  style={{ marginBottom: 4 }}
                />
                <Text style={styles.photoUploadText}>Galeri</Text>
                {activeCategory && (
                  <Text style={styles.photoUploadSubText} numberOfLines={1}>
                    {activeCategory.label}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Fullscreen Photo Viewer Modal */}
      <ImagePreviewModal
        visible={!!selectedPhoto}
        imageUri={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
      />

      {/* Loading Modal Backdrop during Photo Processing */}
      <Modal visible={isLoadingPhoto} transparent animationType="fade">
        <View style={styles.loadingModalOverlay}>
          <View style={styles.loadingModalCard}>
            <ActivityIndicator
              size="large"
              color={Colors.primary}
              style={{ marginBottom: 12 }}
            />
            <Text style={styles.loadingModalTitle}>Memproses Foto</Text>
            <Text style={styles.loadingModalSubtitle}>{loadingText}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  // Folder Grid Styles
  folderViewContainer: {
    width: '100%',
  },
  folderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  folderCard: {
    width: '48.5%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    ...Shadow.sm,
    alignItems: 'center',
  },
  folderCardCompleted: {
    borderColor: 'rgba(34, 197, 94, 0.35)',
    backgroundColor: 'rgba(34, 197, 94, 0.04)',
  },
  folderIconContainer: {
    position: 'relative',
    marginBottom: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderIconBadge: {
    width: 66,
    height: 66,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderIconBadgeCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  folderBadgeCircle: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: Colors.primary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  folderBadgeCircleCompleted: {
    backgroundColor: Colors.success,
  },
  folderBadgeCircleText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  folderCardContent: {
    width: '100%',
    alignItems: 'center',
  },
  folderCategoryTitle: {
    ...Typography.body,
    fontSize: 12.5,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    minHeight: 34,
    marginBottom: 4,
  },
  folderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  folderCountText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  folderCountTextCompleted: {
    color: Colors.success,
    fontWeight: 'bold',
  },
  thumbnailImg: {
    width: 18,
    height: 18,
    borderRadius: 4,
    marginRight: 4,
    backgroundColor: Colors.surfaceLight,
  },

  // Folder Content View Styles
  folderContentContainer: {
    width: '100%',
  },
  backToFoldersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  backToFoldersBtnText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  activeCategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  categoryInfoLeft: {
    flex: 1,
  },
  titleWithIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeCategoryTitle: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: 'bold',
    fontSize: 13,
  },
  activeCategorySubtitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  minRequirementPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  minRequirementPillSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  minRequirementPillText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  minRequirementPillTextSuccess: {
    color: Colors.success,
  },

  // Photo Grid Styles
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  photoUploadBoxWrapper: {
    width: '47%',
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  photoUploadBoxAdd: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderWidth: 1.5,
    borderColor: Colors.glassBorder,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 6,
  },
  photoUploadText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  photoUploadSubText: {
    fontSize: 9.5,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  photoUploadBoxLoading: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 8,
  },
  photoLoadingTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 4,
  },
  photoLoadingSubtitle: {
    fontSize: 9,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  loadingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingModalCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    minWidth: 220,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    ...Shadow.lg,
  },
  loadingModalTitle: {
    ...Typography.h3,
    color: Colors.text,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  loadingModalSubtitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
});
