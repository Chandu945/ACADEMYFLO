import React, { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Text, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../theme';
import type { Colors } from '../theme';
import { useTheme } from './ThemeContext';

type ToastType = 'success' | 'error' | 'info';

type ToastState = {
  message: string;
  type: ToastType;
} | null;

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState>(null);
  const translateY = useRef(new Animated.Value(-100)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const generationRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    // Cancel any pending dismiss
    if (timerRef.current) clearTimeout(timerRef.current);
    if (dismissAnimRef.current) dismissAnimRef.current.stop();
    dismissAnimRef.current = null;

    generationRef.current += 1;
    const gen = generationRef.current;

    setToast({ message, type });
    translateY.setValue(-100);
    Animated.spring(translateY, {
      toValue: 0,
      friction: 8,
      useNativeDriver: true,
    }).start();

    timerRef.current = setTimeout(() => {
      const anim = Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      });
      dismissAnimRef.current = anim;
      anim.start(({ finished }) => {
        // Only clear if this is still the same toast generation
        if (finished && generationRef.current === gen) {
          setToast(null);
        }
      });
    }, 3000);
  }, [translateY]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (dismissAnimRef.current) dismissAnimRef.current.stop();
    };
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  const bgColor = toast
    ? toast.type === 'success'
      ? colors.successBg
      : toast.type === 'error'
        ? colors.dangerBg
        : colors.infoBg
    : colors.infoBg;

  const textColor = toast
    ? toast.type === 'success'
      ? colors.successText
      : toast.type === 'error'
        ? colors.dangerText
        : colors.infoText
    : colors.infoText;

  const borderColor = toast
    ? toast.type === 'success'
      ? colors.successBorder
      : toast.type === 'error'
        ? colors.dangerBorder
        : colors.primary
    : colors.primary;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.toast,
            {
              top: insets.top + spacing.sm,
              backgroundColor: bgColor,
              borderColor,
              transform: [{ translateY }],
            },
          ]}
          pointerEvents="none"
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          <Text style={[styles.toastText, { color: textColor }]} numberOfLines={3}>
            {toast.message}
          </Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.base,
    right: spacing.base,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadows.md,
    zIndex: 9999,
  },
  toastText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    textAlign: 'center',
  },
});
