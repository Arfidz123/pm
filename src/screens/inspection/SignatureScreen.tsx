/**
 * Signature Screen
 * Digital signature capture and final submission
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { Header, Button, showAlert } from '../../components/common';
import {
  useInspectionStore,
  ChecklistEntry,
} from '../../store/inspectionStore';
import { useAppStore } from '../../store/appStore';
import database from '../../database';
import { Inspection, InspectionItem, Asset } from '../../database/models';
import { generateInspectionPDF } from '../../services/pdf';
import type { RootStackParamList } from '../../types';
import { syncInspectionsToFirebase } from '../../services/syncService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SignatureScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const { inspectionId } = route.params;
  const { currentAssetId, checklistEntries, photos, notes, resetInspection } =
    useInspectionStore();
  const { inspectorName, companyName } = useAppStore();
  const [signed, setSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSign = () => {
    // Placeholder for actual signature canvas
    // In production, use react-native-signature-canvas
    setSigned(true);
  };

  const handleClearSignature = () => {
    setSigned(false);
  };

  const handleSubmit = async () => {
    if (!signed) {
      showAlert({
        type: 'warning',
        title: 'Perhatian',
        message: 'Silakan tanda tangan terlebih dahulu',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Save inspection items to database
      await database.write(async () => {
        // Create inspection items
        for (const entry of checklistEntries) {
          await database
            .get<InspectionItem>('inspection_items')
            .create((item: any) => {
              item.inspectionId = inspectionId;
              item.templateItemId = entry.templateItemId;
              item.label = entry.label;
              item.type = entry.type;
              item.value = entry.value;
              item.unit = entry.unit;
              item.status = entry.status;
              item.photoPath = entry.photoPath;
              item.notes = entry.notes;
              item.sortOrder = entry.order;
            });
        }

        // Update inspection status
        const inspection = await database
          .get<Inspection>('inspections')
          .find(inspectionId);
        await inspection.update((i: any) => {
          i.status = 'completed';
          i.notes = notes;
          i.signaturePath = 'signed';
          i.photos = JSON.stringify(photos);
        });
      });

      // Generate PDF
      try {
        if (currentAssetId) {
          const asset = await database
            .get<Asset>('assets')
            .find(currentAssetId);

          const pdfPath = await generateInspectionPDF({
            inspectorName: inspectorName || 'Teknisi',
            inspectionDate: Date.now(),
            type: 'preventive',
            notes,
            asset: {
              assetCode: asset.assetCode,
              name: asset.name,
              category: asset.category,
              location: asset.location,
              manufacturer: asset.manufacturer,
              model: asset.assetModel,
              serialNumber: asset.serialNumber,
              specifications: asset.specs,
            },
            items: checklistEntries.map((e: ChecklistEntry) => ({
              label: e.label,
              value: e.value,
              unit: e.unit,
              status: e.status,
              notes: e.notes,
              type: e.type,
            })),
            photosPaths: photos,
            signaturePath: 'signed',
            companyName: companyName || '',
          });

          // Save PDF path to inspection
          await database.write(async () => {
            const inspection = await database
              .get<Inspection>('inspections')
              .find(inspectionId);
            await inspection.update((i: any) => {
              i.pdfPath = pdfPath;
            });
          });
        }
      } catch (pdfError) {
        console.warn('PDF generation failed:', pdfError);
        // Don't block submission if PDF fails
      }

      resetInspection();

      // Trigger sync in background without awaiting or blocking UI
      syncInspectionsToFirebase().catch(err => {
        console.warn('Background Firebase sync failed:', err);
      });

      showAlert({
        type: 'success',
        title: '✅ PM Selesai!',
        message: 'Data PM berhasil disimpan dan laporan PDF telah dibuat.',
        buttons: [
          {
            text: 'Lihat Detail',
            onPress: () =>
              navigation.navigate('InspectionDetail', { inspectionId }),
          },
          {
            text: 'Ke Dashboard',
            onPress: () => navigation.navigate('MainTabs'),
          },
        ],
      });
    } catch (error) {
      console.error('Error submitting inspection:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Gagal menyimpan data. Silakan coba lagi.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Tanda Tangan"
        subtitle="Verifikasi dan submit laporan"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.content}>
        <Text style={styles.instruction}>
          Tanda tangan di bawah sebagai konfirmasi bahwa pengerjaan telah
          dilakukan dengan benar.
        </Text>

        {/* Signature Canvas Placeholder */}
        <TouchableOpacity
          style={[
            styles.signatureCanvas,
            signed && styles.signatureCanvasSigned,
          ]}
          onPress={handleSign}
          activeOpacity={0.7}
        >
          {signed ? (
            <View style={styles.signedContent}>
              <Text style={styles.signedCheck}>✓</Text>
              <Text style={styles.signedName}>
                {inspectorName || 'Teknisi'}
              </Text>
              <Text style={styles.signedDate}>
                {new Date().toLocaleDateString('id-ID', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </View>
          ) : (
            <View style={styles.unsignedContent}>
              <Text style={styles.signatureIcon}>✍️</Text>
              <Text style={styles.signaturePrompt}>
                Ketuk untuk Tanda Tangan
              </Text>
              <Text style={styles.signatureHint}>
                Tanda tangan digital akan ditambahkan ke laporan PDF
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {signed && (
          <TouchableOpacity
            onPress={handleClearSignature}
            style={styles.clearButton}
          >
            <Text style={styles.clearText}>Hapus Tanda Tangan</Text>
          </TouchableOpacity>
        )}

        <View style={styles.spacer} />

        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          <View style={styles.stepDots}>
            <View style={[styles.dot, styles.dotCompleted]} />
            <View style={[styles.dot, styles.dotCompleted]} />
            <View style={[styles.dot, styles.dotCompleted]} />
            <View style={[styles.dot, styles.dotActive]} />
          </View>
          <Text style={styles.stepText}>Langkah 4 dari 4</Text>
        </View>

        <Button
          title="✅ Submit Laporan"
          onPress={handleSubmit}
          variant="primary"
          size="lg"
          fullWidth
          loading={submitting}
          disabled={!signed}
        />

        <Button
          title="Kembali ke Review"
          onPress={() => navigation.goBack()}
          variant="ghost"
          size="sm"
          fullWidth
          style={{ marginTop: Spacing.md }}
        />
      </View>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  instruction: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  signatureCanvas: {
    height: 200,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signatureCanvasSigned: {
    borderColor: Colors.success,
    borderStyle: 'solid',
    backgroundColor: Colors.statusOk,
  },
  unsignedContent: {
    alignItems: 'center',
  },
  signatureIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  signaturePrompt: {
    ...Typography.h4,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  signatureHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  signedContent: {
    alignItems: 'center',
  },
  signedCheck: {
    fontSize: 40,
    color: Colors.success,
    marginBottom: Spacing.sm,
  },
  signedName: {
    ...Typography.h4,
    color: Colors.success,
  },
  signedDate: {
    ...Typography.caption,
    color: Colors.successDark,
    marginTop: Spacing.xs,
  },
  clearButton: {
    alignSelf: 'center',
    marginTop: Spacing.md,
    padding: Spacing.sm,
  },
  clearText: {
    ...Typography.labelSmall,
    color: Colors.danger,
  },
  spacer: {
    flex: 1,
  },
  stepIndicator: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
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
