import { View } from 'react-native';
import LottieView from 'lottie-react-native';
import { useReducedMotion } from 'react-native-reanimated';

export type ElectionScene = 'welcome' | 'login-welcome' | 'voting' | 'farewell' | 'record' | 'account';

const animations = {
  welcome: require('../../../assets/lottie/ballot-welcome.json'),
  'login-welcome': require('../../../assets/lottie/ballot-login-welcome.json'),
  voting: require('../../../assets/lottie/ballot-voting.json'),
  farewell: require('../../../assets/lottie/ballot-farewell.json'),
  record: require('../../../assets/lottie/ballot-record.json'),
  account: require('../../../assets/lottie/ballot-account.json'),
};

const progressAnimations = {
  welcome: animations.welcome,
  'login-welcome': animations['login-welcome'],
  voting: animations.voting,
  farewell: animations.farewell,
  record: { ...animations.record, layers: animations.record.layers.filter((layer: { nm: string }) => layer.nm !== 'Validación') },
  account: { ...animations.account, layers: animations.account.layers.filter((layer: { nm: string }) => layer.nm !== 'Validación') },
};

export default function ElectionMotion({
  scene,
  size = 74,
  width,
  height,
  loop = true,
}: {
  scene: ElectionScene;
  size?: number;
  width?: number;
  height?: number;
  loop?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const resolvedWidth = width ?? size;
  const resolvedHeight = height ?? (scene === 'voting' && width ? Math.round(width * 0.78) : size);
  return (
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LottieView
        source={(loop ? progressAnimations : animations)[scene]}
        autoPlay={!reducedMotion}
        loop={loop && !reducedMotion}
        progress={reducedMotion ? (scene === 'login-welcome' ? 0.25 : 0.65) : undefined}
        style={{ width: resolvedWidth, height: resolvedHeight }}
      />
    </View>
  );
}
