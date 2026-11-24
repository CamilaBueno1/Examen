import { useCallback, useEffect, useState } from 'react';
import { Image, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useSessionStore } from '@/modules/authentication/presentation/sessionStore';
import { AppButton, AppPage, Card, ScreenHeader, StatusBanner } from '@/shared/presentation/Ui';
import { propuestasCorreccion, revisionActas } from '../actasProvider';
import type { ActaRemota, RevisionAnterior } from '../domain/usecases/revisarActas';
import ActaMap from './ActaMap';
import { estadoActa } from './estadoActa';

const conteo = z.number().int().min(0).max(999999999);
const schema = z.object({
  votos: z.array(z.object({ id: z.string(), votos: conteo })).length(5),
  blancos: conteo,
  nulos: conteo,
  sufragantes: conteo,
  motivo: z.string().trim().min(1, 'Ingresa el motivo.').max(250, 'Máximo 250 caracteres.'),
}).refine(({ votos, blancos, nulos, sufragantes }) =>
  votos.reduce((total, voto) => total + voto.votos, blancos + nulos) === sufragantes,
{ path: ['sufragantes'], message: 'La suma debe coincidir con los sufragantes.' });

function message(error: unknown) {
  return error instanceof Error ? error.message : 'No se pudo completar la operación.';
}

function Detalle({ acta, onChange }: { acta: ActaRemota; onChange: () => void }) {
  const user = useSessionStore((state) => state.user);
  const [foto, setFoto] = useState<string>();
  const [historial, setHistorial] = useState<RevisionAnterior[]>([]);
  const [error, setError] = useState('');
  const [aprobar, setAprobar] = useState(false);
  const [editar, setEditar] = useState(false);
  const [propuesta, setPropuesta] = useState<Awaited<ReturnType<typeof propuestasCorreccion.consultarPropuesta>>>();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      votos: acta.conteos?.map((item) => ({ id: item.id, votos: item.votos ?? 0 })) ?? [],
      blancos: acta.blancos, nulos: acta.nulos, sufragantes: acta.sufragantes, motivo: '',
    },
  });
  useEffect(() => {
    let active = true;
    void revisionActas.historial(acta.id).then(
      (data) => { if (active) setHistorial(data); },
      (cause: unknown) => { if (active) setError(message(cause)); },
    );
    if (acta.storage_path) {
      void revisionActas.foto(acta.storage_path).then(
        (url) => { if (active) setFoto(url); },
        (cause: unknown) => { if (active) setError(message(cause)); },
      );
    }
    if (user?.id && user.role !== 'provincial') {
      void propuestasCorreccion.consultarPropuesta(user.id, acta.id).then(
        (value) => { if (active) setPropuesta(value); },
        (cause: unknown) => { if (active) setError(message(cause)); },
      );
    }
    return () => { active = false; };
  }, [acta.id, acta.storage_path, user]);

  const submit = form.handleSubmit(async (values) => {
    if (!user) return;
    setError('');
    let confirmado = false;
    try {
      await propuestasCorreccion.guardarPropuesta(user.id, acta.id, acta.version, values);
      await revisionActas.corregir(acta, values);
      confirmado = true;
      await propuestasCorreccion.borrarPropuesta(user.id, acta.id);
      onChange();
    } catch (cause) {
      const detalle = message(cause);
      setError(detalle.includes('CONFLICTO_VERSION')
        ? 'La versión cambió. La propuesta sigue guardada. Actualiza el acta y revisa los valores antes de reenviarla.'
        : detalle);
      if (confirmado) onChange();
    }
  });

  const campos = [
    ...(acta.conteos ?? []).map((item, index) => ({ name: `votos.${index}.votos` as const, label: item.nombre })),
    { name: 'blancos' as const, label: 'Votos en blanco' },
    { name: 'nulos' as const, label: 'Votos nulos' },
    { name: 'sufragantes' as const, label: 'Total de sufragantes' },
  ];

  return (
    <Card>
      <View className="gap-3">
        <Text accessibilityRole="header" className="text-xl font-bold text-brand-ink">{acta.recinto} · JRV {acta.numero}</Text>
        <Text className="text-sm text-brand-muted">{acta.dignidad === 'alcaldia' ? 'Alcaldía' : 'Prefectura'} · Versión {acta.version} · {estadoActa(acta.evidencia)}</Text>
        {error ? <StatusBanner tone="error" title="Operación no completada" detail={error} /> : null}
        {foto ? <Image accessibilityLabel="Evidencia fotográfica del acta" source={{ uri: foto }} style={{ height: 250, width: '100%' }} resizeMode="contain" /> : null}
        {acta.lat !== null && acta.lon !== null ? <ActaMap lat={acta.lat} lon={acta.lon} recintoLat={acta.recinto_lat ?? undefined} recintoLon={acta.recinto_lon ?? undefined} /> : null}
        {acta.captura_at ? <Text className="text-sm text-brand-muted">{new Date(acta.captura_at).toLocaleString()} · Precisión {acta.precision_m ?? '—'} m</Text> : null}
        {user?.role === 'coordinator' && foto && acta.foto_id && acta.evidencia !== 'EVIDENCIA_RESPALDADA' ? (
          <AppButton label="Validar respaldo fotográfico" loading={aprobar} onPress={async () => {
            if (!acta.foto_id) return;
            setAprobar(true);
            try { await revisionActas.aprobar(acta.foto_id); onChange(); }
            catch (cause) { setError(message(cause)); }
            finally { setAprobar(false); }
          }} />
        ) : null}
        {!editar ? (
          <>
            {acta.conteos?.map((item) => <Text key={item.id} className="text-sm text-brand-ink">{item.nombre} · {item.votos ?? '—'}</Text>)}
            <Text className="text-sm text-brand-ink">Blancos {acta.blancos} · Nulos {acta.nulos} · Sufragantes {acta.sufragantes}</Text>
            {user?.role !== 'provincial' && acta.conteos?.length === 5 ? <AppButton label="Corregir conteo" variant="secondary" onPress={() => setEditar(true)} /> : null}
          </>
        ) : (
          <>
            {propuesta ? <AppButton label={`Revisar propuesta guardada (versión ${propuesta.version})`} variant="secondary" onPress={() => form.reset(propuesta.propuesta)} /> : null}
            {campos.map(({ name, label }) => (
              <Controller key={name} control={form.control} name={name} render={({ field, fieldState }) => (
                <View>
                  <Text className="mb-1 text-sm font-semibold text-brand-ink">{label}</Text>
                  <TextInput accessibilityLabel={label} keyboardType="number-pad" value={String(field.value)}
                    onChangeText={(text) => { if (/^\d{0,9}$/.test(text)) field.onChange(Number(text)); }}
                    className="min-h-14 rounded-xl border border-brand-line px-4 text-brand-ink" />
                  {fieldState.error ? <Text accessibilityRole="alert" className="text-sm text-brand-danger">{fieldState.error.message}</Text> : null}
                </View>
              )} />
            ))}
            <Controller control={form.control} name="motivo" render={({ field, fieldState }) => (
              <View>
                <Text className="mb-1 text-sm font-semibold text-brand-ink">Motivo</Text>
                <TextInput accessibilityLabel="Motivo de corrección" maxLength={250} value={field.value} onChangeText={field.onChange}
                  className="min-h-14 rounded-xl border border-brand-line px-4 text-brand-ink" />
                {fieldState.error ? <Text accessibilityRole="alert" className="text-sm text-brand-danger">{fieldState.error.message}</Text> : null}
              </View>
            )} />
            <AppButton label="Enviar corrección" loading={form.formState.isSubmitting} onPress={submit} />
          </>
        )}
        {historial.length > 0 ? <Text className="text-base font-bold text-brand-ink">Historial de correcciones</Text> : null}
        {historial.map((item) => (
          <View key={item.version} className="rounded-xl bg-brand-paper p-3">
            <Text className="text-sm font-bold text-brand-ink">Versión {item.version} · {item.autor}</Text>
            <Text className="text-sm text-brand-muted">{new Date(item.fecha).toLocaleString()} · {item.motivo}</Text>
            <Text className="text-sm text-brand-muted">Blancos {item.anteriores.blancos} · Nulos {item.anteriores.nulos} · Sufragantes {item.anteriores.sufragantes}</Text>
            {acta.conteos?.map((conteo) => <Text key={conteo.id} className="text-sm text-brand-muted">{conteo.nombre} · {item.anteriores.votos[conteo.id] ?? '—'}</Text>)}
          </View>
        ))}
      </View>
    </Card>
  );
}

