import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useConnectivityStore } from '@/modules/sincronizacion/presentation/useConnectivityMonitor';
import SignOutButton from '@/modules/authentication/presentation/SignOutButton';
import { AppButton, AppPage, ScreenHeader, StatusBanner } from '@/shared/presentation/Ui';
import AvanceElectoral from './AvanceElectoral';

export default function ProvincialDashboard() {
  const connectivity = useConnectivityStore((state) => state.connectivity);

  return (
    <AppPage>
      <ScreenHeader
        eyebrow="COORDINACIÓN PROVINCIAL"
        title="Panel de control"
        subtitle="Gestión territorial y seguimiento electoral · Rumiñahui, Pichincha"
      />

      <StatusBanner
        tone={connectivity === 'offline' ? 'warning' : 'info'}
        title={connectivity === 'offline' ? 'Trabajando sin conexión' : connectivity === 'online' ? 'Conectado al servicio' : 'Comprobando conexión'}
        detail={connectivity === 'offline'
          ? 'Se muestra el estado conocido. Las cifras no se actualizarán hasta recuperar conexión.'
          : 'El avance se calcula con las actas recibidas por el servidor.'}
        busy={connectivity === 'unknown'}
      />

      <AvanceElectoral />
      <AppButton label="Consultar actas y evidencias" variant="secondary" onPress={() => router.push('/provincial/actas')} />

      <View>
        <Text className="mb-2 text-base font-extrabold text-brand-ink">Herramientas de coordinación</Text>
        <Pressable
          accessibilityRole="button"
          className="mb-3 rounded-2xl border border-brand-line bg-brand-surface p-4 active:bg-brand-paper"
          onPress={() => router.push('/provincial/coordinador')}>
          <Text className="text-base font-bold text-brand-ink">Habilitar coordinador de recinto</Text>
          <Text className="mt-1 text-sm leading-5 text-brand-muted">Crear una cuenta y asignar un responsable a un recinto.</Text>
          <Text className="mt-3 text-sm font-bold text-brand-navy">Crear coordinador  ›</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          className="mb-3 rounded-2xl border border-brand-line bg-brand-surface p-4 active:bg-brand-paper"
          onPress={() => router.push('/provincial/recintos')}>
          <Text className="text-base font-bold text-brand-ink">Territorio y recintos</Text>
          <Text className="mt-1 text-sm leading-5 text-brand-muted">Consultar el catálogo provincial disponible en el dispositivo.</Text>
          <Text className="mt-3 text-sm font-bold text-brand-navy">Consultar recintos  ›</Text>
        </Pressable>
      </View>

      <View className="pt-1">
        <SignOutButton />
      </View>
    </AppPage>
  );
}
