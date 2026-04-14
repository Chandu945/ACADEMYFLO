export type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN';
};

export type AuthSession = {
  accessToken: string;
  user: AdminUser;
  deviceId: string;
};
