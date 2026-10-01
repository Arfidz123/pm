/**
 * Checklist Screen
 * Dynamic checklist form based on the asset's template
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import {
  Header,
  Card,
  Button,
  StatusBadge,
  Input,
} from '../../components/common';
import {
  useInspectionStore,
  ChecklistEntry,
} from '../../store/inspectionStore';
import type { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ChecklistScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const { inspectionId } = route.params;
  const { checklistEntries, updateChecklistEntry } = useInspectionStore();

  const completedCount = checklistEntries.filter(
    (e: ChecklistEntry) => e.value !== '' || e.status !== 'na',
  ).length;
  const totalCount = checklistEntries.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleContinue = () => {
    navigation.navigate('Review', { inspectionId });
  };

  const renderChecklistItem = (entry: ChecklistEntry, index: number) => {
    return (
      <Card key={index} style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.itemLabelRow}>
            <Text style={styles.itemIndex}>{index + 1}</Text>
            <View style={styles.itemLabelContainer}>
              <Text style={styles.itemLabel}>{entry.label}</Text>
              {entry.required && <Text style={styles.requiredStar}>*</Text>}
            </View>
          </View>
          {entry.status !== 'na' && (
            <StatusBadge status={entry.status} size="sm" />
          )}
        </View>

        {/* Render input based on type */}
        {entry.type === 'pass_fail' && (
          <PassFailInput
            value={entry.value}
            onChange={val => {
              updateChecklistEntry(index, {
                value: val,
                status: !val ? 'na' : val === 'true' ? 'ok' : 'critical',
              });
            }}
          />
        )}

        {entry.type === 'numeric' && (
          <NumericInput
            value={entry.value}
            unit={entry.unit}
            minValue={entry.minValue}
            maxValue={entry.maxValue}
            onChange={val => updateChecklistEntry(index, { value: val })}
          />
        )}

        {entry.type === 'text' && (
          <TextInput
            style={styles.textInput}
            placeholder="Masukkan teks..."
            placeholderTextColor={Colors.textMuted}
            value={entry.value}
            onChangeText={val =>
              updateChecklistEntry(index, {
                value: val,
                status: val ? 'ok' : 'na',
              })
            }
            multiline
          />
        )}

        {entry.type === 'select' && (
          <SelectInput
            options={entry.options}
            value={entry.value}
            onChange={val =>
              updateChecklistEntry(index, { value: val, status: 'ok' })
            }
          />
        )}

        {entry.type === 'photo' && (
          <TouchableOpacity style={styles.photoInput}>
            <Text style={styles.photoInputIcon}>📸</Text>
            <Text style={styles.photoInputText}>Ambil Foto</Text>
          </TouchableOpacity>
        )}

        {/* Optional notes for this item */}
        {entry.value !== '' && (
          <TextInput
            style={styles.itemNotes}
            placeholder="Catatan tambahan..."
            placeholderTextColor={Colors.textMuted}
            value={entry.notes}
            onChangeText={val => updateChecklistEntry(index, { notes: val })}
          />
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Checklist PM"
        subtitle={`${completedCount}/${totalCount} item terisi`}
        onBack={() => navigation.goBack()}
      />

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress}%`,
                backgroundColor:
                  progress === 100
                    ? Colors.success
                    : progress > 50
                    ? Colors.info
                    : Colors.warning,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {checklistEntries.map((entry: ChecklistEntry, index: number) =>
          renderChecklistItem(entry, index),
        )}

        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          <View style={styles.stepDots}>
            <View style={[styles.dot, styles.dotCompleted]} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={[styles.dot, styles.dotInactive]} />
            <View style={[styles.dot, styles.dotInactive]} />
          </View>
          <Text style={styles.stepText}>Langkah 2 dari 4</Text>
        </View>

        <Button
          title="Lanjut ke Review →"
          onPress={handleContinue}
          variant="primary"
          size="lg"
          fullWidth
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// ===== Sub-components =====

const PassFailInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
}> = ({ value, onChange }) => (
  <View style={styles.passFailContainer}>
    <TouchableOpacity
      style={[styles.passFailButton, value === 'true' && styles.passButton]}
      onPress={() => onChange(value === 'true' ? '' : 'true')}
    >
      <Text style={[styles.passFailText, value === 'true' && styles.passText]}>
        ✓ PASS
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.passFailButton, value === 'false' && styles.failButton]}
      onPress={() => onChange(value === 'false' ? '' : 'false')}
    >
      <Text style={[styles.passFailText, value === 'false' && styles.failText]}>
        ✗ FAIL
      </Text>
    </TouchableOpacity>
  </View>
);

const NumericInput: React.FC<{
  value: string;
  unit: string;
  minValue: number | null;
  maxValue: number | null;
  onChange: (val: string) => void;
}> = ({ value, unit, minValue, maxValue, onChange }) => (
  <View>
    <View style={styles.numericRow}>
      <TextInput
        style={styles.numericInput}
        placeholder="0"
        placeholderTextColor={Colors.textMuted}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
      />
    </View>
    {minValue !== null && maxValue !== null && (
      <Text style={styles.rangeHint}>
        Range normal: {minValue} - {maxValue}
      </Text>
    )}
  </View>
);

const SelectInput: React.FC<{
  options: string[];
  value: string;
  onChange: (val: string) => void;
}> = ({ options, value, onChange }) => (
  <View style={styles.selectContainer}>
    {options.map(option => (
      <TouchableOpacity
        key={option}
        style={[
          styles.selectOption,
          value === option && styles.selectOptionActive,
        ]}
        onPress={() => onChange(value === option ? '' : option)}
      >
        <Text
          style={[
            styles.selectOptionText,
            value === option && styles.selectOptionTextActive,
          ]}
        >
          {option}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    marginRight: Spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    ...Typography.labelSmall,
    color: Colors.textSecondary,
    width: 40,
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  itemCard: {
    marginBottom: Spacing.lg,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  itemLabelRow: {
    flexDirection: 'row',
    flex: 1,
  },
  itemIndex: {
    ...Typography.labelSmall,
    color: Colors.textMuted,
    width: 24,
    marginRight: Spacing.sm,
  },
  itemLabelContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  itemLabel: {
    ...Typography.label,
    color: Colors.text,
    flex: 1,
  },
  requiredStar: {
    color: Colors.danger,
    marginLeft: 2,
  },

  // Pass/Fail
  passFailContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  passFailButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  passButton: {
    backgroundColor: Colors.statusOk,
    borderColor: Colors.success,
  },
  failButton: {
    backgroundColor: Colors.statusCritical,
    borderColor: Colors.danger,
  },
  passFailText: {
    ...Typography.button,
    color: Colors.textSecondary,
  },
  passText: {
    color: Colors.success,
  },
  failText: {
    color: Colors.danger,
  },

  // Numeric
  numericRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numericInput: {
    flex: 1,
    ...Typography.h4,
    color: Colors.text,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unitText: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginLeft: Spacing.md,
    minWidth: 30,
  },
  rangeHint: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },

  // Text input
  textInput: {
    ...Typography.body,
    color: Colors.text,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 60,
    textAlignVertical: 'top',
  },

  // Select
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  selectOption: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryLight,
  },
  selectOptionText: {
    ...Typography.labelSmall,
    color: Colors.textSecondary,
  },
  selectOptionTextActive: {
    color: Colors.white,
  },

  // Photo input
  photoInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  photoInputIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  photoInputText: {
    ...Typography.label,
    color: Colors.textSecondary,
  },

  // Item notes
  itemNotes: {
    ...Typography.caption,
    color: Colors.text,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginTop: Spacing.sm,
  },

  // Step indicator
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
