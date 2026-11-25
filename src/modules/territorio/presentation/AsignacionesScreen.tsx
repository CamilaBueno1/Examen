// Guía: Muestra el historial de asignaciones y permite reemplazar al responsable de una JRV.

import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import AppIcon from '@/shared/presentation/AppIcon';

import AuthField from '@/modules/authentication/presentation/components/AuthField';
import SubmitButton from '@/modules/authentication/presentation/components/SubmitButton';
import { desactivarUsuario } from '@/modules/authentication/presentation/authUseCaseProvider';
import SaveCelebrationCard from '@/shared/presentation/SaveCelebrationCard';
import { AppButton, AppPage, Card, ScreenHeader, StatusBanner, TricolorStripe } from '@/shared/presentation/Ui';
import { Colors } from '@/constants/theme';
import { asignaciones } from '../mesasProvider';
import type { RegistroAsignacion } from '../domain/usecases/gestionarAsignaciones';
import { useMesasAutorizadas } from './MesasAutorizadas';

const schema = z.object({
  mesa: z.string().min(1, 'Selecciona una JRV.'),
  veedor: z.string().min(1, 'Selecciona un veedor activo.'),
  motivo: z.string().trim().min(1, 'Ingresa el motivo de la asignación o reemplazo.').max(250, 'Máximo 250 caracteres.'),
});

