import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Linking,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { StudentsStackParamList } from '../../navigation/StudentsStack';
import type { StudentListItem } from '../../../domain/student/student.types';
import { ProfilePhotoUploader } from '../../components/common/ProfilePhotoUploader';
import { getStudentPhotoUploadPath, getStudent } from '../../../infra/student/student-api';
import { StudentActionMenu } from '../../components/student/StudentActionMenu';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Nav = NativeStackNavigationProp<StudentsStackParamList, 'StudentDetail'>;
type Route = RouteProp<StudentsStackParamList, 'StudentDetail'>;

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function maskAadhaar(aadhaar: string | null): string {
  if (!aadhaar) return '—';
  return `XXXX XXXX ${aadhaar.slice(-4)}`;
}

function StatusBadge({ status }: { status: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const bgColor =
    status === 'ACTIVE' ? colors.successBg : status === 'INACTIVE' ? colors.warningBg : colors.dangerBg;
  const textColor =
    status === 'ACTIVE' ? colors.successText : status === 'INACTIVE' ? colors.warningText : colors.dangerText;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={[styles.badgeText, { color: textColor }]}>{status}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

export function StudentDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const paramStudent = route.params?.student;
  const [student, setStudent] = useState<StudentListItem>(
    paramStudent ?? ({ id: '', fullName: '', status: 'ACTIVE' } as StudentListItem),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const mountedRef = useRef(true);

  // Guard against missing route params — show error state
  if (!paramStudent?.id) {
    return (
      <View style={styles.screen}>
        <Text style={{ textAlign: 'center', marginTop: 40 }}>Student data unavailable</Text>
      </View>
    );
  }

  const refetchStudent = useCallback(async () => {
    const result = await getStudent(student.id);
    if (!mountedRef.current) return;
    if (result.ok) {
      setStudent(result.value);
    }
  }, [student.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchStudent();
    setRefreshing(false);
  }, [refetchStudent]);

  const handleCall = useCallback((number: string) => {
    Linking.openURL(`tel:${number}`);
  }, []);

  const handleWhatsApp = useCallback((number: string) => {
    const cleaned = number.replace(/\D/g, '');
    Linking.openURL(`whatsapp://send?phone=${cleaned}`);
  }, []);

  const handlePhotoUploaded = useCallback((url: string) => {
    setStudent((prev) => ({ ...prev, profilePhotoUrl: url }));
  }, []);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* Header */}
        <View style={styles.headerCard}>
          <ProfilePhotoUploader
            currentPhotoUrl={student.profilePhotoUrl}
            uploadPath={getStudentPhotoUploadPath(student.id)}
            onPhotoUploaded={handlePhotoUploaded}
            size={90}
            testID="student-detail-photo"
          />
          <Text style={styles.studentName}>{student.fullName}</Text>
          <StatusBadge status={student.status} />
        </View>

        {/* Summary Card */}
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Monthly Fee</Text>
              <Text style={styles.summaryValue}>{`\u20B9${student.monthlyFee}`}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Joined</Text>
              <Text style={styles.summaryValue}>{formatDate(student.joiningDate)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Gender</Text>
              <Text style={styles.summaryValue}>{student.gender || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('StudentForm', { mode: 'edit', student })}
            testID="edit-student-button"
          >
            {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
            <Icon name="pencil-outline" size={18} color={colors.white} />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={() => setActionMenuVisible(true)}
            testID="more-actions-button"
          >
            {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
            <Icon name="dots-horizontal" size={18} color={colors.primary} />
            <Text style={styles.actionButtonSecondaryText}>More</Text>
          </TouchableOpacity>
        </View>

        {/* Personal Information */}
        <View style={styles.card}>
          <SectionTitle title="Personal Information" />
          <InfoRow label="Father Name" value={student.fatherName} />
          <InfoRow label="Mother Name" value={student.motherName} />
          <InfoRow label="Date of Birth" value={formatDate(student.dateOfBirth)} />
          <InfoRow label="Gender" value={student.gender} />
          <InfoRow label="Caste" value={student.caste} />
          <InfoRow label="Aadhaar" value={maskAadhaar(student.aadhaarNumber)} />
        </View>

        {/* Contact Information */}
        <View style={styles.card}>
          <View style={styles.contactSectionHeader}>
            <View style={[styles.contactSectionIcon, { backgroundColor: colors.primarySoft }]}>
              {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
              <Icon name="card-account-phone-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Contact Information</Text>
          </View>

          {/* ── Phone & WhatsApp tiles ──────────────── */}
          {student.guardian?.mobile && (
            <View style={styles.contactTile}>
              <View style={[styles.contactTileIcon, { backgroundColor: colors.primarySoft }]}>
                {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                <Icon name="phone-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.contactTileInfo}>
                <Text style={styles.contactTileLabel}>Guardian Mobile</Text>
                <Text style={styles.contactTileValue}>{student.guardian.mobile}</Text>
              </View>
              <View style={styles.contactTileActions}>
                <TouchableOpacity
                  style={styles.callCircle}
                  onPress={() => handleCall(student.guardian.mobile)}
                  testID="call-guardian"
                  accessibilityLabel="Call guardian"
                >
                  {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                  <Icon name="phone" size={18} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {student.whatsappNumber && (
            <View style={styles.contactTile}>
              <View style={[styles.contactTileIcon, { backgroundColor: '#dcfce7' }]}>
                {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                <Icon name="whatsapp" size={20} color="#25D366" />
              </View>
              <View style={styles.contactTileInfo}>
                <Text style={styles.contactTileLabel}>WhatsApp</Text>
                <Text style={styles.contactTileValue}>{student.whatsappNumber}</Text>
              </View>
              <View style={styles.contactTileActions}>
                <TouchableOpacity
                  style={styles.whatsappCircle}
                  onPress={() => handleWhatsApp(student.whatsappNumber!)}
                  testID="whatsapp-student"
                  accessibilityLabel="Open WhatsApp chat"
                >
                  {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                  <Icon name="message-text-outline" size={18} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Guardian details ────────────────────── */}
          {student.guardian?.name ? (
            <View style={styles.contactDetailRow}>
              {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
              <Icon name="account-outline" size={18} color={colors.textSecondary} />
              <View style={styles.contactDetailInfo}>
                <Text style={styles.contactDetailLabel}>Guardian Name</Text>
                <Text style={styles.contactDetailValue}>{student.guardian.name}</Text>
              </View>
            </View>
          ) : null}

          {student.guardian?.email ? (
            <View style={styles.contactDetailRow}>
              {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
              <Icon name="email-outline" size={18} color={colors.textSecondary} />
              <View style={styles.contactDetailInfo}>
                <Text style={styles.contactDetailLabel}>Guardian Email</Text>
                <Text style={styles.contactDetailValue}>{student.guardian.email}</Text>
              </View>
            </View>
          ) : null}

          {student.addressText ? (
            <View style={styles.contactDetailRow}>
              {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
              <Icon name="map-marker-outline" size={18} color={colors.textSecondary} />
              <View style={styles.contactDetailInfo}>
                <Text style={styles.contactDetailLabel}>Address</Text>
                <Text style={styles.contactDetailValue}>{student.addressText}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Institute Information */}
        {student.instituteInfo && (
          <View style={styles.card}>
            <SectionTitle title="Academic Information" />
            <InfoRow label="School" value={student.instituteInfo.schoolName} />
            <InfoRow label="Roll Number" value={student.instituteInfo.rollNumber} />
            <InfoRow label="Standard" value={student.instituteInfo.standard} />
          </View>
        )}
      </ScrollView>

      {actionMenuVisible && (
        <StudentActionMenu
          visible={actionMenuVisible}
          student={student}
          onClose={() => setActionMenuVisible(false)}
          onEdit={() => {
            navigation.navigate('StudentForm', { mode: 'edit', student });
          }}
          onAssignBatch={() => {
            navigation.navigate('StudentForm', { mode: 'edit', student });
          }}
          onDeleted={() => navigation.goBack()}
          onStatusChanged={refetchStudent}
        />
      )}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing['3xl'],
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.base,
    ...shadows.md,
  },
  studentName: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginTop: spacing.sm,
  },
  badgeText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.base,
    ...shadows.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  actionButtonSecondary: {
    backgroundColor: colors.primarySoft,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },
  actionButtonSecondaryText: {
    color: colors.primary,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: fontSizes.base,
    color: colors.text,
    fontWeight: fontWeights.medium,
    flex: 1,
    textAlign: 'right',
  },
  contactSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  contactSectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  contactTileIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactTileInfo: {
    flex: 1,
  },
  contactTileLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
    marginBottom: 2,
  },
  contactTileValue: {
    fontSize: fontSizes.md,
    color: colors.text,
    fontWeight: fontWeights.semibold,
  },
  contactTileActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  callCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  whatsappCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  contactDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  contactDetailInfo: {
    flex: 1,
  },
  contactDetailLabel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
    marginBottom: 2,
  },
  contactDetailValue: {
    fontSize: fontSizes.base,
    color: colors.text,
    fontWeight: fontWeights.medium,
  },
});
