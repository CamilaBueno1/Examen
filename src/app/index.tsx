// Guía: Espera la recuperación de sesión y abre el panel correspondiente al rol.

import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import LoginScreen from '@/modules/authentication/presentation/LoginScreen';
import { useSessionStore } from '@/modules/authentication/presentation/sessionStore';

// Ruta inicial: espera la sesión y envía a cada usuario al flujo correspondiente.
export default function Index() {
  const user = useSessionStore((state) => state.user);
  const hydrated = useSessionStore((state) => state.hydrated);

  if (!hydrated) return <View className="flex-1 items-center justify-center bg-brand-paper"><ActivityIndicator color="#15464B" /></View>;
  if (!user) return <LoginScreen />;
  if (user.status === 'PENDING') return <Redirect href="/first-access" />;
  if (user.status !== 'ACTIVE') return <LoginScreen />;
  if (user.role === 'provincial') return <Redirect href="/provincial" />;
  if (user.role === 'coordinator') return <Redirect href="/recinto" />;
  return <Redirect href="/veedor" />;
}
