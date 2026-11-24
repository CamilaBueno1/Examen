import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { useSessionStore } from '@/modules/authentication/presentation/sessionStore';
import { useConnectivityStore } from '@/modules/sincronizacion/presentation/useConnectivityMonitor';
import { AppButton, Card, StatusBanner } from '@/shared/presentation/Ui';
import { cargarAvance, cargarResultados, observarAvance } from '../avanceProvider';
import type { AvanceRecinto, ResultadoCandidatura } from '../domain/usecases/consultarAvance';

export default function AvanceElectoral() {
  const user = useSessionStore((state) => state.user);
  const network = useConnectivityStore((state) => state.connectivity);
  const [result, setResult] = useState<{
    owner: string; items?: AvanceRecinto[]; candidaturas?: ResultadoCandidatura[]; error?: string; updated?: string;
  }>();
  const [dignidad, setDignidad] = useState<ResultadoCandidatura['dignidad']>('alcaldia');
  useFocusEffect(useCallback(() => {
    if (user?.status !== 'ACTIVE' || network === 'offline') return;
    const { id: owner, role } = user;
    let active = true;
    let version = 0;
    function refresh() {
      const request = ++version;
      const candidaturas = role === 'provincial' ? cargarResultados() : Promise.resolve([]);
      void Promise.all([cargarAvance(), candidaturas]).then(
        ([items, lista]) => {
          if (active && request === version) setResult({ owner, items, candidaturas: lista, updated: new Date().toLocaleString() });
        },
        (error: unknown) => {
          if (active && request === version) setResult((previous) => ({
            ...(previous?.owner === owner ? previous : undefined),
            owner, error: error instanceof Error ? error.message : 'No se pudo actualizar.',
          }));
        },
      );
    }
    refresh();
    const stop = observarAvance(refresh);
    return () => { active = false; stop(); };
  }, [user, network]));
  const current = user?.id === result?.owner ? result : undefined;
  const candidaturas = current?.candidaturas?.filter((item) => item.dignidad === dignidad) ?? [];

  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-lg font-bold text-brand-ink">Avance por recinto</Text>
      <Text className="text-sm text-brand-muted">{current?.updated ? `Actualizado: ${current.updated}` : 'Control interno de la organización'}</Text>
      {network === 'offline' ? <StatusBanner tone="warning" title="Sin conexión" detail="El avance no se actualizará hasta recuperar la conexión." /> : null}
      {!current && network !== 'offline' ? <StatusBanner tone="info" title="Consultando avance" busy /> : null}
      {current?.error ? <StatusBanner tone="error" title="Avance no disponible" detail={current.error} /> : null}
      {current?.items?.length === 0 ? <StatusBanner tone="info" title="Sin recintos disponibles en tu ámbito" /> : null}
      {current?.items?.map((item) => (
        <Card key={item.recinto_id}>
          <Text className="text-base font-bold text-brand-ink">{item.recinto}</Text>
          <Text className="mt-2 text-sm text-brand-muted">{item.jrv_reportadas} / {item.jrv_total} JRV reportadas</Text>
          <Text className="mt-1 text-sm text-brand-muted">{item.jrv_respaldadas} / {item.jrv_total} JRV respaldadas</Text>
          <Text className="mt-1 text-sm text-brand-muted">Alcaldía: {item.alcaldia_recibidas} · Prefectura: {item.prefectura_recibidas} actas recibidas</Text>
        </Card>
      ))}
      {user?.role === 'provincial' && current?.candidaturas ? (
        <View className="gap-3">
          <Text accessibilityRole="header" className="text-lg font-bold text-brand-ink">Resultados preliminares</Text>
          <Text className="text-sm text-brand-muted">Conteo interno de la organización. Resultados oficiales a cargo del CNE.</Text>
          <View className="flex-row gap-2">
            <View className="flex-1"><AppButton label="Alcaldía" variant={dignidad === 'alcaldia' ? 'primary' : 'secondary'} onPress={() => setDignidad('alcaldia')} /></View>
            <View className="flex-1"><AppButton label="Prefectura" variant={dignidad === 'prefectura' ? 'primary' : 'secondary'} onPress={() => setDignidad('prefectura')} /></View>
          </View>
          {candidaturas.length === 0 ? <StatusBanner tone="info" title="Sin actas recibidas para esta dignidad" /> : null}
          {current.items?.filter((item) => candidaturas.some((voto) => voto.recinto_id === item.recinto_id)).map((item) => {
            const recinto = candidaturas.filter((voto) => voto.recinto_id === item.recinto_id);
            const maximo = Math.max(1, ...recinto.map((voto) => voto.votos));
            return (
              <Card key={item.recinto_id}>
                <Text className="mb-3 text-base font-bold text-brand-ink">{item.recinto}</Text>
                <View className="gap-3">
                  {recinto.map((voto) => (
                    <View key={voto.candidato_id}>
                      <Text className="text-sm font-bold text-brand-ink">{voto.candidato} · {voto.votos.toLocaleString()} votos</Text>
                      <Text className="mb-1 text-xs text-brand-muted">{voto.organizacion}</Text>
                      <View className="h-2 overflow-hidden rounded-full bg-brand-line">
                        <View className="h-2 rounded-full bg-brand-navy" style={{ width: `${Math.round(100 * voto.votos / maximo)}%` }} />
                      </View>
                    </View>
                  ))}
                </View>
              </Card>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
