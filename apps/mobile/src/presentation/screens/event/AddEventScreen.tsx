import React from 'react';
import { SafeAreaView } from 'react-native';
import { EventFormScreen } from './EventFormScreen';

export function AddEventScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <EventFormScreen mode="create" />
    </SafeAreaView>
  );
}
