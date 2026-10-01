import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Animated,
  Easing,
  BackHandler,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Camera,
  Trash2,
  Plus,
  Image as ImageIcon,
  Clock,
  MapPin,
  Building2,
} from 'lucide-react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import {
  Header,
  showAlert,
  CategorizedPhotoSection,
  PhotoCategoryConfig,
} from '../../components/common';
import { useInspectionStore } from '../../store/inspectionStore';

const DOKUMENTASI_PHOTO_CATEGORIES: PhotoCategoryConfig[] = [
  { key: 'popLuar', label: 'Foto POP Tampak Luar' },
  { key: 'popDalam', label: 'Foto POP Tampak Dalam' },
  { key: 'genset', label: 'Foto Genset' },
  { key: 'odf', label: 'Foto ODF' },
  { key: 'acpdb', label: 'Foto ACPDB' },
  { key: 'dcpdb', label: 'Foto DCPDB' },
  { key: 'ats', label: 'Foto ATS' },
  { key: 'powerSupply', label: 'Foto Power Supply' },
  { key: 'exhaustFan', label: 'Foto Exhaust Fan' },
  { key: 'kwhLuar', label: 'Foto Tampak Luar KWH' },
  { key: 'kwhDalam', label: 'Foto Tampak Dalam KWH' },
  { key: 'rectifierKeseluruhan', label: 'Foto Keseluruhan Rectifier' },
  { key: 'rectifierLcd', label: 'Foto LCD Rectifier' },
  { key: 'batteryKeseluruhan', label: 'Foto Keseluruhan Battery' },
  { key: 'batteryJauh', label: 'Foto Tampak Jauh Battery' },
  { key: 'batteryDekat', label: 'Foto Tampak Dekat Battery' },
  { key: 'lainnya', label: 'Foto Lainnya' },
];
import {
  requestCameraPermission,
  fetchCurrentLocation,
  getLiveCoordinatesString,
  getCurrentFormattedTimestamp,
} from '../../utils/helpers';
import type { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const DokumentasiScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {
    activePopId,
    photos,
    addPhoto,
    removePhoto,
    removePhotoBySection,
    currentLocation,
    setCurrentLocation,
    activePopLocation,
    formData,
    getPhotoTimestamp,
    getPhotoCoordinates,
  } = useInspectionStore();
  const [fotoExpanded, setFotoExpanded] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Folder navigation state
  const [selectedFolderKey, setSelectedFolderKey] = useState<string | null>(
    null,
  );
  const [activeFolderInfo, setActiveFolderInfo] = useState<{
    key: string | null;
    label: string | null;
    count: number;
  }>({
    key: null,
    label: null,
    count: 0,
  });

  // Handle back button: if inside a folder, return to folder list!
  const handleHeaderBack = () => {
    if (selectedFolderKey !== null) {
      setSelectedFolderKey(null);
    } else {
      navigation.goBack();
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      if (selectedFolderKey !== null) {
        setSelectedFolderKey(null);
        return true; // handled, don't exit screen
      }
      return false; // let default navigation handle it
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [selectedFolderKey]);

  // Entrance animations
  const contentAnim = useRef(new Animated.Value(0)).current;
  const saveButtonAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(contentAnim, {
      toValue: 1,
      friction: 7,
      tension: 45,
      delay: 80,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSavePressIn = () => {
    Animated.spring(saveButtonAnim, {
      toValue: 0.96,
      friction: 4,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };
  const handleSavePressOut = () => {
    Animated.spring(saveButtonAnim, {
      toValue: 1,
      friction: 3,
      tension: 150,
      useNativeDriver: true,
    }).start();
  };

  React.useEffect(() => {
    const loadGps = async () => {
      const loc = await fetchCurrentLocation();
      if (loc) setCurrentLocation(loc);
    };
    loadGps();
  }, []);

  const infoPop = formData.infoPop || {};
  const coordsStr =
    infoPop.koordinat ||
    (currentLocation
      ? `${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}`
      : '');
  const addressStr =
    infoPop.alamat && infoPop.alamat.trim() !== ''
      ? infoPop.alamat
      : activePopLocation || currentLocation?.address || '-';
  const now = new Date();
  const dateStr = `${now.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })} ${now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })} WITA`;

  // Collect all unique photo items across sections
  const allPhotoItems: {
    uri: string;
    label: string;
    sectionKey?: string;
    indexInSection?: number;
  }[] = [];
  const seenUris = new Set<string>();

  const addPhotoItem = (
    uri: string,
    label: string,
    sectionKey?: string,
    indexInSection?: number,
  ) => {
    if (!uri) return;
    const cleanKey = uri
      .trim()
      .replace(/^file:\/\//i, '')
      .split('?')[0];
    if (!seenUris.has(cleanKey)) {
      seenUris.add(cleanKey);
      allPhotoItems.push({ uri, label, sectionKey, indexInSection });
    }
  };

  const sectionList = [
    { key: 'kwhMeter', label: 'Foto KWH Meter' },
    { key: 'rectifier', label: 'Foto Rectifier' },
    { key: 'battery', label: 'Foto Battery' },
  ];

  sectionList.forEach(sec => {
    const secData = formData[sec.key] || {};
    const secPhotos: string[] = secData.photos || secData.fotos || [];
    if (Array.isArray(secPhotos)) {
      secPhotos.forEach((p, idx) =>
        addPhotoItem(p, `${sec.label} #${idx + 1}`, sec.key, idx),
      );
    }
  });

  if (Array.isArray(photos)) {
    photos.forEach((p, idx) => addPhotoItem(p, `Foto Dokumentasi #${idx + 1}`));
  }
  const dok = formData.dokumentasi || {};
  const dokPhotos: string[] = dok.photos || dok.fotos || [];
  if (Array.isArray(dokPhotos)) {
    dokPhotos.forEach((p, idx) =>
      addPhotoItem(p, `Foto Dokumentasi #${idx + 1}`),
    );
  }

  const handleTakePhoto = async () => {
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
              'Tidak dapat membuka kamera pada perangkat ini',
          });
          return;
        }
        if (response.assets && response.assets.length > 0) {
          const uri = response.assets[0].uri;
          if (uri) {
            const liveCoords = await getLiveCoordinatesString();
            const photoTs = getCurrentFormattedTimestamp();
            addPhoto(uri, photoTs, liveCoords || undefined);
          }
        }
      },
    );
  };

  const handlePickGallery = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.7,
        selectionLimit: 5,
      },
      async response => {
        if (response.assets && response.assets.length > 0) {
          const liveCoords = await getLiveCoordinatesString();
          const photoTs = getCurrentFormattedTimestamp();
          response.assets.forEach(asset => {
            if (asset.uri) {
              addPhoto(asset.uri, photoTs, liveCoords || undefined);
            }
          });
        }
      },
    );
  };

  if (!activePopId) {
    return (
      <View style={styles.container}>
        <Header
          title="Dokumentasi"
          subtitle="Foto Hasil Inspeksi POP"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.emptyLockContainer}>
          <View style={styles.lockIconCircle}>
            <Building2 size={44} color={Colors.primary} />
          </View>
          <Text style={styles.emptyLockTitle}>Pilih POP Terlebih Dahulu</Text>
          <Text style={styles.emptyLockDesc}>
            Halaman dokumentasi foto hanya dapat digunakan setelah Anda memilih
            lokasi POP inspeksi.
          </Text>
          <TouchableOpacity
            style={styles.selectPopLockBtn}
            onPress={() => navigation.navigate('SelectPop')}
            activeOpacity={0.8}
          >
            <Text style={styles.selectPopLockBtnText}>Pilih POP Sekarang</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Dokumentasi"
        subtitle="Foto Hasil Inspeksi POP"
        onBack={handleHeaderBack}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Camera
                color={Colors.primary}
                size={20}
                style={{ marginRight: Spacing.sm }}
              />
              <Text style={styles.cardTitle} numberOfLines={1}>
                {activeFolderInfo.key
                  ? `${activeFolderInfo.label} (${activeFolderInfo.count})`
                  : `Foto Dokumentasi POP (${
                      (formData.dokumentasi?.photos || []).length
                    })`}
              </Text>
            </View>

            {/* Tulisan Minimal 2 saat berada di dalam folder */}
            {activeFolderInfo.key ? (
              <View
                style={[
                  styles.minRequirementBadge,
                  activeFolderInfo.count >= 2
                    ? styles.minRequirementBadgeSuccess
                    : styles.minRequirementBadgeWarning,
                ]}
              >
                <Text
                  style={[
                    styles.minRequirementBadgeText,
                    activeFolderInfo.count >= 2
                      ? styles.minRequirementBadgeTextSuccess
                      : styles.minRequirementBadgeTextWarning,
                  ]}
                >
                  {activeFolderInfo.count >= 2 ? 'Minimal 2 ✓' : 'Minimal 2'}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.titleDivider} />

          <View style={styles.cardBody}>
            <CategorizedPhotoSection
              sectionKey="dokumentasi"
              categories={DOKUMENTASI_PHOTO_CATEGORIES}
              title="Dokumentasi POP"
              addressStr={addressStr}
              coordsStr={coordsStr}
              selectedFolderKey={selectedFolderKey}
              onSelectFolder={setSelectedFolderKey}
              onFolderInfoChange={setActiveFolderInfo}
            />
          </View>
        </View>

        <Animated.View style={{ transform: [{ scale: saveButtonAnim }] }}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleHeaderBack}
            onPressIn={handleSavePressIn}
            onPressOut={handleSavePressOut}
            activeOpacity={1}
          >
            <Text style={styles.saveButtonText}>
              {selectedFolderKey !== null
                ? 'Selesai & Kembali ke Folder'
                : 'Simpan & Kembali'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  cardTitle: {
    ...Typography.h4,
    color: Colors.text,
    fontSize: 17,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  titleDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  minRequirementBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  minRequirementBadgeSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.35)',
  },
  minRequirementBadgeWarning: {
    backgroundColor: 'rgba(243, 156, 18, 0.15)',
    borderColor: 'rgba(243, 156, 18, 0.35)',
  },
  minRequirementBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  minRequirementBadgeTextSuccess: {
    color: Colors.success,
  },
  minRequirementBadgeTextWarning: {
    color: Colors.warning,
  },
  cardBody: {},
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
  photoUploadBox: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.surfaceLight,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'stretch',
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
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  photoUploadText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 6,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    ...Shadow.sm,
    zIndex: 10,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.md,
    ...Shadow.md,
  },
  saveButtonText: {
    ...Typography.button,
    color: Colors.white,
    fontWeight: 'bold',
  },
  timestampBadgeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  timestampOverlayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1,
  },
  timestampOverlayText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  timestampOverlayTextSub: {
    color: '#ffffff',
    fontSize: 8.5,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  emptyLockContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  lockIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  emptyLockTitle: {
    ...Typography.h3,
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.xs + 2,
    textAlign: 'center',
  },
  emptyLockDesc: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.lg,
    maxWidth: 280,
  },
  selectPopLockBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.md,
    ...Shadow.md,
  },
  selectPopLockBtnText: {
    ...Typography.body,
    fontSize: 13.5,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
