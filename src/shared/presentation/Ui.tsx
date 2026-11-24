import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import StatusAnimation from './StatusAnimation';

const colors = Colors.light;

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      className={`min-h-14 flex-row items-center justify-center gap-2 rounded-2xl px-5 active:opacity-85 disabled:opacity-55 ${
        variant === 'primary' ? 'bg-brand-navy' : variant === 'danger' ? 'bg-brand-danger' : 'border border-brand-line bg-brand-surface'
      }`}>
      {loading ? <ActivityIndicator color={variant === 'secondary' ? colors.primary : '#FFFFFF'} /> : null}
      <Text className={`text-base font-bold ${variant === 'secondary' ? 'text-brand-navy' : 'text-white'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export function StatusBanner({
  tone,
  title,
  detail,
  busy = false,
}: {
  tone: 'success' | 'warning' | 'error' | 'info';
  title: string;
  detail?: string;
  busy?: boolean;
}) {
  const toneColor = {
    success: colors.success,
    warning: colors.warning,
    error: colors.danger,
    info: colors.primary,
  }[tone];

  return (
    <Animated.View
      accessibilityLiveRegion={tone === 'error' || tone === 'success' ? 'polite' : 'none'}
      entering={FadeInDown.duration(260)}
      className="flex-row items-center gap-3 rounded-2xl border bg-brand-surface px-4 py-3"
      style={{ borderColor: toneColor }}>
      <StatusAnimation tone={tone} busy={busy} />
      <View style={{ flex: 1 }}>
        <Text className="text-sm font-bold" style={{ color: toneColor }}>{title}</Text>
        {detail ? <Text className="mt-1 text-sm leading-5 text-brand-muted">{detail}</Text> : null}
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
    <View className="mb-1 overflow-hidden rounded-3xl bg-brand-navy px-5 py-6">
      <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={styles.contours}>
        {[0, 1, 2, 3, 4, 5].map((ring) => (
          <View key={ring} style={[styles.contour, {
            width: 100 + ring * 26,
            height: 56 + ring * 18,
            right: -ring * 12,
            top: -ring * 7,
          }]} />
        ))}
      </View>
      <Text className="text-xs font-extrabold uppercase tracking-widest text-brand-gold">{eyebrow}</Text>
      <Text accessibilityRole="header" className="mt-2 text-3xl font-extrabold leading-9 text-white">{title}</Text>
      {subtitle ? <Text className="mt-2 text-base leading-6 text-white/90">{subtitle}</Text> : null}
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View className="rounded-3xl border border-brand-line bg-brand-surface p-5">{children}</View>;
}

export function AppPage({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      className="flex-1 bg-brand-paper"
      style={styles.page}
      contentContainerStyle={styles.pageScroll}
      keyboardShouldPersistTaps="handled">
      <View className="w-full self-center gap-4 px-5 pb-8 pt-6" style={styles.pageContent}>
        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageScroll: { flexGrow: 1 },
  pageContent: { maxWidth: 760 },
  contours: { position: 'absolute', right: -12, top: 14, transform: [{ rotate: '-27deg' }] },
  contour: { position: 'absolute', borderWidth: 1, borderColor: '#FFFFFF26', borderRadius: 99 },
});
