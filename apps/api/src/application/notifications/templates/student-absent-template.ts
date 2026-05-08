export interface StudentAbsentPush {
  title: string;
  body: string;
  data: {
    type: 'STUDENT_ABSENCE';
    academyId: string;
    studentId: string;
    /**
     * Mobile uses this to render the ChildDetail screen header without an
     * extra fetch — Phase B deep-link landing.
     */
    studentName: string;
    batchId: string;
    date: string;
  };
}

export function buildStudentAbsentPush(params: {
  studentName: string;
  academyId: string;
  studentId: string;
  batchId: string;
  date: string;
}): StudentAbsentPush {
  return {
    title: 'Attendance update',
    body: `${params.studentName} was absent from today's coaching session.`,
    data: {
      type: 'STUDENT_ABSENCE',
      academyId: params.academyId,
      studentId: params.studentId,
      studentName: params.studentName,
      batchId: params.batchId,
      date: params.date,
    },
  };
}
