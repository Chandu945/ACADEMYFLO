export type AcademySettings = {
  defaultDueDateDay: number;
  receiptPrefix: string;
};

export type UpdateAcademySettingsRequest = {
  defaultDueDateDay?: number;
  receiptPrefix?: string;
};
