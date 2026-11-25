import { Redirect, Stack, router, usePathname, type Href } from 'expo-router';
import AppIcon, { type AppIconName } from '@/shared/presentation/AppIcon';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { User } from '@/modules/authentication/domain/entities';
import { useSessionStore } from '@/modules/authentication/presentation/sessionStore';
import SignOutButton from '@/modules/authentication/presentation/SignOutButton';
import { useConnectivityStore } from '@/modules/sincronizacion/presentation/useConnectivityMonitor';
import { Colors } from '@/constants/theme';
import { BRAND_ACCENTS } from './Ui';

type ActiveRole = Extract<User['role'], 'provincial' | 'coordinator' | 'veedor'>;

const roleRoute: Record<ActiveRole, '/provincial' | '/recinto' | '/veedor'> = {
  provincial: '/provincial',
  coordinator: '/recinto',
  veedor: '/veedor',
};

const roleLabel: Record<ActiveRole, string> = {
  provincial: 'Coordinador Provincial',
  coordinator: 'Coordinador de Recinto',
  veedor: 'Veedor de Mesa (JRV)',
};

const roleSubtitle: Record<ActiveRole, string> = {
  provincial: 'Pichincha · Cantón Rumiñahui',
  coordinator: 'Gestión de recinto y veedores',
  veedor: 'Captura y respaldo de actas',
};

type Destination = { href: Href; label: string; icon: AppIconName };
const roleTabs: Record<ActiveRole, Destination[]> = {
  provincial: [
    { href: '/provincial', label: 'Resultados', icon: { ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' } },
    { href: '/provincial/recintos', label: 'Recintos', icon: { ios: 'building.columns', android: 'account_balance', web: 'account_balance' } },
    { href: '/provincial/coordinador', label: 'Coordinador', icon: { ios: 'person.badge.plus', android: 'person_add', web: 'person_add' } },
    { href: '/provincial/actas', label: 'Actas', icon: { ios: 'doc.text', android: 'description', web: 'description' } },
  ],
  coordinator: [
    { href: '/recinto', label: 'Recinto', icon: { ios: 'building.columns', android: 'account_balance', web: 'account_balance' } },
    { href: '/recinto/veedor', label: 'Veedores', icon: { ios: 'person.2', android: 'group', web: 'group' } },
    { href: '/recinto/asignaciones', label: 'Asignar', icon: { ios: 'arrow.left.arrow.right', android: 'swap_horiz', web: 'swap_horiz' } },
    { href: '/recinto/actas', label: 'Actas', icon: { ios: 'doc.text', android: 'description', web: 'description' } },
  ],
  veedor: [
    { href: '/veedor', label: 'Mis mesas', icon: { ios: 'tray', android: 'how_to_vote', web: 'how_to_vote' } },
    { href: '/veedor/actas', label: 'Guardadas', icon: { ios: 'doc.text', android: 'description', web: 'description' } },
    { href: '/veedor/recibidas', label: 'Enviadas', icon: { ios: 'checkmark.seal', android: 'task_alt', web: 'task_alt' } },
  ],
};

export default function ProtectedRoleLayout({ role }: { role: ActiveRole }) {
  const user = useSessionStore((state) => state.user);
  const hydrated = useSessionStore((state) => state.hydrated);
  const connectivity = useConnectivityStore((state) => state.connectivity);
  const path = usePathname();

  if (!hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-paper">
        <ActivityIndicator color={Colors.light.primary} />
      </View>
    );
  }
  if (!user) return <Redirect href="/login" />;
  if (user.status === 'PENDING') return <Redirect href="/first-access" />;
  if (user.status !== 'ACTIVE') return <Redirect href="/login" />;
  if (user.role !== role) return <Redirect href={roleRoute[user.role]} />;

  const isCapture = path === '/veedor/acta';
  const offline = connectivity === 'offline';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.layout}>
        {!isCapture ? (
          <Animated.View entering={FadeInDown.duration(260)} style={styles.topBar}>
            <View className="flex-1 flex-row items-center gap-2.5">
              {path !== roleRoute[role] ? (
                <Pressable
                  accessibilityLabel="Volver al panel"
                  accessibilityRole="button"
                  className="h-10 w-10 items-center justify-center rounded-full bg-white/12"
                  onPress={() => {
                    if (!roleTabs[role].some((tab) => tab.href === path) && router.canGoBack()) router.back();
                    else router.replace(roleRoute[role]);
                  }}>
                  <AppIcon name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }} size={19} tintColor="#FFFFFF" />
                </Pressable>
              ) : (
                <View style={styles.ballotBadge}>
                  <AppIcon
                    name={{ ios: 'tray.full.fill', android: 'how_to_vote', web: 'how_to_vote' }}
                    size={17}
                    tintColor={Colors.light.primary}
                  />
                </View>
              )}
              <View className="flex-1">
                <Text numberOfLines={1} accessibilityRole="header" className="font-electoral-bold text-sm text-white">
                  {roleLabel[role]}
                </Text>
                <View className="flex-row items-center gap-1.5">
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: offline ? BRAND_ACCENTS.gold : '#32D583',
                    }}
                  />
                  <Text numberOfLines={1} className="font-electoral text-[11px] text-white/80">
                    {offline ? 'Sin conexión a internet' : roleSubtitle[role]}
                  </Text>
                </View>
              </View>
            </View>
            <SignOutButton compact />
          </Animated.View>
        ) : null}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#FAF9F5' },
          }}
        />
        {!isCapture ? (
          <View style={styles.tabBar} className="flex-row gap-1.5 border-t border-brand-line bg-brand-surface px-2.5 py-2">
            {roleTabs[role].map(({ href, label, icon }) => {
              const selected = path === href;
              return (
                <Pressable
                  key={String(href)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    if (!selected) router.replace(href);
                  }}
                  className={`min-h-12 flex-1 items-center justify-center gap-0.5 rounded-full px-1 ${
                    selected ? 'bg-brand-navy' : 'bg-transparent'
                  }`}>
                  <AppIcon name={icon} size={18} tintColor={selected ? '#FFFFFF' : Colors.light.primary} />
                  <Text className={`font-electoral-bold text-[11px] ${selected ? 'text-white' : 'text-brand-ink'}`}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.light.primary },
  layout: { flex: 1, backgroundColor: '#FAF9F5' },
  topBar: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.light.primary,
  },
  ballotBadge: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  tabBar: {
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 6,
  },
});
