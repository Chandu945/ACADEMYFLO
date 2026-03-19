import * as Keychain from 'react-native-keychain';

const SERVICE_KEY = 'com.playconnect.deviceId';

let _cachedDeviceId: string | null = null;

function generateUUID(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const deviceIdStore = {
  async getDeviceId(): Promise<string> {
    if (_cachedDeviceId) return _cachedDeviceId;

    try {
      const credentials = await Keychain.getGenericPassword({ service: SERVICE_KEY });
      if (credentials) {
        _cachedDeviceId = credentials.password;
        return _cachedDeviceId;
      }
    } catch {
      // Fall through to generate
    }

    const id = generateUUID();
    _cachedDeviceId = id;
    try {
      await Keychain.setGenericPassword('deviceId', id, { service: SERVICE_KEY });
    } catch {
      // Keychain write failed — use ephemeral ID for this session
    }
    return id;
  },
};
