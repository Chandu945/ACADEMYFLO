import React from 'react';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import { EventFormScreen } from './EventFormScreen';

type EditRoute = RouteProp<MoreStackParamList, 'EditEvent'>;

export function EditEventScreen() {
  const route = useRoute<EditRoute>();
  return <EventFormScreen mode="edit" event={route.params?.event} />;
}
