/**
 * Capture Photo Screen
 * Simplified camera screen for taking asset photos
 * Uses a placeholder since vision-camera needs native setup
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { Header, Button, Card, showAlert } from '../../components/common';
import { useInspectionStore } from '../../store/inspectionStore';
import { useAppStore } from '../../store/appStore';
import database from '../../database';
import { Asset, ChecklistItem, Inspection } from '../../database/models';
import type { RootStackParamList } from '../../types';
import type { ChecklistEntry } from '../../store/inspectionStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const CapturePhotoScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const { assetId } = route.params;
  const {
    photos,
    addPhoto,
    removePhoto,
    setChecklistEntries,
    setInspectionId,
  } = useInspectionStore();
  const { inspectorName } = useAppStore();
  const [loading, setLoading] = useState(false);

  const handleTakePhoto = () => {
    // Placeholder - in production this would use react-native-vision-camera
    // or react-native-image-picker
    const mockPhotoPath = `photo_${Date.now()}.jpg`;
    addPhoto(mockPhotoPath);
  };

  const handleContinue = async () => {
    setLoading(true);
    try {
      // Load the asset to get its template
      const asset = await database.get<Asset>('assets').find(assetId);

      // Create inspection record
      const inspection = await database.write(async () => {
        return await database
          .get<Inspection>('inspections')
          .create((i: any) => {
            i.assetId = assetId;
            i.inspectorName = inspectorName || 'Teknisi';
            i.inspectionDate = Date.now();
            i.type = 'preventive';
            i.status = 'in_progress';
            i.photos = JSON.stringify(photos);
            i.notes = '';
            i.signaturePath = '';
            i.pdfPath = '';
          });
      });

      setInspectionId(inspection.id);

      // Load checklist template items
      if (asset.checklistTemplateId) {
        const templateItems = await database
          .get<ChecklistItem>('checklist_items')
          .query()
          .fetch();

        const items = templateItems
          .filter(
            (ti: ChecklistItem) => ti.templateId === asset.checklistTemplateId,
          )
          .sort(
            (a: ChecklistItem, b: ChecklistItem) => a.sortOrder - b.sortOrder,
          );

        const entries: ChecklistEntry[] = items.map((item: ChecklistItem) => ({
          templateItemId: item.id,
          category: item.category,
          label: item.label,
          type: item.type as any,
          value: '',
          unit: item.unit,
          status: 'na' as const,
          photoPath: '',
          notes: '',
          order: item.sortOrder,
          minValue: item.minValue,
          maxValue: item.maxValue,
          options: item.optionsList,
          required: item.isRequired,
        }));

        setChecklistEntries(entries);
      }

      navigation.navigate('Checklist', {
        assetId,
        inspectionId: inspection.id,
      });
    } catch (error) {
      console.error('Error preparing checklist:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Gagal mempersiapkan checklist',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Dokumentasi Foto"
        subtitle="Ambil foto kondisi aset saat ini"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.content}>
        {/* Camera area placeholder */}
        <TouchableOpacity
          style={styles.cameraArea}
          onPress={handleTakePhoto}
          activeOpacity={0.7}
        >
          <Text style={styles.cameraIcon}>📸</Text>
          <Text style={styles.cameraTitle}>Ketuk untuk Mengambil Foto</Text>
          <Text style={styles.cameraSubtitle}>
            Ambil foto kondisi aset sebelum pengerjaan
          </Text>
        </TouchableOpacity>

        {/* Photo thumbnails */}
        {photos.length > 0 && (
          <View style={styles.photoSection}>
            <Text style={styles.photoCount}>{photos.length} foto diambil</Text>
            <FlatList
              horizontal
              data={photos}
              keyExtractor={(_, index) => index.toString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoList}
              renderItem={({ item, index }) => (
                <View style={styles.photoThumb}>
                  <View style={styles.photoPlaceholder}>
                    <Text style={styles.photoPlaceholderText}>📷</Text>
                    <Text style={styles.photoIndex}>#{index + 1}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removePhoto}
                    onPress={() => removePhoto(index)}
                  >
                    <Text style={styles.removePhotoIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        )}

        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          <View style={styles.stepDots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={[styles.dot, styles.dotInactive]} />
            <View style={[styles.dot, styles.dotInactive]} />
            <View style={[styles.dot, styles.dotInactive]} />
          </View>
          <Text style={styles.stepText}>Langkah 1 dari 4</Text>
        </View>

        {/* Continue Button */}
        <Button
          title="Lanjut ke Checklist →"
          onPress={handleContinue}
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
        />

        <Button
          title="Lewati Foto"
          onPress={handleContinue}
          variant="ghost"
          size="sm"
          fullWidth
          loading={loading}
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
    paddingTop: Spacing.lg,
  },
  cameraArea: {
    flex: 1,
    maxHeight: 300,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  cameraIcon: {
    fontSize: 56,
    marginBottom: Spacing.md,
  },
  cameraTitle: {
    ...Typography.h4,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  cameraSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  photoSection: {
    marginBottom: Spacing.lg,
  },
  photoCount: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  photoList: {
    gap: Spacing.sm,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  photoPlaceholderText: {
    fontSize: 24,
  },
  photoIndex: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  removePhoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoIcon: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
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
  dotInactive: {
    backgroundColor: Colors.border,
  },
  stepText: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
});
