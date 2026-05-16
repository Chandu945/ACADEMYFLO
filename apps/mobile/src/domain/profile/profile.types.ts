/**
 * UserProfile mirrors the response of GET /api/v1/profile — the generic
 * per-user endpoint usable by OWNER, STAFF, and (in principle) PARENT.
 *
 * Distinct from `ParentProfile` (which is served by the parent-scoped
 * /api/v1/parent/profile endpoint and does not include role/status).
 * Keeping the two types separate prevents an accidental field merger when
 * one role's response shape later changes.
 */
export type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  status: string;
  profilePhotoUrl: string | null;
};

export type UpdateUserProfileRequest = {
  fullName?: string;
  phoneNumber?: string;
  // email and profilePhotoUrl are intentionally omitted here. The photo flows
  // through ProfilePhotoUploader which calls /api/v1/profile/photo directly;
  // email changes are a separate flow (re-verification) and not exposed in
  // the OwnerProfile screen.
};
