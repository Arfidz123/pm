/**
 * Dashboard Screen
 * Main home screen with camera button and 9-grid menu
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
  Image,
  Easing,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import {
  Camera,
  Navigation,
  Building2,
  FileText,
  Zap,
  Gauge,
  Battery,
  ClipboardCheck,
  MapPin,
  CheckCircle2,
  Bell,
  Gpu,
  EvCharger,
  Wind,
  ServerCog,
  ServerCrash,
  FileClock,
  Trash2,
} from 'lucide-react-native';

import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import { showAlert, AcpdbIcon, DcpdbIcon } from '../../components/common';
import database from '../../database';
import { Asset } from '../../database/models';
import { useAppStore } from '../../store/appStore';
import { useInspectionStore } from '../../store/inspectionStore';
import {
  getInspectionDraft,
  clearInspectionDraft,
  DraftInspectionData,
} from '../../services/draftService';
import { cleanPopName } from '../../utils/helpers';
import type { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');
const GRID_SPACING = Spacing.md;
const GRID_ITEM_WIDTH = Math.floor(
  (width - Spacing.lg * 2 - GRID_SPACING * 2) / 3,
);

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat Pagi';
  if (hour < 15) return 'Selamat Siang';
  if (hour < 18) return 'Selamat Sore';
  return 'Selamat Malam';
};

const MENU_ITEMS = [
  { id: 'dokumentasi', label: 'Dokumentasi', icon: Camera },
  { id: 'pop', label: 'POP', icon: Building2 },
  { id: 'info_pop', label: 'Info POP', icon: FileText },
  { id: 'power_system', label: 'Power System', icon: Zap },
  { id: 'mechanical_electrical', label: 'Mechanical Electrical', icon: Wind },
  { id: 'external_alarm', label: 'External Alarm', icon: Bell },
  { id: 'genset', label: 'Genset', icon: EvCharger },
  { id: 'fot_ip', label: 'FOT IP', icon: ServerCog },
  { id: 'fot_dwdm', label: 'FOT DWDM', icon: ServerCrash },
  { id: 'kwh_meter', label: 'KWH', icon: Gauge },
  { id: 'acpdb', label: 'ACPDB', icon: AcpdbIcon },
  { id: 'dcpdb', label: 'DCPDB', icon: DcpdbIcon },
  { id: 'rectifier', label: 'Rectifier', icon: Gpu },
  { id: 'baterai', label: 'Baterai', icon: Battery },
  { id: 'review', label: 'Review', icon: ClipboardCheck },
];

// ─── Floating orb helper ─────────────────────────────────────────────────────
const FloatingOrb: React.FC<{
  size: number;
  color: string;
  style: any;
}> = ({ size, color, style }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const driftAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000 + Math.random() * 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000 + Math.random() * 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const drift = Animated.loop(
      Animated.sequence([
        Animated.timing(driftAnim, {
          toValue: 1,
          duration: 4000 + Math.random() * 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(driftAnim, {
          toValue: 0,
          duration: 4000 + Math.random() * 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    float.start();
    drift.start();
    return () => {
      float.stop();
      drift.stop();
    };
  }, []);

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: 0.15,
        },
        style,
        {
          transform: [
            {
              translateY: floatAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -18],
              }),
            },
            {
              translateX: driftAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 10],
              }),
            },
          ],
        },
      ]}
    />
  );
};

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { inspectorName } = useAppStore();
  const {
    activePopId,
    activePopName,
    activePopLocation,
    loadExistingInspection,
    resetInspection,
  } = useInspectionStore();
  const [refreshing, setRefreshing] = useState(false);
  const [foundDraft, setFoundDraft] = useState<DraftInspectionData | null>(null);

  // Animated values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(40))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];
  const gridAnims = useState(() =>
    MENU_ITEMS.map(() => new Animated.Value(0)),
  )[0];
  const headerScaleAnim = useRef(new Animated.Value(0)).current;
  const gridPressAnims = useState(() =>
    MENU_ITEMS.map(() => new Animated.Value(1)),
  )[0];
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const cleanNames = async () => {
      try {
        const assets = await database.get<Asset>('assets').query().fetch();
        const updates: any[] = [];
        for (const asset of assets) {
          if (asset.name.match(/^POP_[a-zA-Z0-9]+_?/i)) {
            const cleanName = asset.name
              .replace(/^POP_[a-zA-Z0-9]+_?/i, '')
              .trim();
            if (cleanName !== asset.name) {
              updates.push(
                asset.prepareUpdate(a => {
                  a.name = cleanName;
                }),
              );
            }
          }
        }
        if (updates.length > 0) {
          await database.write(async () => {
            await database.batch(...updates);
          });
          console.log(`Cleaned ${updates.length} POP names`);
        }
      } catch (err) {
        console.error('Failed to clean POP names', err);
      }
    };
    cleanNames();

    // Glow loop for active state indicator
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    glow.start();
    return () => glow.stop();
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Reset values for entry transition
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      headerScaleAnim.setValue(0);
      gridAnims.forEach(anim => anim.setValue(0));

      // Header entrance
      Animated.spring(headerScaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }).start();

      // Entry animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();

      // Staggered grid entrance with bounce
      Animated.stagger(
        55,
        gridAnims.map(anim =>
          Animated.spring(anim, {
            toValue: 1,
            friction: 5,
            tension: 55,
            useNativeDriver: true,
          }),
        ),
      ).start();

      // Continuous pulse for camera button
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 1100,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1100,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoop.start();

      // Check if any unfinished draft exists in local SQLite
      const checkDraft = async () => {
        if (!activePopId) {
          const draft = await getInspectionDraft();
          if (draft && draft.assetId) {
            setFoundDraft(draft);
          } else {
            setFoundDraft(null);
          }
        } else {
          setFoundDraft(null);
        }
      };
      checkDraft();

      return () => {
        pulseLoop.stop();
      };
    }, [activePopId]),
  );

  const handleGridPressIn = (index: number) => {
    Animated.spring(gridPressAnims[index], {
      toValue: 0.92,
      friction: 4,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleGridPressOut = (index: number) => {
    Animated.spring(gridPressAnims[index], {
      toValue: 1,
      friction: 3,
      tension: 150,
      useNativeDriver: true,
    }).start();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate loading
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleStartGpsScan = () => {
    // Navigate to GPS detection logic
    navigation.navigate('StartInspection');
  };

  const handleResumeDraft = () => {
    if (!foundDraft) return;
    loadExistingInspection(foundDraft.formData, {
      id: foundDraft.assetId,
      assetCode: foundDraft.assetId,
      name: foundDraft.popName,
      location: foundDraft.popLocation,
    });
    const draftName = foundDraft.popName;
    setFoundDraft(null);
    showAlert({
      type: 'success',
      title: 'Draft Dipulihkan!',
      message: `Seluruh data pengerjaan untuk POP ${draftName} berhasil dipulihkan. Anda dapat melanjutkan pengisian form.`,
    });
  };

  const handleDiscardDraft = () => {
    showAlert({
      type: 'warning',
      title: 'Hapus Draft?',
      message: `Apakah Anda yakin ingin membuang draft maintenance untuk POP ${foundDraft?.popName || ''}? Data isian yang belum tersimpan akan dihapus secara permanen.`,
      buttons: [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus Draft',
          onPress: async () => {
            await clearInspectionDraft();
            setFoundDraft(null);
          },
        },
      ],
    });
  };

  const handleResetActiveTarget = () => {
    showAlert({
      type: 'warning',
      title: 'Ganti POP Maintenance?',
      message:
        'Apakah Anda ingin mengganti target POP? Sesi maintenance saat ini dan draft pengerjaannya akan direset.',
      buttons: [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ganti POP',
          onPress: () => {
            resetInspection();
            navigation.navigate('SelectPop');
          },
        },
      ],
    });
  };

  const handleMenuPress = (itemId: string) => {
    if (!activePopId && itemId !== 'pop') {
      showAlert({
        type: 'warning',
        title: 'Pilih POP Terlebih Dahulu',
        message:
          'Silakan pilih POP terlebih dahulu di menu POP sebelum membuka menu ini.',
      });
      return;
    }

    if (itemId === 'pop') {
      navigation.navigate('SelectPop');
      return;
    }

    if (itemId === 'review') {
      navigation.navigate('ReviewPdf');
    } else if (itemId === 'info_pop') {
      navigation.navigate('InfoPop');
    } else if (itemId === 'kwh_meter') {
      navigation.navigate('KwhMeter');
    } else if (itemId === 'rectifier') {
      navigation.navigate('Rectifier');
    } else if (itemId === 'baterai') {
      navigation.navigate('Battery');
    } else if (itemId === 'mechanical_electrical') {
      navigation.navigate('MechanicalElect');
    } else if (itemId === 'dokumentasi') {
      navigation.navigate('Dokumentasi');
    } else if (itemId === 'external_alarm') {
      navigation.navigate('ExternalAlarm');
    } else if (itemId === 'acpdb') {
      navigation.navigate('Acpdb');
    } else if (itemId === 'dcpdb') {
      navigation.navigate('Dcpdb');
    } else if (itemId === 'power_system') {
      navigation.navigate('PowerSystem');
    } else if (itemId === 'genset') {
      navigation.navigate('Genset');
    } else if (itemId === 'fot_ip') {
      navigation.navigate('FotIp');
    } else if (itemId === 'fot_dwdm') {
      navigation.navigate('FotDwdm');
    } else {
      const item = MENU_ITEMS.find(i => i.id === itemId);
      navigation.navigate('CategoryForm', {
        categoryId: itemId,
        categoryLabel: item?.label || 'Form',
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <LinearGradient
        colors={[Colors.backgroundSecondary, Colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.headerGradient}
      >
        {/* Floating decorative orbs */}
        <FloatingOrb
          size={120}
          color="#3B82F6"
          style={{ top: -30, right: -20 }}
        />
        <FloatingOrb size={80} color="#60A5FA" style={{ top: 20, right: 80 }} />
        <FloatingOrb size={50} color="#1E40AF" style={{ top: 60, right: 10 }} />

        <Animated.View
          style={[
            styles.headerTitleRow,
            {
              opacity: headerScaleAnim,
              transform: [
                {
                  translateY: headerScaleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View>
            <Image
              source={require('../../assets/images/pln_icon_plus_white.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Text style={styles.headerOverline}>BERANDA</Text>
            <Text style={styles.headerTitle}>{getGreeting()}</Text>
            <Text style={styles.inspectorNameText}>
              {inspectorName || 'Teknisi'}
            </Text>
          </View>
          {activePopId && (
            <Animated.View
              style={[
                styles.activeIndicatorDot,
                {
                  opacity: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                  transform: [
                    {
                      scale: glowAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1.15],
                      }),
                    },
                  ],
                },
              ]}
            />
          )}
        </Animated.View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Draft Recovery Card if app restarted/exited without saving */}
        {foundDraft && !activePopId ? (
          <View style={styles.draftCardContainer}>
            <LinearGradient
              colors={['#78350F', '#B45309']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.draftCardGradient}
            >
              <View style={styles.draftHeaderRow}>
                <View style={styles.draftIconCircle}>
                  <FileClock color={Colors.white} size={22} />
                </View>
                <View style={styles.draftHeaderTextWrap}>
                  <Text style={styles.draftBadge}>DRAFT MAINTENANCE DITEMUKAN</Text>
                  <Text style={styles.draftTitle} numberOfLines={1}>
                    {foundDraft.popName}
                  </Text>
                </View>
              </View>

              <Text style={styles.draftDesc}>
                Sesi maintenance sebelumnya tersimpan otomatis pada {foundDraft.formattedTime}. Lanjutkan pengisian tanpa kehilangan data?
              </Text>

              <View style={styles.draftActionsRow}>
                <TouchableOpacity
                  style={styles.resumeDraftBtn}
                  onPress={handleResumeDraft}
                  activeOpacity={0.8}
                >
                  <Text style={styles.resumeDraftBtnText}>Lanjutkan Draft</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.discardDraftBtn}
                  onPress={handleDiscardDraft}
                  activeOpacity={0.7}
                >
                  <Trash2 color="rgba(255, 255, 255, 0.8)" size={15} />
                  <Text style={styles.discardDraftBtnText}>Hapus</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        ) : null}

        {/* Main Action Top Card */}
        <Animated.View
          style={[
            styles.section,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <LinearGradient
            colors={
              activePopId
                ? ['#10B981', '#059669', '#047857']
                : ['#3B82F6', '#2563EB', '#1E40AF']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mainActionGradient}
          >
            <TouchableOpacity
              style={styles.mainActionButton}
              onPress={() =>
                activePopId
                  ? navigation.navigate('SelectPop')
                  : handleStartGpsScan()
              }
              activeOpacity={0.85}
            >
              {!activePopId ? (
                <>
                  {/* Background decorative circles */}
                  <View style={styles.cardDecorCircle1} />
                  <View style={styles.cardDecorCircle2} />
                  <Animated.View
                    style={[
                      styles.cameraIconContainer,
                      { transform: [{ scale: pulseAnim }] },
                    ]}
                  >
                    <Navigation color={Colors.white} size={38} />
                  </Animated.View>
                  <Text style={styles.mainActionTitle}>
                    Scan GPS untuk Mulai
                  </Text>
                </>
              ) : (
                <View style={styles.activeTargetContainer}>
                  {/* Background decorative circles */}
                  <View style={styles.cardDecorCircle1} />
                  <View style={styles.cardDecorCircle2} />
                  <View style={styles.activeTargetHeader}>
                    <Animated.View
                      style={[
                        styles.activeIconCircle,
                        {
                          transform: [
                            {
                              scale: glowAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.95, 1.05],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <CheckCircle2 color={Colors.white} size={24} />
                    </Animated.View>
                    <Text style={styles.activeTargetLabel}>
                      Maintenance Aktif
                    </Text>
                  </View>
                  <Text style={styles.activePopName}>
                    {cleanPopName(activePopName || 'Unknown POP')}
                  </Text>
                  <View style={styles.locationRow}>
                    <MapPin color={Colors.white} size={14} opacity={0.8} />
                    <Text style={styles.activePopLocation}>
                      {activePopLocation || 'Lokasi tidak diketahui'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.changeTargetBtn}
                    onPress={handleResetActiveTarget}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.changeTargetText}>Ganti POP</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* 9-Grid Menu */}
        <Animated.View
          style={[
            styles.gridContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.grid}>
            {MENU_ITEMS.map((item, index) => {
              const isDisabled = !activePopId && item.id !== 'pop';
              return (
                <Animated.View
                  key={item.id}
                  style={{
                    opacity: gridAnims[index],
                    transform: [
                      {
                        scale: Animated.multiply(
                          gridPressAnims[index],
                          gridAnims[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.6, 1],
                          }),
                        ),
                      },
                      {
                        translateY: gridAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [35, 0],
                        }),
                      },
                    ],
                  }}
                >
                  <TouchableOpacity
                    style={[isDisabled && styles.gridItemDisabled]}
                    onPress={() => handleMenuPress(item.id)}
                    onPressIn={() => handleGridPressIn(index)}
                    onPressOut={() => handleGridPressOut(index)}
                    activeOpacity={1}
                  >
                    <LinearGradient
                      colors={
                        isDisabled
                          ? [Colors.surfaceLight, Colors.surface]
                          : index % 3 === 0
                          ? ['#3B82F6', '#1D4ED8']
                          : index % 3 === 1
                          ? ['#2563EB', '#1E40AF']
                          : ['#1D4ED8', '#1E3A8A']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        styles.gridItem,
                        !isDisabled && styles.gridItemActive,
                      ]}
                    >
                      <View
                        style={[
                          styles.gridIconWrapper,
                          !isDisabled && styles.gridIconWrapperActive,
                        ]}
                      >
                        <item.icon
                          color={isDisabled ? Colors.textMuted : Colors.white}
                          size={28}
                        />
                      </View>
                      <Text
                        style={[
                          styles.gridItemLabel,
                          {
                            color: isDisabled ? Colors.textMuted : Colors.white,
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerGradient: {
    paddingTop: 56,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    overflow: 'hidden',
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLogo: {
    width: 140,
    height: 42,
    marginBottom: Spacing.sm,
    resizeMode: 'contain',
  },
  headerOverline: {
    ...Typography.overline,
    color: Colors.primary,
    letterSpacing: 3,
    marginBottom: 2,
  },
  headerTitle: {
    ...Typography.h1,
    color: Colors.text,
    fontSize: 32,
  },
  inspectorNameText: {
    ...Typography.body,
    color: Colors.textMuted,
    fontWeight: '600',
    marginTop: 4,
  },
  activeIndicatorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  syncBtn: {
    padding: Spacing.sm,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: BorderRadius.full,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  mainActionGradient: {
    borderRadius: BorderRadius['2xl'],
    ...Shadow.lg,
    overflow: 'hidden',
  },
  mainActionButton: {
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  cardDecorCircle1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -50,
    right: -40,
  },
  cardDecorCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -30,
    left: -20,
  },
  cameraIconContainer: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  mainActionTitle: {
    ...Typography.h3,
    color: Colors.white,
    textAlign: 'center',
    fontWeight: '900',
  },
  scanHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scanHintDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#86EFAC',
    marginRight: 6,
  },
  scanHintText: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  },
  mainActionSubtitle: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.8)',
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  activeTargetContainer: {
    alignItems: 'flex-start',
    width: '100%',
    padding: Spacing.sm,
  },
  activeTargetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  activeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  activeTargetLabel: {
    ...Typography.subtitle2,
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: 'bold',
  },
  activePopName: {
    ...Typography.h3,
    color: Colors.white,
    fontWeight: '900',
    marginBottom: 4,
  },
  activePopId: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: Spacing.sm,
    fontWeight: 'bold',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  activePopLocation: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 4,
    fontWeight: '600',
  },
  changeTargetBtn: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  changeTargetText: {
    ...Typography.label,
    color: Colors.white,
    fontWeight: 'bold',
  },

  // Grid Styles
  gridContainer: {
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_SPACING,
  },
  gridItem: {
    width: GRID_ITEM_WIDTH,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: 1,
  },
  gridItemActive: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  gridItemDisabled: {
    opacity: 0.4,
  },
  gridIconWrapper: {
    marginBottom: Spacing.sm,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridIconWrapperActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 22,
  },
  gridItemLabel: {
    ...Typography.caption,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  draftCardContainer: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadow.md,
  },
  draftCardGradient: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
  },
  draftHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  draftIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  draftHeaderTextWrap: {
    flex: 1,
  },
  draftBadge: {
    ...Typography.overline,
    color: '#FDE68A',
    fontWeight: '800',
    letterSpacing: 1,
  },
  draftTitle: {
    ...Typography.h4,
    color: Colors.white,
    fontWeight: '800',
    fontSize: 16,
  },
  draftDesc: {
    ...Typography.caption,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  draftActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  resumeDraftBtn: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  resumeDraftBtnText: {
    ...Typography.button,
    color: '#92400E',
    fontWeight: '800',
    fontSize: 13,
  },
  discardDraftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  discardDraftBtnText: {
    ...Typography.caption,
    color: Colors.white,
    fontWeight: '600',
    fontSize: 12,
  },
  autoSaveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
    alignSelf: 'flex-start',
  },
  autoSaveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
    marginRight: 6,
  },
  autoSaveIndicatorText: {
    ...Typography.caption,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    fontWeight: '600',
  },
});
