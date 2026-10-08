/* -------------------------------------------------------------------------
 * DOKUMENTASI MODUL: INSPEKSI & UJI EXTERNAL ALARM
 * -------------------------------------------------------------------------
 * File       : ExternalAlarmScreen.tsx
 * Fungsi     : Pengujian sensor telemetri external alarm dan verifikasi integrasi NMS.
 * Arsitektur : Hybrid 2-Tab Navigation (Top Segmented Tabs + Contextual Action Buttons).
 *
 * STRUKTUR TAHAPAN (TABS):
 * 1. TAB 1 - Uji Sensor 1 - 5 (Sistem Utama & Power Source):
 *    - 1. Uji Konfigurasi External Alarm (Setting NMS, Ping Cisco/GPA, Trigger test).
 *    - 2. Uji Sensor PLN OFF External Alarm (Wiring, MCB PLN off, Status NMS).
 *    - 3. Uji Sensor Battery Fail (Wiring, Cabut fuse battery, Status NMS).
 *    - 4. Uji Sensor Rectifier Fail (Wiring, Matikan rectifier/MCB, Status NMS).
 *    - 5. Uji Sensor Modul Rectifier Fail (Wiring, Cabut modul rectifier, Status NMS).
 *
 * 2. TAB 2 - Uji Sensor 6 - 10 & Catatan (Lingkungan, Fasilitas & Site):
 *    - 6. Uji Sensor Temperature High (Wiring, Matikan AC ruangan, Suhu lokasi, NMS).
 *    - 7. Uji Sensor Smoke & Heat (Wiring, Uji deteksi asap, Status NMS).
 *    - 8. Uji Arrester & Grounding (Wiring, Cabut kaki arrester, Status NMS).
 *    - 9. Uji Sensor Door Open (Wiring, Simulasi buka/tutup pintu, Status NMS).
 *    - 10. Uji Sensor Genset Run (Wiring, Simulasi genset hidup, Status NMS).
 *    - Card Catatan: Catatan umum teknisi & Tombol Simpan Inspeksi.
 *
 * Nilai Hasil Uji per Item:
 * - Status Uji Utama: OK / NOK / N/A (jika N/A, sub-kegiatan otomatis disembunyikan).
 * - Sub-kegiatan    : Dilakukan / Tidak Dilakukan / NA / Ada Alarm / Tidak Ada Alarm.
 *
 * State & Store:
 * - Global Store    : useInspectionStore -> updateFormData('external_alarm', ...).
 * ------------------------------------------------------------------------- */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native';

