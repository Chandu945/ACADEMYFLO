import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { BirthdayStudent } from '../../../domain/dashboard/dashboard.types';
import { getBirthdays } from '../../../infra/dashboard/dashboard-api';
import { colors, spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';

function formatBirthday(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(d!, 10)} ${months[parseInt(m!, 10) - 1]}`;
}

export function BirthdayWidget() {
  const [todayBirthdays, setTodayBirthdays] = useState<BirthdayStudent[]>([]);
  const [monthBirthdays, setMonthBirthdays] = useState<BirthdayStudent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    const [todayRes, monthRes] = await Promise.all([
      getBirthdays('today'),
      getBirthdays('month'),
    ]);
    if (!mountedRef.current) return;
    if (todayRes.ok) setTodayBirthdays(todayRes.value.students);
    if (monthRes.ok) setMonthBirthdays(monthRes.value.students);
    setLoaded(true);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  if (!loaded) return null;

  const hasToday = todayBirthdays.length > 0;
  const hasMonth = monthBirthdays.length > 0;

  if (!hasToday && !hasMonth) return null;

  return (
    <View style={styles.container} testID="birthday-widget">
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
          <Icon name="cake-variant-outline" size={18} color="#e67e22" />
        </View>
        <Text style={styles.title}>Birthdays</Text>
      </View>

      {hasToday && (
        <View style={styles.section}>
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>Today</Text>
          </View>
          {todayBirthdays.map((s) => (
            <View key={s.id} style={styles.row}>
              <View style={styles.nameInitial}>
                <Text style={styles.initialText}>{s.fullName[0]}</Text>
              </View>
              <View style={styles.nameCol}>
                <Text style={styles.name}>{s.fullName}</Text>
              </View>
              <Text style={styles.phone}>{s.guardianMobile}</Text>
            </View>
          ))}
        </View>
      )}

      {hasMonth && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Month ({monthBirthdays.length})</Text>
          <FlatList
            data={monthBirthdays}
            scrollEnabled={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={styles.nameInitial}>
                  <Text style={styles.initialText}>{item.fullName[0]}</Text>
                </View>
                <View style={styles.nameCol}>
                  <Text style={styles.name}>{item.fullName}</Text>
                  <Text style={styles.date}>{formatBirthday(item.dateOfBirth)}</Text>
                </View>
                <Text style={styles.phone}>{item.guardianMobile}</Text>
              </View>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginTop: spacing.md,
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: '#fef3e7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  section: {
    marginBottom: spacing.sm,
  },
  todayBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fef3e7',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    marginBottom: spacing.sm,
  },
  todayBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    color: '#e67e22',
  },
  sectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nameInitial: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  initialText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.primary,
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
    marginTop: 2,
  },
  phone: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
});
