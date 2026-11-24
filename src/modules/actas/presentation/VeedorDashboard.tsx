import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { MesasAutorizadas } from '@/modules/territorio/presentation/MesasAutorizadas';
import { useActasLocales } from './useActasLocales';
import { estadoActa } from './estadoActa';

import { useConnectivityStore } from '@/modules/sincronizacion/presentation/useConnectivityMonitor';
import SignOutButton from '@/modules/authentication/presentation/SignOutButton';
import { AppButton, AppPage, ScreenHeader, StatusBanner } from '@/shared/presentation/Ui';

export default function VeedorDashboard() {
  const connectivity = useConnectivityStore((state) => state.connectivity);
  const locales = useActasLocales();

  return (
    <AppPage>
      <ScreenHeader
        eyebrow="VEEDOR"
        title="Mis mesas"
        subtitle="Consulta las JRV asignadas y registra sus actas"
      />
      <StatusBanner
        tone={connectivity === 'offline' ? 'warning' : 'info'}
        title={connectivity === 'offline' ? 'Sin conexión' : connectivity === 'online' ? 'Conectado' : 'Estado de red desconocido'}
        detail={connectivity === 'offline'
          ? 'Los datos locales previamente autorizados siguen disponibles.'
          : 'El envío solo se marcará confirmado cuando responda el servidor.'}
        busy={connectivity === 'unknown'}
      />
      {locales?.error ? <StatusBanner tone="warning" title="Historial local no disponible" detail={locales.error} /> : null}
      <MesasAutorizadas
        onSelect={(mesa) => router.push({ pathname: '/veedor/acta', params: { jrvId: mesa.id } })}
        resumen={(mesa) => locales?.actas ? (
          <View className="mb-3 gap-1">
            {(['alcaldia', 'prefectura'] as const).map((dignidad) => {
              const local = locales.actas?.find((item) => item.registro.jrvId === mesa.id && item.registro.dignidad === dignidad);
              const status = local ? estadoActa(local.estado) : 'Sin acta local';
              return <Text key={dignidad} className="text-sm text-brand-muted">{dignidad === 'alcaldia' ? 'Alcaldía' : 'Prefectura'} · {status}</Text>;
            })}
          </View>
        ) : null}
      />
      <AppButton label="Consultar actas" variant="secondary" onPress={() => router.push('/veedor/actas')} />
      <SignOutButton />
    </AppPage>
  );
}
