import { useCallback, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AppIcon from '@/shared/presentation/AppIcon';

import { useSessionStore } from '@/modules/authentication/presentation/sessionStore';
import { useConnectivityStore } from '@/modules/sincronizacion/presentation/useConnectivityMonitor';
import { AppButton, Card, StatusBanner, TricolorStripe } from '@/shared/presentation/Ui';
import { Colors } from '@/constants/theme';
import type { MesaAutorizada } from '../domain/usecases/consultarMesas';
import { cargarCatalogoVeedor, cargarMesasAutorizadas } from '../mesasProvider';

type Resultado = { mesas: MesaAutorizada[] } | { error: string };

export function useMesasAutorizadas(refreshKey = 0, precargarOrganizaciones = false) {
  const user = useSessionStore((state) => state.user);
  const offline = useConnectivityStore((state) => state.connectivity === 'offline');
  const [resultado, setResultado] = useState<{
    userId: string;
    revision: number;
    refreshKey: number;
    value: Resultado;
  }>();
  const [revision, setRevision] = useState(0);
  useFocusEffect(
    useCallback(() => {
      if (user?.status !== 'ACTIVE') return;
      let vigente = true;
      const cargar = precargarOrganizaciones ? cargarCatalogoVeedor : cargarMesasAutorizadas;
      void cargar(user.id, offline).then(
        (mesas) => {
          if (vigente) setResultado({ userId: user.id, revision, refreshKey, value: { mesas } });
        },
        (error: unknown) => {
          if (vigente) {
            setResultado({
              userId: user.id,
              revision,
              refreshKey,
              value: { error: error instanceof Error ? error.message : 'No se pudo consultar el servicio.' },
            });
          }
        },
      );
      return () => {
        vigente = false;
      };
    }, [user, revision, offline, refreshKey, precargarOrganizaciones]),
  );

  return {
    resultado:
      user?.status === 'ACTIVE' &&
      resultado?.userId === user.id &&
      resultado.revision === revision &&
      resultado.refreshKey === refreshKey
        ? resultado.value
        : undefined,
    recargar: () => {
      setResultado(undefined);
      setRevision((current) => current + 1);
    },
  };
}

export function MesasAutorizadas({
  onSelect,
  resumen,
  encabezado,
  refreshKey,
  precargarOrganizaciones,
}: {
  onSelect?: (mesa: MesaAutorizada) => void;
  resumen?: (mesa: MesaAutorizada) => ReactNode;
  encabezado?: (mesas: MesaAutorizada[]) => ReactNode;
  refreshKey?: number;
  precargarOrganizaciones?: boolean;
}) {
  const { resultado, recargar } = useMesasAutorizadas(refreshKey, precargarOrganizaciones);
  if (!resultado) return <StatusBanner tone="info" busy title="Cargando mesas…" />;
  if ('error' in resultado) {
    return (
      <View className="gap-3">
        <StatusBanner
          tone="error"
          title={precargarOrganizaciones ? 'Catálogo del veedor no disponible' : 'No se pudieron cargar las mesas'}
          detail={resultado.error}
        />
        <AppButton label="Reintentar" variant="secondary" onPress={recargar} />
      </View>
    );
  }
  if (resultado.mesas.length === 0) {
    return (
      <StatusBanner
        tone="warning"
        title="Sin mesas asignadas"
        detail="Todavía no tienes mesas registradas o asignadas."
      />
    );
  }
  return (
    <View className="gap-3">
      {encabezado?.(resultado.mesas)}
      {resultado.mesas.map((mesa) => (
        <Card key={mesa.id} compact>
          <View className="mb-2.5 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2.5 flex-1">
              <View className="flex-row items-center gap-1.5 rounded-xl bg-brand-navy px-2.5 py-1.5">
                <AppIcon
                  name={{ ios: 'tray.full', android: 'how_to_vote', web: 'how_to_vote' }}
                  size={15}
                  tintColor="#FFFFFF"
                />
                <Text className="font-electoral-bold text-xs text-white">JRV {mesa.numero}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-electoral-bold text-sm text-brand-ink">{mesa.recinto}</Text>
                {mesa.latitud !== null && mesa.longitud !== null ? (
                  <Text className="font-electoral text-[11px] text-brand-muted">
                    GPS recinto: {mesa.latitud.toFixed(4)}, {mesa.longitud.toFixed(4)}
                  </Text>
                ) : (
                  <Text className="font-electoral text-[11px] text-brand-muted" style={{ color: Colors.light.textSecondary }}>
                    Mesa electoral habilitada
                  </Text>
                )}
              </View>
            </View>
            <TricolorStripe width={20} height={3} />
          </View>
          {resumen?.(mesa)}
          {onSelect ? <AppButton label="Registrar actas de esta mesa" onPress={() => onSelect(mesa)} /> : null}
        </Card>
      ))}
    </View>
  );
}
