// Guía: Presenta la confirmación visual de una operación guardada en móvil.

import LottieView from 'lottie-react-native';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import ElectionMotion, { type ElectionScene } from './ElectionMotion';
import { AppButton, TricolorStripe } from './Ui';

const colors = Colors.light;

/**
 * Tarjeta destacada de confirmación animada (sin modales genéricos, cumpliendo ADR-12):
 * Combina animación Lottie de proceso/éxito/error con entrada Reanimated ZoomIn/FadeInDown
 * y mensajes claros al guardar votos, recintos, asignaciones o cuentas.
 */
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
      entering={FadeInDown.springify().damping(15)}
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
        <Animated.View entering={ZoomIn.delay(90).springify().damping(13)} style={styles.stage}>
          <ElectionMotion scene={scene} size={132} loop={tone === 'info'} />
          {tone === 'success' ? (
            <View style={styles.cornerBadge}>
              <LottieView
                source={require('../../../assets/lottie/status-success.json')}
                autoPlay
                loop={false}
                style={{ width: 46, height: 46 }}
              />
            </View>
          ) : tone === 'error' ? (
            <View style={styles.cornerBadge}>
              <LottieView
                source={require('../../../assets/lottie/status-error.json')}
                autoPlay
                loop={false}
                style={{ width: 46, height: 46 }}
              />
            </View>
          ) : null}
        </Animated.View>
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
  card: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 18,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  stage: {
    width: 144,
    height: 144,
    borderRadius: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cornerBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
});
