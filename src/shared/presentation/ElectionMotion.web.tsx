import AppIcon from '@/shared/presentation/AppIcon';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import type { ElectionScene } from './ElectionMotion';

const icons = {
  welcome: 'how_to_vote',
  'login-welcome': 'how_to_vote',
  voting: 'how_to_vote',
  farewell: 'waving_hand',
  record: 'assignment_turned_in',
  account: 'badge',
} as const;

export default function ElectionMotion({
  scene,
  size = 74,
  width,
  height,
  loop = false,
}: {
  scene: ElectionScene;
  size?: number;
  width?: number;
  height?: number;
  loop?: boolean;
}) {
  const boxSize = width ?? height ?? size;
  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      entering={FadeInDown.duration(450).reduceMotion(ReduceMotion.System)}
      className="items-center justify-center rounded-full bg-brand-field"
      style={{ width: boxSize, height: height ?? boxSize }}>
      <AppIcon
        name={{ web: loop && scene === 'record' ? 'assignment' : icons[scene] }}
        size={Math.round(Math.min(boxSize, height ?? boxSize) * 0.49)}
        tintColor={Colors.light.primary}
      />
    </Animated.View>
  );
}
