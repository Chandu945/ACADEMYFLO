import React from 'react';
import {  } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EnquiryFormScreen } from './EnquiryFormScreen';

export function AddEnquiryScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <EnquiryFormScreen mode="create" />
    </SafeAreaView>
  );
}
