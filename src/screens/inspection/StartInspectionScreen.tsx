/**
 * Start Inspection (GPS Detection) Screen
 * Automatically scans GPS location to detect the closest POP within 100 meters.
 * Replaces the old photo requirement with pure, fast GPS scanning.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Geolocation from '@react-native-community/geolocation';
import { getDistance } from 'geolib';
import {
  Navigation as NavigationIcon,
  MapPin,
  Building2,
  ChevronRight,
  RotateCcw,
  ListFilter,
} from 'lucide-react-native';

import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import { Header, showAlert } from '../../components/common';
import database from '../../database';
import { Asset, ChecklistItem } from '../../database/models';
import { useInspectionStore } from '../../store/inspectionStore';
import {
  requestLocationPermission,
  cleanPopId,
  cleanPopName,
} from '../../utils/helpers';
import type { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface NearbyPopItem {
  asset: Asset;
  distance: number;
}

export const StartInspectionScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [detecting, setDetecting] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Memulai pemindaian GPS...');
  const [currentCoordsStr, setCurrentCoordsStr] = useState<string | null>(null);
  const [nearbyPops, setNearbyPops] = useState<NearbyPopItem[]>([]);
  const [showMultiPopModal, setShowMultiPopModal] = useState(false);

  // Pulse & Radar Animations
  const radarScale1 = useRef(new Animated.Value(1)).current;
  const radarOpacity1 = useRef(new Animated.Value(0.6)).current;
  const radarScale2 = useRef(new Animated.Value(1)).current;
  const radarOpacity2 = useRef(new Animated.Value(0.6)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;

  const {
    setActivePop,
    setCurrentLocation,
    setChecklistEntries,
    setAsset,
  } = useInspectionStore();

  useEffect(() => {
    // Start radar animation loop
    const radarLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(radarScale1, {
            toValue: 2.2,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(radarScale1, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(radarOpacity1, {
            toValue: 0,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(radarOpacity1, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(600),
          Animated.timing(radarScale2, {
            toValue: 2.2,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(radarScale2, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(600),
          Animated.timing(radarOpacity2, {
            toValue: 0,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(radarOpacity2, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(iconPulse, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(iconPulse, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    radarLoop.start();

    // Trigger GPS scan directly on mount
    processGpsDetection();

    return () => {
      radarLoop.stop();
    };
  }, []);

  const applySelectedPop = async (selectedAsset: Asset) => {
    try {
      setShowMultiPopModal(false);
      setDetecting(true);
      setLoadingMsg(`Menyiapkan data: ${cleanPopName(selectedAsset.name)}...`);

      const templateItems = await database
        .get<ChecklistItem>('checklist_items')
        .query()
        .fetch();

      const assetTemplateItems = templateItems.filter(
        item => item.templateId === selectedAsset?.checklistTemplateId,
      );

      const entries = assetTemplateItems.map(item => ({
        templateItemId: (item as any).id,
        category: item.category,
        label: item.label,
        type: item.type,
        unit: item.unit,
        options: item.options ? JSON.parse(item.options) : [],
        minValue: item.minValue,
        maxValue: item.maxValue,
        required: item.isRequired,
        status: 'na' as any,
        value: '',
        photoPath: '',
        notes: '',
        order: item.sortOrder,
      }));

      setActivePop(
        selectedAsset.assetCode,
        selectedAsset.name,
        selectedAsset.location,
        selectedAsset.specifications,
      );
      setChecklistEntries(entries);
      setAsset((selectedAsset as any).id);

      await new Promise<void>(resolve => setTimeout(resolve, 300));
      setDetecting(false);
      navigation.goBack();
    } catch (error) {
      console.error('Error applying selected POP:', error);
      setDetecting(false);
      navigation.goBack();
    }
  };

  const processGpsDetection = async () => {
    setDetecting(true);
    setLoadingMsg('Mendapatkan sinyal & koordinat GPS...');

    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      setDetecting(false);
      showAlert({
        type: 'warning',
        title: 'Izin Lokasi Diperlukan',
        message:
          'Aplikasi memerlukan izin GPS untuk mendeteksi POP terdekat secara otomatis.',
        buttons: [
          {
            text: 'Batal',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
          {
            text: 'Pilih Manual',
            onPress: () => navigation.replace('SelectPop'),
          },
        ],
      });
      return;
    }

    const fetchPosition = (
      enableHighAcc: boolean,
    ): Promise<{ latitude: number; longitude: number }> => {
      return new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          pos => resolve(pos.coords),
          err => reject(err),
          { enableHighAccuracy: enableHighAcc, timeout: 10000, maximumAge: 0 },
        );
      });
    };

    let coords: { latitude: number; longitude: number } | null = null;
    try {
      coords = await fetchPosition(true);
    } catch (err1) {
      console.log('High accuracy GPS failed, trying network location...', err1);
      try {
        coords = await fetchPosition(false);
      } catch (err2) {
        console.log('Network location failed as well', err2);
      }
    }

    if (coords) {
      const { latitude, longitude } = coords;
      const coordsStr = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      setCurrentCoordsStr(coordsStr);
      setCurrentLocation({ lat: latitude, lng: longitude });

      setLoadingMsg('Mencari POP terdekat dalam radius 100m...');

      try {
        const assets = await database.get<Asset>('assets').query().fetch();

        const matchedPops: NearbyPopItem[] = [];
        let closestAsset: Asset | null = null;
        let closestDistance = Infinity;

        for (const asset of assets) {
          if (asset.latitude && asset.longitude) {
            const distance = getDistance(
              { latitude, longitude },
              { latitude: asset.latitude, longitude: asset.longitude },
            );

            if (distance < closestDistance) {
              closestDistance = distance;
              closestAsset = asset;
            }

            // Jarak deteksi dibatasi 100 meter
            if (distance <= 100) {
              matchedPops.push({ asset, distance });
            }
          }
        }

        matchedPops.sort((a, b) => a.distance - b.distance);

        // Jika ditemukan tepat 1 POP
        if (matchedPops.length === 1) {
          const singlePop = matchedPops[0];
          setDetecting(false);
          setLoadingMsg(`Ditemukan: ${cleanPopName(singlePop.asset.name)}`);

          showAlert({
            type: 'success',
            title: 'POP Terdeteksi!',
            message: `Terdeteksi via GPS:\n${cleanPopName(
              singlePop.asset.name,
            )} (${cleanPopId(singlePop.asset.assetCode)})\nJarak: ${
              singlePop.distance
            } meter`,
            buttons: [
              {
                text: 'Pilih POP Lain',
                style: 'cancel',
                onPress: () => navigation.replace('SelectPop'),
              },
              {
                text: 'Mulai Maintenance',
                onPress: () => applySelectedPop(singlePop.asset),
              },
            ],
          });
          return;
        }

        // Jika ditemukan lebih dari 1 POP dalam 100m
        if (matchedPops.length > 1) {
          setNearbyPops(matchedPops);
          setDetecting(false);
          setLoadingMsg(`Ditemukan ${matchedPops.length} POP terdekat`);
          setShowMultiPopModal(true);
          return;
        }

        // Jika tidak ada POP dalam radius 100m
        setDetecting(false);
        setLoadingMsg('Tidak ada POP dalam radius 100m');

        const closestInfo = closestAsset
          ? `\n\nPOP terdekat yang terdaftar:\n${cleanPopName(
              closestAsset.name,
            )} (${
              closestDistance >= 1000
                ? (closestDistance / 1000).toFixed(1) + ' km'
                : closestDistance + ' meter'
            })`
          : '';

        showAlert({
          type: 'warning',
          title: 'Lokasi Tidak Cocok',
          message: `Lokasi GPS Anda tidak berada dalam radius 100 meter dari POP manapun.${closestInfo}\n\nSilakan scan ulang di lokasi atau pilih POP secara manual.`,
          buttons: [
            {
              text: 'Scan Ulang',
              onPress: () => processGpsDetection(),
            },
            {
              text: 'Pilih Manual',
              onPress: () => navigation.replace('SelectPop'),
            },
          ],
        });
        return;
      } catch (error) {
        console.error('Error during GPS matching:', error);
      }
    }

    setDetecting(false);
    setLoadingMsg('Gagal membaca koordinat GPS');
    showAlert({
      type: 'error',
      title: 'GPS Tidak Terdeteksi',
      message:
        'Gagal mendapatkan sinyal GPS dari perangkat Anda. Pastikan layanan lokasi/GPS aktif di ponsel Anda.',
      buttons: [
        {
          text: 'Coba Lagi',
          onPress: () => processGpsDetection(),
        },
        {
          text: 'Pilih Manual',
          onPress: () => navigation.replace('SelectPop'),
        },
      ],
    });
  };

  return (
    <View style={styles.container}>
      <Header
        title="Scan Lokasi GPS"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.content}>
        {/* Radar Scanner Visual */}
        <View style={styles.radarWrapper}>
          <Animated.View
            style={[
              styles.radarCircle,
              {
                transform: [{ scale: radarScale1 }],
                opacity: radarOpacity1,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.radarCircle,
              {
                transform: [{ scale: radarScale2 }],
                opacity: radarOpacity2,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.centerIconCircle,
              { transform: [{ scale: iconPulse }] },
            ]}
          >
            <NavigationIcon color={Colors.white} size={36} />
          </Animated.View>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          {detecting ? (
            <ActivityIndicator
              size="small"
              color={Colors.primary}
              style={{ marginBottom: Spacing.sm }}
            />
          ) : (
            <MapPin
              color={Colors.primary}
              size={24}
              style={{ marginBottom: Spacing.sm }}
            />
          )}

          <Text style={styles.statusMessage}>{loadingMsg}</Text>

          {currentCoordsStr ? (
            <Text style={styles.coordsText}>
              Koordinat: {currentCoordsStr}
            </Text>
          ) : null}

          <View style={styles.radiusBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.radiusBadgeText}>
              Radius: 100 Meter
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.scanAgainButton}
            onPress={processGpsDetection}
            disabled={detecting}
            activeOpacity={0.8}
          >
            <RotateCcw color={Colors.white} size={18} />
            <Text style={styles.scanAgainButtonText}>
              {detecting ? 'Sedang Memindai...' : 'Scan Ulang GPS'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.selectManualButton}
            onPress={() => navigation.replace('SelectPop')}
            activeOpacity={0.8}
          >
            <ListFilter color={Colors.primary} size={18} />
            <Text style={styles.selectManualButtonText}>
              Pilih POP Manual dari Daftar
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal Pilihan Multi-POP Terdekat */}
      <Modal
        visible={showMultiPopModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowMultiPopModal(false);
          navigation.goBack();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconCircle}>
                <Building2 color={Colors.primary} size={24} />
              </View>
              <Text style={styles.modalTitle}>Pilih POP Terdekat</Text>
              <Text style={styles.modalSubtitle}>
                Ditemukan {nearbyPops.length} POP dalam radius 100 meter dari
                posisi Anda saat ini:
              </Text>
            </View>

            <FlatList
              data={nearbyPops}
              keyExtractor={item =>
                (item.asset as any).id || item.asset.assetCode
              }
              style={styles.popList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.popCard}
                  activeOpacity={0.75}
                  onPress={() => applySelectedPop(item.asset)}
                >
                  <View style={styles.popCardLeft}>
                    <Text style={styles.popCardName}>
                      {cleanPopName(item.asset.name)}
                    </Text>
                    <Text style={styles.popCardCode}>
                      {cleanPopId(item.asset.assetCode)}
                    </Text>
                    {item.asset.location ? (
                      <Text style={styles.popCardLocation} numberOfLines={1}>
                        {item.asset.location}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.distanceBadge}>
                    <Text style={styles.distanceText}>{item.distance}m</Text>
                    <ChevronRight color={Colors.primary} size={16} />
                  </View>
                </TouchableOpacity>
              )}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalSelectManualBtn}
                onPress={() => {
                  setShowMultiPopModal(false);
                  navigation.replace('SelectPop');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSelectManualText}>
                  Pilih POP Lainnya dari Daftar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['2xl'],
  },
  radarWrapper: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
    position: 'relative',
  },
  radarCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  centerIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.lg,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statusCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
    ...Shadow.md,
  },
  statusMessage: {
    ...Typography.subtitle1,
    color: Colors.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  coordsText: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontFamily: 'monospace',
    marginBottom: Spacing.md,
  },
  radiusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
    marginRight: 6,
  },
  radiusBadgeText: {
    ...Typography.caption,
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    width: '100%',
    gap: Spacing.md,
  },
  scanAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  scanAgainButtonText: {
    ...Typography.button,
    color: Colors.white,
    fontWeight: 'bold',
  },
  selectManualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  selectManualButtonText: {
    ...Typography.button,
    color: Colors.primary,
    fontWeight: '600',
  },

  // Multi-POP Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    width: '100%',
    maxHeight: '80%',
    padding: Spacing.lg,
    ...Shadow.lg,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    ...Typography.h3,
    color: Colors.white,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalSubtitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  popList: {
    marginVertical: Spacing.sm,
  },
  popCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundSecondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  popCardLeft: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  popCardName: {
    ...Typography.body,
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  popCardCode: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  popCardLocation: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 2,
  },
  distanceText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalFooter: {
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: Spacing.md,
  },
  modalSelectManualBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  modalSelectManualText: {
    color: Colors.primary,
    ...Typography.button,
    fontSize: 13,
  },
});
