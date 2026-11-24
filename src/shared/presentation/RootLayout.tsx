import { DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { restaurarSesion } from '@/modules/authentication/presentation/authUseCaseProvider';
import { useSessionStore } from '@/modules/authentication/presentation/sessionStore';
import { StatusBanner } from './Ui';

SplashScreen.preventAutoHideAsync();

function SessionStack() {
  const [attempt, setAttempt] = useState(0);
  const hydrated = useSessionStore((state) => state.hydrated);
  const restoreError = useSessionStore((state) => state.restoreError);
  const setUser = useSessionStore((state) => state.setUser);
  const beginRestore = useSessionStore((state) => state.beginRestore);
  const setRestoreError = useSessionStore((state) => state.setRestoreError);

  useEffect(() => {
    let active = true;
    void restaurarSesion().then(
      (user) => { if (active) setUser(user); },
      (error: unknown) => {
        if (active) setRestoreError(error instanceof Error ? error.message : 'No se pudo restaurar el acceso.');
      },
    );
    return () => { active = false; };
  }, [attempt, setRestoreError, setUser]);

  if (!hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-paper px-6">
        <ActivityIndicator size="large" color="#15464B" />
        <Text className="mt-4 text-base font-semibold text-brand-ink">Preparando el acceso seguro…</Text>
      </View>
    );
  }

  if (restoreError) {
    return (
      <View className="flex-1 justify-center gap-4 bg-brand-paper px-5">
        <StatusBanner tone="error" title="No se pudo restaurar la sesión" detail={restoreError} />
        <Pressable
          accessibilityRole="button"
          className="min-h-14 items-center justify-center rounded-2xl bg-brand-navy px-5"
          onPress={() => {
            beginRestore();
            setAttempt((current) => current + 1);
          }}>
          <Text className="text-base font-bold text-white">Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F6F5F0' },
        animation: 'fade',
      }}
    />
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={DefaultTheme}>
      <StatusBar style="dark" />
      <SessionStack />
    </ThemeProvider>
  );
}
