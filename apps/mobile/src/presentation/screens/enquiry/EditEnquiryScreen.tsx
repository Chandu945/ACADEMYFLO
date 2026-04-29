import React from 'react';
import { SafeAreaView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import { EnquiryFormScreen } from './EnquiryFormScreen';

type Route = RouteProp<MoreStackParamList, 'EditEnquiry'>;

export function EditEnquiryScreen() {
  const route = useRoute<Route>();
  const { enquiry } = route.params;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <EnquiryFormScreen mode="edit" enquiry={enquiry} />
    </SafeAreaView>
  );
}
