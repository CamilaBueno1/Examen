// Guía: Reúne botones, tarjetas, encabezados y avisos con el estilo compartido.

import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import StatusAnimation from './StatusAnimation';
import ContourLines from './ContourLines';
import ElectionMotion, { type ElectionScene } from './ElectionMotion';

const colors = Colors.light;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const BRAND_ACCENTS = {
  navy: '#103B50',
  red: '#C8322B',
  gold: '#E5A923',
} as const;

/** Filete horizontal de la referencia visual (azul marino · rojo · amarillo) */
export function TricolorStripe({ width = 72, height = 4 }: { width?: number | '100%'; height?: number }) {
  return (
    <View style={{ flexDirection: 'row', width, height, borderRadius: height <= 5 ? 999 : 0, overflow: 'hidden' }}>
      <View style={{ flex: 2, backgroundColor: BRAND_ACCENTS.navy }} />
      <View style={{ flex: 1, backgroundColor: BRAND_ACCENTS.red }} />
      <View style={{ flex: 1, backgroundColor: BRAND_ACCENTS.gold }} />
    </View>
  );
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  pill = true,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  pill?: boolean;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      onPressIn={() => scale.set(withSpring(0.975, { damping: 16, stiffness: 320 }))}
      onPressOut={() => scale.set(withSpring(1, { damping: 14, stiffness: 260 }))}
      style={[isPrimary ? styles.primaryShadow : isDanger ? styles.dangerShadow : undefined, animatedStyle]}
      className={`min-h-13 flex-row items-center justify-center gap-2.5 px-5 disabled:opacity-55 ${pill ? 'rounded-full' : 'rounded-2xl'} ${
        isPrimary
          ? 'bg-brand-navy'
          : isDanger
            ? 'bg-brand-danger'
            : 'border border-brand-line bg-brand-surface'
      }`}>
      {loading ? <ActivityIndicator color={variant === 'secondary' ? colors.primary : '#FFFFFF'} /> : null}
      <Text className={`text-base font-electoral-bold ${variant === 'secondary' ? 'text-brand-navy' : 'text-white'}`}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

export function StatusBanner({
  tone,
  title,
  detail,
  busy = false,
  election,
}: {
  tone: 'success' | 'warning' | 'error' | 'info';
  title: string;
  detail?: string;
  busy?: boolean;
  election?: ElectionScene;
}) {
  const toneConfig = {
    success: { border: colors.success, bg: '#EDF7EF', badge: '#067647' },
    warning: { border: colors.warning, bg: '#FDF3E2', badge: '#B54708' },
    error: { border: colors.danger, bg: '#FEF3F2', badge: '#B42318' },
    info: { border: colors.primary, bg: '#F0F5F8', badge: '#103B50' },
  }[tone];

  return (
    <Animated.View
      accessibilityLiveRegion={tone === 'error' || tone === 'success' ? 'polite' : 'none'}
      entering={FadeInDown.duration(260)}
      className="flex-row items-center gap-3 rounded-2xl border px-4 py-3.5"
      style={[
        styles.bannerShadow,
        { borderColor: toneConfig.border, backgroundColor: toneConfig.bg, borderLeftWidth: 4 },
      ]}>
      {election ? (
        <ElectionMotion key={`${election}:${busy}`} scene={election} size={busy ? 54 : 64} loop={busy} />
      ) : (
        <StatusAnimation tone={tone} busy={busy} />
      )}
      <View style={{ flex: 1 }}>
        <Text className="font-electoral-bold text-sm" style={{ color: toneConfig.badge }}>
          {title}
        </Text>
        {detail ? <Text className="font-electoral mt-1 text-xs leading-5 text-brand-ink">{detail}</Text> : null}
      </View>
    </Animated.View>
  );
}

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(280)} className="mb-1 gap-1.5 px-1 pt-1">
      <View className="flex-row items-center gap-2.5">
        <TricolorStripe width={42} height={4} />
        <Text className="font-electoral-bold text-xs uppercase tracking-widest text-brand-navy">{eyebrow}</Text>
      </View>
      <Text accessibilityRole="header" className="font-electoral-bold text-2xl leading-8 text-brand-ink">
        {title}
      </Text>
      {subtitle ? <Text className="font-electoral text-sm leading-5 text-brand-muted">{subtitle}</Text> : null}
    </Animated.View>
  );
}

export function Card({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(260)}
      className={`rounded-2xl border border-brand-line bg-brand-surface ${compact ? 'p-3.5' : 'p-4.5'}`}
      style={styles.card}>
      {children}
    </Animated.View>
  );
}

export function ActionRow({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => scale.set(withSpring(0.985, { damping: 16, stiffness: 320 }))}
      onPressOut={() => scale.set(withSpring(1, { damping: 14, stiffness: 260 }))}
      className="min-h-14 flex-row items-center gap-3.5 rounded-2xl border border-brand-line bg-brand-surface px-4 py-3 active:bg-brand-field"
      style={[styles.card, animatedStyle]}>
      <View style={styles.accentBar} />
      <View className="flex-1">
        <Text className="font-electoral-bold text-sm text-brand-ink">{title}</Text>
        {subtitle ? <Text className="font-electoral mt-0.5 text-xs text-brand-muted">{subtitle}</Text> : null}
      </View>
      <View className="h-8 w-8 items-center justify-center rounded-full bg-brand-field">
        <Text className="font-electoral-bold text-lg text-brand-navy">›</Text>
      </View>
    </AnimatedPressable>
  );
}

export function AppPage({ children }: { children: ReactNode }) {
  return (
    <View style={styles.page}>
      <ContourLines />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.pageScroll} keyboardShouldPersistTaps="handled">
        <Animated.View
          entering={FadeInDown.duration(300)}
          className="w-full self-center gap-3.5 px-4 pb-8 pt-3"
          style={styles.pageContent}>
          {children}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FAF9F5' },
  scroll: { flex: 1 },
  pageScroll: { flexGrow: 1 },
  pageContent: { maxWidth: 720 },
  card: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  bannerShadow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  primaryShadow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
  },
  dangerShadow: {
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
  },
  accentBar: {
    width: 4,
    height: 30,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
});
