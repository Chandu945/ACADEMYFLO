export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'OWNER' | 'STAFF' | 'PARENT';
  status: 'ACTIVE' | 'INACTIVE';
  profilePhotoUrl?: string | null;
};

export type LoginRequest = {
  identifier: string;
  password: string;
  deviceId: string;
};

export type SignupRequest = {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  deviceId: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  deviceId: string;
  user: AuthUser;
};

export type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

export type AcademySetupRequest = {
  academyName: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
};

export type AcademySetupResponse = {
  id: string;
  academyName: string;
  address: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
};

export type PasswordResetRequestInput = { email: string };
export type PasswordResetConfirmInput = { email: string; otp: string; newPassword: string };
export type PasswordResetResponse = { message: string };
