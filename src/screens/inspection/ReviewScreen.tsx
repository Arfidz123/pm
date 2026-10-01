/**
 * Review Screen
 * Review inspection data before final submission
 * Sections order:
 * 1. Cover
 * 2. Power System
 * 3. Mechanical Electrical
 * 4. External Alarm
 * 5. Genset
 * 6. FOT IP
 * 7. FOT DWDM
 * 8. KWH
 * 9. ACPDB
 * 10. DCPDB
 * 11. Recti
 * 12. Batrei
 * 13. Dokumentasi
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import { Header, Card, Button, StatusBadge, AnimatedBackground } from '../../components/common';
import { useInspectionStore } from '../../store/inspectionStore';
import database from '../../database';
import { Asset } from '../../database/models';
import { getCategoryIcon } from '../../utils/helpers';
import type { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SectionHeaderBadge = ({
  number,
  title,
}: {
  number: number;
  title: string;
}) => (
  <View style={styles.sectionHeaderRow}>
    <View style={styles.numberBadge}>
      <Text style={styles.numberBadgeText}>{number}</Text>
    </View>
    <Text style={styles.mainSectionTitle}>{title}</Text>
  </View>
);

const SectionDetail = ({
  title,
  data,
}: {
  title?: string;
  data: Record<string, string | number | undefined | null>;
}) => {
  const entries = Object.entries(data).filter(
    ([_, v]) => v !== undefined && v !== null && v !== '',
  );
  if (entries.length === 0) return null;

  return (
    <View style={styles.subSection}>
      {title ? <Text style={styles.subSectionTitle}>{title}</Text> : null}
      {entries.map(([key, value]) => (
        <View key={key} style={styles.resultRow}>
          <View style={styles.resultLeft}>
            <Text style={styles.resultLabel}>{key}</Text>
            <Text style={styles.resultValue}>{value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

export const ReviewScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const { inspectionId } = route.params || {};
  const {
    activePopId,
    activePopName,
    activePopLocation,
    currentAssetId,
    checklistEntries,
    photos,
    notes,
    formData,
  } = useInspectionStore();
  const [asset, setAsset] = useState<Asset | null>(null);

  useEffect(() => {
    if (currentAssetId) {
      database
        .get<Asset>('assets')
        .find(currentAssetId)
        .then(setAsset)
        .catch(console.error);
    }
  }, [currentAssetId]);

  const handleContinue = () => {
    navigation.navigate('Signature', { inspectionId });
  };

  const ps = formData.powerSystem || {};
  const me = formData.mechanicalElect || {};
  const ea = formData.external_alarm || formData.externalAlarm || {};
  const gs = formData.genset || {};
  const fotIp = formData.fot_ip || {};
  const fotDwdm = formData.fot_dwdm || {};
  const kwh = formData.kwhMeter || {};
  const acpdb = formData.acpdb || {};
  const dcpdb = formData.dcpdb || {};
  const rect = formData.rectifier || {};
  const battery = formData.battery || {};
  const infoPop = formData.infoPop || {};

  return (
    <AnimatedBackground>
      <View style={styles.container}>
      <Header
        title="Review"
        subtitle="Periksa kembali hasil inspeksi sebelum submit"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ================= 1. COVER ================= */}
        <View style={styles.sectionContainer}>
          <SectionHeaderBadge number={1} title="COVER / INFO POP" />
          <Card style={styles.cardWrapper}>
            {asset && (
              <View style={styles.assetRow}>
                <Text style={styles.assetIcon}>
                  {getCategoryIcon(asset.category)}
                </Text>
                <View style={styles.assetInfo}>
                  <Text style={styles.assetCode}>{asset.assetCode}</Text>
                  <Text style={styles.assetName}>{asset.name}</Text>
                  <Text style={styles.assetLocation}>📍 {asset.location}</Text>
                </View>
              </View>
            )}
            <SectionDetail
              data={{
                'Kode POP': infoPop.kodePop || activePopId,
                'Nama POP': infoPop.namaPop || activePopName,
                'Alamat POP': infoPop.alamat || activePopLocation,
                Koordinat: infoPop.koordinat,
                'Tipe POP': Array.isArray(infoPop.tipePop)
                  ? infoPop.tipePop.join(', ')
                  : infoPop.tipePop,
                Tanggal:
                  infoPop.tanggal ||
                  (formData.inspectionStartTime
                    ? new Date(formData.inspectionStartTime).toLocaleDateString(
                        'id-ID',
                      )
                    : undefined),
                'Tim Serpo': infoPop.timSerpo,
                'Tim PLN': infoPop.timPLN,
                'PIC POP': infoPop.picPop,
                'Catatan POP': infoPop.catatan,
              }}
            />
          </Card>
        </View>

        {/* ================= 2. POWER SYSTEM ================= */}
        <View style={styles.sectionContainer}>
          <SectionHeaderBadge number={2} title="POWER SYSTEM" />
          <Card style={styles.cardWrapper}>
            {/* Catuan Utama */}
            <SectionDetail
              title="CATUAN UTAMA"
              data={{
                'Tipe PLN': ps.tipePln || '-',
                'ID Pelanggan': ps.idPelanggan || kwh.idPelanggan,
                'Daya Listrik (kVA)': ps.dayaListrik || kwh.dayaListrik,
                Phasa: ps.phasaCatuan || kwh.phasa,
                'Pengukuran KWH': ps.pengukuranKwh || kwh.pengukuranKwh,
                'Stand Bulan Ini': ps.bulanIni || kwh.standAkhir,
              }}
            />

            {/* Tegangan & Acuan */}
            <SectionDetail
              title="TEGANGAN & ACUAN"
              data={{
                'Tegangan R-N': ps.teganganR_N
                  ? `${ps.teganganR_N} (Acuan: ${
                      ps.teganganR_N_TU || '220 ± 10%'
                    })`
                  : '',
                'Tegangan S-N': ps.teganganS_N
                  ? `${ps.teganganS_N} (Acuan: ${
                      ps.teganganS_N_TU || '220 ± 10%'
                    })`
                  : '',
                'Tegangan T-N': ps.teganganT_N
                  ? `${ps.teganganT_N} (Acuan: ${
                      ps.teganganT_N_TU || '220 ± 10%'
                    })`
                  : '',
                'Tegangan R-T': ps.teganganR_T
                  ? `${ps.teganganR_T} (Acuan: ${
                      ps.teganganR_T_TU || '400 ± 10%'
                    })`
                  : '',
                'Tegangan S-T': ps.teganganS_T
                  ? `${ps.teganganS_T} (Acuan: ${
                      ps.teganganS_T_TU || '400 ± 10%'
                    })`
                  : '',
                'Tegangan R-S': ps.teganganR_S
                  ? `${ps.teganganR_S} (Acuan: ${
                      ps.teganganR_S_TU || '400 ± 10%'
                    })`
                  : '',
                'Tegangan G-N': ps.teganganG_N
                  ? `${ps.teganganG_N} ${
                      ps.teganganG_N_TU ? `(Acuan: ${ps.teganganG_N_TU})` : ''
                    }`
                  : '',
              }}
            />

            {/* Total Arus & Stabilizer */}
            <SectionDetail
              title="TOTAL ARUS & STABILIZER"
              data={{
                Phasa: ps.phasaArus || ps.phasaCatuan,
                Frekuensi: ps.frekuensi ? `${ps.frekuensi} Hz` : '',
                'Arus Phasa R': ps.arusPhasaR || ps.arusR || '',
                'Arus Phasa S': ps.arusPhasaS || ps.arusS || '',
                'Arus Phasa T': ps.arusPhasaT || ps.arusT || '',
                'Stabilizer Kapasitas': ps.stabilizerKapasitas || '',
                'Stabilizer Jumlah': ps.stabilizerJumlah,
              }}
            />

            {/* Visual Check */}
            <SectionDetail
              title="VISUAL & CHECK KABINET"
              data={{
                'Cek Kabel': ps.cekKabel
                  ? `${ps.cekKabel} ${
                      ps.cekKabelKet ? `(${ps.cekKabelKet})` : ''
                    }`
                  : '',
                'Cek Baut Terminal': ps.cekBautTerminal
                  ? `${ps.cekBautTerminal} ${
                      ps.cekBautTerminalKet ? `(${ps.cekBautTerminalKet})` : ''
                    }`
                  : '',
                'Cek Baut MCB/MCCB': ps.cekBautMCB
                  ? `${ps.cekBautMCB} ${
                      ps.cekBautMCBKet ? `(${ps.cekBautMCBKet})` : ''
                    }`
                  : '',
                'Indikator Lamp': ps.indikatorLamp
                  ? `${ps.indikatorLamp} ${
                      ps.indikatorLampKet ? `(${ps.indikatorLampKet})` : ''
                    }`
                  : '',
                'COS Genset': ps.cosGenset
                  ? `${ps.cosGenset} ${
                      ps.cosGensetKet ? `(${ps.cosGensetKet})` : ''
                    }`
                  : '',
              }}
            />

            {/* Pengecekan Arrester */}
            <SectionDetail
              title="PENGECEKAN ARRESTER"
              data={{
                'Phasa R': `KWH: ${
                  ps.kwhBoxR || ps.arresterKwhR || '-'
                } | ACPDB: ${ps.acpdbR || ps.arresterAcpdbR || '-'} | Rect: ${
                  ps.rectifierR || ps.arresterRectifierR || '-'
                }${ps.arresterKetR ? ` (Ket: ${ps.arresterKetR})` : ''}`,
                'Phasa S': `KWH: ${
                  ps.kwhBoxS || ps.arresterKwhS || '-'
                } | ACPDB: ${ps.acpdbS || ps.arresterAcpdbS || '-'} | Rect: ${
                  ps.rectifierS || ps.arresterRectifierS || '-'
                }${ps.arresterKetS ? ` (Ket: ${ps.arresterKetS})` : ''}`,
                'Phasa T': `KWH: ${
                  ps.kwhBoxT || ps.arresterKwhT || '-'
                } | ACPDB: ${ps.acpdbT || ps.arresterAcpdbT || '-'} | Rect: ${
                  ps.rectifierT || ps.arresterRectifierT || '-'
                }${ps.arresterKetT ? ` (Ket: ${ps.arresterKetT})` : ''}`,
                'Phasa N': `KWH: ${
                  ps.kwhBoxN || ps.arresterKwhN || '-'
                } | ACPDB: ${ps.acpdbN || ps.arresterAcpdbN || '-'} | Rect: ${
                  ps.rectifierN || ps.arresterRectifierN || '-'
                }${ps.arresterKetN ? ` (Ket: ${ps.arresterKetN})` : ''}`,
              }}
            />

            {ps.catatan ? (
              <SectionDetail
                title="CATATAN POWER SYSTEM"
                data={{ Catatan: ps.catatan }}
              />
            ) : null}
          </Card>
        </View>

        {/* ================= 3. MECHANICAL ELECTRICAL ================= */}
        <View style={styles.sectionContainer}>
          <SectionHeaderBadge number={3} title="MECHANICAL ELECTRICAL" />
          <Card style={styles.cardWrapper}>
            <SectionDetail
              title="AIR CONDITIONER & EXHAUST"
              data={{
                'Jumlah AC':
                  me.acJumlah ||
                  (me.acList ? `${me.acList.length} Unit` : undefined),
                'Jumlah Exhaust Fan': me.exJumlah,
              }}
            />

            {me.acList && me.acList.length > 0 && (
              <View style={{ marginBottom: Spacing.sm }}>
                <Text style={styles.subSectionTitle}>
                  UNIT AC ({me.acList.length} Unit)
                </Text>
                {me.acList.map((item: any, idx: number) => (
                  <Card key={idx} style={styles.subCard}>
                    <Text style={styles.subCardTitle}>
                      AC #{idx + 1} - {item.merk || 'AC'}
                    </Text>
                    <Text style={styles.resultValue}>
                      Tipe: {item.tipe || '-'} | PK: {item.pk || '-'} | Status:{' '}
                      {item.kondisi || '-'}
                    </Text>
                    <Text style={styles.resultValue}>
                      Suhu: {item.suhu || '-'} | Arus: {item.arus || '-'}
                    </Text>
                  </Card>
                ))}
              </View>
            )}

            <SectionDetail
              title="GROUNDING & LOKASI POP"
              data={{
                'Status Lokasi POP': me.popLokasi
                  ? `${me.popLokasi}${
                      me.popLokasiKet ? ` (${me.popLokasiKet})` : ''
                    }`
                  : undefined,
                'Dimensi POP': me.popLuas,
                'Pengukuran Grounding': me.grPengukuran,
                'System Grounding':
                  me.systemGrounding || me.grSystem || ps.systemGrounding
                    ? `${me.systemGrounding || me.grSystem || ps.systemGrounding}${
                        me.systemGroundingKet || me.grSystemKet
                          ? ` (${me.systemGroundingKet || me.grSystemKet})`
                          : ''
                      }`
                    : undefined,
                'Status Grounding': me.grStatus
                  ? `${me.grStatus}${
                      me.grStatusKet ? ` (${me.grStatusKet})` : ''
                    }`
                  : undefined,
                'Penangkal Petir': me.grPetir
                  ? `${me.grPetir}${me.grPetirKet ? ` (${me.grPetirKet})` : ''}`
                  : undefined,
                'Catatan Grounding': me.grCatatan || ps.grCatatan,
                'Catatan ME': me.popNote || me.note,
              }}
            />
          </Card>
        </View>

        {/* ================= 4. EXTERNAL ALARM ================= */}
        <View style={styles.sectionContainer}>
          <SectionHeaderBadge number={4} title="EXTERNAL ALARM" />
          <Card style={styles.cardWrapper}>
            <SectionDetail
              title="UJI SENSOR & KONFIGURASI ALARM"
              data={{
                '1. Uji Konfigurasi': ea.uji1_status,
                '2. Uji Sensor PLN OFF': ea.uji2_status,
                '3. Uji Sensor Battery Fail': ea.uji3_status,
                '4. Uji Sensor Rectifier Fail': ea.uji4_status,
                '5. Uji Sensor Modul Rectifier': ea.uji5_status,
                '6. Uji Sensor Temperature High': ea.uji6_status
                  ? `${ea.uji6_status}${
                      ea.uji6_suhuLokasi ? ` (Suhu: ${ea.uji6_suhuLokasi})` : ''
                    }`
                  : undefined,
                '7. Uji Sensor Smoke & Heat': ea.uji7_status,
                '8. Uji Arrester & Grounding': ea.uji8_status,
                '9. Uji Sensor Door Open': ea.uji9_status,
                '10. Uji Sensor Genset Run': ea.uji10_status,
                'Catatan Umum': ea.generalNote || ea.catatan,
              }}
            />
          </Card>
        </View>

        {/* ================= 5. GENSET ================= */}
        <View style={styles.sectionContainer}>
          <SectionHeaderBadge number={5} title="GENSET" />
          <Card style={styles.cardWrapper}>
            <SectionDetail
              title="SPESIFIKASI & SISTEM ATS"
              data={{
                Ketersediaan: gs.gensetAda || '-',
                'Merk Genset': gs.merkGenset,
                'Tipe Genset': gs.tipeGenset,
                'Serial Number': gs.snGenset,
                'Generator Merk': gs.generatorMerk,
                'Engine Merk': gs.engineMerk || gs.engineMark,
                Kapasitas: gs.kapasitasGenset
                  ? `${gs.kapasitasGenset} kVA`
                  : undefined,
                Phasa: gs.phasaGenset,
                'ATS Type': gs.atsType,
                'ATS Controller': gs.atsController,
                'ATS COS': gs.atsCos || gs.cosGenset,
              }}
            />

            <SectionDetail
              title="TYPE POWERHOUSE"
              data={{
                'Running Hour (Last Month)': gs.runningHourLastMonth
                  ? `${gs.runningHourLastMonth} Hour`
                  : undefined,
                'Running Hour (Current Month)': gs.runningHourCurrentMonth
                  ? `${gs.runningHourCurrentMonth} Hour`
                  : undefined,
                'Durasi Pengecekan Lalu - Sekarang':
                  gs.durasiPengecekanLalu_Sekarang
                    ? `${gs.durasiPengecekanLalu_Sekarang} Hari`
                    : undefined,
                'Genset Model': gs.gensetModel,
                'Genset Type': gs.gensetType,
              }}
            />

            <SectionDetail
              title="FUEL SYSTEM & TANGKI"
              data={{
                'Tangki Utama': gs.tangkiUtama
                  ? `${gs.tangkiUtama}${
                      gs.tangkiUtamaKet ? ` (${gs.tangkiUtamaKet})` : ''
                    }`
                  : '',
                'Tangki Eksternal': gs.tangkiEksternal
                  ? `${gs.tangkiEksternal}${
                      gs.tangkiEksternalKet ? ` (${gs.tangkiEksternalKet})` : ''
                    }`
                  : '',
                'Pipa Solar': gs.pipaSolar
                  ? `${gs.pipaSolar}${
                      gs.pipaSolarKet ? ` (${gs.pipaSolarKet})` : ''
                    }`
                  : '',
                'Valve Gate Fuel Sys': gs.valveGateFuelSys
                  ? `${gs.valveGateFuelSys}${
                      gs.valveGateFuelSysKet ? ` (${gs.valveGateFuelSysKet})` : ''
                    }`
                  : '',
                'Test Pompa (Auto)': gs.testPompaKondisiAuto
                  ? `${gs.testPompaKondisiAuto}${
                      gs.testPompaKondisiAutoKet ? ` (${gs.testPompaKondisiAutoKet})` : ''
                    }`
                  : '',
                'Test Pompa (Manual)': gs.testPompaKondisiManual
                  ? `${gs.testPompaKondisiManual}${
                      gs.testPompaKondisiManualKet ? ` (${gs.testPompaKondisiManualKet})` : ''
                    }`
                  : '',
                'Panel Pompa Solar': gs.panelPompaSolar
                  ? `${gs.panelPompaSolar}${
                      gs.panelPompaSolarKet ? ` (${gs.panelPompaSolarKet})` : ''
                    }`
                  : '',
                'Pelampung Pompa Solar': gs.pelampungPompaSolar
                  ? `${gs.pelampungPompaSolar}${
                      gs.pelampungPompaSolarKet ? ` (${gs.pelampungPompaSolarKet})` : ''
                    }`
                  : '',
                'Sisa BBM Bulan Lalu':
                  gs.sisaBbmPengecekanBulanLalu ||
                  gs.sisaBbmPengecekkanBulanLalu,
                'Sisa BBM Bulan Sekarang':
                  gs.sisaBbmPengecekanBulanSekarang ||
                  gs.sisaBbmPengecekkanBulanSekarang,
                'Level BBM': gs.levelBbm
                  ? `${gs.levelBbm} %`
                  : gs.levelIndikatorTangkiBensin,
              }}
            />

            <SectionDetail
              title="PENGUKURAN TEGANGAN & ARUS GENSET"
              data={{
                'Tegangan R-N': gs.teganganR_N,
                'Tegangan S-N': gs.teganganS_N,
                'Tegangan T-N': gs.teganganT_N,
                'Tegangan G-N': gs.teganganG_N,
                'Arus Phasa R': gs.arusPhasaR,
                'Arus Phasa S': gs.arusPhasaS,
                'Arus Phasa T': gs.arusPhasaT,
                Frekuensi: gs.frekuensi ? `${gs.frekuensi} Hz` : '',
                'Running Test': gs.runningTest,
                'Catatan Genset': gs.catatanGenset || gs.catatan,
              }}
            />
          </Card>
        </View>

        {/* ================= 6. FOT IP ================= */}
        <View style={styles.sectionContainer}>
          <SectionHeaderBadge number={6} title="FOT IP" />
          <Card style={styles.cardWrapper}>
            <SectionDetail
              title="PROSEDUR PEMBERSIHAN FOT IP"
              data={{
                'Lower Fan Tray (1.1 - 1.2)':
                  fotIp.procedures?.['1.1'] || fotIp.proc1_1
                    ? 'Sudah Dilakukan'
                    : undefined,
                'Lower Fan Tray (1.3 - 1.10)':
                  fotIp.procedures?.['1.3'] || fotIp.proc_1_3
                    ? 'Sudah Dilakukan'
                    : undefined,
                'Chassis Air Filter (1.1 - 1.10)': fotIp.procedures?.['caf_1.1']
                  ? 'Sudah Dilakukan'
                  : undefined,
                'Chassis Air Filter (3.1 - 3.3)': fotIp.procedures?.['caf_3.1']
                  ? 'Sudah Dilakukan'
                  : undefined,
                'Catatan FOT IP': fotIp.catatan,
              }}
            />
          </Card>
        </View>

        {/* ================= 7. FOT DWDM ================= */}
        <View style={styles.sectionContainer}>
          <SectionHeaderBadge number={7} title="FOT DWDM" />
          <Card style={styles.cardWrapper}>
            <SectionDetail
              title="PROSEDUR & SPESIFIKASI DWDM"
              data={{
                'Site ID': fotDwdm.siteId,
                Vendor: fotDwdm.vendor,
                'Model Chassis': fotDwdm.modelChassis,
                'Serial Number': fotDwdm.sn,
                'Posisi Rack': fotDwdm.posisiRack,
                'Status Power': fotDwdm.statusPower,
                'Anti Dust Screen (1.1 - 1.4)': fotDwdm.procedures?.['1.1']
                  ? 'Sudah Dilakukan'
                  : undefined,
                'Fan Unit (2.1 - 2.9)': fotDwdm.procedures?.['2.1']
                  ? 'Sudah Dilakukan'
                  : undefined,
                'Equipment Unit (3.1 - 3.3)': fotDwdm.procedures?.['3.1']
                  ? 'Sudah Dilakukan'
                  : undefined,
                'Catatan FOT DWDM': fotDwdm.catatan,
              }}
            />
          </Card>
        </View>

        {/* ================= 8. KWH ================= */}
        <View style={styles.sectionContainer}>
          <SectionHeaderBadge number={8} title="KWH" />
          <Card style={styles.cardWrapper}>
            <SectionDetail
              title="PENGUKURAN STAND KWH METER"
              data={{
                'ID Pelanggan': kwh.idPelanggan || ps.idPelanggan,
                'Daya Listrik (kVA)': kwh.dayaListrik || ps.dayaListrik,
                Phasa: kwh.phasa || ps.phasaCatuan,
                'Stand Awal (Bulan Lalu)': kwh.standAwal || kwh.bulanLalu,
                'Stand Akhir (Bulan Ini)':
                  kwh.standAkhir || kwh.bulanIni || ps.bulanIni,
                'Pemakaian KWH':
                  kwh.pengukuranKwh || ps.pengukuranKwh || kwh.pemakaian,
                'KWH Box': kwh.kwhBox,
                'MCB KWH': kwh.mcbKwh,
                'Arrester KWH': kwh.arresterKwh,
                'Comments / Catatan': kwh.comment || kwh.catatan,
              }}
            />
          </Card>
        </View>

        {/* ================= 9. ACPDB ================= */}
        <View style={styles.sectionContainer}>
          <SectionHeaderBadge number={9} title="ACPDB" />
          <Card style={styles.cardWrapper}>
            <SectionDetail
              title="STATUS ARESTER & KELISTRIKAN ACPDB"
              data={{
                'Status Arester': acpdb.aresterAda,
                'Tipe Arester': acpdb.aresterTipe,
                'Warna Indikator': acpdb.aresterWarnaIndikator,
                'Catatan ACPDB': acpdb.catatan,
              }}
            />

            {(() => {
              const list =
                acpdb.acpdbBeban ||
                acpdb.bebanAcpdb ||
                ps.acpdbBeban ||
                ps.bebanAcpdb ||
                [];
              if (!list || list.length === 0) return null;
              return (
                <View style={{ marginTop: Spacing.sm }}>
                  <Text style={styles.subSectionTitle}>
                    DAFTAR BEBAN MCB ACPDB ({list.length} MCB)
                  </Text>
                  {list.map((item: any, idx: number) => (
                    <Card key={idx} style={styles.subCard}>
                      <Text style={styles.subCardTitle}>
                        MCB #{idx + 1} - {item.merk ? `${item.merk} ` : ''}(
                        {item.kapasitas || '-'})
                      </Text>
                      <Text style={styles.resultValue}>
                        Phasa: {item.phasa || item.labelMcb || '-'} | Beban:{' '}
                        {item.beban || '-'} | Arus: {item.arus || '-'}
                      </Text>
                      {item.peruntukan ? (
                        <Text style={styles.resultValue}>
                          Peruntukan: {item.peruntukan}
                        </Text>
                      ) : null}
                    </Card>
                  ))}
                </View>
              );
            })()}
          </Card>
        </View>

        {/* ================= 10. DCPDB ================= */}
        <View style={styles.sectionContainer}>
          <SectionHeaderBadge number={10} title="DCPDB" />
          <Card style={styles.cardWrapper}>
            <SectionDetail
              title="STATUS ARESTER & KELISTRIKAN DCPDB"
              data={{
                'Status Arester': dcpdb.aresterAda,
                'Tipe Arester': dcpdb.aresterTipe,
                'Warna Indikator': dcpdb.aresterWarnaIndikator,
                'Catatan DCPDB': dcpdb.catatan,
              }}
            />

            {(() => {
              const list =
                dcpdb.dcpdbBeban ||
                dcpdb.bebanDcpdb ||
                ps.dcpdbBeban ||
                ps.bebanDcpdb ||
                [];
              if (!list || list.length === 0) return null;
              return (
                <View style={{ marginTop: Spacing.sm }}>
                  <Text style={styles.subSectionTitle}>
                    DAFTAR BEBAN MCB DCPDB ({list.length} MCB)
                  </Text>
                  {list.map((item: any, idx: number) => (
                    <Card key={idx} style={styles.subCard}>
                      <Text style={styles.subCardTitle}>
                        MCB #{idx + 1} - {item.merk ? `${item.merk} ` : ''}(
                        {item.kapasitas || '-'})
                      </Text>
                      <Text style={styles.resultValue}>
                        Phasa:{' '}
                        {item.phasa || item.labelMcb || item.dcpdb || '-'} |
                        Beban: {item.beban || item.dcpdb1Beban || '-'} | Arus:{' '}
                        {item.arus || item.dcpdb1Arus || '-'}
                      </Text>
                      {item.peruntukan ? (
                        <Text style={styles.resultValue}>
                          Peruntukan: {item.peruntukan}
                        </Text>
                      ) : null}
                    </Card>
                  ))}
                </View>
              );
            })()}
          </Card>
        </View>

        {/* ================= 11. RECTI ================= */}
        <View style={styles.sectionContainer}>
          <SectionHeaderBadge number={11} title="RECTI" />
          <Card style={styles.cardWrapper}>
            {(() => {
              const rectList = rect.rectifiers || [];
              if (rectList.length > 0) {
                return rectList.map((r: any, idx: number) => (
                  <SectionDetail
                    key={idx}
                    title={`RECTIFIER #${idx + 1}`}
                    data={{
                      Merk: r.merk,
                      Tipe: r.tipe,
                      'Serial Number': r.sn,
                      'Tipe Modul': r.tipeModul,
                      'Modul Terpasang': r.jmlModul,
                      'Kapasitas Slot': r.jmlSlot,
                      'Arus Beban': r.arusBeban
                        ? `${r.arusBeban} A`
                        : undefined,
                      'Tegangan Input': r.tegInput
                        ? `${r.tegInput} V`
                        : undefined,
                      'Tegangan Floating': r.tegFloating
                        ? `${r.tegFloating} V`
                        : undefined,
                      'Tegangan Equalizing': r.tegEqualizing
                        ? `${r.tegEqualizing} V`
                        : undefined,
                      'LVD Threshold': r.lvd,
                    }}
                  />
                ));
              }

              return (
                <SectionDetail
                  title="RECTIFIER"
                  data={{
                    Merk: rect.merk || ps.rect1Merk,
                    Tipe: rect.tipe || ps.rect1Tipe,
                    'Serial Number': rect.sn || ps.rect1SN,
                    'Arus Beban': rect.arusBeban || ps.rect1ArusBeban,
                    'Tegangan Input': rect.tegInput || ps.rect1TegInput,
                    'Tegangan Floating':
                      rect.tegFloating || ps.rect1TegFloating,
                    'Catatan Rectifier': rect.catatan,
                  }}
                />
              );
            })()}

            {/* Beban Rectifier */}
            {(() => {
              const bebanList =
                rect.rectifierBeban ||
                rect.bebanRectifier ||
                ps.rectifierBeban ||
                ps.bebanRectifier ||
                [];
              if (!bebanList || bebanList.length === 0) return null;
              return (
                <View style={{ marginTop: Spacing.sm }}>
                  <Text style={styles.subSectionTitle}>
                    BEBAN RECTIFIER ({bebanList.length} MCB)
                  </Text>
                  {bebanList.map((item: any, idx: number) => (
                    <Card key={idx} style={styles.subCard}>
                      <Text style={styles.subCardTitle}>
                        MCB #{idx + 1} - Kapasitas: {item.kapasitas || '-'}
                      </Text>
                      <Text style={styles.resultValue}>
                        {item.beban ? `Beban: ${item.beban} | ` : ''}Arus: {item.arus || '-'}
                      </Text>
                      {item.namaNe ? (
                        <Text style={styles.resultValue}>
                          Nama NE: {item.namaNe}
                        </Text>
                      ) : null}
                    </Card>
                  ))}
                </View>
              );
            })()}
          </Card>
        </View>

        {/* ================= 12. BATREI ================= */}
        <View style={styles.sectionContainer}>
          <SectionHeaderBadge number={12} title="BATREI" />
          <Card style={styles.cardWrapper}>
            {battery.banks && battery.banks.length > 0 ? (
              <View>
                <Text style={styles.subSectionTitle}>
                  BANK BATERAI ({battery.banks.length} Bank)
                </Text>
                {battery.banks.map((bank: any, index: number) => (
                  <Card key={index} style={styles.subCard}>
                    <Text style={styles.subCardTitle}>
                      Bank #{index + 1} - Kondisi: {bank.kondisi || 'OK'}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      <View style={{ width: '50%', marginBottom: 4 }}>
                        <Text style={styles.resultLabel}>Merk</Text>
                        <Text style={styles.resultValue}>
                          {bank.merk || '-'}
                        </Text>
                      </View>
                      <View style={{ width: '50%', marginBottom: 4 }}>
                        <Text style={styles.resultLabel}>Tipe</Text>
                        <Text style={styles.resultValue}>
                          {bank.tipe || '-'}
                        </Text>
                      </View>
                      <View style={{ width: '50%', marginBottom: 4 }}>
                        <Text style={styles.resultLabel}>Kapasitas</Text>
                        <Text style={styles.resultValue}>
                          {bank.kapasitas || '-'}
                        </Text>
                      </View>
                      <View style={{ width: '50%', marginBottom: 4 }}>
                        <Text style={styles.resultLabel}>V Total</Text>
                        <Text style={styles.resultValue}>
                          {bank.vTotal || '-'}
                        </Text>
                      </View>
                      <View style={{ width: '100%', marginBottom: 4 }}>
                        <Text style={styles.resultLabel}>Serial Number</Text>
                        <Text style={styles.resultValue}>{bank.sn || '-'}</Text>
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            ) : (
              <SectionDetail
                title="BATERAI"
                data={{
                  Status: 'Belum ada data bank baterai',
                }}
              />
            )}
            {battery.catatan ? (
              <SectionDetail
                title="CATATAN BATERAI"
                data={{ Catatan: battery.catatan }}
              />
            ) : null}
          </Card>
        </View>

        {/* ================= 13. DOKUMENTASI ================= */}
        <View style={styles.sectionContainer}>
          <SectionHeaderBadge number={13} title="DOKUMENTASI" />
          <Card style={styles.cardWrapper}>
            <SectionDetail
              data={{
                'Total Foto Terunggah':
                  photos && photos.length > 0
                    ? `${photos.length} Foto`
                    : '0 Foto',
                'Catatan Dokumentasi':
                  formData.dokumentasi?.catatan ||
                  notes ||
                  'Tidak ada catatan tambahan',
              }}
            />
          </Card>
        </View>

        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          <View style={styles.stepDots}>
            <View style={[styles.dot, styles.dotCompleted]} />
            <View style={[styles.dot, styles.dotCompleted]} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={[styles.dot, styles.dotInactive]} />
          </View>
          <Text style={styles.stepText}>Langkah 3 dari 4</Text>
        </View>

        <Button
          title="Lanjut ke Tanda Tangan →"
          onPress={handleContinue}
          variant="primary"
          size="lg"
          fullWidth
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['3xl'],
  },
  sectionContainer: {
    marginBottom: Spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  numberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  numberBadgeText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 12,
  },
  mainSectionTitle: {
    ...Typography.subtitle1,
    color: Colors.text,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  cardWrapper: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  assetIcon: {
    fontSize: 32,
    marginRight: Spacing.base,
  },
  assetInfo: {
    flex: 1,
  },
  assetCode: {
    ...Typography.overline,
    color: Colors.primary,
    fontWeight: '700',
  },
  assetName: {
    ...Typography.h4,
    color: Colors.text,
    marginTop: 2,
    fontWeight: '700',
  },
  assetLocation: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  subSection: {
    marginBottom: Spacing.md,
  },
  subSectionTitle: {
    ...Typography.caption,
    color: Colors.primaryLight || '#60A5FA',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  subCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  subCardTitle: {
    ...Typography.subtitle2,
    color: Colors.text,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 2,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  resultLeft: {
    flex: 1,
  },
  resultLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  resultValue: {
    ...Typography.bodySmall,
    color: Colors.text,
    fontWeight: '600',
    marginTop: 2,
  },
  stepIndicator: {
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  stepDots: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  dotCompleted: {
    backgroundColor: Colors.success,
  },
  dotInactive: {
    backgroundColor: Colors.border,
  },
  stepText: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
});
