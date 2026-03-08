import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip } from '../ui/Chip';
import type { StudentStatus, FeeFilter } from '../../../domain/student/student.types';
import { spacing } from '../../theme';

type StudentsFiltersProps = {
  statusFilter: StudentStatus | undefined;
  onStatusChange: (status: StudentStatus | undefined) => void;
  feeFilter: FeeFilter | undefined;
  onFeeFilterChange: (filter: FeeFilter | undefined) => void;
};

const STATUS_OPTIONS: { label: string; value: StudentStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'Left', value: 'LEFT' },
];

const FEE_OPTIONS: { label: string; value: FeeFilter | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Due', value: 'DUE' },
  { label: 'Paid', value: 'PAID' },
];

export function StudentsFilters({
  statusFilter,
  onStatusChange,
  feeFilter,
  onFeeFilterChange,
}: StudentsFiltersProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row} testID="status-filters">
        {STATUS_OPTIONS.map((opt) => (
          <Chip
            key={opt.label}
            label={opt.label}
            selected={statusFilter === opt.value}
            onPress={() => onStatusChange(opt.value)}
            testID={`status-chip-${opt.label.toLowerCase()}`}
          />
        ))}
      </View>
      <View style={styles.row} testID="fee-filters">
        {FEE_OPTIONS.map((opt) => (
          <Chip
            key={opt.label}
            label={opt.label}
            selected={feeFilter === opt.value}
            onPress={() => onFeeFilterChange(opt.value)}
            testID={`fee-chip-${opt.label.toLowerCase()}`}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
