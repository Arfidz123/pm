/**
 * History Screen
 * Premium list of all past inspections with search, filters, and grouped dates
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  TextInput,
  SectionList,
  StatusBar,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import {
  Inbox,
  Clock,
  Calendar,
  Search,
  FileCheck,
  MapPin,
  Cloud,
  CloudOff,
  ChevronRight,
  TrendingUp,
  XCircle,
} from 'lucide-react-native';

import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadow,
  FontFamily,
} from '../../theme';
import { StatusBadge, AnimatedBackground } from '../../components/common';
import database from '../../database';
import { Inspection, Asset } from '../../database/models';
import {
  restoreInspectionsFromFirebase,
  syncInspectionsToFirebase,
} from '../../services/syncService';
import {
  formatDate,
  getRelativeTime,
  cleanPopId,
  cleanPopName,
} from '../../utils/helpers';
import type { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface InspectionWithAsset extends Inspection {
  assetName?: string;
  assetCode?: string;
  assetLocation?: string;
}

interface SectionData {
  title: string;
  data: InspectionWithAsset[];
}

const { width } = Dimensions.get('window');

// Helpers
const getDateGroup = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const dateOnly = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  if (dateOnly.getTime() === today.getTime()) return 'Hari Ini';
  if (dateOnly.getTime() === yesterday.getTime()) return 'Kemarin';

  const diffDays = Math.floor(
    (today.getTime() - dateOnly.getTime()) / 86400000,
  );
  if (diffDays < 7) return 'Minggu Ini';
  if (diffDays < 30) return 'Bulan Ini';

  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
};

const getStatusAccentColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return Colors.success;
    case 'in_progress':
      return Colors.info;
    case 'draft':
      return Colors.textMuted;
    default:
      return Colors.primary;
  }
};

// ─── Animated Inspection Card Component ─────────────────────────────────────
const InspectionCard: React.FC<{
  item: InspectionWithAsset;
  index: number;
  onPress: () => void;
  accentColor: string;
}> = ({ item, index, onPress, accentColor }) => {
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: 1,
      friction: 6,
      tension: 50,
      delay: Math.min(index * 60, 400),
      useNativeDriver: true,
    }).start();
  }, [index]);

  return (
    <Animated.View
      style={{
        opacity: cardAnim,
        transform: [
          {
            translateX: cardAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }),
          },
          {
            scale: cardAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.95, 1],
            }),
          },
        ],
      }}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={inspectionCardStyles.cardTouchable}
      >
        <View
          style={[
            inspectionCardStyles.cardAccent,
            { backgroundColor: accentColor },
          ]}
        />
        <View style={inspectionCardStyles.cardInner}>
          <View style={inspectionCardStyles.cardTopRow}>
            <View style={inspectionCardStyles.cardTitleBlock}>
              <Text style={inspectionCardStyles.cardAssetCode}>
                {cleanPopId(item.assetCode || '')}
              </Text>
              <Text
                style={inspectionCardStyles.cardAssetName}
                numberOfLines={1}
              >
                {cleanPopName(item.assetName || '')}
              </Text>
            </View>
            <StatusBadge status={item.status} size="sm" />
          </View>
          {item.assetLocation ? (
            <View style={inspectionCardStyles.locationRow}>
              <MapPin
                size={12}
                color={Colors.textMuted}
                style={{ marginRight: 4 }}
              />
              <Text style={inspectionCardStyles.locationText} numberOfLines={1}>
                {item.assetLocation}
              </Text>
            </View>
          ) : null}
          <View style={inspectionCardStyles.cardDivider} />
          <View style={inspectionCardStyles.cardBottomRow}>
            <View style={inspectionCardStyles.metaChip}>
              <Calendar
                size={12}
                color={Colors.textMuted}
                style={{ marginRight: 4 }}
              />
              <Text style={inspectionCardStyles.metaChipText}>
                {formatDate(item.inspectionDate)}
              </Text>
            </View>
            {item.isSynced ? (
              <View style={inspectionCardStyles.syncCloudChip}>
                <Cloud size={11} color="#059669" style={{ marginRight: 3 }} />
                <Text style={inspectionCardStyles.syncCloudChipText}>
                  Cloud
                </Text>
              </View>
            ) : (
              <View style={inspectionCardStyles.syncLocalChip}>
                <CloudOff
                  size={11}
                  color="#D97706"
                  style={{ marginRight: 3 }}
                />
                <Text style={inspectionCardStyles.syncLocalChipText}>
                  Lokal
                </Text>
              </View>
            )}
            {item.pdfPath ? (
              <View style={inspectionCardStyles.pdfChip}>
                <FileCheck
                  size={12}
                  color={Colors.success}
                  style={{ marginRight: 3 }}
                />
                <Text style={inspectionCardStyles.pdfChipText}>PDF</Text>
              </View>
            ) : null}
          </View>
          <View style={inspectionCardStyles.typeRow}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              {item.updatedAt &&
              item.createdAt &&
              new Date(item.updatedAt).getTime() -
                new Date(item.createdAt).getTime() >
                60000 ? (
                <View style={inspectionCardStyles.editedTag}>
                  <Text style={inspectionCardStyles.editedTagText}>Diedit</Text>
                </View>
              ) : null}
            </View>
            <View style={inspectionCardStyles.timeAgoRow}>
              <Clock
                size={11}
                color={Colors.textMuted}
                style={{ marginRight: 3 }}
              />
              <Text style={inspectionCardStyles.timeAgoText}>
                {getRelativeTime(item.inspectionDate)}
              </Text>
            </View>
          </View>
        </View>
        <View style={inspectionCardStyles.chevronContainer}>
          <ChevronRight size={18} color={Colors.textMuted} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const HistoryScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [inspections, setInspections] = useState<InspectionWithAsset[]>([]);
  const [filteredInspections, setFilteredInspections] = useState<
    InspectionWithAsset[]
  >([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    draft: 0,
  });

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadInspections();

      // Reset values for entry transition
      headerAnim.setValue(0);
      searchAnim.setValue(0);
      listAnim.setValue(0);

      Animated.stagger(100, [
        Animated.spring(headerAnim, {
          toValue: 1,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.spring(searchAnim, {
          toValue: 1,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.spring(listAnim, {
          toValue: 1,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }, []),
  );

  const loadInspections = async () => {
    try {
      const fetchLocal = async () => {
        const allInspections = await database
          .get<Inspection>('inspections')
          .query()
          .fetch();

        // Auto-heal items with Telegram/Cloud PDF URL that were stuck as unsynced
        allInspections.forEach(async insp => {
          if (
            !insp.isSynced &&
            insp.pdfPath &&
            (insp.pdfPath.startsWith('http://') ||
              insp.pdfPath.startsWith('https://'))
          ) {
            try {
              await database.write(async () => {
                await insp.update(i => {
                  i.isSynced = true;
                });
              });
            } catch (e) {}
          }
        });

        const allAssets = await database.get<Asset>('assets').query().fetch();

        const assetMap = new Map(
          allAssets.map((a: Asset) => [(a as any).id, a]),
        );
        const assetCodeMap = new Map(
          allAssets.map((a: Asset) => [a.assetCode, a]),
        );

        const enriched: InspectionWithAsset[] = allInspections
          .filter((insp: Inspection) => insp.status === 'completed')
          .map((insp: Inspection) => {
            const asset =
              assetMap.get(insp.assetId) || assetCodeMap.get(insp.assetId);

            let parsedFormData: any = {};
            if (insp.formData) {
              try {
                parsedFormData =
                  typeof insp.formData === 'string'
                    ? JSON.parse(insp.formData)
                    : insp.formData;
              } catch (e) {}
            }

            const fallbackName =
              parsedFormData?.infoPop?.namaPop ||
              parsedFormData?.infoPop?.popName ||
              (insp.assetId !== 'unknown' ? insp.assetId : 'POP');
            const fallbackLocation =
              parsedFormData?.infoPop?.lokasi ||
              parsedFormData?.infoPop?.alamat ||
              '';

            return Object.assign(
              Object.create(Object.getPrototypeOf(insp)),
              insp,
              {
                assetName: (asset as any)?.name || fallbackName,
                assetCode: (asset as any)?.assetCode || insp.assetId || 'N/A',
                assetLocation: (asset as any)?.location || fallbackLocation,
              },
            );
          })
          .sort((a: any, b: any) => b.inspectionDate - a.inspectionDate);

        setStats({
          total: enriched.length,
          completed: enriched.length,
          inProgress: 0,
          draft: 0,
        });

        setInspections(enriched);
        applyFilters(enriched, searchQuery);
      };

      // Load local database immediately
      await fetchLocal();

      // Silent background restore from Firestore
      restoreInspectionsFromFirebase()
        .then(result => {
          if (result && result.restoredCount > 0) {
            fetchLocal();
          }
        })
        .catch(err => {
          console.warn('Silent restore from Firestore notice:', err);
        });
    } catch (error) {
      console.error('Error loading inspections:', error);
    }
  };

  const applyFilters = (list: InspectionWithAsset[], query: string) => {
    let result = list;

    // Search filter
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      result = result.filter(
        i =>
          i.assetName?.toLowerCase().includes(lowerQuery) ||
          i.assetCode?.toLowerCase().includes(lowerQuery) ||
          i.inspectorName?.toLowerCase().includes(lowerQuery),
      );
    }

    setFilteredInspections(result);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(inspections, query);
  };

  // Group inspections by date
  const getSections = (): SectionData[] => {
    const groups: Record<string, InspectionWithAsset[]> = {};

    filteredInspections.forEach(insp => {
      const group = getDateGroup(insp.inspectionDate);
      if (!groups[group]) groups[group] = [];
      groups[group].push(insp);
    });

    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  };

  const renderInspectionCard = ({
    item,
    index,
  }: {
    item: InspectionWithAsset;
    index: number;
  }) => {
    const accentColor = getStatusAccentColor(item.status);
    return (
      <InspectionCard
        item={item}
        index={index}
        accentColor={accentColor}
        onPress={() =>
          navigation.navigate('InspectionDetail', {
            inspectionId: (item as any).id,
          })
        }
      />
    );
  };

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionDot} />
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.sectionLine} />
      <Text style={styles.sectionCount}>{section.data.length}</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={['rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0.05)']}
        style={styles.emptyGlow}
      >
        <View style={styles.emptyIconCircle}>
          <Inbox size={44} color={Colors.primary} strokeWidth={1.5} />
        </View>
      </LinearGradient>
      <Text style={styles.emptyTitle}>Belum Ada Riwayat</Text>
      <Text style={styles.emptySubtitle}>
        Laporan yang telah Anda selesaikan{'\n'}akan muncul di sini
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('MainTabs')}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyButtonGradient}
        >
          <Text style={styles.emptyButtonText}>Mulai Maintenance</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const sections = getSections();

  return (
    <AnimatedBackground>
      <View style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />

        {/* ─── Header ─── */}
        <LinearGradient
          colors={['rgba(11, 21, 42, 0.75)', 'rgba(7, 13, 29, 0.1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.headerGradient}
        >
          <Animated.View
            style={[
              styles.headerTitleRow,
              {
                opacity: headerAnim,
                transform: [
                  {
                    translateY: headerAnim.interpolate({
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
              <Text style={styles.headerOverline}>PREVENTIVE MAINTENANCE</Text>
              <Text style={styles.headerTitle}>Riwayat Laporan</Text>
            </View>
            <View style={styles.headerBadge}>
              <TrendingUp size={16} color={Colors.primary} />
              <Text style={styles.headerBadgeText}>{stats.total}</Text>
            </View>
          </Animated.View>
        </LinearGradient>

      {/* ─── Search Bar ─── */}
      <Animated.View
        style={[
          styles.searchSection,
          {
            opacity: searchAnim,
            transform: [
              {
                translateY: searchAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View
          style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}
        >
          <Search
            size={18}
            color={isSearchFocused ? Colors.primary : Colors.textMuted}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari asset, kode, atau teknisi..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <XCircle size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* ─── Inspection List ─── */}
      <Animated.View
        style={[
          styles.listWrapper,
          {
            opacity: listAnim,
          },
        ]}
      >
        <SectionList
          sections={sections}
          renderItem={renderInspectionCard}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={item => (item as any).id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={<View style={{ height: 120 }} />}
        />
      </Animated.View>
    </View>
  </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // ─── Header ───
  headerContainer: {},
  headerGradient: {
    paddingTop: 56,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    overflow: 'hidden',
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
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
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    gap: 6,
    marginBottom: 4,
  },
  headerBadgeText: {
    ...Typography.label,
    color: Colors.primary,
    fontWeight: '700',
  },

  // ─── Stats ───
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statCount: {
    ...Typography.h3,
    color: Colors.text,
    fontWeight: '800',
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // ─── Search ───
  searchSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  searchBarFocused: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    marginLeft: Spacing.sm,
    paddingVertical: 0,
  },

  // ─── Section Headers ───
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginRight: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.glassBorder,
    marginHorizontal: Spacing.md,
  },
  sectionCount: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontWeight: '600',
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },

  // ─── List ───
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Spacing.lg,
  },

  // ─── Inspection Card ───
  cardTouchable: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  cardAccent: {
    width: 4,
  },
  cardInner: {
    flex: 1,
    padding: Spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardTitleBlock: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  cardAssetCode: {
    ...Typography.overline,
    color: Colors.primary,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  cardAssetName: {
    ...Typography.h4,
    color: Colors.text,
    fontSize: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  locationText: {
    ...Typography.caption,
    color: Colors.textMuted,
    flex: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.glassBorder,
    marginBottom: Spacing.sm,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaChipText: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontSize: 11,
  },
  syncCloudChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  syncCloudChipText: {
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
    color: '#059669',
    fontWeight: '700',
  },
  syncLocalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  syncLocalChipText: {
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
    color: '#D97706',
    fontWeight: '700',
  },
  pdfChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  pdfChipText: {
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
    color: Colors.success,
    fontWeight: '700',
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeTag: {
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  typeTagText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 10,
  },
  editedTag: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  editedTagText: {
    ...Typography.caption,
    color: '#D97706',
    fontWeight: '700',
    fontSize: 9,
  },
  timeAgoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeAgoText: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontSize: 10,
  },
  chevronContainer: {
    justifyContent: 'center',
    paddingRight: Spacing.md,
    opacity: 0.5,
  },

  // ─── Empty State ───
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: Spacing.xl,
  },
  emptyGlow: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  emptyButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  emptyButtonText: {
    ...Typography.button,
    color: Colors.white,
    fontWeight: '700',
  },
});

// Alias for InspectionCard component (shares same styles as HistoryScreen)
const inspectionCardStyles = styles;
