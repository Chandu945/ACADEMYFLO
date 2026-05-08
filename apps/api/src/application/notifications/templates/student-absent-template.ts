export interface StudentAbsentPush {
  title: string;
  body: string;
  data: {
    type: 'STUDENT_ABSENCE';
    academyId: string;
    studentId: string;
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
      batchId: params.batchId,
      date: params.date,
    },
  };
}
