import React, { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Text, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../theme';
import type { Colors } from '../theme';
import { useTheme } from './ThemeContext';

type ToastType = 'success' | 'error' | 'info';

type ToastItem = {
  message: string;
  type: ToastType;
};

const MAX_QUEUE_SIZE = 3;

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
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const translateY = useRef(new Animated.Value(-100)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const isShowingRef = useRef(false);

  const dismissCurrent = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (dismissAnimRef.current) dismissAnimRef.current.stop();
    dismissAnimRef.current = null;
    timerRef.current = null;
  }, []);

  const showNext = useCallback(() => {
    setQueue((prev) => {
      if (prev.length <= 1) {
        // No more items after current; clear everything
        isShowingRef.current = false;
        return [];
      }
      // Remove the first item (current) and the next will be displayed via the effect
      return prev.slice(1);
    });
  }, []);

  const presentToast = useCallback(() => {
    isShowingRef.current = true;
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
        if (finished) {
          showNext();
        }
      });
    }, 3000);
  }, [translateY, showNext]);

  // When queue changes and we're not currently showing, present the first item
  useEffect(() => {
    if (queue.length > 0 && !isShowingRef.current) {
      presentToast();
    }
  }, [queue, presentToast]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setQueue((prev) => {
      const newItem: ToastItem = { message, type };
      // If already showing, dismiss current animation timers so the new queue kicks in
      if (prev.length === 0) {
        // Queue is empty, just add — effect will present it
        return [newItem];
      }
      // Already showing; push to queue
      let next = [...prev, newItem];
      // Enforce max queue size (drop oldest queued, but keep the currently-showing first item)
      if (next.length > MAX_QUEUE_SIZE) {
        // Keep first (currently showing) + last (MAX_QUEUE_SIZE - 1) items
        next = [next[0]!, ...next.slice(next.length - (MAX_QUEUE_SIZE - 1))];
      }
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      dismissCurrent();
    };
  }, [dismissCurrent]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  const currentToast = queue.length > 0 ? queue[0]! : null;

  const bgColor = currentToast
    ? currentToast.type === 'success'
      ? colors.successBg
      : currentToast.type === 'error'
        ? colors.dangerBg
        : colors.infoBg
    : colors.infoBg;

  const textColor = currentToast
    ? currentToast.type === 'success'
      ? colors.successText
      : currentToast.type === 'error'
        ? colors.dangerText
        : colors.infoText
    : colors.infoText;

  const borderColor = currentToast
    ? currentToast.type === 'success'
      ? colors.successBorder
      : currentToast.type === 'error'
        ? colors.dangerBorder
        : colors.primary
    : colors.primary;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {currentToast && (
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
            {currentToast.message}
          </Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const makeStyles = (_colors: Colors) => StyleSheet.create({
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
