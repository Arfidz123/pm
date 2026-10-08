/* -------------------------------------------------------------------------
 * DOKUMENTASI MODUL: PEMILIHAN & MANAJEMEN POP (POINT OF PRESENCE)
 * -------------------------------------------------------------------------
 * File       : SelectPopScreen.tsx
 * Fungsi     : Menampilkan daftar seluruh site POP, pencarian dinamis, aktivasi
 *              POP untuk inspeksi, penambahan POP baru, serta penghapusan data POP.
 * Keamanan   : Dilengkapi modal konfirmasi 2 langkah dengan Traditional Visual CAPTCHA
 *              Style (Gaya Klasik/Forum) untuk mencegah penghapusan data tidak sengaja.
 *
 * FITUR UTAMA:
 * 1. DAFTAR POP:
 *    - Sinkronisasi WatermelonDB (lokal offline-first) & Firestore cloud DB.
 *    - Pencarian fleksibel berdasarkan nama site atau asset code.
 *    - Status visual POP (Aktif / Siap Inspeksi).
 *
 * 2. PENGHAPUSAN POP DENGAN CAPTCHA KLASIK (TRADITIONAL FORUM STYLE):
 *    - Visual Security Image dengan distorsi karakter, rotasi kemiringan, warna tinta vintage.
 *    - Garis goresan / noise scratch lines khas forum phpBB/vBulletin/klasik.
 *    - Tombol refresh/acak gambar keamanan.
 *    - Checkbox persetujuan risiko penghapusan permanen.
 * ------------------------------------------------------------------------- */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Search,
  MapPin,
  CheckCircle2,
  XCircle,
  Building2,
  Plus,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Check,
} from 'lucide-react-native';

import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import { Header, showAlert } from '../../components/common';
import LinearGradient from 'react-native-linear-gradient';
import database from '../../database';
import { Asset } from '../../database/models';
import { useInspectionStore } from '../../store/inspectionStore';
import { cleanPopId, cleanPopName } from '../../utils/helpers';
import type { RootStackParamList } from '../../types';
import { POP_SEED_DATA } from '../../database/popSeedData';
import {
  fetchAssetsFromFirestore,
  deleteAssetFromFirestore,
} from '../../services/firestoreDb';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Palet warna tinta CAPTCHA gaya forum klasik (vintage security image colors)
const CLASSIC_CAPTCHA_COLORS = [
  '#1E3A8A', // Deep Navy
  '#991B1B', // Dark Crimson
  '#065F46', // Deep Forest Green
  '#581C87', // Royal Purple
  '#9A3412', // Dark Mahogany
];

// Parameter distorsi karakter (rotasi sudut, geser vertikal, skala)
const CAPTCHA_ROTATIONS = [-12, 14, -8, 12, -10];
const CAPTCHA_TRANSLATES = [-3, 4, -4, 3, -2];
const CAPTCHA_SCALES = [1.06, 0.94, 1.1, 0.96, 1.04];

