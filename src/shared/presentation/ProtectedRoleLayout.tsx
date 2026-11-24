import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import type { User } from '@/modules/authentication/domain/entities';
import { useSessionStore } from '@/modules/authentication/presentation/sessionStore';

type ActiveRole = Extract<User['role'], 'provincial' | 'coordinator' | 'veedor'>;

const roleRoute: Record<ActiveRole, '/provincial' | '/recinto' | '/veedor'> = {
  provincial: '/provincial',
  coordinator: '/recinto',
  veedor: '/veedor',
};

export default function ProtectedRoleLayout({ role }: { role: ActiveRole }) {
  const user = useSessionStore((state) => state.user);
  const hydrated = useSessionStore((state) => state.hydrated);

  if (!hydrated) {
    return <View className="flex-1 items-center justify-center bg-brand-paper"><ActivityIndicator color="#15464B" /></View>;
  }
  if (!user) return <Redirect href="/login" />;
  if (user.status === 'PENDING') return <Redirect href="/first-access" />;
  if (user.status !== 'ACTIVE') return <Redirect href="/login" />;
  if (user.role !== role) return <Redirect href={roleRoute[user.role]} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
