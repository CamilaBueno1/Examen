// Guía: Recibe los datos para el alta jerárquica y muestra la credencial inicial.

import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import AppIcon from '@/shared/presentation/AppIcon';

import { useMesasAutorizadas } from '@/modules/territorio/presentation/MesasAutorizadas';
import type { MesaAutorizada } from '@/modules/territorio/domain/usecases/consultarMesas';
import type { RegistroAsignacion } from '@/modules/territorio/domain/usecases/gestionarAsignaciones';
import { asignaciones } from '@/modules/territorio/mesasProvider';
import SaveCelebrationCard from '@/shared/presentation/SaveCelebrationCard';
import { AppButton, AppPage, Card, ScreenHeader, StatusBanner, TricolorStripe } from '@/shared/presentation/Ui';
import { Colors } from '@/constants/theme';
import {
  motivoErrorCedula,
  motivoErrorTelefono,
} from '../domain/usecases/registerUser';
import { registrarUsuario } from './authUseCaseProvider';
import AuthField from './components/AuthField';
import SubmitButton from './components/SubmitButton';

const schema = z.object({
  cedula: z
    .string()
    .superRefine((valor, ctx) => {
      const motivo = motivoErrorCedula(valor);
      if (motivo) {
        ctx.addIssue({ code: 'custom', message: motivo });
      }
    }),
  firstName: z.string().trim().min(2, 'Ingresa los nombres completos.').max(100),
  lastName: z.string().trim().min(2, 'Ingresa los apellidos completos.').max(100),
  phone: z
    .string()
    .superRefine((valor, ctx) => {
      const motivo = motivoErrorTelefono(valor);
      if (motivo) {
        ctx.addIssue({ code: 'custom', message: motivo });
      }
    }),
  email: z.string().trim().email('Revisa el formato del correo electrónico.'),
});

type RoleToCreate = 'coordinator' | 'veedor';

