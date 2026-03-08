const PREFIX = 'RNKeychain:';

export async function setGenericPassword(username, password, options) {
  const service = (options && options.service) || 'default';
  localStorage.setItem(PREFIX + service, JSON.stringify({ username, password }));
  return true;
}

export async function getGenericPassword(options) {
  const service = (options && options.service) || 'default';
  const item = localStorage.getItem(PREFIX + service);
  if (!item) return false;
  return JSON.parse(item);
}

export async function resetGenericPassword(options) {
  const service = (options && options.service) || 'default';
  localStorage.removeItem(PREFIX + service);
  return true;
}

export const SECURITY_LEVEL = { ANY: 'ANY', SECURE_SOFTWARE: 'SECURE_SOFTWARE', SECURE_HARDWARE: 'SECURE_HARDWARE' };
export const ACCESSIBLE = { WHEN_UNLOCKED: 'WHEN_UNLOCKED' };
export const STORAGE_TYPE = { AES: 'AES' };

export default {
  setGenericPassword,
  getGenericPassword,
  resetGenericPassword,
  SECURITY_LEVEL,
  ACCESSIBLE,
  STORAGE_TYPE,
};
