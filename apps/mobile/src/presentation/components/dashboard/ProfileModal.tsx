import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { AppIcon } from '../ui/AppIcon';
import type { AuthUser } from '../../../domain/auth/auth.types';
import type { SubscriptionInfo } from '../../../domain/subscription/subscription.types';
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  visible: boolean;
  user: AuthUser;
  subscription: SubscriptionInfo | null;
  onClose: () => void;
  onViewSubscription: () => void;
  onLogout: () => void;
};

function getStatusLabel(status: string): string {
  switch (status) {
    case 'TRIAL': return 'Free Trial';
    case 'ACTIVE_PAID': return 'Active';
    case 'EXPIRED_GRACE': return 'Grace Period';
    case 'BLOCKED': return 'Blocked';
    case 'DISABLED': return 'Disabled';
    default: return status;
  }
}

function getStatusColor(status: string, colors: Colors): string {
  switch (status) {
    case 'TRIAL': return colors.primary;
    case 'ACTIVE_PAID': return colors.success;
    case 'EXPIRED_GRACE': return colors.warning;
    case 'BLOCKED':
    case 'DISABLED': return colors.danger;
    default: return colors.textSecondary;
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export function ProfileModal({
  visible, user, subscription, onClose, onViewSubscription, onLogout,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const initials = getInitials(user.fullName);
  const renewalDate = subscription?.status === 'TRIAL' ? subscription.trialEndAt : subscription?.paidEndAt;
  const renewalLabel = subscription?.status === 'TRIAL' ? 'Trial ends' : 'Renews';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} testID="profile-modal-overlay">
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          {/* Drag handle */}
          <View style={styles.dragHandle} />

          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            {/* Profile header — compact horizontal layout */}
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName} numberOfLines={1}>{user.fullName}</Text>
                <Text style={styles.profileEmail} numberOfLines={1}>{user.email}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{user.role}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} testID="profile-modal-close">
                <AppIcon name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Contact row */}
            <View style={styles.contactRow}>
              <View style={styles.contactItem}>
                <AppIcon name="phone-outline" size={16} color={colors.primary} />
                <Text style={styles.contactText} numberOfLines={1}>{user.phoneNumber}</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Subscription section — owner only */}
            {subscription && user.role === 'OWNER' && (
              <>
                <View style={styles.subSection}>
                  <View style={styles.subRow}>
                    <Text style={styles.subTitle}>Subscription</Text>
                    <View style={[styles.statusPill, { backgroundColor: getStatusColor(subscription.status, colors) + '20' }]}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(subscription.status, colors) }]} />
                      <Text style={[styles.statusLabel, { color: getStatusColor(subscription.status, colors) }]}>
                        {getStatusLabel(subscription.status)}
                      </Text>
                    </View>
                  </View>

                  {/* Stats row */}
                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Text style={styles.statValue}>{subscription.activeStudentCount}</Text>
                      <Text style={styles.statLabel}>Students</Text>
                    </View>
                    {subscription.daysRemaining > 0 && (
                      <View style={styles.statBox}>
                        <Text style={styles.statValue}>{subscription.daysRemaining}</Text>
                        <Text style={styles.statLabel}>Days Left</Text>
                      </View>
                    )}
                    {renewalDate && (
                      <View style={styles.statBox}>
                        <Text style={[styles.statValue, { fontSize: fontSizes.sm }]}>{formatDate(renewalDate)}</Text>
                        <Text style={styles.statLabel}>{renewalLabel}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => { onClose(); onViewSubscription(); }}
                  testID="view-subscription-btn"
                >
                  <AppIcon name="card-account-details-outline" size={18} color={colors.primary} />
                  <Text style={styles.actionBtnText}>Manage Subscription</Text>
                  <AppIcon name="chevron-right" size={16} color={colors.textDisabled} />
                </TouchableOpacity>
              </>
            )}

            {/* Sign Out */}
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => { onClose(); onLogout(); }}
              testID="profile-modal-logout"
            >
              <AppIcon name="logout" size={18} color={colors.danger} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
    maxHeight: '70%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 16 },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12 },
    }),
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },

  // Profile header
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  profileEmail: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 1,
    marginBottom: spacing.xs,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Contact
  contactRow: {
    marginBottom: spacing.sm,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  contactText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },

  // Subscription
  subSection: {
    marginBottom: spacing.md,
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  subTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Action button
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  actionBtnText: {
    flex: 1,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.text,
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  logoutText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.danger,
  },
});