export default function CreateUserScreen({ role }: { role: RoleToCreate }) {
  const { resultado } = useMesasAutorizadas();
  const [scopeId, setScopeId] = useState('');
  const [error, setError] = useState('');
  const [revisionHistorial, setRevisionHistorial] = useState(0);
  const [snapshot, setSnapshot] = useState<{ revision: number; registros: RegistroAsignacion[] }>();
  const historial = snapshot?.revision === revisionHistorial ? snapshot.registros : undefined;
  const [created, setCreated] = useState<{ email: string; password: string; scope: string }>();
  const mesas = useMemo(() => (resultado && 'mesas' in resultado ? resultado.mesas : []), [resultado]);
  const options = useMemo(() => {
    if (role === 'veedor') {
      return mesas.map((mesa) => ({ id: mesa.id, label: `${mesa.recinto} · Mesa ${mesa.numero}` }));
    }
    const recintos = new Map<string, MesaAutorizada>();
    for (const mesa of mesas) if (!recintos.has(mesa.recintoId)) recintos.set(mesa.recintoId, mesa);
    return [...recintos.values()].map((mesa) => ({ id: mesa.recintoId, label: mesa.recinto }));
  }, [mesas, role]);
  const selectedScope = options.find((option) => option.id === scopeId);
  const responsable = historial?.find((item) => item.jrv_id === scopeId && item.hasta === null);
  useFocusEffect(useCallback(() => {
    if (role !== 'veedor') return;
    let visible = true;
    setSnapshot(undefined);
    void asignaciones.historial().then(
      (registros) => { if (visible) setSnapshot({ revision: revisionHistorial, registros }); },
      () => { if (visible) setError('No se pudo consultar quién está asignado a cada JRV.'); },
    );
    return () => { visible = false; };
  }, [role, revisionHistorial]));
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { cedula: '', firstName: '', lastName: '', phone: '', email: '' },
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
  });
  const creatingCoordinator = role === 'coordinator';
  const title = creatingCoordinator ? 'Registrar coordinador de recinto' : 'Registrar veedor de mesa';

  function updateField(onChange: (value: string) => void, value: string) {
    setError('');
    onChange(value);
  }

  const submit = form.handleSubmit(async (values) => {
    setError('');
    if (!selectedScope || (role === 'veedor' && !historial)) {
      setError(creatingCoordinator ? 'Selecciona el recinto que tendrá a cargo.' : 'Selecciona la mesa que cubrirá.');
      return;
    }
    try {
      const registration = await registrarUsuario.execute({
        ...values,
        role,
        jurisdictionId: selectedScope.id,
      }, role === 'veedor' ? responsable?.id : undefined);
      setCreated({
        email: values.email.trim().toLowerCase(),
        password: registration.temporaryPassword,
        scope: selectedScope.label,
      });
      form.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la cuenta.');
      if (role === 'veedor') setRevisionHistorial((current) => current + 1);
    }
  });

  return (
    <AppPage>
      <ScreenHeader
        eyebrow={creatingCoordinator ? 'EQUIPO PROVINCIAL' : 'EQUIPO DEL RECINTO'}
        title={title}
        subtitle="Se generará una clave inicial que la persona cambiará al ingresar por primera vez."
      />
      {error ? <StatusBanner tone="error" title="Cuenta no creada" detail={error} /> : null}
      {created ? (
        <>
          <SaveCelebrationCard
            tone="success"
            scene="account"
            eyebrow="CUENTA CREADA"
            title="Registro completado"
            detail="Entrega estos datos a la persona asignada para su primer ingreso."
          />
          <Card>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="font-electoral-bold text-lg text-brand-ink">Datos de primer ingreso</Text>
              <TricolorStripe width={36} height={4} />
            </View>
            <View className="gap-3 rounded-2xl border border-brand-line bg-brand-field p-4">
              <View>
                <Text className="font-electoral-bold text-xs text-brand-muted">Correo registrado</Text>
                <Text selectable className="font-electoral-bold mt-0.5 text-base text-brand-ink">{created.email}</Text>
              </View>
              <View>
                <Text className="font-electoral-bold text-xs text-brand-muted">Clave temporal</Text>
                <Text selectable className="font-electoral-bold mt-1 text-2xl tracking-widest text-brand-navy">{created.password}</Text>
              </View>
              <View>
                <Text className="font-electoral-bold text-xs text-brand-muted">Asignación</Text>
                <Text className="font-electoral-bold mt-0.5 text-sm text-brand-ink">{created.scope}</Text>
              </View>
            </View>
          </Card>
          <AppButton label="Registrar otra cuenta" variant="secondary" onPress={() => setCreated(undefined)} />
        </>
      ) : (
        <>
          {resultado && 'error' in resultado ? (
            <StatusBanner tone="error" title="Recintos no disponibles" detail={resultado.error} />
          ) : null}
          <Card>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="font-electoral-bold text-lg text-brand-ink">1. Datos personales</Text>
              <TricolorStripe width={32} height={4} />
            </View>
            <View className="gap-3.5">
              <Controller
                control={form.control}
                name="cedula"
                render={({ field }) => (
                  <AuthField
                    label="Número de cédula"
                    hint={`${field.value.length}/10 dígitos`}
                    icon={{ ios: 'creditcard', android: 'badge', web: 'badge' }}
                    error={form.formState.errors.cedula?.message}
                    keyboardType="number-pad"
                    maxLength={10}
                    placeholder="Ej. 1710034065"
                    value={field.value}
                    onChangeText={(text) => updateField(field.onChange, text.replace(/\D/g, '').slice(0, 10))}
                    editable={!form.formState.isSubmitting}
                    onBlur={field.onBlur}
                  />
                )}
              />

              <Controller
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <AuthField
                    label="Nombres completos"
                    icon={{ ios: 'person', android: 'person', web: 'person' }}
                    error={form.formState.errors.firstName?.message}
                    autoCapitalize="words"
                    autoCorrect={false}
                    maxLength={100}
                    placeholder="Ej. Camila Andrea"
                    value={field.value}
                    onChangeText={(text) => updateField(field.onChange, text)}
                    editable={!form.formState.isSubmitting}
                    onBlur={field.onBlur}
                  />
                )}
              />

              <Controller
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <AuthField
                    label="Apellidos completos"
                    icon={{ ios: 'person.text.rectangle', android: 'person', web: 'person' }}
                    error={form.formState.errors.lastName?.message}
                    autoCapitalize="words"
                    autoCorrect={false}
                    maxLength={100}
                    placeholder="Ej. Bueno Rivera"
                    value={field.value}
                    onChangeText={(text) => updateField(field.onChange, text)}
                    editable={!form.formState.isSubmitting}
                    onBlur={field.onBlur}
                  />
                )}
              />

              <Controller
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <AuthField
                    label="Teléfono"
                    icon={{ ios: 'phone', android: 'phone', web: 'phone' }}
                    error={form.formState.errors.phone?.message}
                    keyboardType="phone-pad"
                    placeholder="Ej. 0991234567"
                    value={field.value}
                    onChangeText={(text) => updateField(field.onChange, text)}
                    editable={!form.formState.isSubmitting}
                    onBlur={field.onBlur}
                  />
                )}
              />

              <Controller
                control={form.control}
                name="email"
                render={({ field }) => (
                  <AuthField
                    label="Correo electrónico"
                    icon={{ ios: 'envelope', android: 'mail', web: 'mail' }}
                    error={form.formState.errors.email?.message}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    placeholder="correo@organizacion.ec"
                    value={field.value}
                    onChangeText={(text) => updateField(field.onChange, text)}
                    editable={!form.formState.isSubmitting}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </View>
          </Card>

          <Card>
            <Text className="font-electoral-bold mb-1 text-lg text-brand-ink">
              {creatingCoordinator ? '2. Recinto electoral a cargo' : '2. Mesa electoral asignada'}
            </Text>
            <Text className="font-electoral mb-3 text-xs leading-5 text-brand-muted">
              {creatingCoordinator
                ? 'Selecciona el recinto que administrará esta persona.'
                : 'Selecciona la mesa que cubrirá este veedor.'}
            </Text>
            {!options.length && !('error' in (resultado ?? {})) ? (
              <StatusBanner tone="info" busy title="Cargando recintos y mesas…" />
            ) : null}
            <View className="gap-2">
              {options.map((option) => {
                const active = scopeId === option.id;
                const actual = historial?.find((item) => item.jrv_id === option.id && item.hasta === null);
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    disabled={form.formState.isSubmitting}
                    onPress={() => {
                      setError('');
                      setScopeId(option.id);
                    }}
                    className={`min-h-13 flex-row items-center gap-3 rounded-2xl border px-3.5 py-2.5 ${
                      active ? 'border-brand-navy bg-brand-navy' : 'border-brand-line bg-brand-field'
                    }`}>
                    <AppIcon
                      name={creatingCoordinator
                        ? { ios: 'building.columns', android: 'account_balance', web: 'account_balance' }
                        : { ios: 'tray.full', android: 'how_to_vote', web: 'how_to_vote' }}
                      size={18}
                      tintColor={active ? '#FFFFFF' : Colors.light.primary}
                    />
                    <Text className={`font-electoral-bold flex-1 text-sm ${active ? 'text-white' : 'text-brand-ink'}`}>
                      {option.label}{actual ? ` · Asignada a ${actual.veedor}` : ''}
                    </Text>
                    <View className={`h-5 w-5 items-center justify-center rounded-full ${active ? 'bg-brand-gold' : 'border border-brand-muted'}`}>
                      {active ? <Text className="font-electoral-bold text-xs text-brand-ink">✓</Text> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {responsable ? (
            <StatusBanner tone="warning" title="Reemplazo de veedor" detail={`El alta sustituirá a ${responsable.veedor} solo en la JRV seleccionada.`} />
          ) : null}
          {creatingCoordinator || historial ? <SubmitButton
            label={creatingCoordinator ? 'Registrar coordinador' : responsable ? 'Registrar y reemplazar' : 'Registrar veedor'}
            loadingLabel="Guardando registro…"
            loading={form.formState.isSubmitting}
            onPress={submit}
          /> : <AppButton label="Recargar asignaciones" variant="secondary" onPress={() => setRevisionHistorial((current) => current + 1)} />}
        </>
      )}
      <AppButton
        label="Volver al panel"
        variant="secondary"
        onPress={() => router.replace(creatingCoordinator ? '/provincial' : '/recinto')}
      />
    </AppPage>
  );
}
