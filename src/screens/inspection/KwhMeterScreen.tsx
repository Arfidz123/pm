import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ChevronDown,
  ChevronLeft,
  Clock,
  Zap,
  Camera,
  FileText,
  Trash2,
  Image as ImageIcon,
  Lock,
} from 'lucide-react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import {
  Header,
  showAlert,
  DropdownModalPicker,
} from '../../components/common';
import { useInspectionStore } from '../../store/inspectionStore';
import {
  requestCameraPermission,
  getLiveCoordinatesString,
  getCurrentFormattedTimestamp,
} from '../../utils/helpers';
import { stampPhotoWithMetadata } from '../../services/imageStampService';
import type { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const KwhMeterScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Modal Picker state
  const [modalPicker, setModalPicker] = useState<{
    visible: boolean;
    title: string;
    options: string[];
    selectedValue: string;
    onSelect: (val: string) => void;
  }>({
    visible: false,
    title: '',
    options: [],
    selectedValue: '',
    onSelect: () => { },
  });

  // Entrance animations
  const contentAnim = useRef(new Animated.Value(0)).current;
  const saveButtonAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(contentAnim, {
      toValue: 1,
      friction: 7,
      tension: 45,
      delay: 100,
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

  const {
    formData,
    updateFormData,
    addPhotoBySection,
    removePhotoBySection,
    currentLocation,
    activePopLocation,
    getPhotoTimestamp,
    getPhotoCoordinates,
  } = useInspectionStore();
  const kwhData = formData.kwhMeter || {};

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
              'Gagal membuka kamera pada perangkat ini',
          });
          return;
        }
        if (response.assets && response.assets.length > 0) {
          const uri = response.assets[0].uri;
          if (uri) {
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
              console.warn('Gagal stamp foto kwh kamera:', stampErr);
            }

            addPhotoBySection(
              'kwhMeter',
              finalUri,
              photoTs,
              effectiveCoords || undefined,
            );
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
                console.warn('Gagal stamp foto kwh galeri:', stampErr);
              }

              addPhotoBySection(
                'kwhMeter',
                finalUri,
                photoTs,
                effectiveCoords || undefined,
              );
            }
          }
        }
      },
    );
  };
  const powerSystemData = formData.powerSystem || {};

  const updateField = (field: string, value: any) => {
    updateFormData('kwhMeter', { [field]: value });
  };

  const syncWithPowerSystem = (
    kwhField: string,
    psField: string,
    value: string,
  ) => {
    updateField(kwhField, value);
    updateFormData('powerSystem', { [psField]: value });
  };

  const phasaDropdownOpen = kwhData.phasaDropdownOpen ?? false;
  const setPhasaDropdownOpen = (v: boolean) =>
    updateField('phasaDropdownOpen', v);

  const cosDropdownOpen = kwhData.cosDropdownOpen ?? false;
  const setCosDropdownOpen = (v: boolean) => updateField('cosDropdownOpen', v);

  const aresterDropdownOpen = kwhData.aresterDropdownOpen ?? false;
  const setAresterDropdownOpen = (v: boolean) =>
    updateField('aresterDropdownOpen', v);

  const cosValue = kwhData.cosValue ?? 'Ada';
  const setCosValue = (v: string) => updateField('cosValue', v);

  const aresterValue = kwhData.aresterValue ?? 'Ada';
  const setAresterValue = (v: string) => updateField('aresterValue', v);

  const idCustomer = powerSystemData.idPelanggan ?? kwhData.idCustomer ?? '';
  const setIdCustomer = (v: string) =>
    syncWithPowerSystem('idCustomer', 'idPelanggan', v);

  const phasa = (powerSystemData.phasaCatuan ?? kwhData.phasa ?? '')
    .replace(/(phase|phasa)\s*/i, '')
    .trim();
  const setPhasa = (v: string) =>
    syncWithPowerSystem('phasa', 'phasaCatuan', v);

  const daya = powerSystemData.dayaListrik ?? kwhData.daya ?? '';
  const setDaya = (v: string) => syncWithPowerSystem('daya', 'dayaListrik', v);

  const mcbR = kwhData.mcbR ?? '';
  const setMcbR = (v: string) => updateField('mcbR', v);

  const mcbS = kwhData.mcbS ?? '';
  const setMcbS = (v: string) => updateField('mcbS', v);

  const mcbT = kwhData.mcbT ?? '';
  const setMcbT = (v: string) => updateField('mcbT', v);

  // Form state - Pengukuran (Mengikuti Tegangan Catuan & Total Arus Terpakai dari Power System - Terkunci)
  const rn = powerSystemData.teganganR_N ?? kwhData.rn ?? '';
  const rAmpere = powerSystemData.arusPhasaR ?? kwhData.rAmpere ?? '';
  const sn = powerSystemData.teganganS_N ?? kwhData.sn ?? '';
  const sAmpere = powerSystemData.arusPhasaS ?? kwhData.sAmpere ?? '';
  const tn = powerSystemData.teganganT_N ?? kwhData.tn ?? '';
  const tAmpere = powerSystemData.arusPhasaT ?? kwhData.tAmpere ?? '';
  const gnVoltage =
    powerSystemData.teganganG_N ?? kwhData.gnVoltage ?? kwhData.ngVoltage ?? '';

  useEffect(() => {
    updateFormData('kwhMeter', {
      rn,
      sn,
      tn,
      gnVoltage,
      ngVoltage: gnVoltage,
      rAmpere,
      sAmpere,
      tAmpere,
    });
  }, [rn, sn, tn, gnVoltage, rAmpere, sAmpere, tAmpere]);

  // Form state - Kabel Output
  const warnaR = kwhData.warnaR ?? '';
  const setWarnaR = (v: string) => updateField('warnaR', v);

  const luasR = kwhData.luasR ?? '';
  const setLuasR = (v: string) => updateField('luasR', v);

  const warnaS = kwhData.warnaS ?? '';
  const setWarnaS = (v: string) => updateField('warnaS', v);

  const luasS = kwhData.luasS ?? '';
  const setLuasS = (v: string) => updateField('luasS', v);

  const warnaT = kwhData.warnaT ?? '';
  const setWarnaT = (v: string) => updateField('warnaT', v);

  const luasT = kwhData.luasT ?? '';
  const setLuasT = (v: string) => updateField('luasT', v);

  const warnaN = kwhData.warnaN ?? '';
  const setWarnaN = (v: string) => updateField('warnaN', v);

  const luasN = kwhData.luasN ?? '';
  const setLuasN = (v: string) => updateField('luasN', v);

  const warnaG = kwhData.warnaG ?? '';
  const setWarnaG = (v: string) => updateField('warnaG', v);

  const luasG = kwhData.luasG ?? '';
  const setLuasG = (v: string) => updateField('luasG', v);

  const suhuR = kwhData.suhuR ?? '';
  const setSuhuR = (v: string) => updateField('suhuR', v);

  const suhuS = kwhData.suhuS ?? '';
  const setSuhuS = (v: string) => updateField('suhuS', v);

  const suhuT = kwhData.suhuT ?? '';
  const setSuhuT = (v: string) => updateField('suhuT', v);

  const suhuN = kwhData.suhuN ?? '';
  const setSuhuN = (v: string) => updateField('suhuN', v);

  const suhuG = kwhData.suhuG ?? '';
  const setSuhuG = (v: string) => updateField('suhuG', v);

  // Form state - Comment / Catatan
  const comment = kwhData.catatan || kwhData.comment || '';
  const setComment = (v: string) => {
    updateField('comment', v);
    updateField('catatan', v);
  };

  return (
    <View style={styles.container}>
      <Header
        title="KWH Meter"
        subtitle="Panel KWH Meter"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.contentContainer}>
        <Animated.ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          style={{
            opacity: contentAnim,
            transform: [
              {
                translateY: contentAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [24, 0],
                }),
              },
            ],
          }}
        >
          {/* Card 1: Panel KWH Meter */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Panel KWH Meter</Text>
              </View>
            </View>
            <View style={styles.titleDivider} />
            <View style={[styles.cardBody, { zIndex: 10 }]}>
              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>ID Pelanggan</Text>
                  <TextInput
                    style={styles.inputBox}
                    value={idCustomer}
                    onChangeText={setIdCustomer}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>
              <View style={[styles.row, { marginBottom: 0 }]}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phasa</Text>
                  <TouchableOpacity
                    style={styles.selectBox}
                    onPress={() => {
                      setModalPicker({
                        visible: true,
                        title: 'Pilih Phasa',
                        options: ['1', '3'],
                        selectedValue: phasa,
                        onSelect: val => setPhasa(val),
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.selectText,
                        !phasa && styles.selectTextPlaceholder,
                      ]}
                    >
                      {phasa || 'Pilih'}
                    </Text>
                    <ChevronDown color={Colors.textMuted} size={16} />
                  </TouchableOpacity>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Daya listrik</Text>
                  <TextInput
                    style={styles.inputBox}
                    value={daya}
                    onChangeText={setDaya}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Card 2: Kapasitas MCB */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Kapasitas MCB</Text>
              </View>
            </View>
            <View style={styles.titleDivider} />
            <View style={styles.cardBody}>
              <View style={[styles.row, { marginBottom: 0 }]}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phasa R</Text>
                  <TextInput
                    style={styles.inputBox}
                    value={mcbR}
                    onChangeText={setMcbR}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phasa S</Text>
                  <TextInput
                    style={styles.inputBox}
                    value={mcbS}
                    onChangeText={setMcbS}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.inputGroup, { marginRight: 0 }]}>
                  <Text style={styles.inputLabel}>Phasa T</Text>
                  <TextInput
                    style={styles.inputBox}
                    value={mcbT}
                    onChangeText={setMcbT}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Card 3: Pengukuran */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Pengukuran</Text>
              </View>
            </View>
            <View style={styles.titleDivider} />
            <View style={styles.cardBody}>
              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Tegangan R-N</Text>
                  <View style={styles.lockedContainer}>
                    <Text
                      style={[
                        styles.lockedText,
                        !rn && styles.lockedPlaceholder,
                      ]}
                    >
                      {rn || '—'}
                    </Text>
                    <Lock size={13} color={Colors.textMuted} />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phasa R</Text>
                  <View style={styles.lockedContainer}>
                    <Text
                      style={[
                        styles.lockedText,
                        !rAmpere && styles.lockedPlaceholder,
                      ]}
                    >
                      {rAmpere ? `${rAmpere} A` : '—'}
                    </Text>
                    <Lock size={13} color={Colors.textMuted} />
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Tegangan S-N</Text>
                  <View style={styles.lockedContainer}>
                    <Text
                      style={[
                        styles.lockedText,
                        !sn && styles.lockedPlaceholder,
                      ]}
                    >
                      {sn || '—'}
                    </Text>
                    <Lock size={13} color={Colors.textMuted} />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phasa S</Text>
                  <View style={styles.lockedContainer}>
                    <Text
                      style={[
                        styles.lockedText,
                        !sAmpere && styles.lockedPlaceholder,
                      ]}
                    >
                      {sAmpere ? `${sAmpere} A` : '—'}
                    </Text>
                    <Lock size={13} color={Colors.textMuted} />
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Tegangan T-N</Text>
                  <View style={styles.lockedContainer}>
                    <Text
                      style={[
                        styles.lockedText,
                        !tn && styles.lockedPlaceholder,
                      ]}
                    >
                      {tn || '—'}
                    </Text>
                    <Lock size={13} color={Colors.textMuted} />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phasa T</Text>
                  <View style={styles.lockedContainer}>
                    <Text
                      style={[
                        styles.lockedText,
                        !tAmpere && styles.lockedPlaceholder,
                      ]}
                    >
                      {tAmpere ? `${tAmpere} A` : '—'}
                    </Text>
                    <Lock size={13} color={Colors.textMuted} />
                  </View>
                </View>
              </View>

              <View style={[styles.row, { marginBottom: 0 }]}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Tegangan G-N</Text>
                  <View style={styles.lockedContainer}>
                    <Text
                      style={[
                        styles.lockedText,
                        !gnVoltage && styles.lockedPlaceholder,
                      ]}
                    >
                      {gnVoltage || '—'}
                    </Text>
                    <Lock size={13} color={Colors.textMuted} />
                  </View>
                </View>
                <View style={styles.inputGroup} />
              </View>
            </View>
          </View>

          {/* Card 4: COS & Arester */}
          <View
            style={[
              styles.card,
              { zIndex: cosDropdownOpen || aresterDropdownOpen ? 1000 : 5 },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>COS & Arester</Text>
              </View>
            </View>
            <View style={styles.titleDivider} />
            <View
              style={[
                styles.cardBody,
                { zIndex: cosDropdownOpen || aresterDropdownOpen ? 1000 : 5 },
              ]}
            >
              <View style={[styles.row, { zIndex: 100 }]}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>COS</Text>
                  <TouchableOpacity
                    style={styles.selectBox}
                    onPress={() => {
                      setModalPicker({
                        visible: true,
                        title: 'Pilih Status COS',
                        options: ['Ada', 'Tidak Ada'],
                        selectedValue: cosValue,
                        onSelect: val => setCosValue(val),
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.selectText,
                        !cosValue && styles.selectTextPlaceholder,
                      ]}
                    >
                      {cosValue || 'Pilih'}
                    </Text>
                    <ChevronDown color={Colors.textMuted} size={16} />
                  </TouchableOpacity>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>ARESTER</Text>
                  <TouchableOpacity
                    style={styles.selectBox}
                    onPress={() => {
                      setModalPicker({
                        visible: true,
                        title: 'Pilih Status ARESTER',
                        options: ['Ada', 'Tidak Ada'],
                        selectedValue: aresterValue,
                        onSelect: val => setAresterValue(val),
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.selectText,
                        !aresterValue && styles.selectTextPlaceholder,
                      ]}
                    >
                      {aresterValue || 'Pilih'}
                    </Text>
                    <ChevronDown color={Colors.textMuted} size={16} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Card 5: Kabel Output KWH */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Kabel Output KWH</Text>
              </View>
            </View>
            <View style={styles.titleDivider} />
            <View style={styles.cardBody}>
              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>WARNA R</Text>
                  <TextInput
                    style={styles.inputBox}
                    value={warnaR}
                    onChangeText={setWarnaR}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>LUAS</Text>
                  <TextInput
                    style={styles.inputBox}
                    value={luasR}
                    onChangeText={setLuasR}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={[styles.inputGroup, { marginRight: 0 }]}>
                  <Text style={styles.inputLabel}>SUHU</Text>
                  <TextInput
                    style={styles.inputBox}
                    value={suhuR}
                    onChangeText={setSuhuR}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>WARNA S</Text>
                  <TextInput
                    style={styles.inputBox}
                    value={warnaS}
                    onChangeText={setWarnaS}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>LUAS</Text>
                  <TextInput
                    style={styles.inputBox}
                    value={luasS}
                    onChangeText={setLuasS}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={[styles.inputGroup, { marginRight: 0 }]}>
                  <Text style={styles.inputLabel}>SUHU</Text>
                  <TextInput
                    style={styles.inputBox}
                    value={suhuS}
                    onChangeText={setSuhuS}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>WARNA T</Text>
                  <TextInput
                    style={styles.inputBox}
                    value={warnaT}
                    onChangeText={setWarnaT}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>LUAS</Text>
                  <TextInput
                    style={styles.inputBox}
                    value={luasT}
                    onChangeText={setLuasT}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={[styles.inputGroup, { marginRight: 0 }]}>
                  <Text style={styles.inputLabel}>SUHU</Text>
                  <TextInput
                    style={styles.inputBox}
                    value={suhuT}
                    onChangeText={setSuhuT}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>WARNA N</Text>
                  <TextInput
                    style={styles.inputBox}
                    value={warnaN}
                    onChangeText={setWarnaN}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>LUAS</Text>
                  <TextInput
                    style={styles.inputBox}
                    value={luasN}
                    onChangeText={setLuasN}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={[styles.inputGroup, { marginRight: 0 }]}>
                  <Text style={styles.inputLabel}>SUHU</Text>
                  <TextInput
                    style={styles.inputBox}
                    value={suhuN}
                    onChangeText={setSuhuN}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              <View style={[styles.row, { marginBottom: 0 }]}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>WARNA G</Text>
                  <TextInput
                    style={styles.inputBox}
                    value={warnaG}
                    onChangeText={setWarnaG}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>LUAS</Text>
                  <TextInput
                    style={styles.inputBox}
                    value={luasG}
                    onChangeText={setLuasG}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={[styles.inputGroup, { marginRight: 0 }]}>
                  <Text style={styles.inputLabel}>SUHU</Text>
                  <TextInput
                    style={styles.inputBox}
                    value={suhuG}
                    onChangeText={setSuhuG}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Card: Catatan */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Catatan</Text>
              </View>
            </View>
            <View style={styles.titleDivider} />
            <View style={styles.cardBody}>
              <TextInput
                style={[
                  styles.inputBox,
                  {
                    height: 100,
                    textAlignVertical: 'top',
                    paddingTop: 10,
                    paddingBottom: 10,
                  },
                ]}
                value={comment}
                onChangeText={setComment}
                placeholder="Tambahkan catatan..."
                placeholderTextColor={Colors.textMuted}
                multiline
              />
            </View>
          </View>

          <Animated.View style={{ transform: [{ scale: saveButtonAnim }] }}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => navigation.goBack()}
              onPressIn={handleSavePressIn}
              onPressOut={handleSavePressOut}
              activeOpacity={1}
            >
              <Text style={styles.saveButtonText}>Simpan & Kembali</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.ScrollView>
      </View>

      <DropdownModalPicker
        visible={modalPicker.visible}
        title={modalPicker.title}
        options={modalPicker.options}
        selectedValue={modalPicker.selectedValue}
        onSelect={modalPicker.onSelect}
        onClose={() => setModalPicker(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: Spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
  },
  backText: {
    ...Typography.body,
    color: Colors.white,
    marginLeft: 4,
  },
  headerTitle: {
    ...Typography.h4,
    color: Colors.white,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
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
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  cardBody: {
    marginTop: 0,
    paddingTop: 0,
  },
  sectionSubtitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dataLabel: {
    ...Typography.body,
    color: Colors.textMuted,
    flex: 1,
  },
  textInputBold: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'left',
    padding: 0,
    margin: 0,
  },
  subHeading: {
    ...Typography.h4,
    color: Colors.text,
    fontSize: 15,
    fontWeight: 'bold',
    lineHeight: 22,
    marginTop: Spacing.lg,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  gridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gridLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginRight: 4,
  },
  gridInput: {
    ...Typography.caption,
    color: Colors.text,
    padding: 0,
    margin: 0,
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  inputGroup: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  inputLabel: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  selectBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    height: 38,
  },
  selectBoxActive: {
    borderColor: '#3B82F6',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 38, // Height of the selectBox
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    ...Shadow.md,
    zIndex: 9999,
    elevation: 8,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
  },
  dropdownItemActive: {
    backgroundColor: '#3B82F6',
  },
  dropdownItemText: {
    ...Typography.body,
    color: Colors.text,
  },
  dropdownItemTextActive: {
    color: Colors.white,
  },
  selectText: {
    color: Colors.text,
    fontSize: 13,
  },
  selectTextPlaceholder: {
    color: Colors.textMuted,
  },
  inputBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    color: Colors.text,
    height: 38,
    fontSize: 13,
    textAlign: 'left',
  },
  commentContainer: {
    marginBottom: Spacing.lg,
  },
  commentBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: Colors.background,
    color: Colors.text,
    minHeight: 60,
    textAlignVertical: 'top',
    ...Typography.body,
  },
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
  timestampBadgeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 6,
    paddingVertical: 4,
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
  syncNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: Spacing.md,
  },
  syncNoticeText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  lockedContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 38,
  },
  lockedText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  lockedPlaceholder: {
    color: Colors.textMuted,
    fontWeight: 'normal',
  },
  measurementUnit: {
    ...Typography.body,
    color: Colors.textMuted,
    fontWeight: 'bold',
    marginLeft: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: 16,
    alignItems: 'center',
    marginTop: Spacing.lg,
    ...Shadow.md,
  },
  saveButtonText: {
    ...Typography.subtitle1,
    color: Colors.white,
    fontWeight: 'bold',
  },
});
