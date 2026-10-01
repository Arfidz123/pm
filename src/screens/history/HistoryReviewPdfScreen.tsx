/**
 * History Review PDF Screen
 * Read-only PDF review loaded from saved inspection formData in the database.
 * This is separate from ReviewPdfScreen which reads from the live zustand store.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Share,
  Platform,
  NativeModules,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Download,
  Share2,
  ChevronLeft,
  ChevronRight,
  Edit3,
} from 'lucide-react-native';
import WebView from 'react-native-webview';
import RNHTMLtoPDF, { generatePDF } from 'react-native-html-to-pdf';
import LinearGradient from 'react-native-linear-gradient';

import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import { Header, showAlert, AnimatedBackground } from '../../components/common';
import { resolveAllTelegramUrisInObject } from '../../services/telegramStorage';
import database from '../../database';
import { Inspection, Asset } from '../../database/models';
import { useInspectionStore } from '../../store/inspectionStore';
import {
  generateDownloadablePdfHtml,
  generatePdfSections,
} from '../../utils/pdfTemplate';
import {
  formatDate,
  cleanPopId,
  cleanPopName,
  sharePdfFile,
} from '../../utils/helpers';
import type { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;

export const HistoryReviewPdfScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const { inspectionId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [mergedFormData, setMergedFormData] = useState<any>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const dotsScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (dotsScrollRef.current) {
      const xOffset = Math.max(0, activeIndex * 44 - (SCREEN_WIDTH / 2 - 40));
      dotsScrollRef.current.scrollTo({ x: xOffset, animated: true });
    }
  }, [activeIndex]);

  useEffect(() => {
    loadData();
  }, [inspectionId]);

  const loadData = async () => {
    if (!inspectionId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const insp = await database
        .get<Inspection>('inspections')
        .find(inspectionId);
      setInspection(insp);

      let parsedForm: any = {};
      if (insp.formData) {
        try {
          parsedForm =
            typeof insp.formData === 'string'
              ? JSON.parse(insp.formData)
              : insp.formData;
        } catch (e) {
          console.warn('Failed to parse formData string:', e);
        }
      }

      let parsedPhotos: any[] = [];
      if (insp.photos) {
        try {
          parsedPhotos =
            typeof insp.photos === 'string'
              ? JSON.parse(insp.photos)
              : insp.photos;
        } catch (e) {}
      }

      const merged = {
        ...parsedForm,
        inspectionStartTime:
          parsedForm.inspectionStartTime ||
          (insp.inspectionDate
            ? new Date(insp.inspectionDate).toISOString()
            : new Date().toISOString()),
        photos:
          parsedPhotos.length > 0 ? parsedPhotos : parsedForm.photos || [],
        notes: insp.notes || parsedForm.notes || '',
      };
      const resolvedMerged = await resolveAllTelegramUrisInObject(merged);
      setMergedFormData(resolvedMerged);

      try {
        const assetData = await database
          .get<Asset>('assets')
          .find(insp.assetId);
        setAsset(assetData);
      } catch (assetErr) {
        try {
          const allAssets = await database.get<Asset>('assets').query().fetch();
          const found =
            allAssets.find((a: Asset) => a.assetCode === insp.assetId) || null;
          setAsset(found);
        } catch (e) {}
      }
    } catch (err) {
      console.error('Error loading inspection for history review:', err);
    } finally {
      setLoading(false);
    }
  };

  const activePopId = asset?.assetCode || inspection?.assetId || 'POP';
  const popName =
    (asset as any)?.name ||
    mergedFormData?.infoPop?.namaPop ||
    mergedFormData?.infoPop?.popName ||
    (inspection?.assetId !== 'unknown' ? inspection?.assetId : 'POP');
  const popLocation =
    (asset as any)?.location || mergedFormData?.infoPop?.lokasi || '';

  const sections = useMemo(() => {
    if (!mergedFormData) return [];
    return generatePdfSections(
      activePopId,
      popName,
      popLocation,
      mergedFormData,
    );
  }, [activePopId, popName, popLocation, mergedFormData]);

  const downloadableHtml = useMemo(() => {
    if (!mergedFormData) return '';
    return generateDownloadablePdfHtml(
      activePopId,
      popName,
      popLocation,
      mergedFormData,
    );
  }, [activePopId, popName, popLocation, mergedFormData]);

  const currentSection: any = sections[activeIndex];
  const scaledHtml = useMemo(() => {
    if (!currentSection) return '';
    const pWidth = currentSection.pageWidth || 850;
    const initialScale = (SLIDE_WIDTH / pWidth).toFixed(2);
    return currentSection.html.replace(
      'initial-scale=1.0',
      `initial-scale=${initialScale}`,
    );
  }, [currentSection]);

  const ensurePdfPath = async (): Promise<string> => {
    // 1. If downloadableHtml is available, ALWAYS convert to a fresh local PDF first!
    if (downloadableHtml) {
      const cleanId = cleanPopId(activePopId) || 'POP';
      const safePopId = cleanId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const pdfFileName = `PM_Report_${safePopId}_${Date.now()}`;
      const options = {
        html: downloadableHtml,
        fileName: pdfFileName,
        directory: 'docs',
      };

      try {
        let file: any;
        if (typeof generatePDF === 'function') {
          file = await generatePDF(options as any);
        } else if (
          RNHTMLtoPDF &&
          typeof (RNHTMLtoPDF as any).convert === 'function'
        ) {
          file = await (RNHTMLtoPDF as any).convert(options);
        }

        const generatedPath = file?.filePath || '';
        if (generatedPath) {
          if (inspection) {
            try {
              await database.write(async () => {
                await inspection.update((i: any) => {
                  i.pdfPath = generatedPath;
                });
              });
            } catch (updateErr) {}
          }
          return generatedPath;
        }
      } catch (firstErr) {
        console.warn(
          'First ensurePdfPath attempt failed, retrying with forceReset:',
          firstErr,
        );
        try {
          const file = await generatePDF({
            ...options,
            forceReset: true,
          } as any);
          const generatedPath = file?.filePath || '';
          if (generatedPath) {
            return generatedPath;
          }
        } catch (retryErr) {
          console.error('Retry generatePDF failed:', retryErr);
        }
      }
    }

    // 2. If inspection already has a local file path
    if (
      inspection?.pdfPath &&
      !inspection.pdfPath.startsWith('http://') &&
      !inspection.pdfPath.startsWith('https://') &&
      !inspection.pdfPath.startsWith('telegram://')
    ) {
      return inspection.pdfPath;
    }

    // 3. Fallback: if it's a telegram or http url, resolve it to an active download link
    if (inspection?.pdfPath) {
      let p = inspection.pdfPath;
      if (p.startsWith('telegram://')) {
        try {
          const { resolveTelegramUri } = require('../../services/telegramStorage');
          const resolved = await resolveTelegramUri(p);
          if (resolved) {
            return resolved;
          }
        } catch (resErr) {
          console.warn('Failed resolving telegram uri:', resErr);
        }
      }
      return p;
    }

    return '';
  };

  const handleSharePdf = async () => {
    setSharing(true);
    try {
      const validPath = await ensurePdfPath();
      if (validPath) {
        await sharePdfFile(
          validPath,
          `PM Report - ${cleanPopId(activePopId)}`,
          `Laporan PM untuk ${cleanPopName(popName)} - ${formatDate(
            inspection?.inspectionDate || Date.now(),
          )}`,
        );
      } else {
        showAlert({
          type: 'error',
          title: 'Error',
          message: 'Gagal membuat file PDF untuk dibagikan',
        });
      }
    } catch (error: any) {
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Gagal membagikan PDF: ' + (error?.message || ''),
      });
    } finally {
      setSharing(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const validPath = await ensurePdfPath();
      if (!validPath) {
        throw new Error(
          'Gagal membuat atau menemukan file PDF untuk laporan ini.',
        );
      }

      const cleanId = cleanPopId(activePopId) || 'POP';
      const safePopId = cleanId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const pdfFileName = `PM_Report_${safePopId}_${Date.now()}`;

      if (Platform.OS === 'android' && NativeModules.PdfDownloader) {
        await NativeModules.PdfDownloader.saveToDownloads(
          validPath,
          pdfFileName,
        );
      }

      showAlert({
        type: 'success',
        title: 'Unduhan Berhasil',
        message:
          'Laporan PDF berhasil diunduh ke folder Download perangkat Anda.',
        buttons: [{ text: 'OK' }],
      });
    } catch (error: any) {
      console.error('Download error in history review:', error);
      showAlert({
        type: 'error',
        title: 'Gagal Mengunduh',
        message:
          'Terjadi kesalahan saat mengunduh PDF: ' +
          (error?.message || 'Error tidak diketahui'),
        buttons: [{ text: 'OK' }],
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleEditInspection = () => {
    if (!inspection) return;
    showAlert({
      type: 'confirm',
      title: 'Edit Laporan PM',
      message: `Anda akan membuka formulir inspeksi "${cleanPopName(
        popName || activePopId || 'POP',
      )}" untuk melakukan perubahan data atau foto. Lanjutkan?`,
      buttons: [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Edit Sekarang',
          onPress: () => {
            useInspectionStore
              .getState()
              .loadExistingInspection(inspection, asset);
            navigation.navigate('MainTabs');
          },
        },
      ],
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header
          title="Review PDF"
          subtitle="Memuat data..."
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Memuat data review...</Text>
        </View>
      </View>
    );
  }

  if (sections.length === 0) {
    return (
      <View style={styles.container}>
        <Header
          title="Review PDF"
          subtitle="Data tidak tersedia"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyIcon}>📄</Text>
          <Text style={styles.emptyTitle}>Data Review Tidak Tersedia</Text>
          <Text style={styles.emptySubtitle}>
            Laporan ini tidak memiliki data form yang tersimpan
          </Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.backBtnText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <AnimatedBackground>
      <View style={styles.container}>
      {/* Header */}
      <Header
        title="Review PDF"
        subtitle={popName ? `POP: ${popName}` : 'Riwayat Laporan PM'}
        onBack={() => navigation.goBack()}
      />

      <View style={styles.contentContainer}>
        {/* Numbered Dots Row */}
        <View style={styles.dotsContainer}>
          <ScrollView
            ref={dotsScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dotsScrollContent}
          >
            {sections.map((_: any, idx: number) => {
              const isActive = idx === activeIndex;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setActiveIndex(idx)}
                  activeOpacity={0.7}
                  style={[styles.dot, isActive && styles.dotActive]}
                >
                  <Text
                    style={[styles.dotText, isActive && styles.dotTextActive]}
                  >
                    {idx + 1}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Section Header Navigation */}
        <View style={styles.sectionHeader}>
          <TouchableOpacity
            style={[
              styles.navArrowBtn,
              activeIndex === 0 && styles.navArrowBtnDisabled,
            ]}
            onPress={() => activeIndex > 0 && setActiveIndex(activeIndex - 1)}
            disabled={activeIndex === 0}
            activeOpacity={0.7}
          >
            <ChevronLeft
              color={activeIndex === 0 ? 'rgba(255,255,255,0.2)' : Colors.white}
              size={20}
            />
          </TouchableOpacity>

          <View style={styles.sectionTitleWrapper}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              {activeIndex + 1}.{' '}
              {sections[activeIndex]?.title || 'Preview Halaman'}
            </Text>
            <Text style={styles.slideCounterText}>
              Halaman {activeIndex + 1} dari {sections.length}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.navArrowBtn,
              activeIndex === sections.length - 1 && styles.navArrowBtnDisabled,
            ]}
            onPress={() =>
              activeIndex < sections.length - 1 &&
              setActiveIndex(activeIndex + 1)
            }
            disabled={activeIndex === sections.length - 1}
            activeOpacity={0.7}
          >
            <ChevronRight
              color={
                activeIndex === sections.length - 1
                  ? 'rgba(255,255,255,0.2)'
                  : Colors.white
              }
              size={20}
            />
          </TouchableOpacity>
        </View>

        {/* Active PDF WebView */}
        <View style={styles.webviewWrapper}>
          {scaledHtml ? (
            <WebView
              key={`webview-slide-${activeIndex}`}
              source={{ html: scaledHtml }}
              style={{ flex: 1, backgroundColor: '#fff' }}
              scalesPageToFit={true}
              showsVerticalScrollIndicator={true}
              showsHorizontalScrollIndicator={true}
              nestedScrollEnabled={true}
              setBuiltInZoomControls={true}
              setDisplayZoomControls={false}
              allowsInlineMediaPlayback={true}
              allowFileAccess={true}
              allowFileAccessFromFileURLs={true}
              allowUniversalAccessFromFileURLs={true}
              allowingReadAccessToURL="*"
              originWhitelist={['*']}
              androidLayerType="hardware"
            />
          ) : null}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            activeOpacity={0.85}
            onPress={handleEditInspection}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionBtnGradient}
            >
              <Edit3
                color={Colors.white}
                size={18}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.actionBtnText}>Edit</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.downloadBtn]}
            activeOpacity={0.85}
            onPress={handleDownloadPdf}
            disabled={downloading || sharing}
          >
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionBtnGradient}
            >
              {downloading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Download
                    color={Colors.white}
                    size={18}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.actionBtnText}>Download</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.shareBtnInline]}
            activeOpacity={0.85}
            onPress={handleSharePdf}
            disabled={downloading || sharing}
          >
            <LinearGradient
              colors={['#64748B', '#475569']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionBtnGradient}
            >
              {sharing ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Share2
                    color={Colors.white}
                    size={18}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.actionBtnText}>Bagikan</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  backBtnText: {
    ...Typography.button,
    color: Colors.white,
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  readOnlyBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    marginBottom: Spacing.sm,
  },
  readOnlyText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  dotsContainer: {
    marginBottom: Spacing.sm,
  },
  dotsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    gap: 8,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    backgroundColor: Colors.primary,
    borderColor: '#60A5FA',
    transform: [{ scale: 1.08 }],
    ...Shadow.sm,
  },
  dotText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
  },
  dotTextActive: {
    color: Colors.white,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.glassBorder,
  },
  sectionTitleWrapper: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.body,
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
  },
  slideCounterText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 11,
    marginTop: 2,
  },
  navArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  webviewWrapper: {
    flex: 1,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: Colors.glassBorder,
    backgroundColor: '#fff',
    ...Shadow.md,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  actionBtn: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadow.md,
  },
  editBtn: {},
  downloadBtn: {},
  shareBtnInline: {},
  actionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.xl,
  },
  actionBtnText: {
    ...Typography.button,
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
