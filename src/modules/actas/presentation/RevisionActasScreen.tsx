import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AppIcon from '@/shared/presentation/AppIcon';

import { useSessionStore } from '@/modules/authentication/presentation/sessionStore';
import { AppButton, AppPage, Card, ScreenHeader, StatusBanner, TricolorStripe } from '@/shared/presentation/Ui';
import { Colors } from '@/constants/theme';
import { consultaRevisionLocal, propuestasCorreccion, revisionActas } from '../actasProvider';
import { useConnectivityStore } from '@/modules/sincronizacion/presentation/useConnectivityMonitor';
import { solicitarSincronizacionInmediata, useSincronizacionActasStore } from '@/modules/sincronizacion/presentation/useSincronizarActas';
import { isNetworkFailure } from '@/shared/data/networkFailure';
import { puedeValidarEvidencia, type ActaRemota, type RevisionAnterior } from '../domain/usecases/revisarActas';
import ActaMap from './ActaMap';
import { estadoActa } from './estadoActa';

const conteo = z.number().int().min(0).max(999999999);
const schema = z
  .object({
    votos: z.array(z.object({ id: z.string(), votos: conteo })).length(5),
    blancos: conteo,
    nulos: conteo,
    sufragantes: conteo,
    motivo: z.string().trim().min(1, 'Ingresa el motivo obligatorio de la corrección.').max(250, 'Máximo 250 caracteres.'),
  })
  .refine(({ votos, blancos, nulos, sufragantes }) => votos.reduce((total, voto) => total + voto.votos, blancos + nulos) === sufragantes, {
    path: ['sufragantes'],
    message: 'La suma de los 7 valores debe coincidir con los sufragantes.',
  });

