import React from 'react';
import { SafeAreaView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import { EventFormScreen } from './EventFormScreen';

type EditRoute = RouteProp<MoreStackParamList, 'EditEvent'>;

export function EditEventScreen() {
  const route = useRoute<EditRoute>();
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <EventFormScreen mode="edit" event={route.params?.event} />
    </SafeAreaView>
  );
}
