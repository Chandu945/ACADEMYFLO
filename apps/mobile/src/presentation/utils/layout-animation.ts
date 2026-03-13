import { LayoutAnimation, Platform, UIManager } from 'react-native';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

export function animateLayout() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}
