import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { StudentsStackParamList } from '../../navigation/StudentsStack';
import type { StudentListItem } from '../../../domain/student/student.types';
import { ProfilePhotoUploader } from '../../components/common/ProfilePhotoUploader';
import { getStudentPhotoUploadPath, getStudent } from '../../../infra/student/student-api';
import { StudentActionMenu } from '../../components/student/StudentActionMenu';
import { colors, spacing, fontSizes, fontWeights, radius, shadows } from '../../theme';

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
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

export function StudentDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const [student, setStudent] = useState<StudentListItem>(route.params.student);
  const [refreshing, setRefreshing] = useState(false);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);

  const refetchStudent = useCallback(async () => {
    const result = await getStudent(student.id);
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setActionMenuVisible(true)}
            testID="more-actions-button"
          >
            <Text style={styles.actionButtonText}>More Actions</Text>
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
          <SectionTitle title="Contact Information" />
          {student.guardian?.mobile && (
            <View style={styles.contactRow}>
              <View style={styles.contactInfo}>
                <Text style={styles.infoLabel}>Guardian Mobile</Text>
                <Text style={styles.infoValue}>{student.guardian.mobile}</Text>
              </View>
              <TouchableOpacity
                style={styles.contactAction}
                onPress={() => handleCall(student.guardian.mobile)}
                testID="call-guardian"
              >
                <Text style={styles.contactActionText}>Call</Text>
              </TouchableOpacity>
            </View>
          )}
          {student.whatsappNumber && (
            <View style={styles.contactRow}>
              <View style={styles.contactInfo}>
                <Text style={styles.infoLabel}>WhatsApp</Text>
                <Text style={styles.infoValue}>{student.whatsappNumber}</Text>
              </View>
              <TouchableOpacity
                style={styles.contactAction}
                onPress={() => handleWhatsApp(student.whatsappNumber!)}
                testID="whatsapp-student"
              >
                <Text style={styles.contactActionText}>Chat</Text>
              </TouchableOpacity>
            </View>
          )}
          <InfoRow label="Guardian Name" value={student.guardian?.name} />
          <InfoRow label="Guardian Email" value={student.guardian?.email} />
          <InfoRow label="Address" value={student.addressText} />
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

const styles = StyleSheet.create({
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
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.base,
    ...shadows.sm,
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
    borderRadius: radius.lg,
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
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  actionButtonText: {
    color: colors.white,
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
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contactInfo: {
    flex: 1,
  },
  contactAction: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  contactActionText: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
});
