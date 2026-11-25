import { DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/theme';

import { restaurarSesion } from '@/modules/authentication/presentation/authUseCaseProvider';
import { useSessionStore } from '@/modules/authentication/presentation/sessionStore';
import { StatusBanner } from './Ui';
import ElectionMotion from './ElectionMotion';

void SplashScreen.preventAutoHideAsync().catch(() => {});

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
        <ElectionMotion scene="voting" size={164} loop />
        <Text className="font-electoral-bold mt-4 text-lg text-brand-ink">Control Electoral</Text>
        <Text className="font-electoral mt-1 text-sm text-brand-muted">Preparando el acceso seguro…</Text>
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
        contentStyle: { backgroundColor: Colors.light.background },
        animation: 'fade',
      }}
    />
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    LatoRegular: require('../../../assets/fonts/Lato-Regular.ttf'),
    LatoBold: require('../../../assets/fonts/Lato-Bold.ttf'),
  });
  const splashDismissed = useRef(false);

  return (
    <ThemeProvider value={DefaultTheme}>
      <StatusBar style="dark" />
      <View
        style={{ flex: 1, backgroundColor: Colors.light.background }}
        onLayout={() => {
          if (splashDismissed.current) return;
          splashDismissed.current = true;
          void SplashScreen.hideAsync().catch(() => {});
        }}>
        {fontsLoaded || fontError ? <SessionStack /> : (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-base font-bold text-brand-ink">Preparando Control Electoral…</Text>
          </View>
        )}
      </View>
    </ThemeProvider>
  );
}
