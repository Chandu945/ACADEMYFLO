import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import { AuthStack } from './AuthStack';
import { OwnerTabs } from './OwnerTabs';
import { StaffTabs } from './StaffTabs';
import { ParentTabs } from './ParentTabs';
import { BlockedStack } from './BlockedStack';
import { AcademySetupScreen } from '../screens/auth/AcademySetupScreen';
import { ForceUpdateScreen } from '../screens/auth/ForceUpdateScreen';
import { SessionExpiredSheet } from '../components/auth/SessionExpiredSheet';

const rootFadeStyle = { flex: 1 } as const;

export function RootNavigator() {
  const { phase, user, forceUpdate, sessionExpired, dismissSessionExpired } = useAuth();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const prevPhaseRef = useRef(phase);

  // Fade transition when auth phase changes to prevent jarring flash
  useEffect(() => {
    if (prevPhaseRef.current !== phase) {
      prevPhaseRef.current = phase;
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [phase, fadeAnim]);

  let content: React.ReactNode;

  switch (phase) {
    case 'initializing':
      content = <LoadingOverlay message="Starting Academyflo..." />;
      break;

    case 'updateRequired':
      content = (
        <ForceUpdateScreen
          storeUrl={forceUpdate?.storeUrl ?? ''}
          minVersion={forceUpdate?.minVersion ?? ''}
        />
      );
      break;

    case 'unauthenticated':
      content = (
        <View style={rootFadeStyle}>
          <AuthStack />
          <SessionExpiredSheet visible={sessionExpired} onDismiss={dismissSessionExpired} />
        </View>
      );
      break;

    case 'needsAcademySetup':
      content = <AcademySetupScreen />;
      break;

    case 'blocked':
      content = <BlockedStack />;
      break;

    case 'ready':
      if (user?.role === 'OWNER') content = <OwnerTabs />;
      else if (user?.role === 'PARENT') content = <ParentTabs />;
      else content = <StaffTabs />;
      break;

    default:
      content = <AuthStack />;
      break;
  }

  return (
    <Animated.View style={[rootFadeStyle, { opacity: fadeAnim }]}>
      {content}
    </Animated.View>
  );
}