function Detalle({ acta, cuenta, online, onChange }: { acta: ActaRemota; cuenta: string; online: boolean; onChange: () => void }) {
  const user = useSessionStore((state) => state.user);
  const syncRevision = useSincronizacionActasStore((state) => state.revision);
  const [foto, setFoto] = useState<string>();
  const [descargandoFoto, setDescargandoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState('');
  const [fotoVisible, setFotoVisible] = useState(false);
  const [validandoFoto, setValidandoFoto] = useState(false);
  const [fotoRespaldada, setFotoRespaldada] = useState(false);
  const [historial, setHistorial] = useState<RevisionAnterior[]>([]);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [editar, setEditar] = useState(false);
  const [propuesta, setPropuesta] = useState<Awaited<ReturnType<typeof propuestasCorreccion.consultarPropuesta>>>();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      votos: acta.conteos?.map((item) => ({ id: item.id, votos: item.votos ?? 0 })) ?? [],
      blancos: acta.blancos,
      nulos: acta.nulos,
      sufragantes: acta.sufragantes,
      motivo: '',
    },
  });

  useEffect(() => {
    let active = true;
    const local = acta.foto_id ? consultaRevisionLocal.foto(cuenta, acta.foto_id) : undefined;
    if (online) void revisionActas.historial(acta.id).then(
      (data) => {
        if (active) setHistorial(data);
      },
      () => {},
    );
    if (online && !local && acta.storage_path) {
      void revisionActas.foto(acta.storage_path).then(
        (url) => {
          if (active) setFoto(url);
        },
        () => {},
      );
    }
    if (user?.id && user.role !== 'provincial') {
      void propuestasCorreccion.consultarPropuesta(user.id, acta.id).then(
        (value) => {
          if (active) setPropuesta(value);
        },
        () => {
          if (active) setError('No se pudo abrir el borrador local.');
        },
      );
    }
    return () => {
      active = false;
    };
  }, [acta.id, acta.foto_id, acta.storage_path, cuenta, online, user, syncRevision]);

  const submit = form.handleSubmit(async (values) => {
    if (!user) return;
    setError('');
    setAviso('');
    try {
      if (propuesta && propuesta.version !== acta.version) {
        setError('El acta cambió. Revisa los conteos vigentes y descarta el borrador anterior antes de preparar una nueva corrección.');
        return;
      }
      await propuestasCorreccion.guardarPropuesta(user.id, acta.id, acta.version, values, true);
      setPropuesta({ version: acta.version, propuesta: values, pendiente: true });
      setAviso(online ? 'Corrección guardada, pendiente de confirmación.' : 'Corrección guardada. Se enviará al recuperar la conexión.');
      setEditar(false);
      solicitarSincronizacionInmediata();
    } catch {
      setError('No se pudo guardar la corrección en el teléfono.');
    }
  });

  const campos = [
    ...(acta.conteos ?? []).map((item, index) => ({ name: `votos.${index}.votos` as const, label: item.nombre })),
    { name: 'blancos' as const, label: 'Votos en blanco' },
    { name: 'nulos' as const, label: 'Votos nulos' },
    { name: 'sufragantes' as const, label: 'Total de sufragantes' },
  ];

  async function validarFoto() {
    if (!online || !fotoVisible || validandoFoto || fotoRespaldada || user?.role !== 'coordinator' || user.status !== 'ACTIVE') return;
    setError('');
    setValidandoFoto(true);
    try {
      await revisionActas.validarEvidencia(acta);
      setFotoRespaldada(true);
      onChange();
    } catch (cause) {
      setError(cause instanceof Error && cause.message.includes('PERMISO_REVOCADO')
        ? 'Ya no tienes permiso para validar la fotografía de esta mesa.'
        : 'No se pudo validar la fotografía. Comprueba la conexión y vuelve a intentarlo.');
    } finally {
      setValidandoFoto(false);
    }
  }

  const fotoDisponible = (acta.foto_id ? consultaRevisionLocal.foto(cuenta, acta.foto_id) : undefined) ?? (online ? foto : undefined);
  const fotoDescargada = acta.foto_id ? consultaRevisionLocal.foto(cuenta, acta.foto_id) : undefined;

  async function descargarParaConsultar() {
    if (!online || !user || !acta.foto_id || !acta.storage_path || descargandoFoto) return;
    setErrorFoto('');
    setDescargandoFoto(true);
    try {
      const uri = await consultaRevisionLocal.descargarFoto(user.id, cuenta, acta.foto_id, acta.storage_path);
      if (!uri) throw new Error('FOTO_NO_GUARDADA');
      setFoto(uri);
    } catch {
      setErrorFoto('No se pudo guardar la fotografía. Comprueba tu conexión y vuelve a intentar.');
    } finally {
      setDescargandoFoto(false);
    }
  }
  return (
    <Card>
      <View className="gap-3.5">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text accessibilityRole="header" className="font-electoral-bold text-xl text-brand-ink">
              {acta.recinto} · JRV {acta.numero}
            </Text>
            <Text className="font-electoral mt-0.5 text-xs text-brand-muted">
              {acta.dignidad === 'alcaldia' ? 'Alcaldía' : 'Prefectura'} · Versión {acta.version} ·{' '}
              {estadoActa(acta.evidencia)}
            </Text>
          </View>
          <TricolorStripe width={36} height={4} />
        </View>

        {error ? <StatusBanner tone="error" title="Operación no completada" detail={error} /> : null}
        {aviso && propuesta?.pendiente ? <StatusBanner tone="info" title="Corrección guardada" detail={aviso} /> : null}
        {propuesta && !propuesta.pendiente ? (
          <StatusBanner tone="warning" title="Corrección por revisar" detail="El borrador está en el teléfono. Revisa el permiso y la versión vigente antes de volver a enviarlo." />
        ) : null}

        {fotoDisponible ? (
          <Image
            accessibilityLabel="Evidencia fotográfica del acta"
            source={{ uri: fotoDisponible }}
            style={{ height: 250, width: '100%', borderRadius: 14, backgroundColor: Colors.light.text }}
            resizeMode="contain"
            onLoad={() => setFotoVisible(true)}
            onError={() => setFotoVisible(false)}
          />
        ) : acta.foto_id && !online ? (
          <Text className="font-electoral text-xs text-brand-muted">Conéctate y toca «Descargar foto» para verla después sin internet.</Text>
        ) : null}
        {fotoDescargada ? (
          <Text className="font-electoral text-xs text-brand-muted">Fotografía guardada para consultar sin internet.</Text>
        ) : online && acta.foto_id && acta.storage_path ? (
          <AppButton label="Descargar foto" variant="secondary" loading={descargandoFoto} onPress={() => void descargarParaConsultar()} />
        ) : null}
        {errorFoto ? <StatusBanner tone="warning" title="Descarga pendiente" detail={errorFoto} /> : null}

        {online && user?.role === 'coordinator' && user.status === 'ACTIVE' && puedeValidarEvidencia(acta) ? (
          <AppButton
            label={fotoRespaldada ? 'Fotografía validada' : validandoFoto ? 'Validando fotografía…' : 'Validar fotografía'}
            disabled={!fotoVisible || validandoFoto || fotoRespaldada}
            onPress={() => void validarFoto()}
          />
        ) : null}

        {acta.lat !== null && acta.lon !== null ? (
          <ActaMap
            lat={acta.lat}
            lon={acta.lon}
            recintoLat={acta.recinto_lat ?? undefined}
            recintoLon={acta.recinto_lon ?? undefined}
            accuracy={acta.precision_m}
          />
        ) : null}

        {acta.captura_at ? (
          <Text className="font-electoral text-xs text-brand-muted">
            Capturada: {new Date(acta.captura_at).toLocaleString()} · Precisión GPS: {acta.precision_m ?? '—'} m
          </Text>
        ) : null}

        {!editar ? (
          <View className="gap-2 rounded-2xl border border-brand-line bg-brand-field p-3.5">
            <Text className="font-electoral-bold text-xs uppercase tracking-wider text-brand-navy">
              Conteo vigente registrado
            </Text>
            {acta.conteos?.map((item) => (
              <View key={item.id} className="flex-row items-center justify-between border-b border-brand-line pb-1.5">
                <Text className="font-electoral text-sm text-brand-ink">{item.nombre}</Text>
                <Text className="font-electoral-bold text-base text-brand-navy">{item.votos ?? '—'}</Text>
              </View>
            ))}
            <View className="mt-1 flex-row justify-between">
              <Text className="font-electoral-bold text-xs text-brand-muted">
                Blancos: {acta.blancos} · Nulos: {acta.nulos}
              </Text>
              <Text className="font-electoral-bold text-sm text-brand-ink">
                Sufragantes: {acta.sufragantes}
              </Text>
            </View>
            {user?.role !== 'provincial' && acta.conteos?.length === 5 ? (
              <View className="mt-2">
                <AppButton label="Corregir conteo" variant="secondary" onPress={() => setEditar(true)} />
              </View>
            ) : null}
          </View>
        ) : (
          <View className="gap-3 rounded-2xl border border-brand-line bg-brand-field p-3.5">
            <Text className="font-electoral-bold text-sm text-brand-navy">
              Corrección de resultados · Versión actual {acta.version}
            </Text>
            {propuesta?.version === acta.version ? (
              <AppButton
                label={`Cargar borrador local guardado (versión ${propuesta.version})`}
                variant="secondary"
                onPress={() => form.reset(propuesta.propuesta)}
              />
            ) : propuesta && user ? (
              <AppButton label="Descartar borrador de la versión anterior" variant="secondary" onPress={async () => {
                try {
                  await propuestasCorreccion.borrarPropuesta(user.id, acta.id);
                  setPropuesta(null);
                  setError('');
                } catch {
                  setError('No se pudo descartar el borrador.');
                }
              }} />
            ) : null}
            {campos.map(({ name, label }) => (
              <Controller
                key={name}
                control={form.control}
                name={name}
                render={({ field, fieldState }) => (
                  <View>
                    <Text className="font-electoral-bold mb-1 text-xs text-brand-ink">{label}</Text>
                    <TextInput
                      accessibilityLabel={label}
                      keyboardType="number-pad"
                      value={String(field.value)}
                      onChangeText={(text) => {
                        if (/^\d{0,9}$/.test(text)) field.onChange(Number(text));
                      }}
                      className="min-h-12 rounded-xl border border-brand-line bg-brand-surface px-3.5 text-brand-ink"
                    />
                    {fieldState.error ? (
                      <Text accessibilityRole="alert" className="font-electoral-bold mt-1 text-xs text-brand-danger">
                        {fieldState.error.message}
                      </Text>
                    ) : null}
                  </View>
                )}
              />
            ))}
            <Controller
              control={form.control}
              name="motivo"
              render={({ field, fieldState }) => (
                <View>
                  <Text className="font-electoral-bold mb-1 text-xs text-brand-ink">
                    Motivo de la corrección (obligatorio)
                  </Text>
                  <TextInput
                    accessibilityLabel="Motivo de corrección"
                    maxLength={250}
                    placeholder="Explica por qué se corrige el conteo"
                    value={field.value}
                    onChangeText={field.onChange}
                    className="min-h-12 rounded-xl border border-brand-line bg-brand-surface px-3.5 text-brand-ink"
                  />
                  {fieldState.error ? (
                    <Text accessibilityRole="alert" className="font-electoral-bold mt-1 text-xs text-brand-danger">
                      {fieldState.error.message}
                    </Text>
                  ) : null}
                </View>
              )}
            />
            <AppButton label="Confirmar y guardar corrección" loading={form.formState.isSubmitting} onPress={submit} />
            <AppButton label="Cancelar edición" variant="secondary" onPress={() => setEditar(false)} />
          </View>
        )}

        {historial.length > 0 ? (
          <View className="gap-2">
            <Text className="font-electoral-bold text-sm text-brand-ink">
              Historial de correcciones ({historial.length})
            </Text>
            {historial.map((item) => (
              <View key={item.version} className="rounded-xl border border-brand-line bg-brand-paper p-3">
                <Text className="font-electoral-bold text-xs text-brand-navy">
                  Versión {item.version} · Autor: {item.autor}
                </Text>
                <Text className="font-electoral mt-0.5 text-xs text-brand-muted">
                  {new Date(item.fecha).toLocaleString()} · Motivo: {item.motivo}
                </Text>
                <Text className="font-electoral mt-1 text-xs text-brand-ink">
                  Valores anteriores → Blancos {item.anteriores.blancos} · Nulos {item.anteriores.nulos} · Sufragantes{' '}
                  {item.anteriores.sufragantes}
                </Text>
                {acta.conteos?.map((c) => (
                  <Text key={c.id} className="font-electoral text-xs text-brand-muted">
                    {c.nombre}: {item.anteriores.votos[c.id] ?? '—'}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Card>
  );
}

export default function RevisionActasScreen() {
  const user = useSessionStore((state) => state.user);
  if (user?.status !== 'ACTIVE') return null;
  const cuenta = `${user.id}:${user.role}`;
  return <RevisionPorCuenta key={cuenta} id={user.id} cuenta={cuenta} />;
}

function RevisionPorCuenta({ id, cuenta }: { id: string; cuenta: string }) {
  const user = useSessionStore((state) => state.user);
  const online = useConnectivityStore((state) => state.connectivity === 'online');
  const syncRevision = useSincronizacionActasStore((state) => state.revision);
  const [actas, setActas] = useState<ActaRemota[]>();
  const [selected, setSelected] = useState<string>();
  const [revision, setRevision] = useState(0);
  const [queriedRevision, setQueriedRevision] = useState('');
  const queryKey = `${revision}:${syncRevision}`;
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        try {
          const copia = await consultaRevisionLocal.leer(cuenta);
          if (!active) return;
          setActas(copia ?? undefined);
          setError(!online && !copia ? 'Conéctate para descargar tus actas por primera vez.' : '');
          if (!online) return;
          const data = await consultaRevisionLocal.actualizar(id, cuenta);
          if (!active) return;
          setActas(data);
          void consultaRevisionLocal.respaldarFotos(id, cuenta, data, () => active);
        } catch (cause) {
          if (active) setError(isNetworkFailure(cause)
            ? 'Se perdió la conexión. Las actas descargadas siguen disponibles.'
            : 'No se pudieron actualizar las actas. Intenta de nuevo al recuperar la conexión.');
        } finally {
          if (active) setQueriedRevision(queryKey);
        }
      })();
      return () => {
        active = false;
      };
    }, [queryKey, id, cuenta, online]),
  );

  const acta = actas?.find((item) => item.id === selected);
  const reload = () => setRevision((current) => current + 1);

  return (
    <AppPage>
      <ScreenHeader
        eyebrow="ACTAS CONFIRMADAS"
        title="Actas recibidas"
        subtitle={
          user?.role === 'provincial'
            ? 'Consulta votos, fotografías y ubicación registrada en cada mesa.'
            : 'Revisa votos, fotografías, mapa o corrige un conteo indicando el motivo.'
        }
      />
      {error ? <StatusBanner tone="error" title="Actas no disponibles" detail={error} /> : null}
      {!online && actas ? <StatusBanner tone="info" title="Información descargada" detail="Mostrando las actas guardadas en este teléfono." /> : null}
      {queriedRevision !== queryKey ? <StatusBanner tone="info" busy title="Cargando actas…" /> : null}
      {actas?.length === 0 ? <StatusBanner tone="info" title="Aún no se han recibido actas" /> : null}
      {!acta ? (
        <View className="gap-3">
          {actas?.map((item) => {
            const backed = item.evidencia === 'EVIDENCIA_RESPALDADA';
            return (
              <Card key={item.id} compact>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSelected(item.id)}
                  className="flex-row items-center gap-3 active:opacity-80">
                  <View className="h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-navy">
                    <AppIcon
                      name={
                        item.dignidad === 'alcaldia'
                          ? { ios: 'building.columns', android: 'account_balance', web: 'account_balance' }
                          : { ios: 'shield', android: 'shield', web: 'shield' }
                      }
                      size={19}
                      tintColor="#FFFFFF"
                    />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className="font-electoral-bold text-sm text-brand-ink">
                      {item.recinto} · JRV {item.numero}
                    </Text>
                    <Text numberOfLines={1} className="font-electoral mt-0.5 text-xs text-brand-muted">
                      {item.dignidad === 'alcaldia' ? 'Alcaldía' : 'Prefectura'} · Versión {item.version} · Sufragantes:{' '}
                      {item.sufragantes}
                    </Text>
                  </View>
                  <Text className="font-electoral-bold text-lg text-brand-navy">›</Text>
                </Pressable>

                <View className="mt-2.5 flex-row flex-wrap items-center justify-between gap-2 border-t border-brand-line pt-2.5">
                  <View
                    className={`rounded-full px-2.5 py-1 ${
                      backed ? 'bg-brand-success-soft' : 'bg-brand-warning-soft'
                    }`}>
                    <Text
                      className={`font-electoral-bold text-xs ${
                        backed ? 'text-brand-success' : 'text-brand-warning'
                      }`}>
                      {estadoActa(item.evidencia)}
                    </Text>
                  </View>
                  <Pressable onPress={() => setSelected(item.id)} className="px-2 py-1">
                    <Text className="font-electoral-bold text-xs text-brand-navy">
                      {user?.role === 'provincial' ? 'Ver detalle y mapa →' : 'Ver o corregir →'}
                    </Text>
                  </Pressable>
                </View>
              </Card>
            );
          })}
        </View>
      ) : (
        <>
          <Detalle key={`${acta.id}:${acta.version}:${acta.evidencia}`} acta={acta} cuenta={cuenta} online={online} onChange={reload} />
          <AppButton label="Volver al listado de actas" variant="secondary" onPress={() => setSelected(undefined)} />
        </>
      )}
      <AppButton label="Actualizar listado" variant="secondary" onPress={reload} />
      <AppButton
        label="Volver a mi panel"
        variant="secondary"
        onPress={() =>
          router.replace(
            user?.role === 'provincial' ? '/provincial' : user?.role === 'coordinator' ? '/recinto' : '/veedor',
          )
        }
      />
    </AppPage>
  );
}
