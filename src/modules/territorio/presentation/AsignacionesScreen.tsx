import { useCallback, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { AppButton, AppPage, Card, ScreenHeader, StatusBanner } from '@/shared/presentation/Ui';
import { desactivarUsuario } from '@/modules/authentication/presentation/authUseCaseProvider';
import { asignaciones } from '../mesasProvider';
import type { RegistroAsignacion } from '../domain/usecases/gestionarAsignaciones';
import { useMesasAutorizadas } from './MesasAutorizadas';

const schema = z.object({
  mesa: z.string().min(1, 'Selecciona una JRV.'),
  veedor: z.string().min(1, 'Selecciona un veedor.'),
  motivo: z.string().trim().min(1, 'Ingresa un motivo.').max(250, 'Máximo 250 caracteres.'),
});

export default function AsignacionesScreen() {
  const { resultado } = useMesasAutorizadas();
  const mesas = resultado && 'mesas' in resultado ? resultado.mesas : [];
  const [historial, setHistorial] = useState<RegistroAsignacion[]>();
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState<string>();
  const [disableComplete, setDisableComplete] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { mesa: '', veedor: '', motivo: '' },
  });
  useFocusEffect(useCallback(() => {
    let visible = true;
    void asignaciones.historial().then(
      (registros) => { if (visible) setHistorial(registros); },
      (cause: unknown) => { if (visible) setError(cause instanceof Error ? cause.message : 'No se pudo consultar el historial.'); },
    );
    return () => { visible = false; };
  }, []));
  const [mesaId, veedorId] = useWatch({ control: form.control, name: ['mesa', 'veedor'] });
  const mesa = mesas.find((item) => item.id === mesaId);
  const equipo = new Map<string, string>();
  if (mesa) {
    const alcance = new Set(mesas.filter((item) => item.recintoId === mesa.recintoId).map((item) => item.id));
    for (const item of historial ?? []) {
      if (item.activo && alcance.has(item.jrv_id)) equipo.set(item.veedor_id, item.veedor);
    }
  }
  const submit = form.handleSubmit(async (values) => {
    setError('');
    setConfirmation(false);
    try {
      await asignaciones.asignar(values.mesa, values.veedor, values.motivo);
      setHistorial(await asignaciones.historial());
      form.reset({ ...values, motivo: '' });
      setConfirmation(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo confirmar la asignación.');
    }
  });
  const veedoresActivos = [...new Map(
    (historial ?? [])
      .filter((item) => item.activo && item.hasta === null && mesa?.recintoId === mesas.find((entry) => entry.id === item.jrv_id)?.recintoId)
      .map((item) => [item.veedor_id, item] as const),
  ).values()];

  return (
    <AppPage>
      <ScreenHeader eyebrow="PERSONAL Y MESAS" title="Asignaciones" subtitle="El reemplazo conserva el historial de cada JRV." />
      {!historial && !error ? <StatusBanner tone="info" busy title="Consultando asignaciones" /> : null}
      {resultado && 'error' in resultado ? <StatusBanner tone="error" title="JRV no disponibles" detail={resultado.error} /> : null}
      {error ? <StatusBanner tone="error" title="Operación no completada" detail={error} /> : null}
      {confirmation ? <StatusBanner tone="success" title="Asignación confirmada" /> : null}
      {disableComplete ? <StatusBanner tone="success" title="Cuenta desactivada" detail="Se cerraron sus asignaciones vigentes y se conservó el historial." /> : null}
      <Card>
        <Text className="mb-3 text-lg font-bold text-brand-ink">Asignar o reemplazar</Text>
        <View className="gap-2">
          {mesas.map((item) => (
            <AppButton key={item.id} label={`${item.recinto} · JRV ${item.numero}`} variant={mesa?.id === item.id ? 'primary' : 'secondary'} onPress={() => {
              form.setValue('mesa', item.id);
              form.setValue('veedor', '');
            }} />
          ))}
          {mesa && equipo.size === 0 ? <Text className="text-sm text-brand-muted">No se encontraron veedores activos vinculados al recinto.</Text> : null}
          {[...equipo].map(([id, nombre]) => (
            <AppButton key={id} label={nombre} variant={veedorId === id ? 'primary' : 'secondary'} onPress={() => form.setValue('veedor', id)} />
          ))}
          <Controller control={form.control} name="motivo" render={({ field }) => (
            <TextInput
              accessibilityLabel="Motivo de asignación"
              placeholder="Motivo de asignación"
              maxLength={250}
              className="min-h-14 rounded-2xl border border-brand-line bg-brand-paper px-4 text-brand-ink"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
            />
          )} />
          {Object.values(form.formState.errors).map((field, index) => (
            <Text key={index} accessibilityRole="alert" className="text-sm text-brand-danger">{field.message}</Text>
          ))}
          <AppButton label="Confirmar asignación" onPress={submit} loading={form.formState.isSubmitting} disabled={!mesa || equipo.size === 0} />
        </View>
      </Card>
      {mesa && historial ? <Card>
        <Text className="mb-2 text-base font-bold text-brand-ink">Historial · JRV {mesa.numero}</Text>
        {!historial.some((item) => item.jrv_id === mesa.id) ? <Text className="text-brand-muted">Sin asignaciones registradas.</Text> : null}
        {historial.filter((item) => item.jrv_id === mesa.id).map((item) => (
          <View key={item.id} className="mb-2">
            <Text className="font-bold text-brand-ink">{item.veedor} · {item.hasta ? 'Cerrada' : 'Vigente'}</Text>
            <Text className="text-sm text-brand-muted">{new Date(item.desde).toLocaleString()}{item.hasta ? ` – ${new Date(item.hasta).toLocaleString()}` : ''}</Text>
            {item.motivo ? <Text className="text-sm text-brand-muted">{item.motivo}</Text> : null}
          </View>
        ))}
      </Card> : null}
      {mesa && veedoresActivos.length ? <Card>
        <Text className="mb-2 text-base font-bold text-brand-ink">Cuentas activas de este recinto</Text>
        {veedoresActivos.map((item) => (
          <View key={item.veedor_id} className="mb-3 gap-2">
            <Text className="font-semibold text-brand-ink">{item.veedor}</Text>
            {confirmDisable === item.veedor_id ? (
              <>
                <StatusBanner tone="warning" title="Confirmar desactivación" detail="Se cerrarán todas las asignaciones vigentes de esta cuenta." />
                <AppButton label="Confirmar desactivación" variant="danger" loading={disabling} onPress={async () => {
                  setError('');
                  setDisabling(true);
                  try {
                    await desactivarUsuario(item.veedor_id);
                    setHistorial(await asignaciones.historial());
                    setConfirmDisable(undefined);
                    setDisableComplete(true);
                  } catch (cause) {
                    setError(cause instanceof Error ? cause.message : 'No se pudo desactivar la cuenta.');
                  } finally {
                    setDisabling(false);
                  }
                }} />
                <AppButton label="Cancelar" variant="secondary" onPress={() => setConfirmDisable(undefined)} />
              </>
            ) : (
              <AppButton label="Desactivar cuenta" variant="danger" onPress={() => {
                setDisableComplete(false);
                setConfirmDisable(item.veedor_id);
              }} />
            )}
          </View>
        ))}
      </Card> : null}
      <AppButton label="Volver al recinto" variant="secondary" onPress={() => router.replace('/recinto')} />
    </AppPage>
  );
}
