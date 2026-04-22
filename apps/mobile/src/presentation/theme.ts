import { Platform } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// Academyflo Design Tokens — single source of truth
//
// Colours
//   bg              #05070D   page background (deepest)
//   bg-2            #0A0E1A   alt background (headers, navbars)
//   surface-2       #141824   cards / inputs / panels
//   surface-3       #1C2233   elevated surface (hover, focused)
//   accent-gradient #7C3AED → #3B82F6   primary action / default avatar
//   success         #10B981
//   warning         #F59E0B
//   danger          #EF4444
//   info            #06B6D4
//
// Typography (Inter)
//   display  34 / 800    heading  24 / 700   title  17 / 600
//   body     15 / 400    small    13         overline 11 / 600
//
// The `lightColors` / `darkColors` objects below keep every legacy key name
// so existing screens compile unchanged; the *values* are consolidated to
// this palette. The ThemeContext is locked to `darkColors` globally so both
// entries are identical on purpose.
// ─────────────────────────────────────────────────────────────────────────────

/** Shared accent-gradient stops. */
export const gradient = {
  start: '#7C3AED',
  end: '#3B82F6',
} as const;

// ── Dark Colors (authoritative dark palette) ─────────────────────────────────
export const darkColors = {
  primary: '#7C3AED',
  primaryHover: '#6D28D9',
  primaryLight: 'rgba(124,58,237,0.18)',
  primarySoft: 'rgba(124,58,237,0.10)',

  bg: '#05070D',
  bgSubtle: '#0A0E1A',
  surface: '#141824',

  text: '#E6E9F2',
  textDark: '#FFFFFF',
  textMedium: 'rgba(230,233,242,0.72)',
  textLight: 'rgba(230,233,242,0.64)',
  textSecondary: 'rgba(230,233,242,0.56)',
  textDisabled: 'rgba(230,233,242,0.38)',

  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',

  success: '#10B981',
  successBg: 'rgba(16,185,129,0.14)',
  successBorder: 'rgba(16,185,129,0.32)',
  successText: '#34D399',

  warning: '#F59E0B',
  warningBg: 'rgba(245,158,11,0.14)',
  warningText: '#FBBF24',
  warningBorder: 'rgba(245,158,11,0.32)',
  warningLightBg: 'rgba(245,158,11,0.08)',
  warningAccent: '#F59E0B',

  danger: '#EF4444',
  dangerBg: 'rgba(239,68,68,0.14)',
  dangerBorder: 'rgba(239,68,68,0.32)',
  dangerText: '#F87171',

  info: '#06B6D4',
  infoBg: 'rgba(6,182,212,0.14)',
  infoText: '#22D3EE',

  overlay: 'rgba(0,0,0,0.72)',

  disabledBg: 'rgba(255,255,255,0.06)',
  link: '#3B82F6',
  focusRing: 'rgba(124,58,237,0.35)',

  white: '#FFFFFF',
  transparent: 'transparent',
} as const;

export type Colors = { [K in keyof typeof darkColors]: string };

// ── Light Colors (authoritative light palette) ───────────────────────────────
// Design notes:
//   • Bg has a whisper-subtle lavender tint (#F3F1FB) so the page breathes the
//     same purple brand as the gradient CTAs, instead of reading as flat white.
//   • Surface stays pure white — cards float crisply against the tinted bg.
//   • bgSubtle is a stronger lavender (#E7E1F5) so chips, inputs and inset
//     surfaces have more chroma than the page.
//   • Text is slate-900 (#0F172A) for a modern, readable dark.
//   • Semantic colours keep their vibrant dark-mode hues (`#10B981`, `#F59E0B`,
//     `#EF4444`, `#06B6D4`) — only the *Text shades drop to 600/700-level so
//     inline text remains readable, while icons and progress bars stay bright.
//   • Tint backgrounds use 14% opacity (matches dark) so pills have presence.
//   • Gradient stops (#7C3AED → #3B82F6) are unchanged — brand consistent.
export const lightColors: Colors = {
  primary: '#7C3AED',
  primaryHover: '#6D28D9',
  primaryLight: 'rgba(124,58,237,0.18)',
  primarySoft: 'rgba(124,58,237,0.10)',

  bg: '#D4DFFF',
  bgSubtle: '#EAEEFC',
  surface: '#FFFFFF',

  text: '#0F172A',
  textDark: '#020617',
  textMedium: 'rgba(15,23,42,0.74)',
  textLight: 'rgba(15,23,42,0.62)',
  textSecondary: 'rgba(15,23,42,0.54)',
  textDisabled: 'rgba(15,23,42,0.38)',

  border: 'rgba(15,23,42,0.10)',
  borderStrong: 'rgba(15,23,42,0.16)',

  success: '#10B981',
  successBg: 'rgba(16,185,129,0.16)',
  successBorder: 'rgba(16,185,129,0.32)',
  successText: '#047857',

  warning: '#F59E0B',
  warningBg: 'rgba(245,158,11,0.18)',
  warningText: '#B45309',
  warningBorder: 'rgba(245,158,11,0.34)',
  warningLightBg: 'rgba(245,158,11,0.10)',
  warningAccent: '#D97706',

  danger: '#EF4444',
  dangerBg: 'rgba(239,68,68,0.16)',
  dangerBorder: 'rgba(239,68,68,0.32)',
  dangerText: '#B91C1C',

  info: '#06B6D4',
  infoBg: 'rgba(6,182,212,0.16)',
  infoText: '#0E7490',

  overlay: 'rgba(15,23,42,0.55)',

  disabledBg: 'rgba(15,23,42,0.06)',
  link: '#2563EB',
  focusRing: 'rgba(124,58,237,0.28)',

  white: '#FFFFFF',
  transparent: 'transparent',
};

