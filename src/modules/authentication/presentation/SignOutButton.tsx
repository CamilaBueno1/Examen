// Guía: Coordina el cierre de sesión y la salida del panel.

import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import AppIcon from '@/shared/presentation/AppIcon';
import { Colors } from '@/constants/theme';

import { AppButton, StatusBanner } from '@/shared/presentation/Ui';
import { cerrarSesion } from './authUseCaseProvider';
import { useSessionStore } from './sessionStore';

export default function SignOutButton({
  compact = false,
  label = 'Cerrar sesión',
  disabled = false,
}: {
  compact?: boolean;
  label?: string;
  disabled?: boolean;
}) {
  const user = useSessionStore((state) => state.user);
  const triggerFarewell = useSessionStore((state) => state.triggerFarewell);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (busy || disabled) return;
    setBusy(true);
    setError('');
    const displayName = user?.firstName?.trim() || user?.fullName?.trim() || '';
    try {
      await cerrarSesion();
      triggerFarewell(displayName);
      router.replace('/login');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cerrar la sesión.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={compact ? styles.compactContainer : styles.container}>
      {compact ? (
        <Pressable
          accessibilityLabel={label}
          accessibilityRole="button"
          accessibilityState={{ busy, disabled: busy || disabled }}
          disabled={busy || disabled}
          onPress={() => void submit()}
          style={({ pressed }) => [styles.compactButton, pressed && styles.pressed, (busy || disabled) && styles.disabled]}>
          {busy ? (
            <ActivityIndicator size="small" color={Colors.light.primary} />
          ) : (
            <View style={styles.compactRow}>
              <AppIcon
                name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }}
                size={15}
                tintColor={Colors.light.primary}
              />
              <Text style={styles.compactLabel}>Salir</Text>
            </View>
          )}
        </Pressable>
      ) : (
        <AppButton label={label} variant="secondary" loading={busy} disabled={disabled} onPress={() => void submit()} />
      )}
      {error ? (
        compact ? (
          <Text accessibilityRole="alert" style={styles.compactError}>
            {error}
          </Text>
        ) : (
          <StatusBanner tone="error" title="No se cerró la sesión" detail={error} />
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  compactContainer: { alignItems: 'flex-end' },
  compactButton: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  compactLabel: { fontFamily: 'LatoBold', color: Colors.light.primary, fontSize: 12.5 },
  compactError: { maxWidth: 160, marginTop: 4, color: '#FFFFFF', fontSize: 10, textAlign: 'right' },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.65 },
});
