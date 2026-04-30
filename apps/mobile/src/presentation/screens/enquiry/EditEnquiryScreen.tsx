import React from 'react';
import {  } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import { EnquiryFormScreen } from './EnquiryFormScreen';

type Route = RouteProp<MoreStackParamList, 'EditEnquiry'>;

export function EditEnquiryScreen() {
  const route = useRoute<Route>();
  const { enquiry } = route.params;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <EnquiryFormScreen mode="edit" enquiry={enquiry} />
    </SafeAreaView>
  );
}
