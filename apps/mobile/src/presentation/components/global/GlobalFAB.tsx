import React, { useState, useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import type { AddNewOption } from './AddNewModal';
import { AddNewModal } from './AddNewModal';
import { useFAB } from '../../context/FABContext';
import { colors, radius } from '../../theme';

export function GlobalFAB() {
  const { isFABVisible } = useFAB();
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation<any>();

  const handleSelect = useCallback(
    (option: AddNewOption) => {
      switch (option) {
        case 'Student':
          navigation.navigate('Students', {
            screen: 'StudentForm',
            params: { mode: 'create' },
          });
          break;
        case 'Staff':
          navigation.navigate('More', {
            screen: 'StaffForm',
            params: { mode: 'create' },
          });
          break;
        case 'Batch':
          navigation.navigate('More', {
            screen: 'BatchForm',
            params: { mode: 'create' },
          });
          break;
        case 'Expense':
          navigation.navigate('More', { screen: 'ExpensesHome' });
          break;
        case 'Enquiry':
          navigation.navigate('More', { screen: 'AddEnquiry' });
          break;
        case 'Event':
          navigation.navigate('More', { screen: 'AddEvent' });
          break;
      }
    },
    [navigation],
  );

  if (!isFABVisible) return null;

  return (
    <>
      <Pressable
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        testID="global-fab"
        accessibilityLabel="Add new item"
        accessibilityRole="button"
      >
        {/* @ts-expect-error react-native-vector-icons types incompatible with @types/react@19 */}
        <Icon name="plus" size={28} color={colors.white} />
      </Pressable>
      <AddNewModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={handleSelect}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    zIndex: 100,
  },
});
