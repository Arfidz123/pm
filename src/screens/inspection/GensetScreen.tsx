/**
 * Genset Screen
 * Form Inspeksi Catuan Eksternal, Data Genset, ATS, Pemipaan & Bahan Bakar,
 * Visual Check Panel Genset, Pengukuran Output Generator, Item, Pengetesan, dan Kebersihan.
 */

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
import { ChevronDown } from 'lucide-react-native';

import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import { Header, DropdownModalPicker } from '../../components/common';
import { useInspectionStore } from '../../store/inspectionStore';
import type { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ATS_TYPE_OPTIONS = ['AMF', 'CDC', 'AMF/CDC'];
const ATS_CONTROLLER_OPTIONS = [
  'ASCO',
  'Deepsea',
  'Lovato',
  'Relay',
  'Siemens',
  'Woodward',
  'Other',
];
const ATS_COS_OPTIONS = [
  'ASCO',
  'Kontaktor',
  'Kyoritsu',
  'MCCB',
  'Socomec',
  'Takada',
  'Other',
];

export const GensetScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { formData, updateFormData } = useInspectionStore();

  const gs = formData.genset || {};

  const defaultForm = {
    // 1. Catuan Eksternal (Genset)
    gensetAda: gs.gensetAda ?? '',
    snGenset: gs.snGenset ?? '',
    generatorMerk: gs.generatorMerk ?? '',
    kapasitasGenset: gs.kapasitasGenset ?? '',
    phasaGenset: gs.phasaGenset ?? '',

    // 2. Data Genset
    merkGenset: gs.merkGenset ?? '',
    tipeGenset: gs.tipeGenset ?? '',
    engineMerk: gs.engineMerk ?? gs.engineMark ?? '',

    // Type Powerhouse
    runningHourLastMonth: gs.runningHourLastMonth ?? '',
    runningHourCurrentMonth: gs.runningHourCurrentMonth ?? '',
    durasiPengecekanLalu_Sekarang: gs.durasiPengecekanLalu_Sekarang ?? '',
    gensetModel: gs.gensetModel ?? '',
    gensetType: gs.gensetType ?? '',

    // 3. ATS
    atsType: gs.atsType ?? '',
    atsController: gs.atsController ?? '',
    atsCos: gs.atsCos ?? gs.cosGenset ?? '',

    // 4. Pemipaan & Bahan Bakar
    tangkiUtama: gs.tangkiUtama ?? '',
    tangkiUtamaKet: gs.tangkiUtamaKet ?? '',
    tangkiEksternal: gs.tangkiEksternal ?? '',
    tangkiEksternalKet: gs.tangkiEksternalKet ?? '',
    pipaSolar: gs.pipaSolar ?? '',
    pipaSolarKet: gs.pipaSolarKet ?? '',
    valveGateFuelSys: gs.valveGateFuelSys ?? '',
    valveGateFuelSysKet: gs.valveGateFuelSysKet ?? '',
    pompaSolar: gs.pompaSolar ?? '',
    testPompaKondisiAuto: gs.testPompaKondisiAuto ?? '',
    testPompaKondisiAutoKet: gs.testPompaKondisiAutoKet ?? '',
    testPompaKondisiManual: gs.testPompaKondisiManual ?? '',
    testPompaKondisiManualKet: gs.testPompaKondisiManualKet ?? '',
    panelPompaSolar: gs.panelPompaSolar ?? '',
    panelPompaSolarKet: gs.panelPompaSolarKet ?? '',
    pelampungPompaSolar: gs.pelampungPompaSolar ?? '',
    pelampungPompaSolarKet: gs.pelampungPompaSolarKet ?? '',
    kapasitasTangkiUtama: gs.kapasitasTangkiUtama ?? '',
    sisaBbmPengecekanBulanLalu: gs.sisaBbmPengecekkanBulanLalu ?? '',
    sisaBbmPengecekanBulanSekarang: gs.sisaBbmPengecekkanBulanSekarang ?? '',
    pengisianBbm: gs.pengisianBbm ?? '',
    levelIndikatorTangkiBensin: gs.levelIndikatorTangkiBensin ?? '',
    kapasitasTangkiEksternal: gs.kapasitasTangkiEksternal ?? '',

    // 5. Visual Check Panel Genset (Kondisi Fisik)
    vcRelay: gs.vcRelay ?? '',
    vcRelayKet: gs.vcRelayKet ?? '',
    vcWiringDiagram: gs.vcWiringDiagram ?? '',
    vcWiringDiagramKet: gs.vcWiringDiagramKet ?? '',
    vcKabel: gs.vcKabel ?? '',
    vcKabelKet: gs.vcKabelKet ?? '',
    vcCos: gs.vcCos ?? '',
    vcCosKet: gs.vcCosKet ?? '',
    vcNcb: gs.vcNcb ?? '',
    vcNcbKet: gs.vcNcbKet ?? '',
    vcLampuIndikator: gs.vcLampuIndikator ?? '',
    vcLampuIndikatorKet: gs.vcLampuIndikatorKet ?? '',
    vcFuse: gs.vcFuse ?? '',
    vcFuseKet: gs.vcFuseKet ?? '',
    vcTerminalPower: gs.vcTerminalPower ?? '',
    vcTerminalPowerKet: gs.vcTerminalPowerKet ?? '',
    vcAmperMeter: gs.vcAAmperMeter ?? '',
    vcAmperMeterKet: gs.vcAmperMeterKet ?? '',
    vcVoltMeter: gs.vcVoltMeter ?? '',
    vcVoltMeterKet: gs.vcVoltMeterKet ?? '',
    vcCossӨMeter: gs.vcCossӨMeter ?? '',
    vcCossӨMeterKet: gs.vcCossӨMeterKet ?? '',
    vcBatteryChargePanel: gs.vcBatteryChargePanel ?? '',
    vcBatteryChargePanelKet: gs.vcBatteryChargePanelKet ?? '',
    vcTimer: gs.vcTimer ?? '',
    vcTimerKet: gs.vcTimerKet ?? '',

    // 6. Pengukuran: Tegangan Output Generator (Mandiri, tidak mengikuti halaman lain)
    teganganR_N: gs.teganganR_N ?? '',
    teganganS_N: gs.teganganS_N ?? '',
    teganganT_N: gs.teganganT_N ?? '',
    teganganG_N: gs.teganganG_N ?? '',
    teganganR_G: gs.teganganR_G ?? '',
    teganganS_G: gs.teganganS_G ?? '',
    teganganT_G: gs.teganganT_G ?? '',

    // 6. Pengukuran: Arus Output Generator (Mandiri, tidak mengikuti halaman lain)
    arusPhasaR: gs.arusPhasaR ?? '',
    arusPhasaS: gs.arusPhasaS ?? '',
    arusPhasaT: gs.arusPhasaT ?? '',
    arusR_S: gs.arusR_S ?? gs.teganganR_S ?? '',
    arusR_T: gs.arusR_T ?? gs.teganganR_T ?? '',
    arusS_T: gs.arusS_T ?? gs.teganganS_T ?? '',
    frekuensi: gs.frekuensi ?? '',
    rekomendasiGenset: gs.rekomendasiGenset ?? gs.rekomendasi ?? '',

    // 7. Item
    itemCoolantLevel: gs.itemCoolantLevel ?? '',
    itemCoolantLevelKet: gs.itemCoolantLevelKet ?? '',
    itemFuelSupply: gs.itemFuelSupply ?? '',
    itemFuelSupplyKet: gs.itemFuelSupplyKet ?? '',
    itemEngineOil: gs.itemEngineOil ?? '',
    itemEngineOilKet: gs.itemEngineOilKet ?? '',
    itemOliGanti: gs.itemOliGanti ?? '',
    itemOliGantiKet: gs.itemOliGantiKet ?? '',
    itemAirCleaner: gs.itemAirCleaner ?? '',
    itemAirCleanerKet: gs.itemAirCleanerKet ?? '',
    itemDrainaseFuelTank: gs.itemDrainaseFuelTank ?? '',
    itemDrainaseFuelTankKet: gs.itemDrainaseFuelTankKet ?? '',
    itemFanBelt: gs.itemFanBelt ?? '',
    itemFanBeltKet: gs.itemFanBeltKet ?? '',
    itemSosBottle: gs.itemSosBottle ?? '',
    itemSosBottleKet: gs.itemSosBottleKet ?? '',
    itemFuelInjectionNozzel: gs.itemFuelInjectionNozzel ?? '',
    itemFuelInjectionNozzelKet: gs.itemFuelInjectionNozzelKet ?? '',
    itemInhibitor: gs.itemInhibitor ?? '',
    itemInhibitorKet: gs.itemInhibitorKet ?? '',
    itemKekencanganBaut: gs.itemKekencanganBaut ?? '',
    itemKekencanganBautKet: gs.itemKekencanganBautKet ?? '',
    itemKabelAccuConnector: gs.itemKabelAccuConnector ?? '',
    itemKabelAccuConnectorKet: gs.itemKabelAccuConnectorKet ?? '',
    itemMuflerGensetKnalpot: gs.itemMuflerGensetKnalpot ?? '',
    itemMuflerGensetKnalpotKet: gs.itemMuflerGensetKnalpotKet ?? '',
    itemBatteryStarter: gs.itemBatteryStarter ?? '',
    itemBatteryStarterKet: gs.itemBatteryStarterKet ?? '',
    itemAirAccu: gs.itemAirAccu ?? '',
    itemAirAccuKet: gs.itemAirAccuKet ?? '',
    itemAccuVoltage: gs.itemAccuVoltage ?? '',
    itemAccuVoltageKet: gs.itemAccuVoltageKet ?? '',
    itemArrester: gs.itemArrester ?? '',
    itemArresterKet: gs.itemArresterKet ?? '',

    // 8. Pengetesan
    testManualAts: gs.testManualAts ?? '',
    testManualAtsKet: gs.testManualAtsKet ?? '',
    testManualGenset: gs.testManualGenset ?? '',
    testManualGensetKet: gs.testManualGensetKet ?? '',
    testManualBebanAts: gs.testManualBebanAts ?? '',
    testManualBebanAtsKet: gs.testManualBebanAtsKet ?? '',
    testManualBebanCos: gs.testManualBebanCos ?? '',
    testManualBebanCosKet: gs.testManualBebanCosKet ?? '',
    testEmergencyStop: gs.testEmergencyStop ?? '',
    testEmergencyStopKet: gs.testEmergencyStopKet ?? '',
    testStopManualAts: gs.testStopManualAts ?? '',
    testStopManualAtsKet: gs.testStopManualAtsKet ?? '',
    testStopManualGenset: gs.testStopManualGenset ?? '',
    testStopManualGensetKet: gs.testStopManualGensetKet ?? '',
    testManualPencatuanBeban: gs.testManualPencatuanBeban ?? '',
    testManualPencatuanBebanKet: gs.testManualPencatuanBebanKet ?? '',

    testAutoPanelAts: gs.testAutoPanelAts ?? '',
    testAutoPanelAtsKet: gs.testAutoPanelAtsKet ?? '',
    testAutoPlnOffKontraktorPln: gs.testAutoPlnOffKontraktorPln ?? '',
    testAutoPlnOffKontraktorPlnKet: gs.testAutoPlnOffKontraktorPlnKet ?? '',
    testAutoPlnOffKontraktorGenset: gs.testAutoPlnOffKontraktorGenset ?? '',
    testAutoPlnOffKontraktorGensetKet:
      gs.testAutoPlnOffKontraktorGensetKet ?? '',
    testAutoPlnOffPencatuanBeban: gs.testAutoPlnOffPencatuanBeban ?? '',
    testAutoPlnOffPencatuanBebanKet: gs.testAutoPlnOffPencatuanBebanKet ?? '',

    testAutoStopKontraktorPln: gs.testAutoStopKontraktorPln ?? '',
    testAutoStopKontraktorPlnKet: gs.testAutoStopKontraktorPlnKet ?? '',
    testAutoStopKontraktorGenset: gs.testAutoStopKontraktorGenset ?? '',
    testAutoStopKontraktorGensetKet: gs.testAutoStopKontraktorGensetKet ?? '',

    // 9. Kebersihan
    kebersihanMesin: gs.kebersihanMesin ?? '',
    kebersihanMesinKet: gs.kebersihanMesinKet ?? '',
    kebersihanPanel: gs.kebersihanPanel ?? '',
    kebersihanPanelKet: gs.kebersihanPanelKet ?? '',
    kondisiBangunanGenset: gs.kondisiBangunanGenset ?? '',
    kondisiBangunanGensetKet: gs.kondisiBangunanGensetKet ?? '',
    kebersihanRuanganGenset: gs.kebersihanRuanganGenset ?? '',
    kebersihanRuanganGensetKet: gs.kebersihanRuanganGensetKet ?? '',
    pintuRuanganGenset: gs.pintuRuanganGenset ?? '',
    pintuRuanganGensetKet: gs.pintuRuanganGensetKet ?? '',
    peneranganRuanganGenset: gs.peneranganRuanganGenset ?? '',
    peneranganRuanganGensetKet: gs.peneranganRuanganGensetKet ?? '',
    fanGenset: gs.fanGenset ?? '',
    fanGensetKet: gs.fanGensetKet ?? '',
    airflowGenset: gs.airflowGenset ?? '',
    airflowGensetKet: gs.airflowGensetKet ?? '',
    doubleWallGenset: gs.doubleWallGenset ?? '',
    doubleWallGensetKet: gs.doubleWallGensetKet ?? '',

    catatanGenset: gs.catatanGenset ?? gs.catatan ?? '',
  };

  const [form, setForm] = useState(defaultForm);

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

  const updateForm = (key: string, value: any) => {
    let extraUpdates: any = { [key]: value };

    if (key === 'gensetAda' && value === 'Tidak Ada') {
      extraUpdates = {
        gensetAda: 'Tidak Ada',
        snGenset: '',
        generatorMerk: '',
        kapasitasGenset: '',
        phasaGenset: '',
        merkGenset: '',
        tipeGenset: '',
        engineMerk: '',
        atsType: '',
        atsController: '',
        atsCos: '',
        cosGenset: '',
        tangkiUtama: '',
        tangkiUtamaKet: '',
        tangkiEksternal: '',
        tangkiEksternalKet: '',
        pipaSolar: '',
        pipaSolarKet: '',
        valveGateFuelSys: '',
        valveGateFuelSysKet: '',
        pompaSolar: '',
        testPompaKondisiAuto: '',
        testPompaKondisiAutoKet: '',
        testPompaKondisiManual: '',
        testPompaKondisiManualKet: '',
        panelPompaSolar: '',
        panelPompaSolarKet: '',
        pelampungPompaSolar: '',
        pelampungPompaSolarKet: '',
        kapasitasTangkiUtama: '',
        sisaBbmPengecekanBulanLalu: '',
        sisaBbmPengecekanBulanSekarang: '',
        durasiPengecekanLalu_Sekarang: '',
        runningHourLastMonth: '',
        runningHourCurrentMonth: '',
        gensetModel: '',
        gensetType: '',
        pengisianBbm: '',
        levelIndikatorTangkiBensin: '',
        kapasitasTangkiEksternal: '',
        vcRelay: '',
        vcRelayKet: '',
        vcWiringDiagram: '',
        vcWiringDiagramKet: '',
        vcKabel: '',
        vcKabelKet: '',
        vcCos: '',
        vcCosKet: '',
        vcNcb: '',
        vcNcbKet: '',
        vcLampuIndikator: '',
        vcLampuIndikatorKet: '',
        vcFuse: '',
        vcFuseKet: '',
        vcTerminalPower: '',
        vcTerminalPowerKet: '',
        vcAmperMeter: '',
        vcAmperMeterKet: '',
        vcVoltMeter: '',
        vcVoltMeterKet: '',
        vcCossӨMeter: '',
        vcCossӨMeterKet: '',
        vcBatteryChargePanel: '',
        vcBatteryChargePanelKet: '',
        vcTimer: '',
        vcTimerKet: '',
        teganganR_N: '',
        teganganS_N: '',
        teganganT_N: '',
        teganganG_N: '',
        teganganR_G: '',
        teganganS_G: '',
        teganganT_G: '',
        arusPhasaR: '',
        arusPhasaS: '',
        arusPhasaT: '',
        arusR_S: '',
        arusR_T: '',
        arusS_T: '',
        frekuensi: '',
        rekomendasiGenset: '',
        itemCoolantLevel: '',
        itemCoolantLevelKet: '',
        itemFuelSupply: '',
        itemFuelSupplyKet: '',
        itemEngineOil: '',
        itemEngineOilKet: '',
        itemOliGanti: '',
        itemOliGantiKet: '',
        itemAirCleaner: '',
        itemAirCleanerKet: '',
        itemDrainaseFuelTank: '',
        itemDrainaseFuelTankKet: '',
        itemFanBelt: '',
        itemFanBeltKet: '',
        itemSosBottle: '',
        itemSosBottleKet: '',
        itemFuelInjectionNozzel: '',
        itemFuelInjectionNozzelKet: '',
        itemInhibitor: '',
        itemInhibitorKet: '',
        itemKekencanganBaut: '',
        itemKekencanganBautKet: '',
        itemKabelAccuConnector: '',
        itemKabelAccuConnectorKet: '',
        itemMuflerGensetKnalpot: '',
        itemMuflerGensetKnalpotKet: '',
        itemBatteryStarter: '',
        itemBatteryStarterKet: '',
        itemAirAccu: '',
        itemAirAccuKet: '',
        itemAccuVoltage: '',
        itemAccuVoltageKet: '',
        itemArrester: '',
        itemArresterKet: '',
        testManualAts: '',
        testManualAtsKet: '',
        testManualGenset: '',
        testManualGensetKet: '',
        testManualBebanAts: '',
        testManualBebanAtsKet: '',
        testManualBebanCos: '',
        testManualBebanCosKet: '',
        testEmergencyStop: '',
        testEmergencyStopKet: '',
        testStopManualAts: '',
        testStopManualAtsKet: '',
        testStopManualGenset: '',
        testStopManualGensetKet: '',
        testManualPencatuanBeban: '',
        testManualPencatuanBebanKet: '',
        testAutoPanelAts: '',
        testAutoPanelAtsKet: '',
        testAutoPlnOffKontraktorPln: '',
        testAutoPlnOffKontraktorPlnKet: '',
        testAutoPlnOffKontraktorGenset: '',
        testAutoPlnOffKontraktorGensetKet: '',
        testAutoPlnOffPencatuanBeban: '',
        testAutoPlnOffPencatuanBebanKet: '',
        testAutoStopKontraktorPln: '',
        testAutoStopKontraktorPlnKet: '',
        testAutoStopKontraktorGenset: '',
        testAutoStopKontraktorGensetKet: '',
        kebersihanMesin: '',
        kebersihanMesinKet: '',
        kebersihanPanel: '',
        kebersihanPanelKet: '',
        kondisiBangunanGenset: '',
        kondisiBangunanGensetKet: '',
        kebersihanRuanganGenset: '',
        kebersihanRuanganGensetKet: '',
        pintuRuanganGenset: '',
        pintuRuanganGensetKet: '',
        peneranganRuanganGenset: '',
        peneranganRuanganGensetKet: '',
        fanGenset: '',
        fanGensetKet: '',
        airflowGenset: '',
        airflowGensetKet: '',
        doubleWallGenset: '',
        doubleWallGensetKet: '',
        catatanGenset: '',
      };
    }

    if (key === 'atsCos') {
      extraUpdates.cosGenset = value;
    }

    if (key === 'arusR_S') {
      extraUpdates.teganganR_S = value;
    } else if (key === 'arusR_T') {
      extraUpdates.teganganR_T = value;
    } else if (key === 'arusS_T') {
      extraUpdates.teganganS_T = value;
    }

    setForm(prev => {
      const updated = { ...prev, ...extraUpdates };
      updateFormData('genset', updated);
      return updated;
    });
  };

  const renderDropdownSelect = (
    key: string,
    value: string,
    onSelect: (val: string) => void,
    options: string[] = ['1', '3'],
    prefix?: string,
    title?: string,
  ) => {
    const displayText = value
      ? prefix
        ? `${prefix}${value}`
        : value
      : 'Pilih';
    const modalTitle =
      title ||
      (key.includes('phasa')
        ? 'Pilih Phasa'
        : key.includes('genset')
          ? 'Pilih Ketersediaan Genset'
          : 'Pilih Opsi');

    return (
      <TouchableOpacity
        style={styles.selectBox}
        onPress={() => {
          setModalPicker({
            visible: true,
            title: modalTitle,
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
            (value === 'OK' || value === 'Bersih' || value === 'Baik') && {
              color: Colors.success,
              fontWeight: '700',
            },
            (value === 'NOK' || value === 'Kotor' || value === 'Rusak') && {
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
    ketKey: string,
    options: string[] = ['OK', 'NOK', 'N/A'],
    dropdownWidth: number = 135,
  ) => {
    return (
      <View style={[styles.row, { marginBottom: Spacing.sm }]}>
        <View style={{ width: dropdownWidth }}>
          <Text style={styles.inputLabel} numberOfLines={1}>
            {label}
          </Text>
          {renderDropdownSelect(
            key,
            form[key as keyof typeof form] || '',
            val => updateForm(key, val),
            options,
            undefined,
            `Pilih ${label}`,
          )}
        </View>

        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TextInput
            style={styles.textInput}
            value={form[ketKey as keyof typeof form] || ''}
            onChangeText={val => updateForm(ketKey, val)}
            placeholder="Keterangan..."
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      </View>
    );
  };

  const renderMeasurementRow = (
    label: string,
    key: string,
    placeholder: string = '—',
    isNumeric: boolean = true,
    unit?: string,
  ) => {
    return (
      <View style={styles.measurementRow}>
        <Text style={styles.measurementLabel}>{label}</Text>
        <View style={styles.measurementInputWrapper}>
          <View style={styles.measurementInputContainer}>
            <TextInput
              style={styles.measurementInput}
              keyboardType={isNumeric ? 'numeric' : 'default'}
              value={form[key as keyof typeof form] || ''}
              onChangeText={val => updateForm(key, val)}
              placeholder={placeholder}
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          {unit ? <Text style={styles.measurementUnitText}>{unit}</Text> : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Genset"
        subtitle="Catuan Eksternal & Generator"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Card 1: Catuan Eksternal */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Catuan Eksternal</Text>
            </View>
          </View>
          <View style={styles.titleDivider} />

          <View style={styles.cardBody}>
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.inputLabel}>Genset</Text>
                {renderDropdownSelect(
                  'gensetAda',
                  form.gensetAda || '',
                  val => updateForm('gensetAda', val),
                  ['Ada', 'Tidak Ada'],
                )}
              </View>
              <View style={styles.col} />
            </View>

            {form.gensetAda === 'Ada' && (
              <>
                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Serial Number</Text>
                    <TextInput
                      style={styles.textInput}
                      value={form.snGenset}
                      onChangeText={val => updateForm('snGenset', val)}
                      placeholder="—"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Generator Merk</Text>
                    <TextInput
                      style={styles.textInput}
                      value={form.generatorMerk}
                      onChangeText={val => updateForm('generatorMerk', val)}
                      placeholder="—"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Kapasitas</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="numeric"
                      value={form.kapasitasGenset}
                      onChangeText={val => updateForm('kapasitasGenset', val)}
                      placeholder="—"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.inputLabel}>Phasa</Text>
                    {renderDropdownSelect(
                      'phasaGenset',
                      (form.phasaGenset || '').replace(/phasa\s*/gi, '').trim(),
                      val => updateForm('phasaGenset', val),
                      ['1', '3'],
                    )}
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Card 2: Data Genset */}
        {form.gensetAda === 'Ada' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Data Genset</Text>
              </View>
            </View>
            <View style={styles.titleDivider} />

            <View style={styles.cardBody}>
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Genset Merk</Text>
                  <TextInput
                    style={styles.textInput}
                    value={form.merkGenset}
                    onChangeText={val => updateForm('merkGenset', val)}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Genset Type</Text>
                  <TextInput
                    style={styles.textInput}
                    value={form.tipeGenset}
                    onChangeText={val => updateForm('tipeGenset', val)}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Engine Mark</Text>
                  <TextInput
                    style={styles.textInput}
                    value={form.engineMerk}
                    onChangeText={val => updateForm('engineMerk', val)}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.col} />
              </View>
            </View>
          </View>
        )}

        {/* Card: Type Powerhouse */}
        {form.gensetAda === 'Ada' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Type Powerhouse</Text>
              </View>
            </View>
            <View style={styles.titleDivider} />

            <View style={styles.cardBody}>
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Genset model</Text>
                  {renderDropdownSelect(
                    'gensetModel',
                    form.gensetModel,
                    val => updateForm('gensetModel', val),
                    ['Fixed', 'Mobile'],
                    undefined,
                    'Pilih Model Genset',
                  )}
                </View>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Genset Type</Text>
                  {renderDropdownSelect(
                    'gensetType',
                    form.gensetType,
                    val => updateForm('gensetType', val),
                    ['Silent', 'Open'],
                    undefined,
                    'Pilih Tipe Genset',
                  )}
                </View>
              </View>
              {renderMeasurementRow(
                'Running Hour Check (Last Month)',
                'runningHourLastMonth',
                '—',
                true,
              )}
              {renderMeasurementRow(
                'Running Hour Check (Current Month)',
                'runningHourCurrentMonth',
                '—',
                true,
              )}
              {renderMeasurementRow(
                'Durasi pengecekan lalu - sekarang',
                'durasiPengecekanLalu_Sekarang',
                '—',
                true,
              )}
            </View>
          </View>
        )}

        {/* Card 3: ATS */}
        {form.gensetAda === 'Ada' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>ATS</Text>
              </View>
            </View>
            <View style={styles.titleDivider} />

            <View style={styles.cardBody}>
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Type</Text>
                  {renderDropdownSelect(
                    'atsType',
                    form.atsType,
                    val => updateForm('atsType', val),
                    ATS_TYPE_OPTIONS,
                    undefined,
                    'Pilih Type ATS',
                  )}
                </View>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Controller</Text>
                  {renderDropdownSelect(
                    'atsController',
                    form.atsController,
                    val => updateForm('atsController', val),
                    ATS_CONTROLLER_OPTIONS,
                    undefined,
                    'Pilih Controller ATS',
                  )}
                  {(form.atsController === 'Other' ||
                    (Boolean(form.atsController) &&
                      !ATS_CONTROLLER_OPTIONS.some(
                        opt =>
                          opt.toLowerCase() ===
                          form.atsController.toLowerCase(),
                      ))) && (
                      <TextInput
                        style={[styles.textInput, { marginTop: Spacing.xs }]}
                        value={
                          form.atsController === 'Other' ? '' : form.atsController
                        }
                        onChangeText={val =>
                          updateForm('atsController', val || 'Other')
                        }
                        placeholder="Sebutkan controller..."
                        placeholderTextColor={Colors.textMuted}
                      />
                    )}
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>COS</Text>
                  {renderDropdownSelect(
                    'atsCos',
                    form.atsCos,
                    val => updateForm('atsCos', val),
                    ATS_COS_OPTIONS,
                    undefined,
                    'Pilih COS ATS',
                  )}
                  {(form.atsCos === 'Other' ||
                    (Boolean(form.atsCos) &&
                      !ATS_COS_OPTIONS.some(
                        opt =>
                          opt.toLowerCase() === form.atsCos.toLowerCase(),
                      ))) && (
                      <TextInput
                        style={[styles.textInput, { marginTop: Spacing.xs }]}
                        value={form.atsCos === 'Other' ? '' : form.atsCos}
                        onChangeText={val => updateForm('atsCos', val || 'Other')}
                        placeholder="Sebutkan COS..."
                        placeholderTextColor={Colors.textMuted}
                      />
                    )}
                </View>
                <View style={styles.col} />
              </View>
            </View>
          </View>
        )}

        {/* Card 4: Pemipaan & Bahan Bakar */}
        {form.gensetAda === 'Ada' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Pemipaan & Bahan Bakar</Text>
              </View>
            </View>
            <View style={styles.titleDivider} />

            <View style={styles.cardBody}>
              {renderCheckRow(
                'Tangki Utama',
                'tangkiUtama',
                'tangkiUtamaKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Tangki Eksternal',
                'tangkiEksternal',
                'tangkiEksternalKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Pipa Solar',
                'pipaSolar',
                'pipaSolarKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Valve Gate Fuel Sys',
                'valveGateFuelSys',
                'valveGateFuelSysKet',
                undefined,
                165,
              )}
              <View style={styles.subHeadingContainer}>
                <Text style={styles.subHeading}>Pompa Solar</Text>
              </View>
              {renderCheckRow(
                'Test Pompa Kondisi Auto',
                'testPompaKondisiAuto',
                'testPompaKondisiAutoKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Test Pompa Kondisi Manual',
                'testPompaKondisiManual',
                'testPompaKondisiManualKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Panel Pompa Solar',
                'panelPompaSolar',
                'panelPompaSolarKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Pelampung Pompa Solar',
                'pelampungPompaSolar',
                'pelampungPompaSolarKet',
                undefined,
                165,
              )}

              {renderMeasurementRow(
                'Kapasitas Tangki Utama',
                'kapasitasTangkiUtama',
              )}
              {renderMeasurementRow(
                'Sisa BBM Pengecekan Bulan Lalu',
                'sisaBbmPengecekanBulanLalu',
              )}
              {renderMeasurementRow(
                'Sisa BBM Pengecekan Bulan Sekarang',
                'sisaBbmPengecekanBulanSekarang',
              )}
              {renderMeasurementRow('Pengisian BBM', 'pengisianBbm')}
              {renderMeasurementRow(
                'Level Indikator Tangki Bensin',
                'levelIndikatorTangkiBensin',
              )}
              {renderMeasurementRow(
                'Kapasitas Tangki Eksternal',
                'kapasitasTangkiEksternal',
              )}
            </View>
          </View>
        )}

        {/* Card 5: Visual Check Panel Genset (Kondisi Fisik) */}
        {form.gensetAda === 'Ada' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>
                  Visual Check Panel Genset (Kondisi Fisik)
                </Text>
              </View>
            </View>
            <View style={styles.titleDivider} />

            <View style={styles.cardBody}>
              {renderCheckRow('Relay', 'vcRelay', 'vcRelayKet')}
              {renderCheckRow(
                'Wiring Diagram',
                'vcWiringDiagram',
                'vcWiringDiagramKet',
              )}
              {renderCheckRow('Kabel', 'vcKabel', 'vcKabelKet')}
              {renderCheckRow('COS', 'vcCos', 'vcCosKet')}
              {renderCheckRow('NCB', 'vcNcb', 'vcNcbKet')}
              {renderCheckRow(
                'Lampu Indikator',
                'vcLampuIndikator',
                'vcLampuIndikatorKet',
              )}
              {renderCheckRow('Fuse', 'vcFuse', 'vcFuseKet')}
              {renderCheckRow(
                'Terminal Power',
                'vcTerminalPower',
                'vcTerminalPowerKet',
              )}
              {renderCheckRow('Amper meter', 'vcAmperMeter', 'vcAmperMeterKet')}
              {renderCheckRow('Volt Meter', 'vcVoltMeter', 'vcVoltMeterKet')}
              {renderCheckRow(
                'Coss θ Meter',
                'vcCossӨMeter',
                'vcCossӨMeterKet',
              )}
              {renderCheckRow(
                'Battery charge panel',
                'vcBatteryChargePanel',
                'vcBatteryChargePanelKet',
              )}
              {renderCheckRow('Timer (hour counter)', 'vcTimer', 'vcTimerKet')}
            </View>
          </View>
        )}

        {/* Card 6: Pengukuran Output Generator */}
        {form.gensetAda === 'Ada' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Pengukuran</Text>
              </View>
            </View>
            <View style={styles.titleDivider} />

            <View style={styles.cardBody}>
              <View
                style={[
                  styles.subHeadingContainer,
                  { borderTopWidth: 0, paddingTop: 0, marginTop: 0 },
                ]}
              >
                <Text style={styles.subHeading}>
                  Pengukuran Tegangan Output Generator
                </Text>
              </View>

              {/* Row 1: R-N & R-G */}
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Phasa R-N</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={form.teganganR_N}
                    onChangeText={val => updateForm('teganganR_N', val)}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Phasa R-G</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={form.teganganR_G}
                    onChangeText={val => updateForm('teganganR_G', val)}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              {/* Row 2: S-N & S-G */}
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Phasa S-N</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={form.teganganS_N}
                    onChangeText={val => updateForm('teganganS_N', val)}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Phasa S-G</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={form.teganganS_G}
                    onChangeText={val => updateForm('teganganS_G', val)}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              {/* Row 3: T-N & T-G */}
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Phasa T-N</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={form.teganganT_N}
                    onChangeText={val => updateForm('teganganT_N', val)}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Phasa T-G</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={form.teganganT_G}
                    onChangeText={val => updateForm('teganganT_G', val)}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              {/* Row 4: G-N & Kosong */}
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Phasa G-N</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={form.teganganG_N}
                    onChangeText={val => updateForm('teganganG_N', val)}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.col} />
              </View>

              <View
                style={[styles.subHeadingContainer, { marginTop: Spacing.md }]}
              >
                <Text style={styles.subHeading}>
                  Pengukuran Arus Output Generator
                </Text>
              </View>

              {/* Row 1: Phasa R & Phasa R-S */}
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Phasa R</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={form.arusPhasaR}
                    onChangeText={val => updateForm('arusPhasaR', val)}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Phasa R-S</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={form.arusR_S}
                    onChangeText={val => updateForm('arusR_S', val)}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              {/* Row 2: Phasa S & Phasa R-T */}
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Phasa S</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={form.arusPhasaS}
                    onChangeText={val => updateForm('arusPhasaS', val)}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Phasa R-T</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={form.arusR_T}
                    onChangeText={val => updateForm('arusR_T', val)}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              {/* Row 3: Phasa T & Phasa S-T */}
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Phasa T</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={form.arusPhasaT}
                    onChangeText={val => updateForm('arusPhasaT', val)}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Phasa S-T</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={form.arusS_T}
                    onChangeText={val => updateForm('arusS_T', val)}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              {/* Row 4: Frekuensi & Kosong */}
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.inputLabel}>Frekuensi</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={form.frekuensi}
                    onChangeText={val => updateForm('frekuensi', val)}
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={styles.col} />
              </View>

              <View
                style={[styles.subHeadingContainer, { marginTop: Spacing.md }]}
              >
                <Text style={styles.subHeading}>Rekomendasi</Text>
              </View>
              <TextInput
                style={[
                  styles.textInput,
                  { height: 90, textAlignVertical: 'top' },
                ]}
                multiline
                numberOfLines={3}
                value={form.rekomendasiGenset}
                onChangeText={val => updateForm('rekomendasiGenset', val)}
                placeholder="Tambahkan rekomendasi..."
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>
        )}

        {/* Card 7: Item */}
        {form.gensetAda === 'Ada' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Item</Text>
              </View>
            </View>
            <View style={styles.titleDivider} />

            <View style={styles.cardBody}>
              {renderCheckRow(
                'Coolent Level',
                'itemCoolantLevel',
                'itemCoolantLevelKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Fuel Supply & level',
                'itemFuelSupply',
                'itemFuelSupplyKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Engine Oil',
                'itemEngineOil',
                'itemEngineOilKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Penambahan/Penggantian Oli',
                'itemOliGanti',
                'itemOliGantiKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Air Cleaner',
                'itemAirCleaner',
                'itemAirCleanerKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Drainase Fuel Tank',
                'itemDrainaseFuelTank',
                'itemDrainaseFuelTankKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Fan Belt',
                'itemFanBelt',
                'itemFanBeltKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'SOS Bottle',
                'itemSosBottle',
                'itemSosBottleKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Fuel Injection Nozzel',
                'itemFuelInjectionNozzel',
                'itemFuelInjectionNozzelKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Inhibitor',
                'itemInhibitor',
                'itemInhibitorKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Kekencangan Baut',
                'itemKekencanganBaut',
                'itemKekencanganBautKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Kabel Accu & Connector',
                'itemKabelAccuConnector',
                'itemKabelAccuConnectorKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Mufler Genset Knalpot',
                'itemMuflerGensetKnalpot',
                'itemMuflerGensetKnalpotKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Battery Starter',
                'itemBatteryStarter',
                'itemBatteryStarterKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Air Accu',
                'itemAirAccu',
                'itemAirAccuKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Accu Voltage',
                'itemAccuVoltage',
                'itemAccuVoltageKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Arrester',
                'itemArrester',
                'itemArresterKet',
                undefined,
                165,
              )}
            </View>
          </View>
        )}

        {/* Card 8: Pengetesan */}
        {form.gensetAda === 'Ada' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Pengetesan</Text>
              </View>
            </View>
            <View style={styles.titleDivider} />

            <View style={styles.cardBody}>
              <View
                style={[
                  styles.subHeadingContainer,
                  {
                    borderTopWidth: 0,
                    paddingTop: 0,
                    marginTop: 0,
                    marginBottom: Spacing.sm,
                  },
                ]}
              >
                <Text style={styles.subHeading}>Start Engine Manual</Text>
                <Text
                  style={[
                    styles.inputLabel,
                    {
                      fontSize: 11,
                      color: Colors.textMuted,
                      marginTop: 3,
                      textTransform: 'none',
                      fontWeight: 'normal',
                    },
                  ]}
                >
                  ATS dikondisikan pada Mode Manual terlebih dahulu
                </Text>
              </View>

              {renderCheckRow(
                'Start Engine dari ATS',
                'testManualAts',
                'testManualAtsKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Start Engine dari Genset',
                'testManualGenset',
                'testManualGensetKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Pemindahan beban dari ATS',
                'testManualBebanAts',
                'testManualBebanAtsKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Pemindahan beban dari COS',
                'testManualBebanCos',
                'testManualBebanCosKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Pengetesan Emergency Stop',
                'testEmergencyStop',
                'testEmergencyStopKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Stop Engine dari ATS',
                'testStopManualAts',
                'testStopManualAtsKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Stop Engine dari Genset',
                'testStopManualGenset',
                'testStopManualGensetKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Pencatuan Beban',
                'testManualPencatuanBeban',
                'testManualPencatuanBebanKet',
                undefined,
                165,
              )}

              <View
                style={[
                  styles.subHeadingContainer,
                  { marginTop: Spacing.md, marginBottom: Spacing.sm },
                ]}
              >
                <Text style={styles.subHeading}>Start Engine Auto</Text>
              </View>

              {renderCheckRow(
                'Panel ATS Test',
                'testAutoPanelAts',
                'testAutoPanelAtsKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Kontraktor PLN',
                'testAutoPlnOffKontraktorPln',
                'testAutoPlnOffKontraktorPlnKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Kontraktor Genset',
                'testAutoPlnOffKontraktorGenset',
                'testAutoPlnOffKontraktorGensetKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Pencatuan Beban',
                'testAutoPlnOffPencatuanBeban',
                'testAutoPlnOffPencatuanBebanKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Kontraktor PLN',
                'testAutoStopKontraktorPln',
                'testAutoStopKontraktorPlnKet',
                undefined,
                165,
              )}
              {renderCheckRow(
                'Kontraktor Genset',
                'testAutoStopKontraktorGenset',
                'testAutoStopKontraktorGensetKet',
                undefined,
                165,
              )}
            </View>
          </View>
        )}

        {/* Card 9: Kebersihan */}
        {form.gensetAda === 'Ada' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Kebersihan</Text>
              </View>
            </View>
            <View style={styles.titleDivider} />

            <View style={styles.cardBody}>
              {renderCheckRow(
                'Mesin',
                'kebersihanMesin',
                'kebersihanMesinKet',
                ['Bersih', 'Kotor'],
              )}
              {renderCheckRow(
                'Panel',
                'kebersihanPanel',
                'kebersihanPanelKet',
                ['Bersih', 'Kotor'],
              )}
              {renderCheckRow(
                'Kondisi Bangunan',
                'kondisiBangunanGenset',
                'kondisiBangunanGensetKet',
                ['Baik', 'Rusak'],
              )}
              {renderCheckRow(
                'Kebersihan Ruangan',
                'kebersihanRuanganGenset',
                'kebersihanRuanganGensetKet',
                ['Bersih', 'Kotor'],
              )}
              {renderCheckRow(
                'Pintu Ruangan',
                'pintuRuanganGenset',
                'pintuRuanganGensetKet',
                ['Baik', 'Rusak'],
              )}
              {renderCheckRow(
                'Penerangan Ruangan',
                'peneranganRuanganGenset',
                'peneranganRuanganGensetKet',
                ['Baik', 'Rusak'],
              )}
              {renderCheckRow('FAN', 'fanGenset', 'fanGensetKet', [
                'Baik',
                'Rusak',
              ])}
              {renderCheckRow('Air flow', 'airflowGenset', 'airflowGensetKet', [
                'Baik',
                'Rusak',
              ])}
              {renderCheckRow(
                'Double wall',
                'doubleWallGenset',
                'doubleWallGensetKet',
                ['Baik', 'Rusak'],
              )}
            </View>
          </View>
        )}

        {/* Card 10: Catatan */}
        {form.gensetAda === 'Ada' && (
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
                  { height: 90, textAlignVertical: 'top' },
                ]}
                multiline
                numberOfLines={3}
                value={form.catatanGenset}
                onChangeText={val => updateForm('catatanGenset', val)}
                placeholder="Tambahkan catatan..."
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.saveButtonText}>Simpan & Kembali</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Picker Pop-up Universal */}
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
  content: {
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
  sectionTitle: {
    ...Typography.h4,
    color: Colors.text,
    fontSize: 17,
    fontWeight: 'bold',
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
  textInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    color: Colors.text,
    paddingHorizontal: 10,
    paddingVertical: 6,
    height: 38,
    fontSize: 13,
    textAlign: 'left',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  col: {
    flex: 1,
  },
  selectBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.background,
    height: 38,
  },
  selectText: {
    color: Colors.text,
    fontSize: 13,
  },
  selectTextPlaceholder: {
    color: Colors.textMuted,
  },
  subHeadingContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  subHeading: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: 'bold',
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
  measurementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
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
  },
  measurementInput: {
    color: Colors.text,
    fontSize: 14,
    textAlign: 'left',
    padding: 0,
    margin: 0,
  },
  measurementUnitText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
    minWidth: 32,
  },
});
