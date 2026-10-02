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
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { activePopId, activePopName, setActivePop, setAsset } = useInspectionStore();

  // Generator CAPTCHA 5 karakter acak unik
  const generateCaptcha = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleOpenDeleteModal = (pop: Asset) => {
    setPopToDelete(pop);
    setCaptchaCode(generateCaptcha());
    setCaptchaInput('');
    setIsAcknowledged(false);
  };

  const handleConfirmDelete = async () => {
    if (!popToDelete) return;

    if (captchaInput.trim().toUpperCase() !== captchaCode) {
      showAlert({
        type: 'error',
        title: 'Kode CAPTCHA Salah',
        message: 'Kode yang Anda ketikkan tidak cocok. Silakan coba lagi.',
      });
      return;
    }

    if (!isAcknowledged) {
      showAlert({
        type: 'warning',
        title: 'Konfirmasi Diperlukan',
        message: 'Harap centang kotak persetujuan sebelum menghapus POP.',
      });
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

      {/* Modal Verifikasi 2 Langkah & CAPTCHA Penghapusan POP */}
      <Modal
        visible={!!popToDelete}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isDeleting) setPopToDelete(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.deleteModalCard}>
            {/* Warning Icon & Header Row */}
            <View style={styles.deleteHeaderRow}>
              <View style={styles.alertIconCircle}>
                <AlertTriangle size={22} color={Colors.danger} />
              </View>
              <Text style={styles.deleteModalTitle}>Konfirmasi Hapus POP</Text>
            </View>

            {/* Detail POP Info Box (Kotak Merah: Nama POP & Teks Peringatan) */}
            {popToDelete && (
              <View style={styles.popDetailBox}>
                <Text style={styles.popDetailName}>
                  {cleanPopName(popToDelete.name)}
                </Text>
                <Text style={styles.popDetailWarningText}>
                  <Text style={{ fontWeight: 'bold', color: '#FCA5A5' }}>
                    Peringatan :{' '}
                  </Text>
                  Tindakan ini tidak dapat dibatalkan, seluruh data dan riwayat
                  akan dihapus seketika.
                </Text>
              </View>
            )}

            {/* CAPTCHA Section */}
            <View style={styles.captchaSection}>
              <Text style={styles.captchaLabel}>
                Verifikasi Keamanan CAPTCHA
              </Text>
              <Text style={styles.captchaSubLabel}>
                Ketik kode 5-karakter di bawah ini untuk konfirmasi:
              </Text>

              {/* Visual CAPTCHA Box */}
              <View style={styles.captchaBox}>
                <View style={styles.captchaPattern}>
                  <Text style={styles.captchaText}>
                    {captchaCode.split('').join('  ')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.captchaRefreshBtn}
                  onPress={() => {
                    setCaptchaCode(generateCaptcha());
                    setCaptchaInput('');
                  }}
                  activeOpacity={0.7}
                >
                  <RefreshCw size={18} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Input CAPTCHA */}
              <TextInput
                style={[
                  styles.captchaInput,
                  captchaInput.trim().toUpperCase() === captchaCode &&
                    styles.captchaInputMatch,
                ]}
                placeholder="Ketik kode CAPTCHA di sini"
                placeholderTextColor={Colors.textMuted}
                value={captchaInput}
                onChangeText={setCaptchaInput}
                autoCapitalize="characters"
                maxLength={8}
              />

              {/* Kotak Centang Persetujuan Bahaya */}
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setIsAcknowledged(!isAcknowledged)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    isAcknowledged && styles.checkboxBoxChecked,
                  ]}
                >
                  {isAcknowledged && (
                    <Check size={14} color="#ffffff" strokeWidth={3} />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>
                  Saya memahami risiko dan menyetujui penghapusan seluruh data
                  POP ini.
                </Text>
              </TouchableOpacity>
            </View>

            {/* Modal Buttons */}
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setPopToDelete(null)}
                disabled={isDeleting}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmDeleteBtn,
                  (!isAcknowledged ||
                    captchaInput.trim().toUpperCase() !== captchaCode) &&
                    styles.confirmDeleteBtnDisabled,
                ]}
                onPress={handleConfirmDelete}
                disabled={
                  isDeleting ||
                  !isAcknowledged ||
                  captchaInput.trim().toUpperCase() !== captchaCode
                }
                activeOpacity={0.8}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Trash2
                      size={16}
                      color="#ffffff"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.confirmDeleteBtnText}>
                      Hapus Semua Data
                    </Text>
                  </>
                )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  deleteModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    ...Shadow.lg,
  },
  deleteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  alertIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm + 2,
  },
  deleteModalTitle: {
    ...Typography.h3,
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
  },
  popDetailBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  popDetailName: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  popDetailWarningText: {
    ...Typography.caption,
    fontSize: 11.5,
    color: '#FECACA',
    lineHeight: 16,
    fontWeight: '500',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.md,
    paddingHorizontal: 2,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.textMuted,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  checkboxBoxChecked: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
  },
  checkboxLabel: {
    ...Typography.caption,
    fontSize: 11.5,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  captchaSection: {
    marginBottom: Spacing.lg,
  },
  captchaLabel: {
    ...Typography.body,
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 2,
  },
  captchaSubLabel: {
    ...Typography.caption,
    fontSize: 10.5,
    color: Colors.textMuted,
    marginBottom: Spacing.xs + 2,
  },
  captchaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  captchaPattern: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captchaText: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: Colors.primaryLight,
    letterSpacing: 6,
    textDecorationLine: 'line-through',
  },
  captchaRefreshBtn: {
    padding: Spacing.xs,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: BorderRadius.sm,
  },
  captchaInput: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.glassBorder,
    color: Colors.text,
    fontSize: 14,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    textAlign: 'center',
    letterSpacing: 2,
    fontWeight: 'bold',
  },
  captchaInputMatch: {
    borderColor: Colors.success,
    backgroundColor: 'rgba(46, 204, 113, 0.08)',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    ...Typography.body,
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.textSecondary,
  },
  confirmDeleteBtn: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  confirmDeleteBtnDisabled: {
    backgroundColor: 'rgba(231, 76, 60, 0.3)',
  },
  confirmDeleteBtnText: {
    ...Typography.body,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
