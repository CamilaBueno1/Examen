// Guía: Presenta indicadores por recinto y resultados preliminares por dignidad.

import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AppIcon from '@/shared/presentation/AppIcon';

import { useSessionStore } from '@/modules/authentication/presentation/sessionStore';
import { useConnectivityStore } from '@/modules/sincronizacion/presentation/useConnectivityMonitor';
import { Card, StatusBanner, TricolorStripe, BRAND_ACCENTS } from '@/shared/presentation/Ui';
import { Colors } from '@/constants/theme';
import { cargarAvance, cargarResultados, observarAvance } from '../avanceProvider';
import type { AvanceRecinto, ResultadoCandidatura } from '../domain/usecases/consultarAvance';

export default function AvanceElectoral() {
  const user = useSessionStore((state) => state.user);
  const network = useConnectivityStore((state) => state.connectivity);
  const [result, setResult] = useState<{
    owner: string;
    items?: AvanceRecinto[];
    candidaturas?: ResultadoCandidatura[];
    error?: string;
    updated?: string;
  }>();
  const [dignidad, setDignidad] = useState<ResultadoCandidatura['dignidad']>('alcaldia');

  useFocusEffect(
    useCallback(() => {
      if (user?.status !== 'ACTIVE' || network === 'offline') return;
      const { id: owner, role } = user;
      let active = true;
      let version = 0;
      function refresh() {
        const request = ++version;
        const candidaturas = role === 'provincial' ? cargarResultados() : Promise.resolve([]);
        void Promise.all([cargarAvance(), candidaturas]).then(
          ([items, lista]) => {
            if (active && request === version) {
              setResult({ owner, items, candidaturas: lista, updated: new Date().toLocaleTimeString('es-EC') });
            }
          },
          (error: unknown) => {
            if (active && request === version) {
              setResult((previous) => ({
                ...(previous?.owner === owner ? previous : undefined),
                owner,
                error: error instanceof Error ? error.message : 'No se pudo actualizar.',
              }));
            }
          },
        );
      }
      refresh();
      const stop = observarAvance(refresh);
      return () => {
        active = false;
        stop();
      };
    }, [user, network]),
  );

  const current = user?.id === result?.owner ? result : undefined;
  const candidaturas = current?.candidaturas?.filter((item) => item.dignidad === dignidad) ?? [];
  const totales = current?.items?.reduce(
    (total, item) => ({
      jrv: total.jrv + item.jrv_total,
      reportadas: total.reportadas + item.jrv_reportadas,
      respaldadas: total.respaldadas + item.jrv_respaldadas,
      actasAlcaldia: total.actasAlcaldia + item.alcaldia_recibidas,
      actasPrefectura: total.actasPrefectura + item.prefectura_recibidas,
    }),
    { jrv: 0, reportadas: 0, respaldadas: 0, actasAlcaldia: 0, actasPrefectura: 0 },
  );
  const totalActasEsperadas = (totales?.jrv ?? 0) * 2;
  const totalActasRecibidas = (totales?.actasAlcaldia ?? 0) + (totales?.actasPrefectura ?? 0);
  const pctActas = totalActasEsperadas > 0 ? (100 * totalActasRecibidas) / totalActasEsperadas : 0;
  const pctReportadas = totales?.jrv ? (100 * totales.reportadas) / totales.jrv : 0;
  const pctRespaldadas = totales?.jrv ? (100 * totales.respaldadas) / totales.jrv : 0;

  return (
    <View className="gap-3.5">
      {user?.role === 'provincial' && !!totales?.jrv ? (
        <Card>
          <View className="mb-2.5 flex-row flex-wrap items-center justify-between gap-2">
            <View className="flex-row items-center gap-2">
              <TricolorStripe width={26} height={4} />
              <Text className="font-electoral-bold text-sm uppercase tracking-wider text-brand-navy">
                Cómputo general de la jornada
              </Text>
            </View>
            <View className="rounded-full bg-brand-success-soft px-3 py-1">
              <Text className="font-electoral-bold text-xs text-brand-success">
                {totalActasRecibidas} / {totalActasEsperadas} actas ({pctActas.toLocaleString('es-EC', { maximumFractionDigits: 1 })}%)
              </Text>
            </View>
          </View>

          <View className="mb-3.5 gap-2.5">
            <View>
              <View className="mb-1 flex-row items-center justify-between gap-2">
                <Text className="font-electoral flex-1 text-xs text-brand-muted">
                  Actas recibidas (Alcaldía {totales.actasAlcaldia} · Prefectura {totales.actasPrefectura})
                </Text>
                <Text className="font-electoral-bold text-xs text-brand-navy">
                  {totalActasRecibidas}/{totalActasEsperadas}
                </Text>
              </View>
              <View className="h-2.5 overflow-hidden rounded-full bg-brand-line">
                <View
                  className="h-full rounded-full bg-brand-gold"
                  style={{ width: `${Math.max(0, Math.min(100, pctActas))}%` }}
                />
              </View>
            </View>

            <View>
              <View className="mb-1 flex-row items-center justify-between gap-2">
                <Text className="font-electoral flex-1 text-xs text-brand-muted">
                  Mesas reportadas (Alcaldía y Prefectura recibidas)
                </Text>
                <Text className="font-electoral-bold text-xs text-brand-ink">
                  {totales.reportadas}/{totales.jrv}
                </Text>
              </View>
              <View className="h-2.5 overflow-hidden rounded-full bg-brand-line">
                <View
                  className="h-full rounded-full bg-brand-navy"
                  style={{ width: `${Math.max(0, Math.min(100, pctReportadas))}%` }}
                />
              </View>
            </View>

            <View>
              <View className="mb-1 flex-row items-center justify-between gap-2">
                <Text className="font-electoral flex-1 text-xs text-brand-muted">
                  Mesas respaldadas (ambas fotografías confirmadas)
                </Text>
                <Text className="font-electoral-bold text-xs text-brand-success">
                  {totales.respaldadas}/{totales.jrv}
                </Text>
              </View>
              <View className="h-2.5 overflow-hidden rounded-full bg-brand-line">
                <View
                  className="h-full rounded-full bg-brand-success"
                  style={{ width: `${Math.max(0, Math.min(100, pctRespaldadas))}%` }}
                />
              </View>
            </View>
          </View>

          <View className="flex-row gap-2">
            {[
              { label: 'Mesas totales', count: String(totales.jrv), bg: 'bg-brand-field', text: 'text-brand-ink' },
              { label: 'Reportadas', count: String(totales.reportadas), bg: 'bg-brand-gold-soft', text: 'text-brand-navy' },
              { label: 'Respaldadas', count: String(totales.respaldadas), bg: 'bg-brand-success-soft', text: 'text-brand-success' },
            ].map(({ label, count, bg, text }) => (
              <View key={label} className={`min-w-0 flex-1 items-center justify-center rounded-xl px-2 py-2.5 ${bg}`}>
                <Text numberOfLines={1} adjustsFontSizeToFit className={`font-electoral-bold text-lg ${text}`}>
                  {count}
                </Text>
                <Text numberOfLines={1} className="font-electoral mt-0.5 text-[11px] text-brand-muted">
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <View className="flex-row flex-wrap items-center justify-between gap-2 px-1">
        <Text accessibilityRole="header" className="font-electoral-bold text-base text-brand-ink">
          Avance por recinto electoral
        </Text>
        <View className="flex-row items-center gap-1.5 rounded-full border border-brand-line bg-brand-surface px-2.5 py-1">
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: network === 'online' ? '#067647' : BRAND_ACCENTS.gold,
            }}
          />
          <Text className="font-electoral text-[11px] text-brand-muted">
            {current?.updated ? `Actualizado · ${current.updated}` : 'En espera de datos'}
          </Text>
        </View>
      </View>

      {network === 'offline' ? (
        <StatusBanner
          tone="warning"
          title="Sin conexión"
          detail="El avance no se actualizará hasta recuperar la conexión."
        />
      ) : null}
      {!current && network !== 'offline' ? (
        <StatusBanner tone="info" title="Cargando avance…" busy />
      ) : null}
      {current?.error ? (
        <StatusBanner tone="error" title="Avance no disponible" detail={current.error} />
      ) : null}
      {current?.items?.length === 0 ? (
        <StatusBanner tone="info" title="Aún no hay recintos asignados" />
      ) : null}

      {current?.items?.map((item) => {
        const actasEsperadasRecinto = item.jrv_total * 2;
        const actasRecibidasRecinto = item.alcaldia_recibidas + item.prefectura_recibidas;
        const pctActasRecinto =
          actasEsperadasRecinto > 0 ? Math.round((100 * actasRecibidasRecinto) / actasEsperadasRecinto) : 0;
        return (
          <Card key={item.recinto_id} compact>
            <View className="flex-row items-center justify-between gap-2">
              <View className="flex-row items-center gap-2.5 flex-1">
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-field">
                  <AppIcon
                    name={{ ios: 'building.columns', android: 'account_balance', web: 'account_balance' }}
                    size={17}
                    tintColor={Colors.light.primary}
                  />
                </View>
                <View className="flex-1">
                  <Text numberOfLines={2} className="font-electoral-bold text-base text-brand-ink">
                    {item.recinto}
                  </Text>
                  <Text className="font-electoral text-xs text-brand-muted">
                    {actasRecibidasRecinto} de {actasEsperadasRecinto} actas recibidas
                  </Text>
                </View>
              </View>
              <View className="rounded-full bg-brand-navy px-3 py-1">
                <Text className="font-electoral-bold text-xs text-white">{pctActasRecinto}%</Text>
              </View>
            </View>

            {/* Cuadrícula limpia 2x2 para que ningún número se salga del recuadro */}
            <View className="my-3 gap-2">
              <View className="flex-row gap-2">
                <View className="min-w-0 flex-1 flex-row items-center justify-between rounded-xl bg-brand-field px-3 py-2.5">
                  <Text className="font-electoral text-xs text-brand-muted">Mesas totales</Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit className="font-electoral-bold text-base text-brand-ink">
                    {item.jrv_total}
                  </Text>
                </View>
                <View className="min-w-0 flex-1 flex-row items-center justify-between rounded-xl bg-brand-success-soft px-3 py-2.5">
                  <Text className="font-electoral text-xs text-brand-ink">Reportadas</Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit className="font-electoral-bold text-base text-brand-success">
                    {item.jrv_reportadas} / {item.jrv_total}
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-2">
                <View className="min-w-0 flex-1 flex-row items-center justify-between rounded-xl bg-brand-gold-soft px-3 py-2.5">
                  <Text className="font-electoral text-xs text-brand-ink">Alcaldía</Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit className="font-electoral-bold text-base text-brand-navy">
                    {item.alcaldia_recibidas} / {item.jrv_total}
                  </Text>
                </View>
                <View className="min-w-0 flex-1 flex-row items-center justify-between rounded-xl bg-brand-gold-soft px-3 py-2.5">
                  <Text className="font-electoral text-xs text-brand-ink">Prefectura</Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit className="font-electoral-bold text-base text-brand-navy">
                    {item.prefectura_recibidas} / {item.jrv_total}
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row flex-wrap items-center justify-between gap-2 border-t border-brand-line pt-2">
              <Text className="font-electoral text-[11px] text-brand-muted">
                Mesas con ambas fotografías confirmadas
              </Text>
              <View className="rounded-full bg-brand-success-soft px-2.5 py-0.5">
                <Text className="font-electoral-bold text-xs text-brand-success">
                  {item.jrv_respaldadas} de {item.jrv_total}
                </Text>
              </View>
            </View>
          </Card>
        );
      })}

      {user?.role === 'provincial' && current?.candidaturas ? (
        <View className="gap-3">
          <View className="px-1">
            <Text accessibilityRole="header" className="font-electoral-bold text-base text-brand-ink">
              Resultados preliminares por dignidad
            </Text>
            <Text className="font-electoral text-xs text-brand-muted">
              Cifras preliminares internas de la organización política según las actas recibidas.
            </Text>
          </View>

          <View className="flex-row gap-2">
            {(['alcaldia', 'prefectura'] as const).map((value) => {
              const active = dignidad === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => setDignidad(value)}
                  className={`min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border px-3 ${
                    active ? 'border-brand-navy bg-brand-navy' : 'border-brand-line bg-brand-surface'
                  }`}>
                  <AppIcon
                    name={
                      value === 'alcaldia'
                        ? { ios: 'building.columns', android: 'account_balance', web: 'account_balance' }
                        : { ios: 'shield', android: 'shield', web: 'shield' }
                    }
                    size={16}
                    tintColor={active ? '#FFFFFF' : Colors.light.primary}
                  />
                  <Text className={`font-electoral-bold text-sm ${active ? 'text-white' : 'text-brand-navy'}`}>
                    {value === 'alcaldia' ? 'Alcaldía' : 'Prefectura'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {candidaturas.length === 0 ? (
            <StatusBanner tone="info" title="Sin actas recibidas para esta dignidad" />
          ) : null}

          {current.items
            ?.filter((item) => candidaturas.some((voto) => voto.recinto_id === item.recinto_id))
            .map((item) => {
              const recinto = candidaturas.filter((voto) => voto.recinto_id === item.recinto_id);
              const totalVotosRecinto = recinto.reduce((sum, v) => sum + v.votos, 0);
              const maximo = Math.max(1, ...recinto.map((voto) => voto.votos));
              return (
                <Card key={item.recinto_id}>
                  <View className="mb-3 flex-row flex-wrap items-center justify-between gap-2">
                    <Text className="font-electoral-bold flex-1 text-base text-brand-ink">{item.recinto}</Text>
                    <View className="rounded-full bg-brand-field px-2.5 py-1">
                      <Text className="font-electoral-bold text-xs text-brand-navy">
                        {totalVotosRecinto.toLocaleString('es-EC')} votos válidos
                      </Text>
                    </View>
                  </View>
                  <View className="gap-3">
                    {recinto.map((voto, idx) => {
                      const pct = totalVotosRecinto > 0 ? ((100 * voto.votos) / totalVotosRecinto).toFixed(1) : '0.0';
                      const barColor =
                        idx === 0 ? Colors.light.primary : idx === 1 ? Colors.light.accent : '#526570';
                      return (
                        <View key={voto.candidato_id}>
                          <View className="flex-row items-center justify-between gap-2">
                            <Text numberOfLines={1} className="font-electoral-bold flex-1 text-sm text-brand-ink">
                              {voto.candidato}
                            </Text>
                            <Text className="font-electoral-bold shrink-0 text-sm text-brand-navy">
                              {voto.votos.toLocaleString('es-EC')} ({pct}%)
                            </Text>
                          </View>
                          <Text numberOfLines={1} className="font-electoral mb-1 text-xs text-brand-muted">
                            {voto.organizacion}
                          </Text>
                          <View className="h-2.5 overflow-hidden rounded-full bg-brand-line">
                            <View
                              className="h-2.5 rounded-full"
                              style={{
                                width: `${Math.round((100 * voto.votos) / maximo)}%`,
                                backgroundColor: barColor,
                              }}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </Card>
              );
            })}
        </View>
      ) : null}
    </View>
  );
}