/** @deprecated Use `useTheme()` hook instead. Kept for backward compatibility during migration. */
export const colors = lightColors;

// ── Spacing (4px grid) ─────────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  '2xl': 32,
  '3xl': 48,
} as const;

// ── Typography (Inter — display 34/800 · heading 24/700 · title 17/600 ·
//                body 15/400 · small 13 · overline 11/600) ──────────────────
export const fontFamily = Platform.select({
  ios: 'Inter',
  android: 'Inter',
  default: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
});

export const fontSizes = {
  xs: 11,      // overline
  sm: 13,      // small secondary
  base: 14,    // legacy body — use `md` (15) for new work
  md: 15,      // body
  lg: 17,      // title
  xl: 20,      // subheading
  '2xl': 22,   // large subheading
  '3xl': 24,   // heading
  '4xl': 34,   // display
} as const;

export const fontWeights = {
  normal: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
  heavy: '800' as TextStyle['fontWeight'],
};

export const typography = {
  display: { fontSize: fontSizes['4xl'], fontWeight: fontWeights.heavy, lineHeight: 40, letterSpacing: -0.8, fontFamily },
  heading: { fontSize: fontSizes['3xl'], fontWeight: fontWeights.bold, lineHeight: 30, letterSpacing: -0.4, fontFamily },
  title: { fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, lineHeight: 22, letterSpacing: -0.2, fontFamily },
  body: { fontSize: fontSizes.md, fontWeight: fontWeights.normal, lineHeight: 22, fontFamily },
  bodyMedium: { fontSize: fontSizes.md, fontWeight: fontWeights.medium, lineHeight: 22, fontFamily },
  small: { fontSize: fontSizes.sm, fontWeight: fontWeights.normal, lineHeight: 18, fontFamily },
  overline: { fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, lineHeight: 14, letterSpacing: 0.8, fontFamily },

  /** Legacy aliases — keep for back-compat with existing screens. */
  h1: { fontSize: fontSizes['3xl'], fontWeight: fontWeights.bold, lineHeight: 30, letterSpacing: -0.4, fontFamily },
  h2: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, lineHeight: 26, fontFamily },
  h3: { fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, lineHeight: 22, fontFamily },
  caption: { fontSize: fontSizes.sm, fontWeight: fontWeights.normal, lineHeight: 18, fontFamily },
  label: { fontSize: fontSizes.md, fontWeight: fontWeights.medium, lineHeight: 22, fontFamily },
} as const;

// ── Border Radius ──────────────────────────────────────────────────────────
export const radius = {
  sm: 4,
  base: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
} as const;

// ── Shadows ────────────────────────────────────────────────────────────────
// ── Avatar Colors ─────────────────────────────────────────────────────────
export const avatarColors = {
  light: ['#0891b2', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#2563eb'],
  dark: ['#22d3ee', '#a78bfa', '#f472b6', '#fb923c', '#4ade80', '#60a5fa'],
} as const;

// ── Interaction ───────────────────────────────────────────────────────────
export const disabledOpacity = 0.45;

// ── Opacity Scale ─────────────────────────────────────────────────────────
export const opacity = {
  disabled: 0.45,
  muted: 0.6,
  subtle: 0.8,
  full: 1,
} as const;

// ── Letter Spacing ────────────────────────────────────────────────────────
export const letterSpacing = {
  tight: -0.3,
  normal: 0,
  wide: 0.3,
  wider: 0.5,
  widest: 1,
} as const;

// ── Animation ─────────────────────────────────────────────────────────────
export const springConfig = {
  /** Gentle press feedback */
  press: { toValue: 0.97, useNativeDriver: true } as const,
  /** Snap-back after press */
  release: { toValue: 1, friction: 4, useNativeDriver: true } as const,
  /** Toggle / switch animations */
  toggle: { friction: 5, useNativeDriver: true } as const,
} as const;

// ── List Defaults ─────────────────────────────────────────────────────────
export const listDefaults = {
  contentPaddingBottom: 100,
  contentPaddingBottomNoFab: 32,
} as const;

// ── Shadows ────────────────────────────────────────────────────────────────
// On web, RN 0.76 deprecated shadow* in favor of boxShadow. On native, keep
// shadow* + elevation so iOS and Android render shadows correctly.
const shadow = (web: ViewStyle, native: ViewStyle): ViewStyle =>
  Platform.OS === 'web' ? web : native;

export const shadows = {
  none: shadow(
    { boxShadow: 'none' },
    {
      shadowColor: lightColors.transparent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
  ),
  sm: shadow(
    { boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
  ),
  md: shadow(
    { boxShadow: '0 2px 6px rgba(0,0,0,0.08)' },
    {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
  ),
  lg: shadow(
    { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 6,
    },
  ),
} as const;
