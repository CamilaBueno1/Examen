import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import ElectionMotion, { type ElectionScene } from './ElectionMotion';
import { AppButton, TricolorStripe } from './Ui';

const colors = Colors.light;

export default function SaveCelebrationCard({
  tone = 'success',
  scene = 'record',
  eyebrow = 'OPERACIÓN CONFIRMADA',
  title,
  detail,
  actionLabel,
  onAction,
}: {
  tone?: 'success' | 'warning' | 'error' | 'info';
  scene?: ElectionScene;
  eyebrow?: string;
  title: string;
  detail: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const palette = {
    success: { border: colors.success, bg: '#F1FAF4', pill: '#DCF2E4', text: colors.success },
    warning: { border: colors.warning, bg: '#FEF7EC', pill: '#FDE9C9', text: colors.warning },
    error: { border: colors.danger, bg: '#FEF3F2', pill: '#FDE0DE', text: colors.danger },
    info: { border: colors.primary, bg: '#F0F6FA', pill: '#DCEAF3', text: colors.primary },
  }[tone];

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      entering={FadeInDown.duration(300)}
      style={[styles.card, { borderColor: palette.border, backgroundColor: palette.bg }]}>
      <View className="flex-row items-center justify-between">
        <View style={[styles.pill, { backgroundColor: palette.pill }]}>
          <Text className="font-electoral-bold text-[10px] uppercase tracking-widest" style={{ color: palette.text }}>
            {eyebrow}
          </Text>
        </View>
        <TricolorStripe width={36} height={4} />
      </View>
      <View className="my-2 items-center justify-center">
        <ElectionMotion scene={scene} size={120} loop={tone === 'info'} />
      </View>
      <Text accessibilityRole="header" className="font-electoral-bold text-center text-xl text-brand-ink">
        {title}
      </Text>
      <Text className="font-electoral mt-1 text-center text-xs leading-5 text-brand-muted">
        {detail}
      </Text>
      {actionLabel && onAction ? (
        <View className="mt-4">
          <AppButton label={actionLabel} pill onPress={onAction} />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, borderWidth: 1.5, padding: 18 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
});
