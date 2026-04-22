import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Share,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { crossAlert } from '../../utils/crossPlatformAlert';
import { AppIcon } from '../ui/AppIcon';
import RNShare from 'react-native-share';
import type { StudentListItem, StudentStatus } from '../../../domain/student/student.types';
import * as studentApi from '../../../infra/student/student-api';
import { getAccessToken, tryRefresh } from '../../../infra/http/api-client';
import { isTokenExpiredOrExpiring } from '../../../infra/auth/token-expiry';
import { env } from '../../../infra/env';
import { useAuth } from '../../context/AuthContext';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, fontSizes, fontWeights, radius, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  visible: boolean;
  student: StudentListItem;
  onClose: () => void;
  onEdit: () => void;
  onAssignBatch: () => void;
  onDeleted: () => void;
  onStatusChanged: () => void;
}

interface ActionItem {
  key: string;
  title: string;
  subtitle: string;
  iconColor: string;
  iconName: string;
  ownerOnly?: boolean;
  onPress: () => void;
}

export function StudentActionMenu({
  visible, student, onClose, onEdit, onAssignBatch, onDeleted, onStatusChanged,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  const handleDelete = () => {
    onClose();
    crossAlert(
      'Delete Student',
      `Are you sure you want to delete ${student.fullName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await studentApi.deleteStudent(student.id);
            if (result.ok) {
              onDeleted();
            } else {
              crossAlert('Error', result.error.message);
            }
          },
        },
      ],
    );
  };

  const handleShareCredentials = async () => {
    onClose();
    const result = await studentApi.getStudentCredentials(student.id);
    if (result.ok) {
      try {
        await Share.share({ message: result.value.shareText });
      } catch {
        // User cancelled share
      }
    } else {
      crossAlert('Error', result.error.message);
    }
  };

  const handleInviteParent = () => {
    onClose();
    crossAlert(
      'Invite Parent',
      `This will create a parent login for ${student.fullName}'s guardian. The guardian must have an email and mobile number set.\n\nContinue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Invite',
          onPress: async () => {
            const result = await studentApi.inviteParent(student.id);
            if (result.ok) {
              const { parentEmail, tempPassword, isExistingUser } = result.value;
              if (isExistingUser) {
                crossAlert(
                  'Parent Linked',
                  `${parentEmail} already has an account and has been linked to ${student.fullName}. They can log in with their existing password.`,
                );
              } else {
                crossAlert(
                  'Parent Invited',
                  `A parent account has been created.\n\nLogin ID: ${parentEmail}\nTemporary Password: ${tempPassword}\n\nPlease share these credentials with the guardian.`,
                  [
                    { text: 'OK' },
                    {
                      text: 'Share',
                      onPress: async () => {
                        try {
                          await Share.share({
                            message: `Login ID: ${parentEmail}\nPassword: ${tempPassword}`,
                          });
                        } catch {
                          // User cancelled share
                        }
                      },
                    },
                  ],
                );
              }
            } else {
              crossAlert('Error', result.error.message);
            }
          },
        },
      ],
    );
  };

  const handleGenerateDocument = async (docType: 'report' | 'registration-form' | 'id-card', label: string) => {
    onClose();
    let token = getAccessToken();
    if (!token) {
      crossAlert('Error', 'Session expired. Please log in again.');
      return;
    }

    if (isTokenExpiredOrExpiring(token)) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        token = refreshed;
      } else {
        crossAlert('Error', 'Session expired. Please log in again.');
        return;
      }
    }

    setGenerating(label);
    try {
      const path = studentApi.getStudentDocumentUrl(student.id, docType);
      const url = `${env.API_BASE_URL}${path}`;

      const res = await fetch(url, {
        headers: {
          Accept: 'application/pdf',
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        const refreshed = await tryRefresh();
        if (!refreshed) {
          crossAlert('Error', 'Session expired. Please log in again.');
          return;
        }
        const retry = await fetch(url, {
          headers: { Accept: 'application/pdf', Authorization: `Bearer ${refreshed}` },
        });
        if (!retry.ok) {
          crossAlert('Error', `Server returned status ${retry.status}.`);
          return;
        }
        const blob = await retry.blob();
        const base64 = await blobToBase64(blob);
        await sharePdf(base64, `${docType}_${student.id}.pdf`, label);
        return;
      }

      if (!res.ok) {
        let errorMsg = `Server returned status ${res.status}.`;
        try {
          const body = await res.json();
          if (body.message) errorMsg = body.message;
        } catch {
          // use generic
        }
        crossAlert('Error', errorMsg);
        return;
      }

      const blob = await res.blob();
      const base64 = await blobToBase64(blob);
      await sharePdf(base64, `${docType}_${student.id}.pdf`, label);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      crossAlert('Error', `Failed to generate document: ${msg}`);
    } finally {
      setGenerating(null);
    }
  };

  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Strip data URL prefix: "data:application/pdf;base64,..."
        const base64 = result.split(',')[1] ?? result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function sharePdf(base64: string, filename: string, title: string) {
    await RNShare.open({
      url: `data:application/pdf;base64,${base64}`,
      filename,
      type: 'application/pdf',
      title,
    }).catch(() => {});
  }

  const actions: ActionItem[] = [
    {
      key: 'edit',
      title: 'Edit Student',
      subtitle: 'You can edit student details here',
      iconColor: colors.info,
      iconName: 'pencil-outline',
      onPress: () => { onClose(); onEdit(); },
    },
    {
      key: 'batch',
      title: 'Assign Batch',
      subtitle: 'You can assign new batch here',
      iconColor: colors.info,
      iconName: 'account-group-outline',
      onPress: () => { onClose(); onAssignBatch(); },
    },
    {
      key: 'status',
      title: 'Close / Reactivate',
      subtitle: 'Change student status (Active, Inactive, Left)',
      iconColor: colors.danger,
      iconName: 'swap-horizontal-circle-outline',
      ownerOnly: true,
      onPress: () => { onClose(); setShowStatusModal(true); },
    },
    {
      key: 'invite-parent',
      title: 'Invite Parent',
      subtitle: 'Create guardian login for this student',
      iconColor: colors.success,
      iconName: 'account-plus-outline',
      ownerOnly: true,
      onPress: handleInviteParent,
    },
    {
      key: 'share',
      title: 'Share Login Id And Password',
      subtitle: 'Share login credentials with guardian',
      iconColor: colors.info,
      iconName: 'share-variant-outline',
      onPress: handleShareCredentials,
    },
    {
      key: 'delete',
      title: 'Delete Student',
      subtitle: 'You can delete student here',
      iconColor: colors.danger,
      iconName: 'delete-outline',
      ownerOnly: true,
      onPress: handleDelete,
    },
    {
      key: 'report',
      title: 'Generate Report',
      subtitle: 'Generate student attendance & fee report',
      iconColor: colors.success,
      iconName: 'chart-bar',
      ownerOnly: true,
      onPress: () => handleGenerateDocument('report', 'Generating Report...'),
    },
  ];

  const visibleActions = actions.filter((a) => !a.ownerOnly || isOwner);

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Student Actions</Text>
              <TouchableOpacity onPress={onClose} testID="action-menu-close">
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.scroll}>
              {visibleActions.map((action) => (
                <TouchableOpacity
                  key={action.key}
                  style={styles.actionRow}
                  onPress={action.onPress}
                  testID={`action-${action.key}`}
                >
                  <View style={[styles.iconContainer, { backgroundColor: action.iconColor + '20' }]}>
                    
                    <AppIcon name={action.iconName} size={22} color={action.iconColor} />
                  </View>
                  <View style={styles.actionText}>
                    <Text style={styles.actionTitle}>{action.title}</Text>
                    <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <StatusChangeModal
        visible={showStatusModal}
        student={student}
        onClose={() => setShowStatusModal(false)}
        onChanged={() => { setShowStatusModal(false); onStatusChanged(); }}
      />

      {generating && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{generating}</Text>
          </View>
        </View>
      )}
    </>
  );
}

