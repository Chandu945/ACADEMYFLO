import React from 'react';
import type { StaffStatus } from '../../../domain/staff/staff.types';
import { Badge } from '../ui/Badge';

type StaffStatusBadgeProps = {
  status: StaffStatus;
};

const VARIANT: Record<StaffStatus, 'success' | 'warning'> = {
  ACTIVE: 'success',
  INACTIVE: 'warning',
};

export function StaffStatusBadge({ status }: StaffStatusBadgeProps) {
  return <Badge label={status} variant={VARIANT[status]} dot uppercase />;
}