import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import { Header, DropdownModalPicker } from '../../components/common';
import { useInspectionStore } from '../../store/inspectionStore';
import type { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface AlarmSubItem {
  key: string;
  label: string;
  options: string[];
}

interface AlarmSectionConfig {
  id: number;
  title: string;
  keyPrefix: string;
  overallKey: string;
  items: AlarmSubItem[];
}

const ALARM_SECTIONS: AlarmSectionConfig[] = [
  {
    id: 1,
    title: 'Uji Konfigurasi External Alarm',
    keyPrefix: 'uji1',
    overallKey: 'uji1_status',
    items: [
      {
        key: 'uji1_cekNms',
        label: 'Cek konfigurasi dan setting NMS external alarm',
        options: ['Dilakukan', 'Tidak Dilakukan', 'NA'],
      },
      {
        key: 'uji1_pingTest',
        label: 'Ping test untuk external alarm (Cisco 3600/3800 & GPA/HARIFF)',
        options: ['Dilakukan', 'Tidak Dilakukan', 'NA'],
      },
      {
        key: 'uji1_trigger',
        label: 'Test dengan mengubah trigger pada external alarm',
        options: ['Dilakukan', 'Tidak Dilakukan', 'NA'],
      },
    ],
  },
  {
    id: 2,
    title: 'Uji Sensor PLN OFF External Alarm',
    keyPrefix: 'uji2',
    overallKey: 'uji2_status',
    items: [
      {
        key: 'uji2_wiring',
        label: 'Cek wiringan dan sensor/input alarm',
        options: ['Dilakukan', 'Tidak Dilakukan', 'NA'],
      },
      {
        key: 'uji2_testMcb',
        label: 'Test dengan mematikan MCB source PLN',
        options: ['Dilakukan', 'Tidak Dilakukan', 'NA'],
      },
      {
        key: 'uji2_alarmLokasi',
        label: 'Cek kondisi alarm di lokasi',
        options: ['Ada Alarm', 'Tidak Ada Alarm', 'NA'],
      },
      {
        key: 'uji2_alarmNms',
        label: 'Cek kondisi alarm Log di NMS',
        options: ['Ada Alarm', 'Tidak Ada Alarm', 'NA'],
      },
      {
        key: 'uji2_anomali',
        label: 'Terdapat anomali atau kesalahan deteksi',
        options: ['Ada', 'Tidak Ada', 'NA'],
      },
    ],
  },
  {
    id: 3,
    title: 'Uji Sensor Battery Fail',
    keyPrefix: 'uji3',
    overallKey: 'uji3_status',
    items: [
      {
        key: 'uji3_wiring',
        label: 'Cek wiringan dan sensor/input alarm',
        options: ['Dilakukan', 'Tidak Dilakukan', 'NA'],
      },
      {
        key: 'uji3_cabutFuse',
        label: 'Test dengan mencabut fuse pada battery',
        options: ['Dilakukan', 'Tidak Dilakukan', 'NA'],
      },
      {
        key: 'uji3_alarmLokasi',
        label: 'Cek kondisi alarm di lokasi / directifier untuk battery',
        options: ['Ada Alarm', 'Tidak Ada Alarm', 'NA'],
      },
      {
        key: 'uji3_alarmNms',
        label: 'Cek kondisi alarm Log di NMS',
        options: ['Ada Alarm', 'Tidak Ada Alarm', 'NA'],
      },
      {
        key: 'uji3_anomali',
        label: 'Terdapat anomali atau kesalahan deteksi',
        options: ['Ada', 'Tidak Ada', 'NA'],
      },
    ],
  },
  {
    id: 4,
    title: 'Uji Sensor Rectifier Fail',
    keyPrefix: 'uji4',
    overallKey: 'uji4_status',
    items: [
      {
        key: 'uji4_wiring',
        label: 'Cek wiringan dan sensor/input alarm',
        options: ['Dilakukan', 'Tidak Dilakukan', 'NA'],
      },
      {
        key: 'uji4_matiRect',
        label: 'Test dengan mematikan rectifier atau mcb source rectifier',
        options: ['Dilakukan', 'Tidak Dilakukan', 'NA'],
      },
      {
        key: 'uji4_alarmLokasi',
        label:
          'Cek kondisi alarm di lokasi / directifier (kondisi rectifier mati)',
        options: ['Ada Alarm', 'Tidak Ada Alarm', 'NA'],
      },
      {
        key: 'uji4_alarmNms',
        label: 'Cek kondisi alarm Log di NMS',
        options: ['Ada Alarm', 'Tidak Ada Alarm', 'NA'],
      },
      {
        key: 'uji4_anomali',
        label: 'Terdapat anomali atau kesalahan deteksi',
        options: ['Ada', 'Tidak Ada', 'NA'],
      },
    ],
  },
  {
    id: 5,
    title: 'Uji Sensor Modul Rectifier Fail',
    keyPrefix: 'uji5',
    overallKey: 'uji5_status',
    items: [
      {
        key: 'uji5_wiring',
        label: 'Cek wiringan dan sensor/input alarm',
        options: ['Dilakukan', 'Tidak Dilakukan', 'NA'],
      },
      {
        key: 'uji5_cabutModul',
        label: 'Test dengan mencabut modul rectifier',
        options: ['Dilakukan', 'Tidak Dilakukan', 'NA'],
      },
      {
        key: 'uji5_alarmLokasi',
        label:
          'Cek kondisi alarm di lokasi / directifier untuk modul rectifier',
        options: ['Ada Alarm', 'Tidak Ada Alarm', 'NA'],
      },
      {
        key: 'uji5_alarmNms',
        label: 'Cek kondisi alarm Log di NMS',
        options: ['Ada Alarm', 'Tidak Ada Alarm', 'NA'],
      },
      {
        key: 'uji5_anomali',
        label: 'Terdapat anomali atau kesalahan deteksi',
        options: ['Ada', 'Tidak Ada', 'NA'],
      },
    ],
  },
  {
    id: 6,
    title: 'Uji Sensor Temperature High',
    keyPrefix: 'uji6',
    overallKey: 'uji6_status',
    items: [
      {
        key: 'uji6_wiring',
        label: 'Cek wiringan dan sensor/input alarm',
        options: ['Dilakukan', 'Tidak Dilakukan', 'NA'],
      },
      {
        key: 'uji6_matiAc',
        label: 'Test dengan mematikan Air Conditioner (Pendingin Ruangan)',
        options: ['Dilakukan', 'Tidak Dilakukan', 'NA'],
      },
      {
        key: 'uji6_suhuLokasi',
        label: 'Cek kondisi suhu di lokasi (dapat digenerate dari OMNI)',
        options: ['Panas', 'Normal', 'Dingin', 'NA'],
      },
      {
        key: 'uji6_alarmNms',
        label: 'Cek kondisi alarm Log di NMS',
        options: ['Ada Alarm', 'Tidak Ada Alarm', 'NA'],
      },
      {
        key: 'uji6_anomali',
        label: 'Terdapat anomali atau kesalahan deteksi',
        options: ['Ada', 'Tidak Ada', 'NA'],
      },
    ],
  },
  {
    id: 7,
    title: 'Uji Sensor Smoke & Heat',
    keyPrefix: 'uji7',
    overallKey: 'uji7_status',
    items: [
      {
        key: 'uji7_wiring',
        label: 'Cek wiringan dan sensor/input alarm',
        options: ['Dilakukan', 'Tidak Dilakukan', 'NA'],
      },
      {
        key: 'uji7_asapRokok',
        label: 'Test dengan uji pakai asap rokok',
        options: ['Dilakukan', 'Tidak Dilakukan', 'NA'],
      },
      {
        key: 'uji7_alarmNms',
        label: 'Cek kondisi alarm Log di NMS',
        options: ['Ada Alarm', 'Tidak Ada Alarm', 'NA'],
      },
      {
        key: 'uji7_anomali',
        label: 'Terdapat anomali atau kesalahan deteksi',
        options: ['Ada', 'Tidak Ada', 'NA'],
      },
    ],
  },
  {
    id: 8,
    title: 'Uji Arrester & Grounding',
    keyPrefix: 'uji8',
    overallKey: 'uji8_status',
    items: [
      {
        key: 'uji8_wiring',
        label: 'Cek wiringan dan sensor/input alarm dari pin arrester',
        options: ['Dilakukan', 'Tidak Dilakukan', 'NA'],
      },
      {
        key: 'uji8_cabutKaki',
        label: 'Test dengan mencabut satu kaki arrester',
        options: ['Dilakukan', 'Tidak Dilakukan', 'NA'],
      },
      {
        key: 'uji8_alarmNms',
        label: 'Cek kondisi alarm Log di NMS',
        options: ['Ada Alarm', 'Tidak Ada Alarm', 'NA'],
      },
      {
        key: 'uji8_anomali',
        label: 'Terdapat anomali atau kesalahan deteksi',
        options: ['Ada', 'Tidak Ada', 'NA'],
      },
    ],
  },
  {
    id: 9,
    title: 'Uji Sensor Door Open',
    keyPrefix: 'uji9',
    overallKey: 'uji9_status',
    items: [
      {
        key: 'uji9_wiring',
        label: 'Cek wiringan dan sensor/input alarm',
        options: ['Dilakukan', 'Tidak Dilakukan', 'NA'],
      },
      {
        key: 'uji9_bukaPintu',
        label: 'Test dengan dilakukan buka/tutup pintu',
        options: ['Dilakukan', 'Tidak Dilakukan', 'NA'],
      },
      {
        key: 'uji9_alarmNms',
        label: 'Cek kondisi alarm Log di NMS',
        options: ['Ada Alarm', 'Tidak Ada Alarm', 'NA'],
      },
      {
        key: 'uji9_anomali',
        label: 'Terdapat anomali atau kesalahan deteksi',
        options: ['Ada', 'Tidak Ada', 'NA'],
      },
    ],
  },
  {
    id: 10,
    title: 'Uji Sensor Genset Run',
    keyPrefix: 'uji10',
    overallKey: 'uji10_status',
    items: [
      {
        key: 'uji10_wiring',
        label: 'Cek wiringan dan sensor/input alarm',
        options: ['Dilakukan', 'Tidak Dilakukan', 'NA'],
      },
      {
        key: 'uji10_switchGenset',
        label: 'Test dengan mematikan source PLN dan aktifkan switch genset',
        options: ['Dilakukan', 'Tidak Dilakukan', 'NA'],
      },
      {
        key: 'uji10_alarmNms',
        label: 'Cek kondisi alarm Log di NMS',
        options: ['Ada Alarm', 'Tidak Ada Alarm', 'NA'],
      },
      {
        key: 'uji10_anomali',
        label: 'Terdapat anomali atau kesalahan deteksi',
        options: ['Ada', 'Tidak Ada', 'NA'],
      },
    ],
  },
];

export const ExternalAlarmScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { formData, updateFormData } = useInspectionStore();

  const alarmData = {
    ...(formData.externalAlarm || {}),
    ...(formData.external_alarm || {}),
  };

  const [activeTab, setActiveTab] = useState<1 | 2>(1);
  const scrollViewRef = useRef<ScrollView>(null);

  const switchTab = (tab: 1 | 2) => {
    setActiveTab(tab);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Universal Modal Picker State
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

  const updateFields = (fields: Record<string, any>) => {
    updateFormData('external_alarm', { ...alarmData, ...fields });
  };

  const updateField = (key: string, value: any) => {
    updateFields({ [key]: value });
  };

  const openPicker = (
    title: string,
    options: string[],
    selectedValue: string,
    onSelect: (val: string) => void,
  ) => {
    setModalPicker({
      visible: true,
      title,
      options,
      selectedValue,
      onSelect,
    });
  };

  const renderDropdownSelect = (
    value: string,
    onSelect: (val: string) => void,
    options: string[],
    title: string,
  ) => {
    return (
      <TouchableOpacity
        style={styles.selectBox}
        onPress={() => openPicker(title, options, value, onSelect)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.selectText,
            !value && styles.selectTextPlaceholder,
            value === 'OK' && { color: Colors.success, fontWeight: '700' },
            value === 'NOK' && { color: Colors.danger, fontWeight: '700' },
            (value === 'N/A' || value === 'NA') && {
              color: Colors.warning,
              fontWeight: '700',
            },
          ]}
          numberOfLines={1}
        >
          {value || 'Pilih'}
        </Text>
        <ChevronDown color={Colors.textMuted} size={14} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="External Alarm"
        subtitle="Uji Sensor & Konfigurasi External Alarm"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.contentContainer}>
        {/* -----------------------------------------------------------------
          * NAVIGASI TAB: PEMBAGIAN UJI SENSOR TELEMETRI
          * - Tab 1: Sensor Utama 1 - 5 (Konfigurasi, PLN Off, Battery, Rectifier)
          * - Tab 2: Sensor Lingkungan 6 - 10 & Catatan (Temp, Smoke, Arrester, Door, Genset)
          * ----------------------------------------------------------------- */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 1 && styles.tabButtonActive]}
            onPress={() => switchTab(1)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 1 && styles.tabButtonTextActive,
              ]}
            >
              Uji Sensor 1-5
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 2 && styles.tabButtonActive]}
            onPress={() => switchTab(2)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 2 && styles.tabButtonTextActive,
              ]}
            >
              Uji Sensor 6-10
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ---------------------------------------------------------------
            * CARDS PENGUJIAN SENSOR SESUAI TAB AKTIF
            * Menampilkan daftar form uji sensor sesuai tab aktif.
            * Setiap kegiatan memiliki evaluasi status (OK/NOK/NA) & keterangan.
            * --------------------------------------------------------------- */}
          {ALARM_SECTIONS.filter(section =>
            activeTab === 1 ? section.id <= 5 : section.id > 5,
          ).map(section => {
            const overallStatus = alarmData[section.overallKey] || '';
            const keteranganVal =
              alarmData[`${section.keyPrefix}_keterangan`] || '';
            const isNa = overallStatus === 'NA' || overallStatus === 'N/A';

            return (
              <View key={section.id} style={styles.card}>
                {/* Item Utama (misal: 1. Uji Konfigurasi External Alarm) */}
                <View
                  style={[
                    styles.itemContainer,
                    isNa && { borderBottomWidth: 0, marginBottom: 0 },
                  ]}
                >
                  <View style={styles.itemRow}>
                    <View style={styles.labelContainer}>
                      <Text style={styles.sectionCode} numberOfLines={1}>
                        {section.id}.
                      </Text>
                      <Text style={styles.sectionTitleText}>
                        {section.title}
                      </Text>
                    </View>
                    <View style={styles.selectWrap}>
                      {renderDropdownSelect(
                        overallStatus,
                        val => updateField(section.overallKey, val),
                        ['OK', 'NOK', 'N/A'],
                        `${section.id}. ${section.title}`,
                      )}
                    </View>
                  </View>
                  <View style={styles.keteranganContainer}>
                    <TextInput
                      style={styles.inputBox}
                      placeholder="Keterangan..."
                      placeholderTextColor={Colors.textMuted}
                      value={keteranganVal}
                      onChangeText={txt =>
                        updateField(`${section.keyPrefix}_keterangan`, txt)
                      }
                    />
                  </View>
                </View>

                {/* Sub-kegiatan di bawahnya - disembunyikan jika uji dipilih N/A */}
                {!isNa &&
                  section.items.map((item, idx) => {
                    const val = alarmData[item.key] || '';
                    const itemKet = alarmData[`${item.key}_ket`] || '';
                    const subCode = `${section.id}.${idx + 1}`;

                    return (
                      <View key={item.key} style={styles.itemContainer}>
                        <View style={styles.itemRow}>
                          <View style={styles.labelContainer}>
                            <Text style={styles.subItemCode} numberOfLines={1}>
                              {subCode}
                            </Text>
                            <Text style={styles.subItemLabelText}>
                              {item.label}
                            </Text>
                          </View>
                          <View style={styles.selectWrap}>
                            {renderDropdownSelect(
                              val,
                              newVal => updateField(item.key, newVal),
                              item.options,
                              `${subCode} ${item.label}`,
                            )}
                          </View>
                        </View>

                        <View style={styles.keteranganContainer}>
                          <TextInput
                            style={styles.inputBox}
                            placeholder="Keterangan..."
                            placeholderTextColor={Colors.textMuted}
                            value={itemKet}
                            onChangeText={txt =>
                              updateField(`${item.key}_ket`, txt)
                            }
                          />
                        </View>
                      </View>
                    );
                  })}
              </View>
            );
          })}

          {/* ---------------------------------------------------------------
            * SEKSI CATATAN KHUSUS (HANYA TAB 2)
            * Tempat teknisi mencatat anomali atau rekomendasi terkait alarm.
            * --------------------------------------------------------------- */}
          {activeTab === 2 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Catatan</Text>
              <View style={styles.titleDivider} />
              <TextInput
                style={[
                  styles.inputBox,
                  { height: 100, textAlignVertical: 'top', paddingTop: 10 },
                ]}
                value={
                  alarmData.catatan !== undefined
                    ? alarmData.catatan
                    : alarmData.generalNote || alarmData.note || ''
                }
                onChangeText={val => {
                  updateFields({
                    generalNote: val,
                    catatan: val,
                    note: val,
                  });
                }}
                placeholder="Tambahkan catatan..."
                placeholderTextColor={Colors.textMuted}
                multiline
              />
            </View>
          )}

          {/* ---------------------------------------------------------------
            * NAVIGASI FOOTER (HYBRID CONTROLS)
            * - Tab 1: Tombol Selanjutnya -> Melompat ke Tab 2.
            * - Tab 2: Tombol Kembali -> Tab 1 & Tombol Simpan & Selesai.
            * --------------------------------------------------------------- */}
          <View style={styles.navContainer}>
            {activeTab === 1 ? (
              <TouchableOpacity
                style={styles.nextButton}
                onPress={() => switchTab(2)}
                activeOpacity={0.8}
              >
                <Text style={styles.nextButtonText}>Selanjutnya</Text>
                <ChevronRight color={Colors.white} size={16} />
              </TouchableOpacity>
            ) : (
              <View style={styles.dualButtonRow}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => switchTab(1)}
                  activeOpacity={0.8}
                >
                  <ChevronLeft color={Colors.textSecondary} size={16} />
                  <Text style={styles.backButtonText}>Kembali</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveButtonDual}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveButtonText}>Simpan & Kembali</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Dropdown Modal Picker Universal */}
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
  headerInfoBanner: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  subHeaderTitle: {
    ...Typography.subtitle1,
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subHeaderDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  subHeaderWrap: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  subHeader: {
    ...Typography.subtitle2,
    color: Colors.primaryLight || '#93C5FD',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  itemContainer: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  labelContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sectionCode: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.text,
    fontWeight: '700',
    width: 24,
  },
  sectionTitleText: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.text,
    fontWeight: '700',
    flex: 1,
    textAlign: 'justify',
  },
  subItemCode: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.text,
    fontWeight: '600',
    width: 34,
  },
  subItemLabelText: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
    textAlign: 'justify',
  },
  itemLabel: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    textAlign: 'justify',
  },
  selectWrap: {
    width: 135,
  },
  selectBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: Colors.background,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    ...Typography.body,
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 4,
  },
  selectTextPlaceholder: {
    color: Colors.textMuted,
    fontWeight: 'normal',
  },
  keteranganContainer: {
    marginTop: 6,
  },
  inputLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontWeight: 'bold',
    marginBottom: 4,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  inputBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    color: Colors.text,
    height: 40,
    ...Typography.body,
    fontSize: 13,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 4,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
    ...Shadow.sm,
  },
  tabButtonText: {
    ...Typography.subtitle2,
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  navContainer: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 44,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...Shadow.sm,
  },
  nextButtonText: {
    ...Typography.button,
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  dualButtonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  backButton: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  backButtonText: {
    ...Typography.button,
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  saveButtonDual: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
    ...Shadow.sm,
  },
  saveButtonText: {
    ...Typography.button,
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});
