import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { router } from 'expo-router';
import AppIcon from '@/shared/presentation/AppIcon';

import {
  solicitarSincronizacionInmediata,
  useSincronizacionActasStore,
} from '@/modules/sincronizacion/presentation/useSincronizarActas';
import { useConnectivityStore } from '@/modules/sincronizacion/presentation/useConnectivityMonitor';
import { AppButton, AppPage, Card, ScreenHeader, StatusBanner, TricolorStripe } from '@/shared/presentation/Ui';
import { Colors } from '@/constants/theme';
import ActaMap from './ActaMap';
import { useActasLocales } from './useActasLocales';
import { infoEstadoActa } from './estadoActa';

export default function ActasScreen() {
  const visible = useActasLocales();
  const syncing = useSincronizacionActasStore((state) => state.syncing);
  const online = useConnectivityStore((state) => state.connectivity === 'online');
  const [selected, setSelected] = useState<string>();

  const pendientes =
    visible?.actas?.filter((a) => a.estado === 'PENDING' || a.estado === 'EVIDENCIA_PENDIENTE').length ?? 0;

  return (
    <AppPage>
      <ScreenHeader
        eyebrow="REGISTROS LOCALES"
        title="Actas guardadas"
        subtitle="Aquí puedes revisar tus capturas y su estado de envío incluso cuando no tengas señal."
      />
      {pendientes > 0 || syncing ? (
        <AppButton
          label={syncing ? 'Enviando actas pendientes…' : `Enviar ${pendientes} pendiente(s) ahora`}
          variant="secondary"
          loading={syncing}
          disabled={!online}
          onPress={solicitarSincronizacionInmediata}
        />
      ) : null}
      {!visible ? <StatusBanner tone="info" title="Cargando actas guardadas…" busy /> : null}
      {visible?.error ? (
        <StatusBanner tone="error" title="No se pudieron cargar las actas" detail={visible.error} />
      ) : null}
      {visible?.actas?.length === 0 ? (
        <StatusBanner
          tone="info"
          election="record"
          title="Todavía no has registrado actas"
          detail="Elige una mesa en «Mis mesas» para capturar Alcaldía y Prefectura."
        />
      ) : null}
      {visible?.actas?.map(({ id, estado, registro }) => {
        const info = infoEstadoActa(estado);
        const boxStyle =
          info.categoria === 'enviada'
            ? 'border-brand-success bg-brand-success-soft'
            : info.categoria === 'pendiente'
              ? 'border-brand-gold bg-brand-gold-soft'
              : 'border-brand-warning bg-brand-warning-soft';
        const textStyle =
          info.categoria === 'enviada'
            ? 'text-brand-success'
            : info.categoria === 'pendiente'
              ? 'text-brand-navy'
              : 'text-brand-warning';
        return (
          <Card key={id}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1 flex-row items-center gap-2.5">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand-navy">
                  <AppIcon
                    name={
                      registro.dignidad === 'alcaldia'
                        ? { ios: 'building.columns', android: 'account_balance', web: 'account_balance' }
                        : { ios: 'shield', android: 'shield', web: 'shield' }
                    }
                    size={19}
                    tintColor="#FFFFFF"
                  />
                </View>
                <View className="flex-1">
                  <Text className="font-electoral-bold text-lg text-brand-ink">
                    {registro.dignidad === 'alcaldia' ? 'Acta de Alcaldía' : 'Acta de Prefectura'}
                  </Text>
                  <Text className="font-electoral text-xs text-brand-muted">
                    {registro.recinto} · Mesa {registro.numeroJrv} · {new Date(registro.capturedAt).toLocaleString()}
                  </Text>
                </View>
              </View>
              <TricolorStripe width={24} height={4} />
            </View>

            <View className={`my-3 rounded-xl border px-3 py-2.5 ${boxStyle}`}>
              <Text className={`font-electoral-bold text-xs ${textStyle}`}>{info.etiqueta}</Text>
              <Text className="font-electoral mt-0.5 text-[11px] text-brand-muted">{info.detalle}</Text>
            </View>

            <AppButton
              label={selected === id ? 'Ocultar detalle' : 'Ver votos, foto y mapa'}
              variant="secondary"
              onPress={() => setSelected(selected === id ? undefined : id)}
            />
            {selected === id ? (
              <View className="mt-4 gap-3 border-t border-brand-line pt-3">
                <View className="flex-row gap-2">
                  {[
                    { label: 'Sufragantes', value: registro.totalSufragantes },
                    { label: 'Blancos', value: registro.votosBlancos },
                    { label: 'Nulos', value: registro.votosNulos },
                  ].map((item) => (
                    <View key={item.label} className="min-w-0 flex-1 items-center rounded-xl bg-brand-field px-2 py-2.5">
                      <Text numberOfLines={1} adjustsFontSizeToFit className="font-electoral-bold text-base text-brand-navy">
                        {item.value}
                      </Text>
                      <Text numberOfLines={1} className="font-electoral mt-0.5 text-[11px] text-brand-muted">
                        {item.label}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text className="font-electoral text-xs text-brand-muted">
                  Precisión GPS: {Math.round(registro.accuracy)} m · Fotografía:{' '}
                  {registro.calidadFoto === 'buena' ? 'Nítida' : 'Con observación'}
                </Text>
                <Image
                  accessibilityLabel="Fotografía del acta"
                  source={{ uri: registro.fotoPath }}
                  style={{ width: '100%', height: 230, borderRadius: 14, backgroundColor: Colors.light.backgroundSelected }}
                  resizeMode="contain"
                />
                <ActaMap
                  lat={registro.lat}
                  lon={registro.lon}
                  recintoLat={registro.recintoLat ?? undefined}
                  recintoLon={registro.recintoLon ?? undefined}
                  accuracy={registro.accuracy}
                />
              </View>
            ) : null}
          </Card>
        );
      })}
      <AppButton
        label="Ver actas recibidas en el servidor"
        variant="secondary"
        onPress={() => router.push('/veedor/recibidas')}
      />
      <AppButton label="Volver a mis mesas" variant="secondary" onPress={() => router.replace('/veedor')} />
    </AppPage>
  );
}
