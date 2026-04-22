export type BankDetails = {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName: string;
};

export type InstituteInfo = {
  signatureStampUrl: string | null;
  bankDetails: BankDetails | null;
  upiId: string | null;
  upiHolderName: string | null;
  qrCodeImageUrl: string | null;
  manualPaymentsEnabled: boolean;
};

export type UpdateInstituteInfoRequest = {
  bankDetails?: BankDetails | null;
  upiId?: string | null;
  upiHolderName?: string | null;
  manualPaymentsEnabled?: boolean;
};
