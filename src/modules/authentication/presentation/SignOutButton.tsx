import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

import { AppButton, StatusBanner } from '@/shared/presentation/Ui';
import { cerrarSesion } from './authUseCaseProvider';
import { useSessionStore } from './sessionStore';

export default function SignOutButton() {
  const setUser = useSessionStore((state) => state.setUser);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setBusy(true);
    setError('');
    try {
      await cerrarSesion();
      setUser(null);
      router.replace('/login');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cerrar la sesión.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="gap-2">
      {error ? <StatusBanner tone="error" title="No se cerró la sesión" detail={error} /> : null}
      <AppButton label="Cerrar sesión" variant="secondary" loading={busy} onPress={submit} />
    </View>
  );
}
