import * as Keychain from 'react-native-keychain';

const SERVICE_KEY = 'com.playconnect.deviceId';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const deviceIdStore = {
  async getDeviceId(): Promise<string> {
    try {
      const credentials = await Keychain.getGenericPassword({ service: SERVICE_KEY });
      if (credentials) return credentials.password;
    } catch {
      // Fall through to generate
    }

    const id = generateUUID();
    try {
      await Keychain.setGenericPassword('deviceId', id, { service: SERVICE_KEY });
    } catch {
      // Keychain write failed — use ephemeral ID for this session
    }
    return id;
  },
};