function StatusChangeModal({
  visible, student, onClose, onChanged,
}: { visible: boolean; student: StudentListItem; onClose: () => void; onChanged: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [selectedStatus, setSelectedStatus] = useState<StudentStatus | ''>('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  // Defense-in-depth dedup: setSaving(true) is async, so a fast double-tap can
  // queue two calls before the disabled state propagates to the button.
  const inflightRef = useRef(false);

  const options: { value: StudentStatus; label: string }[] = student.status === 'ACTIVE'
    ? [
        { value: 'INACTIVE', label: 'Mark as Inactive' },
        { value: 'LEFT', label: 'Mark as Left/Closed' },
      ]
    : [{ value: 'ACTIVE', label: 'Reactivate (Mark as Active)' }];

  const handleConfirm = async () => {
    if (!selectedStatus) {
      crossAlert('Validation', 'Please select a status');
      return;
    }
    if (inflightRef.current) return;
    inflightRef.current = true;
    setSaving(true);
    try {
      const result = await studentApi.changeStudentStatus(student.id, {
        status: selectedStatus,
        reason: reason.trim() || undefined,
      });
      if (result.ok) {
        setSelectedStatus('');
        setReason('');
        onChanged();
      } else {
        // Map common server error codes to actionable messages so the user
        // knows whether to retry, fix input, or contact an admin.
        const code = result.error.code;
        let title = 'Error';
        let msg = result.error.message;
        if (code === 'FORBIDDEN') {
          title = 'Not allowed';
          msg = 'You do not have permission to change this student’s status.';
        } else if (code === 'NOT_FOUND') {
          title = 'Not found';
          msg = 'This student no longer exists. Please refresh.';
        } else if (code === 'CONFLICT') {
          title = 'Conflict';
          msg = result.error.message;
        } else if (code === 'NETWORK' || code === 'UNKNOWN') {
          title = 'Network error';
          msg = 'Could not reach the server. Check your connection and try again.';
        }
        crossAlert(title, msg);
      }
    } finally {
      inflightRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Change Student Status</Text>
          <Text style={styles.currentStatus}>
            Current status: <Text style={styles.currentStatusValue}>{student.status}</Text>
          </Text>

          {(selectedStatus === 'INACTIVE' || selectedStatus === 'LEFT') && (
            <View style={styles.warningBox}>
              <AppIcon name="information-outline" size={18} color={colors.warningText} />
              <Text style={styles.warningText}>
                Changing status will stop fee generation and remove any upcoming
                (not-yet-due) fee entries for this student. Past and currently due
                fees are preserved.
              </Text>
            </View>
          )}

          <View style={styles.statusOptions}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.statusChip, selectedStatus === opt.value && styles.statusChipActive]}
                onPress={() => setSelectedStatus(opt.value)}
                testID={`status-option-${opt.value}`}
              >
                {selectedStatus === opt.value ? (
                  <LinearGradient
                    colors={[gradient.start, gradient.end]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                ) : null}
                <Text style={[styles.statusChipText, selectedStatus === opt.value && styles.statusChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Reason (optional)</Text>
          <TextInput
            style={styles.input}
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Family relocated"
            maxLength={500}
            testID="status-reason"
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} testID="status-cancel">
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, saving && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={saving}
              testID="status-confirm"
            >
              <LinearGradient
                colors={[gradient.start, gradient.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.confirmButtonText}>{saving ? 'Saving...' : 'Confirm'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.base, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.text, letterSpacing: -0.3 },
  closeX: { fontSize: fontSizes.xl, color: colors.textSecondary, padding: spacing.xs },
  scroll: { paddingHorizontal: spacing.base, paddingBottom: spacing.xl },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconContainer: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionText: { flex: 1, marginLeft: spacing.md },
  actionTitle: { fontSize: fontSizes.base, fontWeight: fontWeights.semibold, color: colors.text },
  actionSubtitle: { fontSize: fontSizes.sm, color: colors.textSecondary, marginTop: 2 },
  // Status modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.xl },
  modalContent: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.xl },
  modalTitle: { fontSize: fontSizes.xl, fontWeight: fontWeights.semibold, color: colors.text, marginBottom: spacing.sm },
  currentStatus: { fontSize: fontSizes.base, color: colors.textSecondary, marginBottom: spacing.md },
  currentStatusValue: { fontWeight: fontWeights.semibold, color: colors.text },
  warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.warningLightBg, padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.warningBorder },
  warningText: { flex: 1, fontSize: fontSizes.sm, color: colors.warningText, lineHeight: 18 },
  statusOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  statusChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  statusChipActive: { overflow: 'hidden', borderColor: colors.primary },
  statusChipText: { fontSize: fontSizes.sm, color: colors.textSecondary },
  statusChipTextActive: { color: colors.white },
  label: { fontSize: fontSizes.base, fontWeight: fontWeights.medium, color: colors.text, marginBottom: spacing.xs, marginTop: spacing.sm },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: fontSizes.base, color: colors.text },
  modalButtons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  cancelButton: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.base, alignItems: 'center' },
  cancelButtonText: { fontSize: fontSizes.base, fontWeight: fontWeights.medium, color: colors.textSecondary },
  confirmButton: { flex: 1, overflow: 'hidden', borderRadius: radius.md, padding: spacing.base, alignItems: 'center' },
  confirmButtonDisabled: { opacity: 0.6 },
  confirmButtonText: { fontSize: fontSizes.base, fontWeight: fontWeights.semibold, color: colors.white },
  // Loading overlay
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  loadingBox: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', gap: spacing.md },
  loadingText: { fontSize: fontSizes.base, color: colors.textSecondary },
});
