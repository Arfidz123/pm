import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronUp, ChevronDown, Trash2, Plus, Lock } from 'lucide-react-native';

import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import {
  Header,
  showAlert,
  DropdownModalPicker,
} from '../../components/common';
import { useInspectionStore } from '../../store/inspectionStore';
import type { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface RectifierModule {
  id: string;
  sn: string;
  kapasitas: string;
  beban?: string;
}

interface RectifierMCB {
  id: string;
  merk: string;
  kapasitas: string;
  beban: string;
  arus: string;
  namaNe: string;
  peruntukan: string;
}

interface RectifierData {
  id: string;
  isExpanded: boolean;
  inputAC: string;
  merk: string;
  tipe: string;
  sn: string;
  tipeModul: string;
  jmlModul: string;
  jmlSlot: string;
  kapasitasModul: string;
  modules: RectifierModule[];
  mcbs: RectifierMCB[];
  arusBeban: string;
  tegInput: string;
  tegFloating: string;
  tegEqualizing: string;
  lvd: string;
  boost: string;
  utilisasi: string;
  comment?: string;
  kebersihanRack: string;
  kebersihanRackKet: string;
  cekBautKabinet: string;
  cekBautKabinetKet: string;
}

export const calculateUtilisasi = (arusStr: string, kapStr: string): string => {
  if (!arusStr || !kapStr) return '';
  const cleanArus = parseFloat(
    arusStr.toString().replace(',', '.').replace(/[^0-9.]/g, ''),
  );
  const cleanKap = parseFloat(
    kapStr.toString().replace(',', '.').replace(/[^0-9.]/g, ''),
  );
  if (isNaN(cleanArus) || isNaN(cleanKap) || cleanKap <= 0) return '';
  const val = cleanArus / cleanKap;
  const normalized = parseFloat(val.toPrecision(12));
  return normalized.toString();
};

export const RectifierScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { formData, updateFormData } = useInspectionStore();

  const rectData = formData.rectifier || {};

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
    onSelect: () => {},
  });

  // Catatan
  const catatan = rectData.catatan || rectData.comment || '';
  const setCatatan = (val: string) =>
    updateFormData('rectifier', { ...rectData, catatan: val, comment: val });

  // Initial Rectifiers
  const getInitialRectifiers = (): RectifierData[] => {
    const existingBeban = (rectData.rectifierBeban ||
      rectData.bebanRectifier) as any[] | undefined;

    const getMcbsForRect = (
      num: number,
      existingMcbs?: any[],
    ): RectifierMCB[] => {
      if (
        existingMcbs &&
        Array.isArray(existingMcbs) &&
        existingMcbs.length > 0
      ) {
        const hasData = existingMcbs.some(
          (m: any) =>
            m.kapasitas ||
            m.beban ||
            m.arus ||
            m.namaNe ||
            m.merk ||
            m.peruntukan,
        );
        if (hasData) {
          return existingMcbs.map((m: any, mIdx: number) => ({
            id: m.id || (mIdx + 1).toString(),
            merk: m.merk || '',
            kapasitas: m.kapasitas || '',
            beban: m.beban || '',
            arus: m.arus || '',
            namaNe: m.namaNe || '',
            peruntukan: m.peruntukan || '',
          }));
        }
      }

      if (Array.isArray(existingBeban) && existingBeban.length > 0) {
        const rectMatches = existingBeban.filter((b: any) => {
          const rNum = (b.rectifier || '').match(/\d+/)?.[0];
          if (rNum) return rNum === num.toString();
          if (
            num === 1 &&
            (b.rect1KapMcb ||
              b.rect1Arus ||
              b.rect1NamaNe ||
              b.r1Kap ||
              b.r1Arus ||
              b.r1Nama)
          )
            return true;
          if (
            num === 2 &&
            (b.rect2KapMcb ||
              b.rect2Arus ||
              b.rect2NamaNe ||
              b.r2Kap ||
              b.r2Arus ||
              b.r2Nama)
          )
            return true;
          if (
            num === 3 &&
            (b.rect3KapMcb ||
              b.rect3Arus ||
              b.rect3NamaNe ||
              b.r3Kap ||
              b.r3Arus ||
              b.r3Nama)
          )
            return true;
          return num === 1 && !b.rectifier;
        });

        if (rectMatches.length > 0) {
          return rectMatches.map((b: any, bIdx: number) => ({
            id: (bIdx + 1).toString(),
            merk: b.merk || '',
            kapasitas:
              b.kapasitas || b[`rect${num}KapMcb`] || b[`r${num}Kap`] || '',
            beban: b.beban || '',
            arus: b.arus || b[`rect${num}Arus`] || b[`r${num}Arus`] || '',
            namaNe: b.namaNe || '',
            peruntukan: b.peruntukan || b.namaNe || '',
          }));
        }
      }

      return [
        {
          id: '1',
          merk: '',
          kapasitas: '',
          beban: '',
          arus: '',
          namaNe: '',
          peruntukan: '',
        },
      ];
    };

    if (
      rectData.rectifiers &&
      Array.isArray(rectData.rectifiers) &&
      rectData.rectifiers.length > 0
    ) {
      return rectData.rectifiers.map((r: any, idx: number) => {
        const num = idx + 1;
        const arus = r.arusBeban || '';
        const kap = r.kapasitasModul || '';
        const initialUtil = r.utilisasi || calculateUtilisasi(arus, kap);
        const numModules = Math.min(parseInt(r.jmlModul || '', 10) || 0, 20);
        let modules: RectifierModule[] = Array.isArray(r.modules) ? [...r.modules] : [];

        if (numModules > modules.length) {
          for (let i = modules.length; i < numModules; i++) {
            modules.push({
              id: (i + 1).toString(),
              sn: '',
              kapasitas: '',
              beban: '',
            });
          }
        } else if (numModules > 0 && numModules < modules.length) {
          modules = modules.slice(0, numModules);
        }

        return {
          id: r.id || num.toString(),
          isExpanded: r.isExpanded ?? idx === 0,
          inputAC: r.inputAC || '',
          merk: r.merk || '',
          tipe: r.tipe || '',
          sn: r.sn || '',
          tipeModul: r.tipeModul || '',
          jmlModul: r.jmlModul || '',
          jmlSlot: r.jmlSlot || '',
          kapasitasModul: kap,
          modules: modules,
          mcbs: getMcbsForRect(num, r.mcbs),
          arusBeban: arus,
          tegInput: r.tegInput || '',
          tegFloating: r.tegFloating || '',
          tegEqualizing: r.tegEqualizing || '',
          lvd: r.lvd || '',
          boost: r.boost || '',
          utilisasi: initialUtil,
          comment: r.comment || r.catatan || '',
          kebersihanRack: r.kebersihanRack || '',
          kebersihanRackKet: r.kebersihanRackKet || '',
          cekBautKabinet: r.cekBautKabinet || '',
          cekBautKabinetKet: r.cekBautKabinetKet || '',
        };
      });
    }

    return [
      {
        id: '1',
        isExpanded: true,
        inputAC: '',
        merk: '',
        tipe: '',
        sn: '',
        tipeModul: '',
        jmlModul: '',
        jmlSlot: '',
        kapasitasModul: '',
        modules: [],
        mcbs: getMcbsForRect(1),
        arusBeban: '',
        tegInput: '',
        tegFloating: '',
        tegEqualizing: '',
        lvd: '',
        boost: '',
        utilisasi: '',
        comment: '',
        kebersihanRack: '',
        kebersihanRackKet: '',
        cekBautKabinet: '',
        cekBautKabinetKet: '',
      },
    ];
  };

  const [rectifiers, setRectifiersState] =
    useState<RectifierData[]>(getInitialRectifiers);

  // Sync Rectifiers to store & powerSystem
  const syncRectifiers = (newRectifiers: RectifierData[]) => {
    setRectifiersState(newRectifiers);

    // Build unified beban list across all rectifiers for backward compatibility with ReviewScreen and pdfTemplate
    const allBebanRows: any[] = [];
    newRectifiers.forEach(r => {
      const rectNum = r.id;
      const rectLabel = `Rectifier ${rectNum}`;
      (r.mcbs || []).forEach((mcb, mIdx) => {
        allBebanRows.push({
          mcb: (mIdx + 1).toString(),
          id: (mIdx + 1).toString(),
          rectifier: rectLabel,
          merk: mcb.merk || '',
          kapasitas: mcb.kapasitas || '',
          beban: mcb.beban || '',
          arus: mcb.arus || '',
          namaNe: mcb.namaNe || '',
          peruntukan: mcb.peruntukan || '',
          rect1KapMcb: rectNum === '1' ? mcb.kapasitas || '' : '',
          rect1Arus: rectNum === '1' ? mcb.arus || '' : '',
          rect1NamaNe:
            rectNum === '1' ? mcb.namaNe || mcb.peruntukan || '' : '',
          rect2KapMcb: rectNum === '2' ? mcb.kapasitas || '' : '',
          rect2Arus: rectNum === '2' ? mcb.arus || '' : '',
          rect2NamaNe:
            rectNum === '2' ? mcb.namaNe || mcb.peruntukan || '' : '',
          rect3KapMcb: rectNum === '3' ? mcb.kapasitas || '' : '',
          rect3Arus: rectNum === '3' ? mcb.arus || '' : '',
          rect3NamaNe:
            rectNum === '3' ? mcb.namaNe || mcb.peruntukan || '' : '',
          r1Kap: rectNum === '1' ? mcb.kapasitas || '' : '',
          r1Arus: rectNum === '1' ? mcb.arus || '' : '',
          r1Nama: rectNum === '1' ? mcb.namaNe || mcb.peruntukan || '' : '',
          r2Kap: rectNum === '2' ? mcb.kapasitas || '' : '',
          r2Arus: rectNum === '2' ? mcb.arus || '' : '',
          r2Nama: rectNum === '2' ? mcb.namaNe || mcb.peruntukan || '' : '',
          r3Kap: rectNum === '3' ? mcb.kapasitas || '' : '',
          r3Arus: rectNum === '3' ? mcb.arus || '' : '',
          r3Nama: rectNum === '3' ? mcb.namaNe || mcb.peruntukan || '' : '',
        });
      });
    });

    updateFormData('rectifier', {
      rectifiers: newRectifiers,
      rectifierBeban: allBebanRows,
      bebanRectifier: allBebanRows,
    });
  };

  const updateRectifier = (
    id: string,
    field: keyof RectifierData,
    value: any,
  ) => {
    syncRectifiers(
      rectifiers.map(r => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };

        // Auto-calculate Utilisasi when arusBeban or kapasitasModul changes
        if (field === 'arusBeban' || field === 'kapasitasModul') {
          const arusStr = field === 'arusBeban' ? value : r.arusBeban;
          const kapStr = field === 'kapasitasModul' ? value : r.kapasitasModul;
          const calculated = calculateUtilisasi(arusStr, kapStr);
          if (calculated) {
            updated.utilisasi = calculated;
          } else if (!arusStr || !kapStr) {
            updated.utilisasi = '';
          }
        }

        return updated;
      }),
    );
  };

  const addRectifier = () => {
    if (rectifiers.length >= 3) {
      showAlert({
        type: 'warning',
        title: 'Maksimal Rectifier',
        message: 'Maksimal 3 Rectifier pada sistem.',
        buttons: [{ text: 'OK' }],
      });
      return;
    }
    const currentIds = rectifiers
      .map(r => parseInt(r.id, 10))
      .filter(n => !isNaN(n));
    const nextNum =
      [1, 2, 3].find(n => !currentIds.includes(n)) || currentIds.length + 1;
    const newRect: RectifierData = {
      id: nextNum.toString(),
      isExpanded: true,
      inputAC: '',
      merk: '',
      tipe: '',
      sn: '',
      tipeModul: '',
      jmlModul: '',
      jmlSlot: '',
      kapasitasModul: '',
      modules: [],
      mcbs: [
        {
          id: '1',
          merk: '',
          kapasitas: '',
          beban: '',
          arus: '',
          namaNe: '',
          peruntukan: '',
        },
      ],
      arusBeban: '',
      tegInput: '',
      tegFloating: '',
      tegEqualizing: '',
      lvd: '',
      boost: '',
      utilisasi: '',
      comment: '',
      kebersihanRack: '',
      kebersihanRackKet: '',
      cekBautKabinet: '',
      cekBautKabinetKet: '',
    };
    const updated = [...rectifiers, newRect].sort(
      (a, b) => parseInt(a.id, 10) - parseInt(b.id, 10),
    );
    syncRectifiers(updated);
    showAlert({
      type: 'success',
      title: 'Berhasil Ditambahkan',
      message: `Rectifier #${nextNum} berhasil ditambahkan.`,
    });
  };

  const deleteRectifier = (id: string) => {
    showAlert({
      type: 'confirm',
      title: 'Hapus Rectifier',
      message: `Apakah Anda yakin ingin menghapus Rectifier #${id}?`,
      buttons: [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            const updated = rectifiers.filter(r => r.id !== id);
            syncRectifiers(updated);
          },
        },
      ],
    });
  };

  const handleJmlModulChange = (rectId: string, val: string) => {
    const num = Math.min(parseInt(val, 10) || 0, 20);
    const updated = rectifiers.map(r => {
      if (r.id === rectId) {
        let newModules = [...r.modules];
        if (num > newModules.length) {
          for (let i = newModules.length; i < num; i++) {
            newModules.push({
              id: (i + 1).toString(),
              sn: '',
              kapasitas: '',
              beban: '',
            });
          }
        } else {
          newModules = newModules.slice(0, num);
        }
        return { ...r, jmlModul: val, modules: newModules };
      }
      return r;
    });
    syncRectifiers(updated);
  };

  const updateModule = (
    rectId: string,
    moduleId: string,
    field: keyof RectifierModule,
    value: string,
  ) => {
    const updated = rectifiers.map(r => {
      if (r.id === rectId) {
        return {
          ...r,
          modules: r.modules.map(m =>
            m.id === moduleId ? { ...m, [field]: value } : m,
          ),
        };
      }
      return r;
    });
    syncRectifiers(updated);
  };

  const addMCB = (rectId: string) => {
    let createdMcbId = '1';
    const updated = rectifiers.map(r => {
      if (r.id === rectId) {
        const newMcbId = (
          r.mcbs.length > 0
            ? Math.max(...r.mcbs.map(m => parseInt(m.id, 10) || 0)) + 1
            : 1
        ).toString();
        createdMcbId = newMcbId;
        return {
          ...r,
          mcbs: [
            ...r.mcbs,
            {
              id: newMcbId,
              merk: '',
              kapasitas: '',
              beban: '',
              arus: '',
              namaNe: '',
              peruntukan: '',
            },
          ],
        };
      }
      return r;
    });
    syncRectifiers(updated);
    showAlert({
      type: 'success',
      title: 'Berhasil Ditambahkan',
      message: `Baris MCB #${createdMcbId} pada Rectifier #${rectId} berhasil ditambahkan.`,
    });
  };

  const updateMCB = (
    rectId: string,
    mcbId: string,
    field: keyof RectifierMCB,
    value: string,
  ) => {
    const updated = rectifiers.map(r => {
      if (r.id === rectId) {
        return {
          ...r,
          mcbs: r.mcbs.map(m =>
            m.id === mcbId ? { ...m, [field]: value } : m,
          ),
        };
      }
      return r;
    });
    syncRectifiers(updated);
  };

  const removeMCB = (rectId: string, mcbId: string) => {
    showAlert({
      type: 'confirm',
      title: 'Hapus MCB',
      message: 'Apakah Anda yakin ingin menghapus MCB ini?',
      buttons: [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            const updated = rectifiers.map(r => {
              if (r.id === rectId) {
                return {
                  ...r,
                  mcbs: r.mcbs.filter(m => m.id !== mcbId),
                };
              }
              return r;
            });
            syncRectifiers(updated);
          },
        },
      ],
    });
  };

  // Dropdown helper
  const renderDropdownSelect = (
    key: string,
    value: string,
    onSelect: (val: string) => void,
    options: string[] = ['1', '3'],
    prefix?: string,
    title?: string,
    placeholder: string = 'Pilih',
  ) => {
    const displayText = value
      ? prefix
        ? `${prefix}${value}`
        : value
      : placeholder;
    const modalTitle =
      title ||
      (key.includes('rectBeban') || key.includes('rectifier')
        ? 'Pilih Rectifier'
        : key.includes('InputAC')
        ? 'Pilih Phasa'
        : key.includes('Boost')
        ? 'Pilih Boost Charge'
        : 'Pilih');

    return (
      <TouchableOpacity
        style={styles.dropdownBtn}
        onPress={() => {
          setModalPicker({
            visible: true,
            title: modalTitle,
            options,
            selectedValue: value,
            onSelect: (selectedVal: string) => {
              onSelect(selectedVal === value ? '' : selectedVal);
              setModalPicker(prev => ({ ...prev, visible: false }));
            },
          });
        }}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.dropdownBtnText,
            !value && styles.dropdownBtnTextPlaceholder,
          ]}
        >
          {displayText}
        </Text>
        <ChevronDown size={18} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  };

  const renderVisualRow = (
    label: string,
    status: string,
    onStatusChange: (val: string) => void,
    keterangan: string,
    onKeteranganChange: (val: string) => void,
    options: string[] = ['OK', 'NOK'],
  ) => {
    return (
      <View style={[styles.row, { marginBottom: Spacing.sm }]}>
        <View style={{ width: 140 }}>
          <Text style={styles.inputLabel} numberOfLines={1}>
            {label}
          </Text>
          {renderDropdownSelect(
            label,
            status,
            onStatusChange,
            options,
            undefined,
            `Pilih ${label}`,
            'Pilih',
          )}
        </View>

        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TextInput
            style={styles.inputBox}
            value={keterangan || ''}
            onChangeText={onKeteranganChange}
            placeholder="Keterangan..."
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      </View>
    );
  };

  // Measurement input helper (No Unit)
  const renderMeasurement = (
    rectId: string,
    field: keyof RectifierData,
    label: string,
    value: string,
    isLocked: boolean = false,
  ) => {
    return (
      <View style={styles.measurementRow}>
        <Text style={styles.measurementLabel}>{label}</Text>
        <View style={styles.measurementInputWrapper}>
          {isLocked ? (
            <View
              style={[
                styles.measurementInputContainer,
                styles.lockedMeasurementContainer,
              ]}
            >
              <Text
                style={[
                  styles.measurementInput,
                  styles.lockedMeasurementText,
                  !value && { color: Colors.textMuted },
                ]}
                numberOfLines={1}
              >
                {value || '—'}
              </Text>
              <Lock size={12} color={Colors.textMuted} style={{ marginLeft: 4 }} />
            </View>
          ) : (
            <View style={styles.measurementInputContainer}>
              <TextInput
                style={styles.measurementInput}
                value={value}
                onChangeText={val => updateRectifier(rectId, field, val)}
                placeholder="—"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
              />
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Rectifier"
        subtitle="Pengukuran & Output"
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
          {rectifiers.map(rect => (
            <View key={rect.id} style={styles.card}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() =>
                  updateRectifier(rect.id, 'isExpanded', !rect.isExpanded)
                }
                activeOpacity={0.7}
              >
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>Rectifier #{rect.id}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {parseInt(rect.id, 10) > 1 && (
                    <TouchableOpacity
                      onPress={e => {
                        e.stopPropagation();
                        deleteRectifier(rect.id);
                      }}
                      style={[styles.deleteBtn, { marginRight: 8 }]}
                    >
                      <Trash2 color={Colors.danger} size={18} />
                    </TouchableOpacity>
                  )}
                  {rect.isExpanded ? (
                    <ChevronUp color={Colors.textMuted} size={20} />
                  ) : (
                    <ChevronDown color={Colors.textMuted} size={20} />
                  )}
                </View>
              </TouchableOpacity>

              {rect.isExpanded && (
                <>
                  <View style={styles.titleDivider} />
                  <View style={styles.cardBody}>
                    {/* Row 1: Phasa (Input AC) & Merk Recti */}
                    <View style={styles.row}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Phasa</Text>
                        {renderDropdownSelect(
                          `rect_${rect.id}_InputAC`,
                          (rect.inputAC || '').replace(/phasa\s*/gi, '').trim(),
                          val => updateRectifier(rect.id, 'inputAC', val),
                          ['1', '3'],
                          undefined,
                          'Pilih Phasa',
                          'Pilih',
                        )}
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Merk Recti</Text>
                        <TextInput
                          style={styles.inputBox}
                          value={rect.merk}
                          onChangeText={val =>
                            updateRectifier(rect.id, 'merk', val)
                          }
                          placeholder="—"
                          placeholderTextColor={Colors.textMuted}
                        />
                      </View>
                    </View>

                    {/* Row 2: Serial Number & Tipe Recti */}
                    <View style={styles.row}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Serial Number</Text>
                        <TextInput
                          style={styles.inputBox}
                          value={rect.sn}
                          onChangeText={val =>
                            updateRectifier(rect.id, 'sn', val)
                          }
                          placeholder="—"
                          placeholderTextColor={Colors.textMuted}
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Tipe Recti</Text>
                        <TextInput
                          style={styles.inputBox}
                          value={rect.tipe}
                          onChangeText={val =>
                            updateRectifier(rect.id, 'tipe', val)
                          }
                          placeholder="—"
                          placeholderTextColor={Colors.textMuted}
                        />
                      </View>
                    </View>

                    {/* Row 3: Kapasitas Modul & Tipe Modul */}
                    <View style={styles.row}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Kapasitas Modul</Text>
                        <TextInput
                          style={styles.inputBox}
                          keyboardType="numeric"
                          value={rect.kapasitasModul}
                          onChangeText={val =>
                            updateRectifier(rect.id, 'kapasitasModul', val)
                          }
                          placeholder="—"
                          placeholderTextColor={Colors.textMuted}
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Tipe Modul</Text>
                        <TextInput
                          style={styles.inputBox}
                          value={rect.tipeModul}
                          onChangeText={val =>
                            updateRectifier(rect.id, 'tipeModul', val)
                          }
                          placeholder="—"
                          placeholderTextColor={Colors.textMuted}
                        />
                      </View>
                    </View>

                    {/* Row 4: Jumlah Modul & Jumlah Slot Modul */}
                    <View style={styles.row}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Jumlah Modul</Text>
                        <TextInput
                          style={styles.inputBox}
                          keyboardType="numeric"
                          value={rect.jmlModul}
                          onChangeText={val =>
                            handleJmlModulChange(rect.id, val)
                          }
                          placeholder="—"
                          placeholderTextColor={Colors.textMuted}
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Jumlah Slot Modul</Text>
                        <TextInput
                          style={styles.inputBox}
                          keyboardType="numeric"
                          value={rect.jmlSlot}
                          onChangeText={val =>
                            updateRectifier(rect.id, 'jmlSlot', val)
                          }
                          placeholder="—"
                          placeholderTextColor={Colors.textMuted}
                        />
                      </View>
                    </View>

                    {/* Detail Modul (dam detail modul) */}
                    {rect.modules.length > 0 && (
                      <View style={styles.sectionContainer}>
                        <View style={styles.subHeadingContainer}>
                          <Text style={styles.subHeading}>Detail Modul</Text>
                        </View>
                        {rect.modules.map((mod, index) => (
                          <View
                            key={mod.id}
                            style={[
                              styles.card,
                              {
                                marginTop: index === 0 ? 0 : Spacing.md,
                                marginBottom: Spacing.sm,
                                borderWidth: 1,
                                borderColor: Colors.border,
                                backgroundColor: Colors.surface,
                              },
                            ]}
                          >
                            <View style={styles.cardHeader}>
                              <Text style={styles.mcbTitle}>
                                Modul #{mod.id}
                              </Text>
                            </View>
                            <View style={styles.titleDivider} />

                            <View style={[styles.row, { marginBottom: 0 }]}>
                              <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>
                                  Serial Number
                                </Text>
                                <TextInput
                                  style={styles.inputBox}
                                  value={mod.sn}
                                  onChangeText={val =>
                                    updateModule(rect.id, mod.id, 'sn', val)
                                  }
                                  placeholder="—"
                                  placeholderTextColor={Colors.textMuted}
                                />
                              </View>
                              <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Kapasitas</Text>
                                <TextInput
                                  style={styles.inputBox}
                                  value={mod.kapasitas}
                                  onChangeText={val =>
                                    updateModule(
                                      rect.id,
                                      mod.id,
                                      'kapasitas',
                                      val,
                                    )
                                  }
                                  keyboardType="numeric"
                                  placeholder="—"
                                  placeholderTextColor={Colors.textMuted}
                                />
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Pengukuran: Arus Beban, Tegangan Input, Tegangan Floating, Tegangan Equalizing, LVD Threshold, Boost Charge, Utilisasi */}
                    <View style={styles.sectionContainer}>
                      <View style={styles.subHeadingContainer}>
                        <Text style={styles.subHeading}>Pengukuran</Text>
                      </View>

                      {renderMeasurement(
                        rect.id,
                        'arusBeban',
                        'Arus Beban',
                        rect.arusBeban,
                      )}
                      {renderMeasurement(
                        rect.id,
                        'tegInput',
                        'Tegangan Input',
                        rect.tegInput,
                      )}
                      {renderMeasurement(
                        rect.id,
                        'tegFloating',
                        'Tegangan Floating',
                        rect.tegFloating,
                      )}
                      {renderMeasurement(
                        rect.id,
                        'tegEqualizing',
                        'Tegangan Equalizing',
                        rect.tegEqualizing,
                      )}
                      {renderMeasurement(
                        rect.id,
                        'lvd',
                        'LVD Threshold',
                        rect.lvd,
                      )}

                      {/* Boost Charge */}
                      <View style={styles.measurementRow}>
                        <Text style={styles.measurementLabel}>
                          Boost Charge
                        </Text>
                        <View style={styles.measurementInputWrapper}>
                          <TouchableOpacity
                            style={[
                              styles.measurementInputContainer,
                              {
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingHorizontal: 10,
                              },
                            ]}
                            onPress={() => {
                              setModalPicker({
                                visible: true,
                                title: 'Pilih Boost Charge',
                                options: ['Disable', 'Enable'],
                                selectedValue: rect.boost || '',
                                onSelect: val => {
                                  updateRectifier(
                                    rect.id,
                                    'boost',
                                    rect.boost === val ? '' : val,
                                  );
                                  setModalPicker(prev => ({
                                    ...prev,
                                    visible: false,
                                  }));
                                },
                              });
                            }}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.measurementInput,
                                {
                                  flex: 1,
                                  textAlign: 'left',
                                  fontSize: 14,
                                  color: rect.boost
                                    ? Colors.text
                                    : Colors.textMuted,
                                },
                              ]}
                              numberOfLines={1}
                            >
                              {rect.boost || 'Pilih'}
                            </Text>
                            <ChevronDown size={14} color={Colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {renderMeasurement(
                        rect.id,
                        'utilisasi',
                        'Utilisasi',
                        rect.utilisasi,
                        true,
                      )}
                    </View>

                    {/* Output */}
                    <View style={styles.sectionContainer}>
                      <View style={styles.sectionHeaderRow}>
                        <Text style={styles.subHeading}>Output</Text>
                        <TouchableOpacity
                          onPress={() => addMCB(rect.id)}
                          style={{ paddingVertical: 4, paddingHorizontal: 6 }}
                        >
                          <Text
                            style={{
                              color: Colors.primary,
                              fontWeight: 'bold',
                            }}
                          >
                            + Tambah MCB Baru
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {rect.mcbs.map((mcb, index) => (
                        <View
                          key={mcb.id}
                          style={[
                            styles.card,
                            {
                              marginTop: index === 0 ? 0 : Spacing.md,
                              marginBottom: Spacing.sm,
                              borderWidth: 1,
                              borderColor: Colors.border,
                              backgroundColor: Colors.surface,
                            },
                          ]}
                        >
                          <View style={styles.cardHeader}>
                            <Text style={styles.mcbTitle}>
                              MCB #{index + 1}
                            </Text>
                            {rect.mcbs.length > 1 && (
                              <TouchableOpacity
                                onPress={() => removeMCB(rect.id, mcb.id)}
                                style={{ padding: 4 }}
                              >
                                <Trash2 color={Colors.danger} size={15} />
                              </TouchableOpacity>
                            )}
                          </View>
                          <View style={styles.titleDivider} />

                          {/* Row 1: Merk & Kapasitas */}
                          <View style={styles.row}>
                            <View style={styles.inputGroup}>
                              <Text style={styles.inputLabel}>Merk</Text>
                              <TextInput
                                style={styles.inputBox}
                                value={mcb.merk}
                                onChangeText={val =>
                                  updateMCB(rect.id, mcb.id, 'merk', val)
                                }
                                placeholder="—"
                                placeholderTextColor={Colors.textMuted}
                              />
                            </View>
                            <View style={styles.inputGroup}>
                              <Text style={styles.inputLabel}>Kapasitas</Text>
                              <TextInput
                                style={styles.inputBox}
                                keyboardType="numeric"
                                value={mcb.kapasitas}
                                onChangeText={val =>
                                  updateMCB(rect.id, mcb.id, 'kapasitas', val)
                                }
                                placeholder="—"
                                placeholderTextColor={Colors.textMuted}
                              />
                            </View>
                          </View>

                          {/* Row 2: Nama NE & Peruntukan (di atas Beban) */}
                          <View style={styles.row}>
                            <View style={styles.inputGroup}>
                              <Text style={styles.inputLabel}>Nama NE</Text>
                              <TextInput
                                style={styles.inputBox}
                                value={mcb.namaNe ?? ''}
                                onChangeText={val =>
                                  updateMCB(rect.id, mcb.id, 'namaNe', val)
                                }
                                placeholder="—"
                                placeholderTextColor={Colors.textMuted}
                              />
                            </View>
                            <View style={styles.inputGroup}>
                              <Text style={styles.inputLabel}>Peruntukan</Text>
                              <TextInput
                                style={styles.inputBox}
                                value={mcb.peruntukan ?? ''}
                                onChangeText={val =>
                                  updateMCB(rect.id, mcb.id, 'peruntukan', val)
                                }
                                placeholder="—"
                                placeholderTextColor={Colors.textMuted}
                              />
                            </View>
                          </View>

                          <View
                            style={[
                              styles.divider,
                              { marginVertical: Spacing.sm },
                            ]}
                          />

                          {/* Pengukuran: Arus */}
                          <View style={styles.measurementRow}>
                            <Text style={styles.measurementLabel}>Arus</Text>
                            <View style={styles.measurementInputWrapper}>
                              <View style={styles.measurementInputContainer}>
                                <TextInput
                                  style={styles.measurementInput}
                                  value={mcb.arus ?? ''}
                                  onChangeText={val =>
                                    updateMCB(rect.id, mcb.id, 'arus', val)
                                  }
                                  placeholder="—"
                                  placeholderTextColor={Colors.textMuted}
                                  keyboardType="numeric"
                                />
                              </View>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>

                    {/* Pengecekan Fisik Rectifier: Kebersihan Rack & Cek Baut Kabinet */}
                    <View style={styles.sectionContainer}>
                      <View style={styles.subHeadingContainer}>
                        <Text style={styles.subHeading}>
                          Pengecekan Fisik Rectifier #{rect.id}
                        </Text>
                      </View>

                      {renderVisualRow(
                        'Kebersihan Rack',
                        rect.kebersihanRack,
                        val => updateRectifier(rect.id, 'kebersihanRack', val),
                        rect.kebersihanRackKet,
                        val =>
                          updateRectifier(rect.id, 'kebersihanRackKet', val),
                        ['OK', 'NOK'],
                      )}

                      {renderVisualRow(
                        'Cek Baut Kabinet',
                        rect.cekBautKabinet,
                        val => updateRectifier(rect.id, 'cekBautKabinet', val),
                        rect.cekBautKabinetKet,
                        val =>
                          updateRectifier(rect.id, 'cekBautKabinetKet', val),
                        ['OK', 'NOK'],
                      )}
                    </View>
                  </View>
                </>
              )}
            </View>
          ))}

          {/* Add Rectifier Button (up to 3) */}
          {rectifiers.length < 3 && (
            <TouchableOpacity
              style={styles.addRectifierButton}
              onPress={addRectifier}
              activeOpacity={0.7}
            >
              <Plus
                size={18}
                color={Colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.addRectifierText}>Tambah Rectifier</Text>
            </TouchableOpacity>
          )}

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
                value={catatan}
                onChangeText={setCatatan}
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

      {/* Modal Picker Pop-up */}
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
    minHeight: 28,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitle: {
    ...Typography.h4,
    color: Colors.text,
    fontSize: 17,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  mcbTitle: {
    ...Typography.h4,
    color: Colors.text,
    fontSize: 15,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  deleteBtn: {
    padding: 8,
  },
  titleDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardBody: {
    zIndex: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    flex: 1,
  },
  inputGroupFull: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    ...Typography.caption,
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  inputBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 38,
    backgroundColor: Colors.background,
    color: Colors.text,
    fontSize: 13,
    textAlign: 'left',
  },
  sectionContainer: {
    marginTop: 0,
  },
  measurementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  measurementLabel: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
    flex: 1,
  },
  measurementInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  measurementInputContainer: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    width: 90,
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  measurementInput: {
    color: Colors.text,
    fontSize: 14,
    textAlign: 'left',
    padding: 0,
    margin: 0,
  },
  lockedMeasurementContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  lockedMeasurementText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  subHeading: {
    ...Typography.h4,
    color: Colors.text,
    fontSize: 17,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  subHeadingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  addRectifierButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    marginBottom: Spacing.lg,
  },
  addRectifierText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
  },
  dropdownBtnText: {
    color: Colors.text,
    fontSize: 13,
  },
  dropdownBtnTextPlaceholder: {
    color: Colors.textMuted,
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
