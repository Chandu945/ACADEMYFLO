import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { AppIcon } from '../ui/AppIcon';
import { AvatarImage } from '../ui/AvatarImage';
import type { BirthdayStudent } from '../../../domain/dashboard/dashboard.types';
import { getBirthdays } from '../../../infra/dashboard/dashboard-api';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

const WHATSAPP_GREEN = '#25D366'; // brand color

function formatBirthday(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(d!, 10)} ${months[parseInt(m!, 10) - 1]}`;
}

function calculateAge(dateStr: string): number | null {
  const [y, m, d] = dateStr.split('-').map(Number) as [number, number, number];
  if (!y || y < 1900) return null;
  const today = new Date();
  let age = today.getFullYear() - y;
  const monthDiff = today.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
    age--;
  }
  return age > 0 ? age : null;
}

function openWhatsApp(phone: string, studentName: string) {
  const cleaned = phone.replace(/\D/g, '');
  const number = cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
  const message = encodeURIComponent(
    `Happy Birthday to ${studentName}! 🎂🎉 Wishing a wonderful year ahead!`,
  );
  Linking.openURL(`https://wa.me/${number}?text=${message}`).catch(() => {});
}

function openPhone(phone: string) {
  Linking.openURL(`tel:${phone}`).catch(() => {});
}

type BirthdayRowProps = {
  student: BirthdayStudent;
  isToday: boolean;
  testID?: string;
};

function BirthdayRow({ student, isToday, testID }: BirthdayRowProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const age = calculateAge(student.dateOfBirth);
  const hasPhoto = !!student.profilePhotoUrl;

  return (
    <View style={styles.row} testID={testID}>
      <View style={[styles.avatar, isToday && styles.avatarToday]}>
        {hasPhoto ? (
          <AvatarImage url={student.profilePhotoUrl!} style={styles.avatarImage} />
        ) : (
          <Text style={[styles.initialText, isToday && styles.initialTextToday]}>
            {student.fullName[0]}
          </Text>
        )}
        {isToday && (
          <View style={styles.partyHat}>
            
            <AppIcon name="party-popper" size={10} color={colors.warningAccent} />
          </View>
        )}
      </View>

      <View style={styles.nameCol}>
        <Text style={styles.name} numberOfLines={1}>{student.fullName}</Text>
        <Text style={styles.date}>
          {formatBirthday(student.dateOfBirth)}
          {age != null ? ` · Turns ${age}` : ''}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => openPhone(student.guardianMobile)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={`Call guardian of ${student.fullName}`}
        >
          <LinearGradient
            colors={[gradient.start, gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <AppIcon name="phone-outline" size={16} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.whatsappBtn]}
          onPress={() => openWhatsApp(student.guardianMobile, student.fullName)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={`Send WhatsApp birthday wish for ${student.fullName}`}
        >
          
          <AppIcon name="whatsapp" size={16} color={WHATSAPP_GREEN} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

type BirthdayWidgetProps = {
  /** Pre-fetched students from parent's Promise.all — skips internal API call when provided */
  students?: BirthdayStudent[];
};

export function BirthdayWidget({ students: prefetchedStudents }: BirthdayWidgetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [todayBirthdays, setTodayBirthdays] = useState<BirthdayStudent[]>([]);
  const [monthBirthdays, setMonthBirthdays] = useState<BirthdayStudent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    // Single API call — filter today's birthdays client-side
    const monthRes = await getBirthdays('month');
    if (!mountedRef.current) return;
    if (monthRes.ok) {
      const all = monthRes.value.students;
      setMonthBirthdays(all);

      // Filter today's birthdays from month data
      const now = new Date();
      const todayMonth = String(now.getMonth() + 1).padStart(2, '0');
      const todayDay = String(now.getDate()).padStart(2, '0');
      const todaySuffix = `-${todayMonth}-${todayDay}`;
      setTodayBirthdays(all.filter((s) => s.dateOfBirth.endsWith(todaySuffix)));
    }
    setLoaded(true);
  }, []);

  // When prefetched data is provided, use it directly — no API call
  useEffect(() => {
    if (prefetchedStudents) {
      const all = prefetchedStudents;
      setMonthBirthdays(all);

      const now = new Date();
      const todayMonth = String(now.getMonth() + 1).padStart(2, '0');
      const todayDay = String(now.getDate()).padStart(2, '0');
      const todaySuffix = `-${todayMonth}-${todayDay}`;
      setTodayBirthdays(all.filter((s) => s.dateOfBirth.endsWith(todaySuffix)));
      setLoaded(true);
    }
  }, [prefetchedStudents]);

  useEffect(() => {
    if (prefetchedStudents) return; // skip self-fetch when parent provides data
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load, prefetchedStudents]);

  if (!loaded) return null;

  const hasToday = todayBirthdays.length > 0;
  const todayIds = new Set(todayBirthdays.map((s) => s.id));
  const upcomingBirthdays = monthBirthdays.filter((s) => !todayIds.has(s.id));
  const hasUpcoming = upcomingBirthdays.length > 0;

  if (!hasToday && !hasUpcoming) return null;

  return (
    <View style={styles.container} testID="birthday-widget">
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          
          <AppIcon name="cake-variant-outline" size={18} color={colors.warningAccent} />
        </View>
        <Text style={styles.title}>Birthdays</Text>
        {hasToday && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{todayBirthdays.length} today</Text>
          </View>
        )}
      </View>

      {hasToday && (
        <View style={styles.todaySection}>
          <View style={styles.todayBanner}>
            
            <AppIcon name="party-popper" size={16} color={colors.warningAccent} />
            <Text style={styles.todayBannerText}>
              {todayBirthdays.length === 1
                ? `${todayBirthdays[0]!.fullName}'s birthday today!`
                : `${todayBirthdays.length} birthdays today!`}
            </Text>
            
            <AppIcon name="party-popper" size={16} color={colors.warningAccent} />
          </View>
          {todayBirthdays.map((s) => (
            <BirthdayRow key={s.id} student={s} isToday testID={`today-birthday-${s.id}`} />
          ))}
        </View>
      )}

      {hasUpcoming && (
        <View style={styles.upcomingSection}>
          <Text style={styles.sectionTitle}>
            Upcoming This Month ({upcomingBirthdays.length})
          </Text>
          {upcomingBirthdays.map((item) => (
            <BirthdayRow key={item.id} student={item} isToday={false} testID={`month-birthday-${item.id}`} />
          ))}
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginTop: spacing.sm,
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.warningLightBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  countBadge: {
    backgroundColor: colors.warningAccent,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  countBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },

  /* ── Today Section ──────────────────────────────── */
  todaySection: {
    backgroundColor: colors.warningLightBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  todayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  todayBannerText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colors.warningAccent,
  },

  /* ── Upcoming Section ───────────────────────────── */
  upcomingSection: {
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* ── Row ─────────────────────────────────────────── */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarToday: {
    backgroundColor: colors.warningAccent,
    borderWidth: 2,
    borderColor: colors.white,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  partyHat: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  initialTextToday: {
    color: colors.white,
  },
  nameCol: {
    flex: 1,
  },
  name: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.text,
  },
  date: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappBtn: {
    backgroundColor: colors.successBg,
  },
});
