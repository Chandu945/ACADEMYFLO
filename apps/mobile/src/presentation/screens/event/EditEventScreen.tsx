import React from 'react';
import {  } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import { EventFormScreen } from './EventFormScreen';

type EditRoute = RouteProp<MoreStackParamList, 'EditEvent'>;

export function EditEventScreen() {
  const route = useRoute<EditRoute>();
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <EventFormScreen mode="edit" event={route.params?.event} />
    </SafeAreaView>
  );
}
