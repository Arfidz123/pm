import React, { useState } from 'react';
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
import { ChevronDown, Lock } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';

import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import {
  Header,
  showAlert,
  DropdownModalPicker,
} from '../../components/common';
import { useInspectionStore } from '../../store/inspectionStore';
import type { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const MechanicalElectScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  // Daftar Parameter Pemeriksaan AC
  const AC_CHECK_ITEMS = [
    { key: 'status', label: 'Status AC', ketKey: 'acStatusKet' },
    { key: 'daya', label: 'Daya', ketKey: 'acDayaKet' },
    { key: 'tekanan', label: 'Tekanan', ketKey: 'acTekananKet' },
    { key: 'currentMax', label: 'Current Max', ketKey: 'acCurrentMaxKet' },
    { key: 'arus', label: 'Arus Pengukuran', ketKey: 'acArusKet' },
    {
      key: 'kondisiIndoor',
      label: 'Kondisi Indoor AC',
      ketKey: 'acKondisiIndoorKet',
    },
    { key: 'kondisiPipa', label: 'Kondisi Pipa', ketKey: 'acKondisiPipaKet' },
    { key: 'autoRestart', label: 'Auto Restart', ketKey: 'acAutoRestartKet' },
    { key: 'switch', label: 'Switch Kontaktor', ketKey: 'acSwitchKet' },
    { key: 'settingSuhu', label: 'Seting Suhu AC', ketKey: 'acSettingSuhuKet' },
    { key: 'suhuRuangan', label: 'Suhu Ruangan', ketKey: 'acSuhuRuanganKet' },
  ];

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

  const { formData, updateFormData } = useInspectionStore();

  // Unified Form state
  const defaultForm = {
    // AC (Dynamic List)
    acList: [
      {
        id: 1,
        status: '',
        daya: '',
        tekanan: '',
        currentMax: '',
        arus: '',
        kondisiIndoor: '',
        kondisiPipa: '',
        autoRestart: '',
        switch: '',
        settingSuhu: '',
        suhuRuangan: '',
      },
    ],
    acSiteStatusKet: '',
    acSiteStatus: '',
    acMerk: '',
    acJumlah: '',
    acStatusKet: '',
    acDayaKet: '',
    acTekananKet: '',
    acCurrentMaxKet: '',
    acArusKet: '',
    acKondisiIndoorKet: '',
    acKondisiPipaKet: '',
    acAutoRestartKet: '',
    acSwitchKet: '',
    acSettingSuhuKet: '',
    acSuhuRuanganKet: '',

    // Exhaust Fan
    exStatusKet: '',
    exStatus: '',
    exJumlah: '',
    exSystemKet: '',
    exSystem: '',
    exControllerKet: '',
    exController: '',

    // Grounding
    grPengukuran: '',
    systemGrounding: '',
    systemGroundingKet: '',
    grStatusKet: '',
    grStatus: '',
    grPetirKet: '',
    grPetir: '',
    grBarIndoorKet: '',
    grBarIndoor: '',
    grBarTowerKet: '',
    grBarTower: '',
    grBarSumurKet: '',
    grBarSumur: '',
    grKabelKet: '',
    grKabel: '',
    grKoneksiKet: '',
    grKoneksi: '',

    // Status POP
    popLokasiKet: '',
    popLokasi: '',
    popLuas: '',
    popCatKet: '',
    popCat: '',
    popKonstruksiKet: '',
    popKonstruksi: '',
    popLampuKet: '',
    popLampu: '',
    popKunciKet: '',
    popKunci: '',

    // Catatan
    popNote: '',
    note: '',
  };

  const form = { ...defaultForm, ...(formData.mechanicalElect || {}) };

  const updateForm = (key: string, value: any) => {
    updateFormData('mechanicalElect', { [key]: value });
  };

  const isAcUnitFilled = (ac: any) => {
    if (!ac) return false;
    return Object.keys(ac).some(key => {
      if (key === 'id') return false;
      const val = ac[key];
      return val !== undefined && val !== null && String(val).trim() !== '';
    });
  };

  const getFilledAcCount = (list: any[]) => {
    return (list || []).filter(isAcUnitFilled).length;
  };

  const addAcRow = () => {
    const list = form.acList || [];
    const nextId =
      list.length > 0
        ? Math.max(...list.map((item: any) => item.id || 1)) + 1
        : 1;
    const newList = [
      ...list,
      {
        id: nextId,
        status: '',
        daya: '',
        tekanan: '',
        currentMax: '',
        arus: '',
        kondisiIndoor: '',
        kondisiPipa: '',
        autoRestart: '',
        switch: '',
        settingSuhu: '',
        suhuRuangan: '',
      },
    ];
    const count = getFilledAcCount(newList);
    updateFormData('mechanicalElect', {
      acList: newList,
      acJumlah: count > 0 ? count.toString() : '',
    });
    showAlert({
      type: 'success',
      title: 'Berhasil Ditambahkan',
      message: `Kolom status Unit AC #${newList.length} berhasil ditambahkan.`,
    });
  };

  const removeAcRow = (id: number) => {
    showAlert({
      type: 'confirm',
      title: 'Hapus Unit AC',
      message: 'Apakah Anda yakin ingin menghapus Unit AC ini?',
      buttons: [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            const list = form.acList || [];
            const newList = list.filter((item: any) => item.id !== id);
            const count = getFilledAcCount(newList);
            updateFormData('mechanicalElect', {
              acList: newList,
              acJumlah: count > 0 ? count.toString() : '',
            });
          },
        },
      ],
    });
  };

  const updateAcRow = (index: number, field: string, value: string) => {
    const newList = [...(form.acList || [])];
    newList[index] = { ...newList[index], [field]: value };
    const count = getFilledAcCount(newList);
    updateFormData('mechanicalElect', {
      acList: newList,
      acJumlah: count > 0 ? count.toString() : '',
    });
  };

  const renderDropdownSelect = (
    key: string,
    value: string,
    onSelect: (val: string) => void,
    options: string[] = ['OK', 'NOK', 'N/A'],
    title?: string,
    placeholder: string = 'Pilih',
  ) => {
    const displayText = value || placeholder;

    return (
      <TouchableOpacity
        style={styles.selectBox}
        onPress={() => {
          setModalPicker({
            visible: true,
            title: title || 'Pilih Status',
            options,
            selectedValue: value,
            onSelect,
          });
        }}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.selectText,
            !value && styles.selectTextPlaceholder,
            (value === 'OK' || value === 'Baik' || value === 'Normal') && {
              color: Colors.success,
              fontWeight: '700',
            },
            (value === 'NOK' || value === 'Rusak' || value === 'Alarm') && {
              color: Colors.danger,
              fontWeight: '700',
            },
            (value === 'N/A' || value === 'NA') && {
              color: Colors.warning,
              fontWeight: '700',
            },
          ]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <ChevronDown color={Colors.textMuted} size={16} />
      </TouchableOpacity>
    );
  };

  const renderCheckRow = (
    label: string,
    key: string,
    ketKey?: string,
    options: string[] = ['OK', 'NOK', 'N/A'],
    dropdownWidth: number = 165,
  ) => {
    const val = (form as any)[key] || '';
    const ketVal = ketKey ? (form as any)[ketKey] || '' : '';

    return (
      <View style={styles.row}>
        <View style={{ width: dropdownWidth }}>
          <Text style={styles.inputLabel} numberOfLines={1}>
            {label}
          </Text>
          {renderDropdownSelect(
            key,
            val,
            v => updateForm(key, v),
            options,
            label,
          )}
        </View>

        {ketKey && (
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <TextInput
              style={styles.textInput}
              value={ketVal}
              onChangeText={v => updateForm(ketKey, v)}
              placeholder="Keterangan..."
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Mechanical Electrical"
        subtitle="AC, Exhaust & Grounding"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.contentContainer}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card 1: Air Conditioner */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Air Conditioner</Text>
              <View
                style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}
              >
                {(form.acList?.length || 1) > 1 && (
                  <TouchableOpacity
                    onPress={() =>
                      removeAcRow(form.acList[form.acList.length - 1].id)
                    }
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{
                        color: Colors.danger,
                        fontWeight: 'bold',
                        fontSize: 13,
                      }}
                    >
                      - Hapus AC
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={addAcRow} activeOpacity={0.7}>
                  <Text
                    style={{
                      color: Colors.primary,
                      fontWeight: 'bold',
                      fontSize: 13,
                    }}
                  >
                    + Tambah AC
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.titleDivider} />

            <View style={styles.cardBody}>
              {renderCheckRow(
                'Site Status',
                'acSiteStatus',
                'acSiteStatusKet',
                ['Indoor', 'Outdoor', 'N/A'],
                165,
              )}

              <View style={styles.row}>
                <View style={{ width: 165 }}>
                  <Text style={styles.inputLabel}>Jumlah AC</Text>
                  <View style={styles.lockedContainer}>
                    <Text style={styles.lockedText}>
                      {getFilledAcCount(form.acList) > 0
                        ? getFilledAcCount(form.acList).toString()
                        : ''}
                    </Text>
                    <Lock size={14} color={Colors.textMuted} />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Merk AC</Text>
                  <TextInput
                    style={styles.textInput}
                    value={form.acMerk}
                    onChangeText={val => updateForm('acMerk', val)}
                    placeholder="Merk AC..."
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              <View
                style={[styles.titleDivider, { marginVertical: Spacing.sm }]}
              />

              {/* Matriks Pemeriksaan Parameter AC */}
              {AC_CHECK_ITEMS.map(item => (
                <View key={item.key} style={{ marginBottom: Spacing.md }}>
                  <Text style={styles.inputLabel}>{item.label}</Text>

                  {/* Baris Kotak Status AC #1, AC #2, dst */}
                  <View style={styles.row}>
                    {(form.acList || [{ id: 1 }]).map(
                      (ac: any, acIdx: number) => {
                        const val = ac[item.key] || '';
                        return (
                          <View key={acIdx} style={{ flex: 1 }}>
                            {renderDropdownSelect(
                              `ac_${acIdx}_${item.key}`,
                              val,
                              v => updateAcRow(acIdx, item.key, v),
                              ['OK', 'NOK', 'N/A'],
                              `Pilih Status ${item.label} (AC #${acIdx + 1})`,
                              `AC #${acIdx + 1}`,
                            )}
                          </View>
                        );
                      },
                    )}
                  </View>

                  {/* Keterangan di Bawah Kotak AC #1-3 */}
                  <View style={{ marginTop: 6 }}>
                    <TextInput
                      style={styles.textInput}
                      value={
                        (form as any)[item.ketKey] ??
                        (form.acList?.[0]?.[`${item.key}Ket`] || '')
                      }
                      onChangeText={val => {
                        updateForm(item.ketKey, val);
                        updateAcRow(0, `${item.key}Ket`, val);
                      }}
                      placeholder="Keterangan..."
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Card 2: Exhaust Fan */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Exhaust Fan</Text>
              </View>
            </View>
            <View style={styles.titleDivider} />

            <View style={styles.cardBody}>
              <View style={[styles.row, { marginBottom: Spacing.sm }]}>
                <View style={{ width: 165 }}>
                  <Text style={styles.inputLabel}>Jumlah</Text>
                  <TextInput
                    style={styles.textInput}
                    value={form.exJumlah}
                    onChangeText={val => updateForm('exJumlah', val)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }} />
              </View>

              {renderCheckRow(
                'Status',
                'exStatus',
                'exStatusKet',
                ['OK', 'NOK', 'N/A'],
                165,
              )}
              {renderCheckRow(
                'Sistem Kerja',
                'exSystem',
                'exSystemKet',
                ['Backup', 'Main', 'N/A'],
                165,
              )}
              {renderCheckRow(
                'Controller',
                'exController',
                'exControllerKet',
                ['Analog', 'Digital', 'N/A'],
                165,
              )}
            </View>
          </View>

          {/* Card 3: Grounding */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Grounding</Text>
              </View>
            </View>
            <View style={styles.titleDivider} />

            <View style={styles.cardBody}>
              <View style={[styles.row, { marginBottom: Spacing.sm }]}>
                <View style={{ width: 165 }}>
                  <Text style={styles.inputLabel}>Pengukuran Grounding</Text>
                  <TextInput
                    style={styles.textInput}
                    value={form.grPengukuran}
                    onChangeText={val => updateForm('grPengukuran', val)}
                    placeholder="Nilai Ohm..."
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }} />
              </View>

              {renderCheckRow(
                'System Grounding',
                'systemGrounding',
                'systemGroundingKet',
                ['Single', 'Double (Ganda)'],
                165,
              )}
              {renderCheckRow(
                'Status Grounding',
                'grStatus',
                'grStatusKet',
                ['OK', 'NOK', 'N/A'],
                165,
              )}
              {renderCheckRow(
                'Penangkal Petir',
                'grPetir',
                'grPetirKet',
                ['OK', 'NOK', 'N/A'],
                165,
              )}
              {renderCheckRow(
                'Bar Grounding Indoor',
                'grBarIndoor',
                'grBarIndoorKet',
                ['OK', 'NOK', 'N/A'],
                165,
              )}
              {renderCheckRow(
                'Bar Grounding Tower',
                'grBarTower',
                'grBarTowerKet',
                ['OK', 'NOK', 'N/A'],
                165,
              )}
              {renderCheckRow(
                'Bar Sumur Grounding',
                'grBarSumur',
                'grBarSumurKet',
                ['OK', 'NOK', 'N/A'],
                165,
              )}
              {renderCheckRow(
                'Kabel Down Conductor (BC50)',
                'grKabel',
                'grKabelKet',
                ['OK', 'NOK', 'N/A'],
                165,
              )}
              {renderCheckRow(
                'Koneksi Baut',
                'grKoneksi',
                'grKoneksiKet',
                ['OK', 'NOK', 'N/A'],
                165,
              )}
            </View>
          </View>

          {/* Card 4: Status POP */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Status POP</Text>
              </View>
            </View>
            <View style={styles.titleDivider} />

            <View style={styles.cardBody}>
              {renderCheckRow(
                'Status Lokasi',
                'popLokasi',
                'popLokasiKet',
                ['Shelter', 'Mini Shelter', 'ODC', 'PLC', 'Other', 'N/A'],
                165,
              )}

              <View style={{ marginBottom: Spacing.sm }}>
                <Text style={styles.inputLabel}>
                  Dimensi Ruangan / Bangunan
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={form.popLuas}
                  onChangeText={val => updateForm('popLuas', val)}
                  placeholder="Contoh: 3m x 4m..."
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              {renderCheckRow(
                'Kondisi Cat',
                'popCat',
                'popCatKet',
                ['OK', 'NOK', 'N/A'],
                165,
              )}
              {renderCheckRow(
                'Konstruksi Bangunan',
                'popKonstruksi',
                'popKonstruksiKet',
                ['OK', 'NOK', 'N/A'],
                165,
              )}
              {renderCheckRow(
                'Lampu Penerangan',
                'popLampu',
                'popLampuKet',
                ['OK', 'NOK', 'N/A'],
                165,
              )}
              {renderCheckRow(
                'Kunci Pintu Pengaman',
                'popKunci',
                'popKunciKet',
                ['OK', 'NOK', 'N/A'],
                165,
              )}
            </View>
          </View>

          {/* Card 5: Catatan */}
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
                  styles.textInput,
                  {
                    height: 100,
                    textAlignVertical: 'top',
                    paddingVertical: 10,
                  },
                ]}
                value={form.popNote || form.note}
                onChangeText={val => {
                  updateForm('popNote', val);
                  updateForm('note', val);
                }}
                placeholder="Tambahkan catatan..."
                placeholderTextColor={Colors.textMuted}
                multiline
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveGradient}
            >
              <Text style={styles.saveButtonText}>Simpan & Selesai</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
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
  contentContainer: {
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
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
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
  },
  titleDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing.md,
  },
  cardBody: {
    gap: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  inputLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 10,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm + 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    color: Colors.text,
    height: 38,
    fontSize: 13,
  },
  selectBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm + 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontSize: 13,
    color: Colors.text,
  },
  selectTextPlaceholder: {
    color: Colors.textMuted,
  },
  lockedContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm + 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 38,
  },
  lockedText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  saveButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
    ...Shadow.md,
  },
  saveGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
  saveButtonText: {
    ...Typography.button,
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
