import { router } from 'expo-router';
import { Text, View } from 'react-native';
import AppIcon from '@/shared/presentation/AppIcon';

import { MesasAutorizadas } from '@/modules/territorio/presentation/MesasAutorizadas';
import { useConnectivityStore } from '@/modules/sincronizacion/presentation/useConnectivityMonitor';
import {
  solicitarSincronizacionInmediata,
  useSincronizacionActasStore,
} from '@/modules/sincronizacion/presentation/useSincronizarActas';
import { useSessionStore } from '@/modules/authentication/presentation/sessionStore';
import { ActionRow, AppButton, AppPage, Card, StatusBanner, TricolorStripe } from '@/shared/presentation/Ui';
import { Colors } from '@/constants/theme';
import { useActasLocales } from './useActasLocales';
import { infoEstadoActa } from './estadoActa';

export default function VeedorDashboard() {
  const connectivity = useConnectivityStore((state) => state.connectivity);
  const syncing = useSincronizacionActasStore((state) => state.syncing);
  const locales = useActasLocales();
  const userName = useSessionStore((state) => state.user?.firstName?.trim() || state.user?.fullName?.trim());

  const pendientesDeSubir =
    locales?.actas?.filter((a) => a.estado === 'PENDING' || a.estado === 'EVIDENCIA_PENDIENTE').length ?? 0;

  return (
    <AppPage>
      <Card compact>
        <View className="flex-row items-center gap-3">
          <View className="h-13 w-13 items-center justify-center rounded-2xl bg-brand-navy">
            <AppIcon name={{ ios: 'person.fill', android: 'person', web: 'person' }} size={24} tintColor="#FFFFFF" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <TricolorStripe width={24} height={3} />
              <Text className="font-electoral-bold text-[10px] uppercase tracking-widest text-brand-navy">
                VEEDOR DE MESA
              </Text>
            </View>
            <Text accessibilityRole="header" className="font-electoral-bold mt-0.5 text-xl text-brand-ink">
              {userName ? `Hola, ${userName}` : 'Mis mesas asignadas'}
            </Text>
            <Text className="font-electoral text-xs text-brand-muted">
              Registra Alcaldía y Prefectura en cada mesa
            </Text>
          </View>
          <View
            className={`rounded-full px-2.5 py-1 ${
              connectivity === 'online' ? 'bg-brand-success-soft' : 'bg-brand-warning-soft'
            }`}>
            <Text
              className={`font-electoral-bold text-xs ${
                connectivity === 'online' ? 'text-brand-success' : 'text-brand-warning'
              }`}>
              {connectivity === 'online' ? 'En línea' : connectivity === 'offline' ? 'Sin señal' : 'Verificando señal'}
            </Text>
          </View>
        </View>
      </Card>

      {connectivity === 'offline' ? (
        <StatusBanner
          tone="warning"
          title="Trabajando sin internet"
          detail="Puedes registrar votos, foto y ubicación en las mesas ya descargadas. Las actas quedan en este teléfono y se sincronizan cuando vuelve la conexión."
        />
      ) : null}

      {syncing || pendientesDeSubir > 0 ? (
        <Card compact>
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1">
              <Text className="font-electoral-bold text-xs text-brand-navy">
                {syncing
                  ? 'Enviando actas pendientes…'
                  : `${pendientesDeSubir} acta(s) lista(s) para enviar`}
              </Text>
              <Text className="font-electoral text-[11px] text-brand-muted">
                Se envían automáticamente al tener conexión.
              </Text>
            </View>
            <AppButton
              label="Enviar ahora"
              variant="secondary"
              loading={syncing}
              disabled={connectivity !== 'online'}
              onPress={solicitarSincronizacionInmediata}
            />
          </View>
        </Card>
      ) : null}

      {locales?.error ? (
        <StatusBanner tone="warning" title="No se pudieron leer las actas locales" detail={locales.error} />
      ) : null}

      <MesasAutorizadas
        precargarOrganizaciones
        encabezado={(mesas) => {
          const recintos = [...new Set(mesas.map(({ recinto }) => recinto))];
          const ids = new Set(mesas.map(({ id }) => id));
          const guardadas = locales?.actas?.filter((item) => ids.has(item.registro.jrvId)).length ?? 0;
          const esperadas = mesas.length * 2;
          return (
            <View className="gap-2.5">
              <Card compact>
                <View className="flex-row items-center gap-2.5">
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-gold-soft">
                    <AppIcon
                      name={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }}
                      size={19}
                      tintColor={Colors.light.primary}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="font-electoral text-xs text-brand-muted">Recinto electoral</Text>
                    <Text className="font-electoral-bold text-sm text-brand-ink">{recintos.join(' · ')}</Text>
                  </View>
                </View>
              </Card>
              <View className="flex-row gap-2.5">
                <View className="min-w-0 flex-1 items-center justify-center rounded-2xl border border-brand-line bg-brand-surface px-3 py-3">
                  <Text numberOfLines={1} adjustsFontSizeToFit className="font-electoral-bold text-2xl text-brand-navy">
                    {mesas.length}
                  </Text>
                  <Text numberOfLines={1} className="font-electoral mt-0.5 text-xs text-brand-muted">
                    Mesas asignadas
                  </Text>
                </View>
                <View className="min-w-0 flex-1 items-center justify-center rounded-2xl border border-brand-line bg-brand-success-soft px-3 py-3">
                  <Text numberOfLines={1} adjustsFontSizeToFit className="font-electoral-bold text-2xl text-brand-success">
                    {guardadas} / {esperadas}
                  </Text>
                  <Text numberOfLines={1} className="font-electoral mt-0.5 text-xs text-brand-ink">
                    Actas registradas
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
        onSelect={(mesa) => router.push({ pathname: '/veedor/acta', params: { jrvId: mesa.id } })}
        resumen={(mesa) =>
          locales?.actas ? (
            <View className="mb-3 gap-2">
              {(['alcaldia', 'prefectura'] as const).map((dignidad) => {
                const local = locales.actas?.find(
                  (item) => item.registro.jrvId === mesa.id && item.registro.dignidad === dignidad,
                );
                const info = local ? infoEstadoActa(local.estado) : null;
                const boxStyle = !info
                  ? 'border-brand-line bg-brand-field'
                  : info.categoria === 'enviada'
                    ? 'border-brand-success bg-brand-success-soft'
                    : info.categoria === 'pendiente'
                      ? 'border-brand-gold bg-brand-gold-soft'
                      : 'border-brand-warning bg-brand-warning-soft';
                const badgeStyle = !info
                  ? 'text-brand-muted'
                  : info.categoria === 'enviada'
                    ? 'text-brand-success'
                    : info.categoria === 'pendiente'
                      ? 'text-brand-navy'
                      : 'text-brand-warning';
                return (
                  <View key={dignidad} className={`rounded-xl border px-3 py-2 ${boxStyle}`}>
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className="font-electoral-bold text-xs text-brand-ink">
                        {dignidad === 'alcaldia' ? 'Acta de Alcaldía' : 'Acta de Prefectura'}
                      </Text>
                      <Text className={`font-electoral-bold text-[11px] ${badgeStyle}`}>
                        {info ? info.etiqueta : 'Por registrar'}
                      </Text>
                    </View>
                    {info ? (
                      <Text className="font-electoral mt-0.5 text-[11px] text-brand-muted">{info.detalle}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null
        }
      />

      <ActionRow
        title="Actas guardadas en este teléfono"
        subtitle="Ver estado de envío, fotografía y mapa de ubicación"
        onPress={() => router.push('/veedor/actas')}
      />
      <ActionRow
        title="Actas enviadas y correcciones"
        subtitle="Revisar actas confirmadas o corregir un conteo con motivo"
        onPress={() => router.push('/veedor/recibidas')}
      />
    </AppPage>
  );
}
