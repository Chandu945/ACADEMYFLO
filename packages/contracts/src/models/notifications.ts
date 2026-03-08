export interface FeeReminderRunSummary {
  runDate: string;
  targetDueDate: string;
  totalDuesFound: number;
  academiesProcessed: number;
  academiesSkipped: number;
  emailsSent: number;
  emailsFailed: number;
  studentsSkippedNoEmail: number;
}