export default function RevisionActasScreen() {
  const user = useSessionStore((state) => state.user);
  const [actas, setActas] = useState<ActaRemota[]>();
  const [selected, setSelected] = useState<string>();
  const [revision, setRevision] = useState(0);
  const [queriedRevision, setQueriedRevision] = useState(-1);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    void revisionActas.listar().then(
      (data) => { if (active) { setActas(data); setError(''); setQueriedRevision(revision); } },
      (cause: unknown) => { if (active) { setError(message(cause)); setQueriedRevision(revision); } },
    );
    return () => { active = false; };
  }, [revision]));
  const acta = actas?.find((item) => item.id === selected);
  const reload = () => setRevision((current) => current + 1);

  return (
    <AppPage>
      <ScreenHeader eyebrow="ESCRUTINIO" title="Actas recibidas" subtitle="Resultados y evidencias dentro de tu ámbito." />
      {error ? <StatusBanner tone="error" title="Actas no disponibles" detail={error} /> : null}
      {queriedRevision !== revision ? <StatusBanner tone="info" busy title="Consultando actas" /> : null}
      {actas?.length === 0 ? <StatusBanner tone="info" title="Aún no hay actas en el servidor" /> : null}
      {!acta ? actas?.map((item) => <AppButton key={item.id} variant="secondary" label={`${item.recinto} · JRV ${item.numero} · ${item.dignidad === 'alcaldia' ? 'Alcaldía' : 'Prefectura'}`} onPress={() => setSelected(item.id)} />) : (
        <>
          <Detalle key={`${acta.id}:${acta.version}:${acta.evidencia}`} acta={acta} onChange={reload} />
          <AppButton label="Volver al listado" variant="secondary" onPress={() => setSelected(undefined)} />
        </>
      )}
      <AppButton label="Actualizar" variant="secondary" onPress={reload} />
      <AppButton label="Volver a mi panel" variant="secondary" onPress={() => router.replace(user?.role === 'provincial' ? '/provincial' : user?.role === 'coordinator' ? '/recinto' : '/veedor')} />
    </AppPage>
  );
}
