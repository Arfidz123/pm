import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CheckSquare, Square } from 'lucide-react-native';

import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import database from '../../database';
import { Asset } from '../../database/models';
import { Header } from '../../components/common';
import { useInspectionStore } from '../../store/inspectionStore';
import { cleanPopId, cleanPopName } from '../../utils/helpers';
import { findPopMasterRecord } from '../../database/popMasterData';
import type { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const TIPE_POP_OPTIONS = ['Super Backbone', 'Backbone', 'Distribusi', 'Akses'];

export const InfoPopScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {
    activePopId,
    activePopName,
    activePopLocation,
    photos,
    setActivePop,
    addPhoto,
    removePhoto,
    formData,
    updateFormData,
    saveDraftNow,
  } = useInspectionStore();

  const [asset, setAsset] = useState<Asset | null>(null);

  const form = formData.infoPop || {};
  const master =
    findPopMasterRecord(activePopId) || findPopMasterRecord(activePopName);

  const [selectedTipe, setSelectedTipe] = useState<string[]>(
    form.tipePop && form.tipePop.length > 0 ? form.tipePop : [],
  );
  const [idPM, setIdPM] = useState(form.idPM || '');
  const [timPLN, setTimPLN] = useState(form.timPLN || '');
  const [timSerpo, setTimSerpo] = useState(form.timSerpo || '');
  const [namaManual, setNamaManual] = useState(
    form.namaPop || master?.name || cleanPopName(activePopName || '') || '',
  );
  const [alamatManual, setAlamatManual] = useState(
    form.alamat || master?.location || activePopLocation || '',
  );
  const [koordinatManual, setKoordinatManual] = useState(
    form.koordinat ||
      (master?.latitude && master?.longitude
        ? `${master.latitude}, ${master.longitude}`
        : ''),
  );

  useEffect(() => {
    loadAssetData();
  }, [activePopId]);

  const loadAssetData = async () => {
    if (!activePopId) return;
    try {
      const assets = await database.get<Asset>('assets').query().fetch();
      const currentAsset = assets.find(a => a.assetCode === activePopId);

      if (currentAsset) {
        setAsset(currentAsset);
        if (!form.namaPop) setNamaManual(cleanPopName(currentAsset.name));
        if (!form.alamat) setAlamatManual(currentAsset.location);
        if (!form.koordinat) {
          const coordsStr =
            currentAsset.latitude && currentAsset.longitude
              ? `${currentAsset.latitude}, ${currentAsset.longitude}`
              : '';
          setKoordinatManual(coordsStr);
          handleUpdateField('koordinat', coordsStr);
        }

        try {
          const specs = JSON.parse(currentAsset.specifications || '{}');
          if (specs.alamat_manual && !form.alamat)
            setAlamatManual(specs.alamat_manual);
          if (specs.koordinat_manual && !form.koordinat)
            setKoordinatManual(specs.koordinat_manual);
        } catch (e) {
          console.log('Error parsing specifications', e);
        }
      }
    } catch (error) {
      console.error('Error loading asset data', error);
    }
  };

  const handleUpdateField = (key: string, value: any) => {
    updateFormData('infoPop', {
      ...formData.infoPop,
      [key]: value,
    });
  };

  const toggleTipe = (tipe: string) => {
    let newSelected = [...selectedTipe];
    if (newSelected.includes(tipe)) {
      newSelected = newSelected.filter(t => t !== tipe);
    } else {
      newSelected.push(tipe);
    }
    setSelectedTipe(newSelected);
    handleUpdateField('tipePop', newSelected);
  };

  const handleSaveAndBack = async () => {
    try {
      await saveDraftNow();
    } catch (e) {}
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Header
        title="Info POP"
        subtitle={
          activePopName
            ? `POP: ${cleanPopName(activePopName)}`
            : 'Detail Informasi POP'
        }
        onBack={handleSaveAndBack}
      />

      <View style={styles.contentContainer}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card 1: Info POP */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Info POP</Text>
              </View>
            </View>
            <View style={styles.titleDivider} />

            <View style={styles.cardBody}>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>ID PM</Text>
                <TextInput
                  style={styles.textInput}
                  value={idPM}
                  onChangeText={val => {
                    setIdPM(val);
                    handleUpdateField('idPM', val);
                  }}
                  placeholder="Masukkan ID PM"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>ID POP</Text>
                <Text style={styles.dataValueBold}>
                  {activePopId ? cleanPopId(activePopId) : '-'}
                </Text>
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Nama POP</Text>
                <TextInput
                  style={styles.textInput}
                  value={namaManual}
                  onChangeText={val => {
                    setNamaManual(val);
                    handleUpdateField('namaPop', val);
                    useInspectionStore.setState({ activePopName: val });
                  }}
                  placeholder="Masukkan nama POP"
                  placeholderTextColor={Colors.textMuted}
                  multiline
                />
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Alamat</Text>
                <TextInput
                  style={styles.textInput}
                  value={alamatManual}
                  onChangeText={val => {
                    setAlamatManual(val);
                    handleUpdateField('alamat', val);
                  }}
                  placeholder="Masukkan alamat manual"
                  placeholderTextColor={Colors.textMuted}
                  multiline
                />
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Koordinat</Text>
                <TextInput
                  style={styles.textInput}
                  value={koordinatManual}
                  onChangeText={val => {
                    setKoordinatManual(val);
                    handleUpdateField('koordinat', val);
                  }}
                  placeholder="Koordinat GPS"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Tim PLN ICON PLUS</Text>
                <TextInput
                  style={styles.textInput}
                  value={timPLN}
                  onChangeText={val => {
                    setTimPLN(val);
                    handleUpdateField('timPLN', val);
                  }}
                  placeholder="Nama Tim PLN"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              <View
                style={[
                  styles.dataRow,
                  { borderBottomWidth: 0, paddingBottom: 0 },
                ]}
              >
                <Text style={styles.dataLabel}>Tim SERPO</Text>
                <TextInput
                  style={styles.textInput}
                  value={timSerpo}
                  onChangeText={val => {
                    setTimSerpo(val);
                    handleUpdateField('timSerpo', val);
                  }}
                  placeholder="Nama Tim Serpo"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>
          </View>

          {/* Card 2: Tipe POP */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Tipe POP</Text>
              </View>
            </View>
            <View style={styles.titleDivider} />

            <View style={styles.cardBody}>
              {TIPE_POP_OPTIONS.map((tipe, index) => {
                const isChecked = selectedTipe.includes(tipe);
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.checkboxRow}
                    onPress={() => toggleTipe(tipe)}
                    activeOpacity={0.7}
                  >
                    {isChecked ? (
                      <CheckSquare color={Colors.primary} size={22} />
                    ) : (
                      <Square color={Colors.border} size={22} />
                    )}
                    <Text
                      style={[
                        styles.checkboxLabel,
                        isChecked && { fontWeight: 'bold' },
                      ]}
                    >
                      {tipe}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveAndBack}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>Simpan & Kembali</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    flex: 1,
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
    marginBottom: Spacing.xs,
  },
  cardBody: {},
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  dataLabel: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
  },
  dataValueBold: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
    flex: 2,
    textAlign: 'left',
    paddingLeft: 8,
  },
  textInput: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
    flex: 2,
    textAlign: 'left',
    paddingVertical: 4,
    paddingHorizontal: 0,
    paddingLeft: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  checkboxLabel: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
    marginLeft: Spacing.md,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  photoUploadBoxWrapper: {
    width: '47%',
    position: 'relative',
  },
  photoUploadBox: {
    width: '100%',
    height: 100,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  photoUploadBoxAdd: {
    width: '100%',
    height: 100,
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
});
