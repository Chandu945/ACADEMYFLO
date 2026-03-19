import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../context/AuthContext';
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

export type AddNewOption =
  | 'Student'
  | 'Staff'
  | 'Batch'
  | 'Expense'
  | 'Enquiry'
  | 'Event';

type MenuItemConfig = {
  key: AddNewOption;
  icon: string;
  title: string;
  subtitle: string;
  ownerOnly?: boolean;
};

const MENU_ITEMS: MenuItemConfig[] = [
  {
    key: 'Student',
    icon: 'account-plus-outline',
    title: 'Student',
    subtitle: 'Add a new student',
  },
  {
    key: 'Staff',
    icon: 'account-tie-outline',
    title: 'Staff',
    subtitle: 'Add a new staff member',
    ownerOnly: true,
  },
  {
    key: 'Batch',
    icon: 'account-group-outline',
    title: 'Batch',
    subtitle: 'Create a new batch',
  },
  {
    key: 'Expense',
    icon: 'calculator-variant-outline',
    title: 'Expense',
    subtitle: 'Record an expense',
    ownerOnly: true,
  },
  {
    key: 'Enquiry',
    icon: 'account-question-outline',
    title: 'Enquiry',
    subtitle: 'Add a new enquiry',
  },
  {
    key: 'Event',
    icon: 'calendar-plus',
    title: 'Calendar Event',
    subtitle: 'Create a new event',
  },
];

type AddNewModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (option: AddNewOption) => void;
};

function AddNewModalComponent({ visible, onClose, onSelect }: AddNewModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const filteredItems = MENU_ITEMS.filter(
    (item) => !item.ownerOnly || isOwner,
  );

  const handleSelect = useCallback(
    (key: AddNewOption) => {
      onSelect(key);
      onClose();
    },
    [onSelect, onClose],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add New</Text>
            <Pressable onPress={onClose} hitSlop={12} testID="add-new-close">
              {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
              <Icon name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView bounces={false}>
            {filteredItems.map((item) => (
              <Pressable
                key={item.key}
                style={styles.menuItem}
                onPress={() => handleSelect(item.key)}
                testID={`add-new-${item.key.toLowerCase()}`}
              >
                <View style={styles.iconContainer}>
                  {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                  <Icon name={item.icon} size={24} color={colors.primary} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
                <Icon name="chevron-right" size={20} color={colors.textDisabled} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

export const AddNewModal = memo(AddNewModalComponent);

const makeStyles = (colors: Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing['3xl'],
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.primary,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
  menuSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
