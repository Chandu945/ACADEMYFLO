import React from 'react';
import {  } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EventFormScreen } from './EventFormScreen';

export function AddEventScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <EventFormScreen mode="create" />
    </SafeAreaView>
  );
}
