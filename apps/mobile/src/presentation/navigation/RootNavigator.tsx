import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import { AuthStack } from './AuthStack';
import { OwnerTabs } from './OwnerTabs';
import { StaffTabs } from './StaffTabs';
import { ParentTabs } from './ParentTabs';
import { BlockedStack } from './BlockedStack';
import { AcademySetupScreen } from '../screens/auth/AcademySetupScreen';

export function RootNavigator() {
  const { phase, user } = useAuth();

  switch (phase) {
    case 'initializing':
      return <LoadingOverlay message="Starting PlayConnect..." />;

    case 'unauthenticated':
      return <AuthStack />;

    case 'needsAcademySetup':
      return <AcademySetupScreen />;

    case 'blocked':
      return <BlockedStack />;

    case 'ready':
      if (user?.role === 'OWNER') return <OwnerTabs />;
      if (user?.role === 'PARENT') return <ParentTabs />;
      return <StaffTabs />;

    default:
      return <AuthStack />;
  }
}
