import type { StudentStatus } from '@academyflo/contracts';

function humanReadableStatus(status: StudentStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'INACTIVE':
      return 'Inactive';
    case 'LEFT':
      return 'Left the academy';
  }
}

export interface StudentStatusChangedPush {
  title: string;
  body: string;
  data: {
    type: 'STUDENT_STATUS_CHANGED';
    academyId: string;
    studentId: string;
    studentName: string;
    newStatus: StudentStatus;
    reason: string;
  };
}

/**
 * Push sent to parents linked to a student when the owner changes the
 * student's status (M2 student-management audit fix). Sent alongside the
 * existing email — push is the primary channel for in-app parents, email
 * is the backup for parents who haven't installed the app.
 *
 * Body keeps the reason short (truncated to keep the push within typical
 * device limits). Full reason is visible in the audit log and the
 * student-detail screen.
 */
export function buildStudentStatusChangedPush(params: {
  studentName: string;
  academyId: string;
  studentId: string;
  newStatus: StudentStatus;
  reason: string | null;
}): StudentStatusChangedPush {
  const statusLabel = humanReadableStatus(params.newStatus);
  const reasonSnippet =
    params.reason && params.reason.trim().length > 0
      ? ` — ${params.reason.trim().slice(0, 80)}`
      : '';
  return {
    title: 'Student status updated',
    body: `${params.studentName}'s status changed to ${statusLabel}${reasonSnippet}`,
    data: {
      type: 'STUDENT_STATUS_CHANGED',
      academyId: params.academyId,
      studentId: params.studentId,
      studentName: params.studentName,
      newStatus: params.newStatus,
      reason: params.reason ?? '',
    },
  };
}