export const SelectPopScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [pops, setPops] = useState<Asset[]>([]);
  const [filteredPops, setFilteredPops] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // 2-Step Verification & CAPTCHA states for deleting POP
  const [popToDelete, setPopToDelete] = useState<Asset | null>(null);
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { activePopId, activePopName, setActivePop, setAsset } = useInspectionStore();

  // 1. Fungsi untuk generate string acak (Alfanumerik Klasik 6 karakter)
  const generateCaptcha = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'; // Menghilangkan karakter mirip seperti 0, O, 1, l
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(result);
    setCaptchaInput('');
    setCaptchaError(false);
    return result;
  };

  const handleOpenDeleteModal = (pop: Asset) => {
    setPopToDelete(pop);
    generateCaptcha();
  };

  const handleConfirmDelete = async () => {
    if (!popToDelete) return;

    if (captchaInput !== captchaCode) {
      setCaptchaError(true);
      generateCaptcha(); // Acak ulang jika salah ketik
      return;
    }

    setIsDeleting(true);
    try {
      const assetCode = popToDelete.assetCode;
      const popName = popToDelete.name;

      // 1. Delete from WatermelonDB locally (all data from device)
      await database.write(async () => {
        await popToDelete.destroyPermanently();
      });

      // 2. Delete from Firestore if online
      try {
        await deleteAssetFromFirestore(assetCode);
      } catch (cloudErr) {
        console.log('Deleted locally, cloud sync error or offline:', cloudErr);
      }

      // 3. Reset active POP if it was the one deleted
      if (activePopId === assetCode) {
        setActivePop('', '', '');
      }

      // 4. Close modal and refresh list
      setPopToDelete(null);
      setCaptchaInput('');
      await loadPops();

      showAlert({
        type: 'success',
        title: 'POP Berhasil Dihapus',
        message: `POP ${popName} (${assetCode}) telah berhasil dihapus dari perangkat.`,
      });
    } catch (err) {
      console.error('Error deleting POP:', err);
      showAlert({
        type: 'error',
        title: 'Gagal Menghapus POP',
        message: 'Terjadi kesalahan saat menghapus data POP dari perangkat.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadPops();
    }, []),
  );

  useEffect(() => {
    let result = pops;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (pop: Asset) =>
          pop.name.toLowerCase().includes(query) ||
          pop.assetCode.toLowerCase().includes(query) ||
          pop.location.toLowerCase().includes(query),
      );
    }

    // Default sort: by Category, then by Name
    result = [...result].sort((a, b) => {
      const catCompare = (a.category || '').localeCompare(b.category || '');
      if (catCompare !== 0) return catCompare;
      return a.name.localeCompare(b.name);
    });

    setFilteredPops(result);
  }, [pops, searchQuery]);

  const loadPops = async () => {
    try {
      const assets = await database.get<Asset>('assets').query().fetch();
      const assetsCollection = database.get<Asset>('assets');

      // Clean up legacy dummy sample asset (POP_1KDI10015 telecom) if it exists
      const dummyAssets = assets.filter(
        a => a.assetCode === 'POP_1KDI10015' && a.category === 'telecom',
      );
      if (dummyAssets.length > 0) {
        await database.write(async () => {
          for (const dummy of dummyAssets) {
            await dummy.destroyPermanently();
          }
        });
        deleteAssetFromFirestore('POP_1KDI10015').catch(() => {});
      }

      const validAssets = assets.filter(
        a => !(a.assetCode === 'POP_1KDI10015' && a.category === 'telecom'),
      );
      const existingAssetsMap = new Map<string, Asset>(
        validAssets.map(a => [a.assetCode, a]),
      );
      const batchOps: any[] = [];

      POP_SEED_DATA.forEach(pop => {
        const existing = existingAssetsMap.get(pop.asset_code);
        const newLat = (pop as any).latitude ?? null;
        const newLng = (pop as any).longitude ?? null;
        const newCat = (pop.category || 'other') as any;
        const newLoc = pop.location || '';
        const newSpecs = pop.specifications || '';
        const newName = pop.name;

        if (!existing) {
          batchOps.push(
            assetsCollection.prepareCreate(asset => {
              asset.assetCode = pop.asset_code;
              asset.name = newName;
              asset.category = newCat;
              asset.location = newLoc;
              asset.latitude = newLat;
              asset.longitude = newLng;
              asset.manufacturer = '';
              asset.assetModel = '';
              asset.serialNumber = '';
              asset.installDate = Date.now();
              asset.qrCode = '';
              asset.photoPath = '';
              asset.specifications = newSpecs;
              asset.checklistTemplateId = '';
              asset.status = 'active';
            }),
          );
        } else if (existing.specifications !== newSpecs) {
          batchOps.push(
            existing.prepareUpdate(asset => {
              asset.specifications = newSpecs;
              if (newLat && newLng && (!asset.latitude || !asset.longitude)) {
                asset.latitude = newLat;
                asset.longitude = newLng;
              }
              if (newLoc && !asset.location) {
                asset.location = newLoc;
              }
              if (newCat && (!asset.category || asset.category === 'other')) {
                asset.category = newCat;
              }
            }),
          );
        }
      });

      if (batchOps.length > 0) {
        console.log(`Syncing ${batchOps.length} POPs to database...`);
        await database.write(async () => {
          await database.batch(...batchOps);
        });
      }

      const updatedAssets = await database.get<Asset>('assets').query().fetch();
      const uniqueAssetsMap = new Map<string, Asset>();
      updatedAssets.forEach(asset => {
        if (!uniqueAssetsMap.has(asset.assetCode)) {
          uniqueAssetsMap.set(asset.assetCode, asset);
        }
      });

      setPops(Array.from(uniqueAssetsMap.values()));

      // Background Fetch from Firestore for remote added POPs
      try {
        const remoteAssets = await fetchAssetsFromFirestore();
        if (Array.isArray(remoteAssets) && remoteAssets.length > 0) {
          const remoteBatch: any[] = [];
          const currentMap = new Map<string, Asset>(
            updatedAssets.map(a => [a.assetCode, a]),
          );

          remoteAssets.forEach(r => {
            if (r.asset_code && !currentMap.has(r.asset_code)) {
              remoteBatch.push(
                assetsCollection.prepareCreate(asset => {
                  asset.assetCode = r.asset_code;
                  asset.name = r.name || r.asset_code;
                  asset.category = (r.category as any) || 'other';
                  asset.location = r.location || '';
                  asset.latitude = r.latitude || undefined;
                  asset.longitude = r.longitude || undefined;
                  asset.manufacturer = r.manufacturer || '';
                  asset.assetModel = r.model || '';
                  asset.serialNumber = r.serial_number || '';
                  asset.installDate = r.install_date
                    ? new Date(r.install_date).getTime()
                    : Date.now();
                  asset.qrCode = r.qr_code || '';
                  asset.photoPath = r.photo_path || '';
                  asset.specifications =
                    typeof r.specifications === 'string'
                      ? r.specifications
                      : JSON.stringify(r.specifications || {});
                  asset.checklistTemplateId = r.checklist_template_id || '';
                  asset.status = (r.status as any) || 'active';
                }),
              );
            }
          });

          if (remoteBatch.length > 0) {
            console.log(
              `Downloaded ${remoteBatch.length} new POPs from Firestore!`,
            );
            await database.write(async () => {
              await database.batch(...remoteBatch);
            });
            const refreshed = await database
              .get<Asset>('assets')
              .query()
              .fetch();
            const refreshedMap = new Map<string, Asset>();
            refreshed.forEach(a => {
              if (!refreshedMap.has(a.assetCode))
                refreshedMap.set(a.assetCode, a);
            });
            setPops(Array.from(refreshedMap.values()));
          }
        }
      } catch (cloudErr) {
        console.log('Background Firestore sync skipped or offline:', cloudErr);
      }
    } catch (error) {
      console.error('Error loading POPs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const handleSelectPop = (pop: Asset) => {
    if (activePopId === pop.assetCode) {
      // Sesi POP yang sama sedang aktif / baru dipulihkan dari draft. Jangan reset data form!
      navigation.goBack();
      return;
    }

    if (activePopId && activePopId !== pop.assetCode) {
      showAlert({
        type: 'warning',
        title: 'Ganti POP Maintenance?',
        message: `Sesi maintenance saat ini untuk POP ${activePopName || activePopId} akan direset. Apakah Anda yakin ingin beralih ke POP ${cleanPopName(pop.name)}?`,
        buttons: [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Ganti POP',
            onPress: () => {
              setActivePop(pop.assetCode, pop.name, pop.location, pop.specifications);
              setAsset(pop.id);
              navigation.goBack();
            },
          },
        ],
      });
      return;
    }

    setActivePop(pop.assetCode, pop.name, pop.location, pop.specifications);
    setAsset(pop.id);
    navigation.goBack();
  };

  const renderPopItem = ({ item }: { item: Asset }) => {
    const isActive = activePopId === item.assetCode;

    return (
      <View style={[styles.popItem, isActive && styles.popItemActive]}>
        <TouchableOpacity
          style={styles.popItemMainTouchable}
          onPress={() => handleSelectPop(item)}
          activeOpacity={0.7}
        >
          <View
            style={[styles.popItemIcon, isActive && styles.popItemIconActive]}
          >
            <Building2
              color={isActive ? Colors.primary : Colors.textMuted}
              size={22}
            />
          </View>
          <View style={styles.popItemContent}>
            <Text
              style={[styles.popItemName, isActive && styles.popItemNameActive]}
            >
              {cleanPopName(item.name)}
            </Text>
            <View style={styles.popItemMetaRow}>
              <Text style={styles.popItemCode}>
                {cleanPopId(item.assetCode)}
              </Text>
              {item.category ? (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{item.category}</Text>
                </View>
              ) : null}
            </View>
            {item.location ? (
              <View style={styles.locationRow}>
                <MapPin
                  size={12}
                  color={Colors.textMuted}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.popItemLocation} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            ) : null}
          </View>
          {isActive && (
            <View style={styles.popItemCheck}>
              <CheckCircle2 color={Colors.primary} size={22} />
            </View>
          )}
        </TouchableOpacity>

        {/* Tombol Hapus POP (Ikon Tempat Sampah) */}
        <TouchableOpacity
          style={styles.popItemDeleteBtn}
          onPress={() => handleOpenDeleteModal(item)}
          activeOpacity={0.65}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 size={18} color="#F87171" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Shared Header with Embedded Search Bar */}
      <Header
        title="Pilih POP"
        subtitle={
          searchQuery.trim()
            ? `${filteredPops.length} dari ${pops.length} POP`
            : `${pops.length} POP tersedia`
        }
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            style={styles.headerAddPopBtn}
            onPress={() => navigation.navigate('AddPop')}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Plus size={14} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.headerAddPopBtnText}>Tambah POP</Text>
          </TouchableOpacity>
        }
      >
        <View
          style={[
            styles.searchInputWrapper,
            isSearchFocused && styles.searchInputWrapperFocused,
          ]}
        >
          <Search
            color={isSearchFocused ? Colors.primary : Colors.textMuted}
            size={18}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama POP, ID, atau lokasi..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => handleSearch('')}
              activeOpacity={0.7}
            >
              <XCircle size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </Header>

      {/* List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Memuat data POP...</Text>
        </View>
      ) : filteredPops.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Tidak ada POP yang ditemukan</Text>
          <TouchableOpacity
            style={styles.emptyAddBtn}
            onPress={() => navigation.navigate('AddPop')}
            activeOpacity={0.75}
          >
            <Plus size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.emptyAddBtnText}>Tambah POP Sekarang</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredPops}
          keyExtractor={item => item.id}
          renderItem={renderPopItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={15}
        />
      )}

      {/* Modal Verifikasi CAPTCHA Klasik Penghapusan POP */}
      <Modal
        visible={!!popToDelete}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isDeleting) {
            setPopToDelete(null);
            setCaptchaError(false);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.classicModalCard}>
            {/* Header Merah Diperbesar & Ikon Vector Peringatan */}
            <LinearGradient
              colors={['#DC2626', '#B91C1C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.classicHeader}
            >
              <View style={styles.classicHeaderTitleRow}>
                <AlertTriangle
                  size={18}
                  color="#FFFFFF"
                  strokeWidth={2.3}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.classicHeaderTitle}>
                  KONFIRMASI PENGHAPUSAN POP
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (!isDeleting) {
                    setPopToDelete(null);
                    setCaptchaError(false);
                  }
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.classicCloseBtn}>×</Text>
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.classicBody}>
              {popToDelete && (
                <Text style={styles.classicWarningText}>
                  Anda akan menghapus "{cleanPopName(popToDelete.name)}" secara
                  permanen. Tindakan ini tidak dapat dibatalkan.
                </Text>
              )}

              {/* BOX CAPTCHA TRADISIONAL */}
              <View style={styles.classicCaptchaBox}>
                {/* Efek Garis Gangguan (Noise Lines) Khas Forum Lama */}
                <View style={styles.noiseLine1} pointerEvents="none" />
                <View style={styles.noiseLine2} pointerEvents="none" />
                <View style={styles.noiseLine3} pointerEvents="none" />

                {/* Teks CAPTCHA Terdistorsi di Tengah */}
                <View style={styles.classicCaptchaTextWrap}>
                  <Text style={styles.classicCaptchaText}>
                    {captchaCode}
                  </Text>
                </View>

                {/* Tombol Segarkan Tanpa Emote */}
                <TouchableOpacity
                  style={styles.classicRefreshBtn}
                  onPress={generateCaptcha}
                  activeOpacity={0.7}
                >
                  <Text style={styles.classicRefreshBtnText}>Segarkan</Text>
                  <RefreshCw
                    size={12}
                    color={Colors.textSecondary}
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
              </View>

              {/* Form Input */}
              <View>
                <Text style={styles.classicInputLabel}>
                  Ketik Kode Keamanan:
                </Text>
                <TextInput
                  style={[
                    styles.classicInput,
                    captchaError && styles.classicInputError,
                  ]}
                  placeholder="Perhatikan huruf besar & kecil"
                  placeholderTextColor="#64748B"
                  value={captchaInput}
                  onChangeText={text => {
                    setCaptchaInput(text);
                    if (captchaError) setCaptchaError(false);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={6}
                />
                {captchaError && (
                  <Text style={styles.classicErrorText}>
                    ❌ Kode salah! CAPTCHA telah diacak ulang, silakan coba lagi.
                  </Text>
                )}
              </View>

              {/* Tombol Aksi Hapus */}
              <View style={styles.classicFooterRow}>
                <TouchableOpacity
                  style={[
                    styles.classicSubmitBtn,
                    (captchaInput.length !== 6 || isDeleting) &&
                      styles.classicSubmitBtnDisabled,
                  ]}
                  onPress={handleConfirmDelete}
                  disabled={captchaInput.length !== 6 || isDeleting}
                  activeOpacity={0.8}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.classicSubmitBtnText}>Hapus</Text>
                  )}
                </TouchableOpacity>
              </View>
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
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.65)',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    ...Shadow.sm,
  },
  searchInputWrapperFocused: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    paddingVertical: 0,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  popItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    ...Shadow.sm,
  },
  popItemActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  popItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  popItemIconActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  popItemContent: {
    flex: 1,
  },
  popItemName: {
    ...Typography.h4,
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  popItemNameActive: {
    color: Colors.primaryLight,
  },
  popItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  popItemCode: {
    ...Typography.overline,
    color: Colors.primary,
    letterSpacing: 1,
  },
  categoryBadge: {
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  categoryBadgeText: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  popItemLocation: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontSize: 11,
    flex: 1,
  },
  popItemCheck: {
    marginLeft: Spacing.sm,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
  emptyText: {
    ...Typography.h4,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySubText: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  headerAddPopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...Shadow.sm,
  },
  headerAddPopBtnText: {
    ...Typography.caption,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    ...Shadow.md,
  },
  emptyAddBtnText: {
    ...Typography.body,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  popItemMainTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  popItemDeleteBtn: {
    padding: Spacing.xs + 2,
    marginLeft: Spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 9, 20, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  classicModalCard: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 10,
    overflow: 'hidden',
    ...Shadow.lg,
  },
  classicHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  classicHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  classicHeaderTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    fontSize: 12.5,
    textTransform: 'uppercase',
  },
  classicCloseBtn: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: 'bold',
    fontSize: 20,
    lineHeight: 20,
    paddingHorizontal: 2,
  },
  classicBody: {
    padding: 14,
  },
  classicWarningText: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  classicCaptchaBox: {
    position: 'relative',
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(59, 130, 246, 0.45)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noiseLine1: {
    position: 'absolute',
    top: 10,
    left: -20,
    right: -20,
    height: 1.5,
    backgroundColor: Colors.primary,
    opacity: 0.25,
    transform: [{ rotate: '3deg' }],
  },
  noiseLine2: {
    position: 'absolute',
    top: 22,
    left: -20,
    right: -20,
    height: 1.2,
    backgroundColor: Colors.primaryLight,
    opacity: 0.2,
    transform: [{ rotate: '-2deg' }],
  },
  noiseLine3: {
    position: 'absolute',
    top: 34,
    left: -20,
    right: -20,
    height: 1.5,
    backgroundColor: Colors.danger,
    opacity: 0.2,
    transform: [{ rotate: '1deg' }],
  },
  classicCaptchaTextWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classicCaptchaText: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#60A5FA',
    letterSpacing: 5,
  },
  classicRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    ...Shadow.sm,
  },
  classicRefreshBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  classicInputLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  classicInput: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 6,
    backgroundColor: '#0F172A',
    fontSize: 13.5,
    letterSpacing: 2,
    color: Colors.text,
  },
  classicInputError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  classicErrorText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
    marginTop: 4,
  },
  classicFooterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  classicSubmitBtn: {
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  classicSubmitBtnDisabled: {
    backgroundColor: 'rgba(220, 38, 38, 0.3)',
  },
  classicSubmitBtnText: {
    fontSize: 12.5,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
