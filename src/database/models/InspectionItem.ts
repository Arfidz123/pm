/**
 * InspectionItem Model - WatermelonDB
 * Represents a single filled item from a checklist
 */

import { Model } from '@nozbe/watermelondb';
import { field, text, relation } from '@nozbe/watermelondb/decorators';
import type { ChecklistItemType, ItemStatus } from '../../types';

export default class InspectionItem extends Model {
  static table = 'inspection_items';

  static associations = {
    inspections: { type: 'belongs_to' as const, key: 'inspection_id' },
  };

  @text('inspection_id') inspectionId!: string;
  @text('template_item_id') templateItemId!: string;
  @text('category') category!: string;
  @text('label') label!: string;
  @text('type') type!: ChecklistItemType;
  @text('value') value!: string;
  @text('unit') unit!: string;
  @text('status') status!: ItemStatus;
  @text('photo_path') photoPath!: string;
  @text('notes') notes!: string;
  @field('sort_order') sortOrder!: number;

  @relation('inspections', 'inspection_id') inspection: any;

  /** Get status label */
  get statusLabel(): string {
    const labels: Record<ItemStatus, string> = {
      ok: 'OK',
      warning: 'Perhatian',
      critical: 'Kritis',
      na: 'N/A',
    };
    return labels[this.status] || this.status;
  }

  /** Get display value with unit */
  get displayValue(): string {
    if (this.type === 'pass_fail') {
      return this.value === 'true' ? 'PASS ✓' : 'FAIL ✗';
    }
    if (this.unit) {
      return `${this.value} ${this.unit}`;
    }
    return this.value;
  }
}
