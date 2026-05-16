/**
 * Direct-support contact for owners/staff/parents. Surfaced in the More tab
 * under the "Help & Support" section.
 *
 * Hardcoded for now so changes don't require a backend deploy. If/when the
 * contact channels need to vary per build (e.g., regional support lines) or
 * per academy, move this to env config or to a `/api/v1/support` endpoint
 * fetched at app start.
 */

export const SUPPORT_EMAIL = 'academyflo.support@gmail.com';

/**
 * E.164-formatted phone number. The plus prefix is preserved for the dialer
 * (`tel:`) but stripped for the WhatsApp deep link (`wa.me` expects no `+`).
 */
export const SUPPORT_PHONE_E164 = '+919502282115';

/** Pre-built URLs so callers don't have to remember scheme quirks. */
export const SUPPORT_LINKS = {
  email: `mailto:${SUPPORT_EMAIL}`,
  phone: `tel:${SUPPORT_PHONE_E164}`,
  whatsapp: `https://wa.me/${SUPPORT_PHONE_E164.replace(/^\+/, '')}`,
} as const;