export default function AsignacionesScreen() {
  const { resultado } = useMesasAutorizadas();
  const mesas = resultado && 'mesas' in resultado ? resultado.mesas : [];
  const [revisionHistorial, setRevisionHistorial] = useState(0);
  const [snapshot, setSnapshot] = useState<{ revision: number; registros: RegistroAsignacion[] }>();
  const historial = snapshot?.revision === revisionHistorial ? snapshot.registros : undefined;
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState<string>();
  const [disableComplete, setDisableComplete] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { mesa: '', veedor: '', motivo: '' },
  });

  useFocusEffect(
    useCallback(() => {
      let visible = true;
      void asignaciones.historial().then(
        (registros) => {
          if (visible) setSnapshot({ revision: revisionHistorial, registros });
        },
        (cause: unknown) => {
          if (visible) setError(cause instanceof Error ? cause.message : 'No se pudo consultar el historial.');
        },
      );
      return () => {
        visible = false;
      };
    }, [revisionHistorial]),
  );

  const [mesaId, veedorId] = useWatch({ control: form.control, name: ['mesa', 'veedor'] });
  const mesa = mesas.find((item) => item.id === mesaId);
  const vigente = historial?.find((item) => item.jrv_id === mesaId && item.hasta === null);
  const equipo = new Map<string, string>();
  if (mesa) {
    const alcance = new Set(mesas.filter((item) => item.recintoId === mesa.recintoId).map((item) => item.id));
    for (const item of historial ?? []) {
      if (item.activo && alcance.has(item.jrv_id) && item.veedor_id !== vigente?.veedor_id) {
        equipo.set(item.veedor_id, item.veedor);
      }
    }
  }

  const submit = form.handleSubmit(async (values) => {
    setError('');
    setConfirmation(false);
    try {
      if (!historial || values.mesa !== mesaId) throw new Error('Vuelve a seleccionar la JRV.');
      await asignaciones.asignar(values.mesa, values.veedor, values.motivo, vigente?.id ?? null);
      form.reset({ mesa: values.mesa, veedor: '', motivo: '' });
      setConfirmation(true);
    } catch (cause) {
      const mensaje = cause instanceof Error ? cause.message : 'No se pudo confirmar la asignación.';
      if (mensaje === 'JRV_OCUPADA' || mensaje === 'ASIGNACION_CAMBIO') {
        setError('La asignación cambió. Revisa el responsable vigente antes de volver a confirmar.');
        form.setValue('veedor', '');
      } else {
        setError(mensaje);
      }
    } finally {
      setRevisionHistorial((actual) => actual + 1);
    }
  });

  const veedoresActivos = [
    ...new Map(
      (historial ?? [])
        .filter(
          (item) =>
            item.activo &&
            item.hasta === null &&
            mesa?.recintoId === mesas.find((entry) => entry.id === item.jrv_id)?.recintoId,
        )
        .map((item) => [item.veedor_id, item] as const),
    ).values(),
  ];

  return (
    <AppPage>
      <ScreenHeader
        eyebrow="EQUIPO DEL RECINTO"
        title="Asignación y reemplazo"
        subtitle="Asigna mesas a tus veedores o registra reemplazos indicando el motivo."
      />
      {!historial && !error ? <StatusBanner tone="info" busy title="Cargando asignaciones…" /> : null}
      {resultado && 'error' in resultado ? (
        <StatusBanner tone="error" title="Mesas no disponibles" detail={resultado.error} />
      ) : null}
      {error ? <StatusBanner tone="error" title="No se completó el cambio" detail={error} /> : null}
      {confirmation ? (
        <SaveCelebrationCard
          tone="success"
          scene="account"
          eyebrow="CAMBIO GUARDADO"
          title="Asignación actualizada"
          detail="El veedor quedó asignado a la mesa seleccionada."
        />
      ) : null}
      {disableComplete ? (
        <StatusBanner
          tone="success"
          title="Cuenta desactivada"
          detail="El acceso del veedor quedó deshabilitado."
        />
      ) : null}

      <Card>
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="font-electoral-bold text-lg text-brand-ink">Asignar o reemplazar en JRV</Text>
          <TricolorStripe width={32} height={4} />
        </View>
        <View className="gap-3">
          <Text className="font-electoral-bold text-xs uppercase tracking-wider text-brand-muted">
            1. Selecciona la JRV del recinto
          </Text>
          <View className="gap-2">
            {mesas.map((item) => {
              const active = mesa?.id === item.id;
              const responsable = historial?.find((registro) => registro.jrv_id === item.id && registro.hasta === null);
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  disabled={form.formState.isSubmitting}
                  onPress={() => {
                    form.setValue('mesa', item.id);
                    form.setValue('veedor', '');
                  }}
                  className={`min-h-12 flex-row items-center gap-3 rounded-2xl border px-3.5 py-2.5 ${
                    active ? 'border-brand-navy bg-brand-navy' : 'border-brand-line bg-brand-field'
                  }`}>
                  <AppIcon
                    name={{ ios: 'tray.full', android: 'how_to_vote', web: 'how_to_vote' }}
                    size={17}
                    tintColor={active ? '#FFFFFF' : Colors.light.primary}
                  />
                  <View className="flex-1">
                    <Text className={`font-electoral-bold text-sm ${active ? 'text-white' : 'text-brand-ink'}`}>
                      {item.recinto} · JRV {item.numero}
                    </Text>
                    {historial ? (
                      <Text className={`font-electoral text-xs ${active ? 'text-white' : 'text-brand-muted'}`}>
                        {responsable ? `Asignada a ${responsable.veedor}` : 'Sin veedor asignado'}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {mesa ? (
            <>
              <Text className="font-electoral-bold mt-1 text-xs uppercase tracking-wider text-brand-muted">
                2. Selecciona el veedor habilitado
              </Text>
              {equipo.size === 0 ? (
                <Text className="font-electoral text-sm text-brand-muted">
                  No se encontraron veedores activos vinculados a este recinto.
                </Text>
              ) : (
                <View className="gap-2">
                  {[...equipo].map(([id, nombre]) => {
                    const active = veedorId === id;
                    return (
                      <Pressable
                        key={id}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                        disabled={form.formState.isSubmitting}
                        onPress={() => form.setValue('veedor', id)}
                        className={`min-h-12 flex-row items-center gap-3 rounded-2xl border px-3.5 py-2.5 ${
                          active ? 'border-brand-navy bg-brand-navy' : 'border-brand-line bg-brand-field'
                        }`}>
                        <AppIcon
                          name={{ ios: 'person.fill', android: 'person', web: 'person' }}
                          size={17}
                          tintColor={active ? '#FFFFFF' : Colors.light.primary}
                        />
                        <Text className={`font-electoral-bold flex-1 text-sm ${active ? 'text-white' : 'text-brand-ink'}`}>
                          {nombre}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </>
          ) : null}

          <Controller
            control={form.control}
            name="motivo"
            render={({ field }) => (
              <AuthField
                label="3. Motivo de asignación o reemplazo"
                icon={{ ios: 'doc.text', android: 'description', web: 'description' }}
                error={form.formState.errors.motivo?.message}
                placeholder="Ej. Reemplazo por ausencia del titular en JRV"
                maxLength={250}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />

          {historial && mesa ? (
            <SubmitButton
              label={vigente ? 'Confirmar reemplazo' : 'Confirmar asignación'}
              loadingLabel={vigente ? 'Registrando reemplazo…' : 'Registrando asignación…'}
              loading={form.formState.isSubmitting}
              onPress={submit}
            />
          ) : null}
        </View>
      </Card>

      {mesa && historial ? (
        <Card>
          <Text className="font-electoral-bold mb-2.5 text-base text-brand-ink">
            Historial de asignaciones · JRV {mesa.numero}
          </Text>
          {!historial.some((item) => item.jrv_id === mesa.id) ? (
            <Text className="font-electoral text-sm text-brand-muted">Sin asignaciones registradas.</Text>
          ) : null}
          <View className="gap-2">
            {historial
              .filter((item) => item.jrv_id === mesa.id)
              .map((item) => {
                const vigente = !item.hasta;
                return (
                  <View key={item.id} className="rounded-xl border border-brand-line bg-brand-field p-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="font-electoral-bold text-sm text-brand-ink">{item.veedor}</Text>
                      <View
                        className={`rounded-full px-2.5 py-0.5 ${
                          vigente ? 'bg-brand-success-soft' : 'bg-brand-warning-soft'
                        }`}>
                        <Text
                          className={`font-electoral-bold text-xs ${
                            vigente ? 'text-brand-success' : 'text-brand-warning'
                          }`}>
                          {vigente ? 'Vigente' : 'Cerrada'}
                        </Text>
                      </View>
                    </View>
                    <Text className="font-electoral mt-1 text-xs text-brand-muted">
                      {new Date(item.desde).toLocaleString()}
                      {item.hasta ? ` → ${new Date(item.hasta).toLocaleString()}` : ''}
                    </Text>
                    {item.motivo ? (
                      <Text className="font-electoral mt-1 text-xs text-brand-ink">Motivo: {item.motivo}</Text>
                    ) : null}
                  </View>
                );
              })}
          </View>
        </Card>
      ) : null}

      {mesa && veedoresActivos.length ? (
        <Card>
          <Text className="font-electoral-bold mb-2.5 text-base text-brand-ink">
            Veedores habilitados en este recinto
          </Text>
          <View className="gap-3">
            {veedoresActivos.map((item) => (
              <View key={item.veedor_id} className="gap-2 rounded-2xl border border-brand-line bg-brand-field p-3">
                <Text className="font-electoral-bold text-sm text-brand-ink">{item.veedor}</Text>
                {confirmDisable === item.veedor_id ? (
                  <>
                    <StatusBanner
                      tone="warning"
                      title="Confirmar desactivación de cuenta"
                      detail="Se cerrarán todas las asignaciones vigentes de este veedor y se conservará el historial."
                    />
                    <AppButton
                      label="Confirmar desactivación"
                      variant="danger"
                      loading={disabling}
                      onPress={async () => {
                        setError('');
                        setDisabling(true);
                        try {
                          await desactivarUsuario(item.veedor_id);
                          setRevisionHistorial((actual) => actual + 1);
                          setConfirmDisable(undefined);
                          setDisableComplete(true);
                        } catch (cause) {
                          setError(cause instanceof Error ? cause.message : 'No se pudo desactivar la cuenta.');
                        } finally {
                          setDisabling(false);
                        }
                      }}
                    />
                    <AppButton label="Cancelar" variant="secondary" onPress={() => setConfirmDisable(undefined)} />
                  </>
                ) : (
                  <AppButton
                    label="Desactivar cuenta"
                    variant="danger"
                    onPress={() => {
                      setDisableComplete(false);
                      setConfirmDisable(item.veedor_id);
                    }}
                  />
                )}
              </View>
            ))}
          </View>
        </Card>
      ) : null}
      <AppButton label="Volver al recinto" variant="secondary" onPress={() => router.replace('/recinto')} />
    </AppPage>
  );
}
