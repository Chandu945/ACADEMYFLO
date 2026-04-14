import React, { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { View, Text, Animated, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../components/ui/AppIcon';
import { spacing, fontSizes, fontWeights, radius } from '../theme';
import type { Colors } from '../theme';
import { useTheme } from './ThemeContext';

type ToastType = 'success' | 'error' | 'info';

type ToastItem = {
  message: string;
  type: ToastType;
};

const MAX_QUEUE_SIZE = 3;
const TOAST_DURATION = 2800;

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const ICON_MAP: Record<ToastType, string> = {
  success: 'check-circle',
  error: 'alert-circle',
  info: 'information',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isShowingRef = useRef(false);

  const showNext = useCallback(() => {
    setQueue((prev) => {
      if (prev.length <= 1) {
        isShowingRef.current = false;
        return [];
      }
      return prev.slice(1);
    });
  }, []);

  const presentToast = useCallback(() => {
    isShowingRef.current = true;
    translateY.setValue(80);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        friction: 9,
        tension: 65,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 80,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) showNext();
      });
    }, TOAST_DURATION);
  }, [translateY, opacity, showNext]);

  useEffect(() => {
    if (queue.length > 0 && !isShowingRef.current) {
      presentToast();
    }
  }, [queue, presentToast]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setQueue((prev) => {
      const newItem: ToastItem = { message, type };
      if (prev.length === 0) return [newItem];
      let next = [...prev, newItem];
      if (next.length > MAX_QUEUE_SIZE) {
        next = [next[0]!, ...next.slice(next.length - (MAX_QUEUE_SIZE - 1))];
      }
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);
  const currentToast = queue.length > 0 ? queue[0]! : null;

  const getToastColors = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          bg: isDark ? '#065f46' : '#059669',
          icon: '#ffffff',
          text: '#ffffff',
        };
      case 'error':
        return {
          bg: isDark ? '#7f1d1d' : '#dc2626',
          icon: '#ffffff',
          text: '#ffffff',
        };
      case 'info':
        return {
          bg: isDark ? '#1e3a5f' : '#2563eb',
          icon: '#ffffff',
          text: '#ffffff',
        };
    }
  };

  const toastColors = currentToast ? getToastColors(currentToast.type) : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {currentToast && toastColors && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              bottom: Math.max(insets.bottom, spacing.base) + 60,
              opacity,
              transform: [{ translateY }],
            },
          ]}
          pointerEvents="none"
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          <View style={[styles.toast, { backgroundColor: toastColors.bg }]}>
            <View style={styles.iconContainer}>
              <AppIcon name={ICON_MAP[currentToast.type]} size={20} color={toastColors.icon} />
            </View>
            <Text style={[styles.toastText, { color: toastColors.text }]} numberOfLines={2}>
              {currentToast.message}
            </Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const makeStyles = (_colors: Colors, _isDark: boolean) => StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    maxWidth: '85%',
    minWidth: 200,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
    }),
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  toastText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    flexShrink: 1,
  },
});
