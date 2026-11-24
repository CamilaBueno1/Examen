import { useCallback, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { useSessionStore } from '@/modules/authentication/presentation/sessionStore';
import { useConnectivityStore } from '@/modules/sincronizacion/presentation/useConnectivityMonitor';
import { AppButton, Card, StatusBanner } from '@/shared/presentation/Ui';
import type { MesaAutorizada } from '../domain/usecases/consultarMesas';
import { cargarMesasAutorizadas } from '../mesasProvider';

type Resultado = { mesas: MesaAutorizada[] } | { error: string };

export function useMesasAutorizadas(refreshKey = 0) {
  const user = useSessionStore((state) => state.user);
  const offline = useConnectivityStore((state) => state.connectivity === 'offline');
  const [resultado, setResultado] = useState<{
    userId: string;
    revision: number;
    refreshKey: number;
    value: Resultado;
  }>();
  const [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => {
    if (user?.status !== 'ACTIVE') return;
    let vigente = true;
    void cargarMesasAutorizadas(user.id, offline).then(
      (mesas) => { if (vigente) setResultado({ userId: user.id, revision, refreshKey, value: { mesas } }); },
      (error: unknown) => {
        if (vigente) setResultado({
          userId: user.id,
          revision,
          refreshKey,
          value: { error: error instanceof Error ? error.message : 'No se pudo consultar el servicio.' },
        });
      },
    );
    return () => { vigente = false; };
  }, [user, revision, offline, refreshKey]));

  return {
    resultado: user?.status === 'ACTIVE' && resultado?.userId === user.id &&
      resultado.revision === revision && resultado.refreshKey === refreshKey ? resultado.value : undefined,
    recargar: () => {
      setResultado(undefined);
      setRevision((current) => current + 1);
    },
  };
}

export function MesasAutorizadas({ onSelect, resumen, refreshKey }: {
  onSelect?: (mesa: MesaAutorizada) => void;
  resumen?: (mesa: MesaAutorizada) => ReactNode;
  refreshKey?: number;
}) {
  const { resultado, recargar } = useMesasAutorizadas(refreshKey);
  if (!resultado) return <StatusBanner tone="info" busy title="Consultando JRV autorizadas" />;
  if ('error' in resultado) return (
    <View className="gap-3">
      <StatusBanner tone="error" title="Consulta de JRV fallida" detail={resultado.error} />
      <AppButton label="Reintentar" variant="secondary" onPress={recargar} />
    </View>
  );
  if (resultado.mesas.length === 0) {
    return <StatusBanner tone="warning" title="Sin JRV disponibles" detail="No hay mesas de tu ámbito registradas o asignadas en el catálogo." />;
  }
  return (
    <View className="gap-3">
      {resultado.mesas.map((mesa) => (
        <Card key={mesa.id}>
          <Text className="text-xs font-semibold text-brand-muted">{mesa.recinto}</Text>
          <Text className="mb-2 text-lg font-bold text-brand-ink">JRV {mesa.numero}</Text>
          {resumen?.(mesa)}
          {onSelect ? <AppButton label="Registrar acta" onPress={() => onSelect(mesa)} /> : null}
        </Card>
      ))}
    </View>
  );
}
