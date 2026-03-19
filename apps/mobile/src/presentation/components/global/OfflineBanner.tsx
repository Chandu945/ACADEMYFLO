import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, AppState, AppStateStatus, Platform } from 'react-native';

/**
 * Lightweight offline banner that works without @react-native-community/netinfo.
 *
 * Strategy:
 *  - On web: uses `navigator.onLine` + the "online"/"offline" events.
 *  - On native: performs a lightweight HEAD request whenever the app returns to
 *    the foreground. Install `@react-native-community/netinfo` for a more
 *    responsive native implementation.
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    // --- Web path (react-native-web) ---
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const goOffline = () => setIsOffline(true);
      const goOnline = () => setIsOffline(false);
      setIsOffline(!window.navigator.onLine);
      window.addEventListener('offline', goOffline);
      window.addEventListener('online', goOnline);
      return () => {
        window.removeEventListener('offline', goOffline);
        window.removeEventListener('online', goOnline);
      };
    }

    // --- Native path ---
    const checkConnectivity = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        await fetch('https://clients3.google.com/generate_204', {
          method: 'HEAD',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        setIsOffline(false);
      } catch {
        setIsOffline(true);
      }
    };

    // Check immediately on mount
    checkConnectivity();

    // Re-check each time the app comes back to the foreground
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        checkConnectivity();
      }
      appStateRef.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#dc2626',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
