import React from 'react';
import { SafeAreaView } from 'react-native';
import { EnquiryFormScreen } from './EnquiryFormScreen';

export function AddEnquiryScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <EnquiryFormScreen mode="create" />
    </SafeAreaView>
  );
}
