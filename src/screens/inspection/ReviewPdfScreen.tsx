import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  NativeModules,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Download,
  Share2,
  ChevronLeft,
  ChevronRight,
  Check,
  Send,
} from 'lucide-react-native';
import WebView from 'react-native-webview';
import RNHTMLtoPDF, { generatePDF } from 'react-native-html-to-pdf';
import LinearGradient from 'react-native-linear-gradient';

import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../theme';
import { Header, showAlert, AnimatedBackground } from '../../components/common';
import { useInspectionStore } from '../../store/inspectionStore';
import {
  generatePdfSections,
  generateDownloadablePdfHtml,
} from '../../utils/pdfTemplate';
import database from '../../database';
import { resolveAllTelegramUrisInObject } from '../../services/telegramStorage';
import { saveInspectionDirectlyToFirebase } from '../../services/syncService';
import {
  extractSavedPmProfile,
  savePopPmProfile,
} from '../../services/savedPmProfileService';
import { sharePdfFile, cleanPopId } from '../../utils/helpers';
import type { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;

export const ReviewPdfScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [generatedPdfPath, setGeneratedPdfPath] = useState<string>('');
  const [generatedPdfFileName, setGeneratedPdfFileName] = useState<string>('');
  const dotsScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (dotsScrollRef.current) {
      const xOffset = Math.max(0, activeIndex * 44 - (SCREEN_WIDTH / 2 - 40));
      dotsScrollRef.current.scrollTo({ x: xOffset, animated: true });
    }
  }, [activeIndex]);

  const {
    activePopId,
    activePopName,
    activePopLocation,
    currentLocation,
    formData,
    photos,
    editingInspectionId,
    originalInspectionDate,
    resetInspection,
  } = useInspectionStore();

  const mergedFormData = useMemo(
    () => ({
      ...formData,
      infoPop: {
        ...(formData as any)?.infoPop,
        popId: activePopId,
        namaPop: activePopName,
        alamat: activePopLocation || (formData as any)?.infoPop?.alamat,
        latitude: (formData as any)?.infoPop?.latitude || currentLocation?.lat,
        longitude:
          (formData as any)?.infoPop?.longitude || currentLocation?.lng,
      },
    }),
    [formData, activePopId, activePopName, activePopLocation, currentLocation],
  );

  const [resolvedFormData, setResolvedFormData] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    resolveAllTelegramUrisInObject(mergedFormData).then(res => {
      if (isMounted) setResolvedFormData(res);
    });
    return () => {
      isMounted = false;
    };
  }, [mergedFormData]);

  const activeFormData = resolvedFormData || mergedFormData;

  const sections = useMemo(() => {
    return generatePdfSections(
      activePopId,
      activePopName,
      activePopLocation,
      activeFormData,
    );
  }, [activePopId, activePopName, activePopLocation, activeFormData]);

  const downloadableHtml = useMemo(() => {
    return generateDownloadablePdfHtml(
      activePopId,
      activePopName,
      activePopLocation,
      activeFormData,
    );
  }, [activePopId, activePopName, activePopLocation, activeFormData]);

  const currentSection: any = sections[activeIndex] || sections[0];

  // Scale HTML content to fit slide container
  const scaledHtml = useMemo(() => {
    if (!currentSection?.html) return '';
    const pWidth = currentSection.pageWidth || 850;
    const initialScale = (SLIDE_WIDTH / pWidth).toFixed(2);
    return currentSection.html.replace(
      'initial-scale=1.0',
      `initial-scale=${initialScale}`,
    );
  }, [currentSection]);

  useEffect(() => {
    setGeneratedPdfPath('');
    setGeneratedPdfFileName('');
  }, [downloadableHtml]);

  /**
   * Helper untuk membuat atau mengambil file PDF lokal di HP
   */
  const getOrGenerateLocalPdf = async (
    forceFresh = false,
  ): Promise<{
    pdfPath: string;
    pdfFileName: string;
  }> => {
    if (!forceFresh && generatedPdfPath && generatedPdfFileName) {
      return { pdfPath: generatedPdfPath, pdfFileName: generatedPdfFileName };
    }

    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}-${(
      now.getMonth() + 1
    )
      .toString()
      .padStart(2, '0')}-${now.getFullYear()}`;
    const timeStr = `${now.getHours().toString().padStart(2, '0')}${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
    const cleanId = cleanPopId(activePopId || '') || 'POP';
    const safePopId = cleanId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const pdfFileName = `PM_Report_${safePopId}_${dateStr}_${timeStr}`;

    const options = {
      html: downloadableHtml,
      fileName: pdfFileName,
      directory: 'docs',
    };

    let pdfPath = '';
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
      pdfPath = file?.filePath || '';
    } catch (pdfErr: any) {
      console.warn(
        'First generatePDF attempt failed, retrying with forceReset:',
        pdfErr,
      );
      try {
        let file: any = await generatePDF({
          ...options,
          forceReset: true,
        } as any);
        pdfPath = file?.filePath || '';
      } catch (retryErr: any) {
        console.error('Retry generatePDF failed:', retryErr);
        throw new Error(
          'Gagal membuat PDF: ' +
            (retryErr?.message || pdfErr?.message || 'Error konversi PDF'),
        );
      }
    }

    if (!pdfPath) {
      throw new Error('File PDF tidak berhasil dibuat pada perangkat.');
    }

    setGeneratedPdfPath(pdfPath);
    setGeneratedPdfFileName(pdfFileName);
    return { pdfPath, pdfFileName };
  };

  /**
   * 1. SIMPAN: Simpan ke Database Lokal, Upload PDF ke Telegram (1x Saja), dan Sync Firestore
   */
  const handleSaveInspection = async () => {
    setSaving(true);
    try {
      const { pdfPath, pdfFileName } = await getOrGenerateLocalPdf();
      const timestamp = Date.now();
      const inspectionId = editingInspectionId || `insp_${timestamp}`;
      const effectiveInspectionDate = originalInspectionDate || timestamp;

      // 1. Simpan ke database lokal WatermelonDB
      try {
        let existingRecord: any = null;
        if (editingInspectionId) {
          try {
            existingRecord = await database
              .get('inspections')
              .find(editingInspectionId);
          } catch (findErr) {}
        }

        await database.write(async () => {
          if (existingRecord) {
            await existingRecord.update((insp: any) => {
              insp.assetId = activePopId || 'unknown';
              insp.pdfPath = pdfPath;
              insp.formData = JSON.stringify(mergedFormData);
              insp.photos = JSON.stringify(photos || []);
              insp.notes = (mergedFormData as any)?.infoPop?.catatan || '';
              insp.isSynced = false;
            });
          } else {
            await database.get('inspections').create((inspection: any) => {
              inspection._raw.id = inspectionId;
              inspection.assetId = activePopId || 'unknown';
              inspection.inspectorName = 'Teknisi';
              inspection.inspectionDate = effectiveInspectionDate;
              inspection.type = 'PM';
              inspection.status = 'completed';
              inspection.pdfPath = pdfPath;
              inspection.formData = JSON.stringify(mergedFormData);
              inspection.photos = JSON.stringify(photos || []);
              inspection.notes =
                (mergedFormData as any)?.infoPop?.catatan || '';
              inspection.isSynced = false;
            });
          }
        });
      } catch (dbErr) {
        console.warn('Local database save fallback error:', dbErr);
      }

      // Save static profile for this POP for future PMs
      try {
        if (activePopId) {
          const profile = extractSavedPmProfile(mergedFormData);
          await savePopPmProfile(activePopId, profile);
        }
      } catch (profileErr) {
        console.warn('Error saving POP PM profile:', profileErr);
      }

      // 2. Upload PDF ke Telegram (HANYA SEKALI) dan simpan ke Firestore
      try {
        const cloudRes = await saveInspectionDirectlyToFirebase({
          id: inspectionId,
          assetId: activePopId || 'unknown',
          inspectorName: 'Teknisi',
          inspectionDate: effectiveInspectionDate,
          type: 'PM',
          status: 'completed',
          pdfPath: pdfPath,
          formData: mergedFormData,
          photos: photos || [],
          notes: (mergedFormData as any)?.infoPop?.catatan || '',
        });

        // Update local DB with Telegram remote URL & Cloud Sync status
        if (cloudRes) {
          const isUploaded = Boolean(
            cloudRes.isSynced ||
              (cloudRes.remotePdfPath &&
                (cloudRes.remotePdfPath.startsWith('http://') ||
                  cloudRes.remotePdfPath.startsWith('https://'))),
          );
          try {
            const inspRecord = await database
              .get('inspections')
              .find(inspectionId);
            if (inspRecord) {
              await database.write(async () => {
                await inspRecord.update((i: any) => {
                  if (isUploaded) {
                    i.isSynced = true;
                  }
                  if (cloudRes.remotePdfPath) {
                    i.pdfPath = cloudRes.remotePdfPath;
                  }
                  if (
                    cloudRes.remotePhotos &&
                    Array.isArray(cloudRes.remotePhotos) &&
                    cloudRes.remotePhotos.length > 0
                  ) {
                    i.photos = JSON.stringify(cloudRes.remotePhotos);
                  }
                  if (cloudRes.data?.form_data) {
                    i.formData = JSON.stringify(cloudRes.data.form_data);
                  }
                });
              });
            }
          } catch (updateErr) {
            console.warn('Error updating local DB sync status:', updateErr);
          }
        }
      } catch (cloudErr) {
        console.warn('Direct Telegram / Firestore upload error:', cloudErr);
      }

      setSaving(false);
      resetInspection();

      showAlert({
        type: 'success',
        title: 'Laporan Berhasil Disimpan!',
        message:
          'Data inspeksi dan file PDF laporan telah berhasil disimpan serta terkirim ke Channel Telegram.',
        buttons: [
          {
            text: 'OK',
            onPress: () => {
              resetInspection();
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs' as any }],
              });
            },
          },
        ],
      });
    } catch (error: any) {
      console.error('Error in handleSaveInspection:', error);
      setSaving(false);
      showAlert({
        type: 'error',
        title: 'Gagal Menyimpan Laporan',
        message: error?.message || 'Terjadi kesalahan saat menyimpan laporan.',
        buttons: [{ text: 'OK' }],
      });
    }
  };

  /**
   * 2. DOWNLOAD: HANYA download ke folder Download HP (TIDAK kirim ke Telegram)
   */
  const handleDownloadPdfOnly = async () => {
    setDownloading(true);
    try {
      const { pdfPath, pdfFileName } = await getOrGenerateLocalPdf(true);

      if (pdfPath && Platform.OS === 'android' && NativeModules.PdfDownloader) {
        try {
          await NativeModules.PdfDownloader.saveToDownloads(
            pdfPath,
            pdfFileName,
          );
        } catch (downloadErr) {
          console.warn('Save to downloads notice:', downloadErr);
        }
      }

      setDownloading(false);

      showAlert({
        type: 'success',
        title: 'Unduhan Berhasil',
        message:
          'Laporan berhasil diunduh dan disimpan ke folder Download perangkat Anda.',
        buttons: [{ text: 'OK' }],
      });
    } catch (error: any) {
      console.error('Error in handleDownloadPdfOnly:', error);
      setDownloading(false);
      showAlert({
        type: 'error',
        title: 'Gagal Mengunduh',
        message:
          'Gagal mengunduh: ' + (error?.message || 'Terjadi kesalahan sistem'),
        buttons: [{ text: 'OK' }],
      });
    }
  };

  /**
   * 3. BAGIKAN: HANYA membuka dialog share HP / WhatsApp (TIDAK kirim ke Telegram)
   */
  const handleSharePdfOnly = async () => {
    setSharing(true);
    try {
      const { pdfPath } = await getOrGenerateLocalPdf();
      setSharing(false);

      if (pdfPath) {
        try {
          await sharePdfFile(
            pdfPath,
            `Laporan PM - ${activePopName || 'POP'}`,
            `Berikut file laporan PM untuk POP ${activePopName || ''}`,
          );
        } catch (shareErr) {
          console.warn('Share PDF error:', shareErr);
        }
      }
    } catch (error: any) {
      console.error('Error in handleSharePdfOnly:', error);
      setSharing(false);
      showAlert({
        type: 'error',
        title: 'Gagal Membagikan',
        message:
          'Gagal membagikan: ' + (error?.message || 'Terjadi kesalahan sistem'),
        buttons: [{ text: 'OK' }],
      });
    }
  };

  const isBusy = saving || downloading || sharing;

  return (
    <AnimatedBackground>
      <View style={styles.container}>
      {/* Header */}
      <Header
        title="Review Laporan"
        subtitle={
          activePopName ? `POP: ${activePopName}` : 'Preview Laporan PM'
        }
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
            {sections.map((_, idx) => {
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
            style={[styles.navBtn, activeIndex === 0 && styles.navBtnDisabled]}
            disabled={activeIndex === 0}
            onPress={() => setActiveIndex(i => Math.max(0, i - 1))}
          >
            <ChevronLeft
              color={activeIndex === 0 ? Colors.textMuted : Colors.text}
              size={20}
            />
          </TouchableOpacity>

          <Text style={styles.sectionTitleText} numberOfLines={1}>
            {currentSection?.title || 'Preview Laporan'}
          </Text>

          <TouchableOpacity
            style={[
              styles.navBtn,
              activeIndex === sections.length - 1 && styles.navBtnDisabled,
            ]}
            disabled={activeIndex === sections.length - 1}
            onPress={() =>
              setActiveIndex(i => Math.min(sections.length - 1, i + 1))
            }
          >
            <ChevronRight
              color={
                activeIndex === sections.length - 1
                  ? Colors.textMuted
                  : Colors.text
              }
              size={20}
            />
          </TouchableOpacity>
        </View>

        {/* Slide Preview Box */}
        <View style={styles.previewBox}>
          {scaledHtml ? (
            <WebView
              key={`preview-section-${activeIndex}`}
              source={{ html: scaledHtml }}
              style={styles.webView}
              scalesPageToFit={true}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
              showsHorizontalScrollIndicator={true}
              javaScriptEnabled={true}
              domStorageEnabled={true}
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

        {/* ─── ACTION BUTTONS: SIMPAN, DOWNLOAD, BAGIKAN (1 BARIS) ─── */}
        <View style={styles.actionsContainer}>
          {/* Tombol Simpan */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.saveBtn]}
            activeOpacity={0.85}
            onPress={handleSaveInspection}
            disabled={isBusy}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionBtnGradient}
            >
              {saving ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Check
                    color={Colors.white}
                    size={16}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.actionBtnText}>Simpan</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Tombol Download */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.downloadBtn]}
            activeOpacity={0.85}
            onPress={handleDownloadPdfOnly}
            disabled={isBusy}
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
                    size={16}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.actionBtnText}>Download</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Tombol Bagikan */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.shareBtn]}
            activeOpacity={0.85}
            onPress={handleSharePdfOnly}
            disabled={isBusy}
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
                    size={16}
                    style={{ marginRight: 4 }}
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
  contentContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
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
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
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
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  navBtn: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  sectionTitleText: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '700',
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  previewBox: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    ...Shadow.md,
  },
  webView: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  saveBtn: {},
  downloadBtn: {},
  shareBtn: {},
  actionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.xs,
  },
  actionBtnText: {
    ...Typography.bodySmall,
    color: Colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
});
