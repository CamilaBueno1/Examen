import { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { useMesasAutorizadas } from '@/modules/territorio/presentation/MesasAutorizadas';
import type { MesaAutorizada } from '@/modules/territorio/domain/usecases/consultarMesas';
import { AppButton, AppPage, Card, ScreenHeader, StatusBanner } from '@/shared/presentation/Ui';
import { cedulaEcuatorianaValida } from '../domain/usecases/registerUser';
import { registrarUsuario } from './authUseCaseProvider';

const schema = z.object({
  cedula: z.string().refine(cedulaEcuatorianaValida, 'Ingresa una cédula ecuatoriana válida.'),
  firstName: z.string().trim().min(2, 'Ingresa los nombres.').max(100),
  lastName: z.string().trim().min(2, 'Ingresa los apellidos.').max(100),
  phone: z.string().trim().regex(/^\+?[0-9 -]{7,20}$/, 'Revisa el teléfono.'),
  email: z.string().trim().email('Revisa el correo electrónico.'),
});

type RoleToCreate = 'coordinator' | 'veedor';

export default function CreateUserScreen({ role }: { role: RoleToCreate }) {
  const { resultado } = useMesasAutorizadas();
  const [scopeId, setScopeId] = useState('');
  const [error, setError] = useState('');
  const [created, setCreated] = useState<{ email: string; password: string; scope: string }>();
  const mesas = useMemo(() => resultado && 'mesas' in resultado ? resultado.mesas : [], [resultado]);
  const options = useMemo(() => {
    if (role === 'veedor') {
      return mesas.map((mesa) => ({ id: mesa.id, label: `${mesa.recinto} · JRV ${mesa.numero}` }));
    }
    const recintos = new Map<string, MesaAutorizada>();
    for (const mesa of mesas) if (!recintos.has(mesa.recintoId)) recintos.set(mesa.recintoId, mesa);
    return [...recintos.values()].map((mesa) => ({ id: mesa.recintoId, label: mesa.recinto }));
  }, [mesas, role]);
  const selectedScope = options.find((option) => option.id === scopeId);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { cedula: '', firstName: '', lastName: '', phone: '', email: '' },
  });
  const creatingCoordinator = role === 'coordinator';
  const title = creatingCoordinator ? 'Crear coordinador' : 'Crear veedor';

  const submit = form.handleSubmit(async (values) => {
    setError('');
    if (!selectedScope) {
      setError(creatingCoordinator ? 'Selecciona el recinto que tendrá a cargo.' : 'Selecciona la JRV que cubrirá.');
      return;
    }
    try {
      const registration = await registrarUsuario.execute({
        ...values,
        role,
        jurisdictionId: selectedScope.id,
      });
      setCreated({
        email: values.email.trim().toLowerCase(),
        password: registration.temporaryPassword,
        scope: selectedScope.label,
      });
      form.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la cuenta.');
    }
  });

  return (
    <AppPage>
      <ScreenHeader
        eyebrow={creatingCoordinator ? 'EQUIPO PROVINCIAL' : 'EQUIPO DEL RECINTO'}
        title={title}
        subtitle="La cuenta queda pendiente hasta que su titular verifique el correo y cambie la clave temporal."
      />
      {error ? <StatusBanner tone="error" title="Cuenta no creada" detail={error} /> : null}
      {created ? (
        <>
          <StatusBanner tone="success" title="Cuenta creada" detail="Entrega estos datos al titular para completar su primer acceso." />
          <Card>
            <Text className="mb-3 text-lg font-bold text-brand-ink">Credenciales temporales</Text>
            <Text className="mb-1 text-sm text-brand-muted">Correo</Text>
            <Text selectable className="mb-3 text-base font-bold text-brand-ink">{created.email}</Text>
            <Text className="mb-1 text-sm text-brand-muted">Clave temporal</Text>
            <Text selectable className="mb-3 text-xl font-black tracking-widest text-brand-navy">{created.password}</Text>
            <Text className="text-sm text-brand-muted">Asignación inicial: {created.scope}</Text>
          </Card>
          <AppButton label="Crear otra cuenta" variant="secondary" onPress={() => setCreated(undefined)} />
        </>
      ) : (
        <>
          {resultado && 'error' in resultado ? <StatusBanner tone="error" title="Territorio no disponible" detail={resultado.error} /> : null}
          <Card>
            <Text className="mb-3 text-lg font-bold text-brand-ink">Datos del titular</Text>
            {([
              { name: 'cedula', label: 'Cédula', keyboardType: 'number-pad' as const, autoCapitalize: 'none' as const },
              { name: 'firstName', label: 'Nombres completos', keyboardType: 'default' as const, autoCapitalize: 'words' as const },
              { name: 'lastName', label: 'Apellidos completos', keyboardType: 'default' as const, autoCapitalize: 'words' as const },
              { name: 'phone', label: 'Teléfono', keyboardType: 'phone-pad' as const, autoCapitalize: 'none' as const },
              { name: 'email', label: 'Correo electrónico', keyboardType: 'email-address' as const, autoCapitalize: 'none' as const },
            ] as const).map(({ name, label, keyboardType, autoCapitalize }) => (
              <View key={name} className="mb-3">
                <Text className="mb-1 text-sm font-bold text-brand-ink">{label}</Text>
                <Controller control={form.control} name={name} render={({ field }) => (
                  <TextInput
                    accessibilityLabel={label}
                    autoCapitalize={autoCapitalize}
                    autoCorrect={false}
                    keyboardType={keyboardType}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    className="min-h-14 rounded-2xl border border-brand-line bg-brand-paper px-4 text-brand-ink"
                  />
                )} />
                {form.formState.errors[name] ? <Text accessibilityRole="alert" className="mt-1 text-sm text-brand-danger">{form.formState.errors[name]?.message}</Text> : null}
              </View>
            ))}
          </Card>
          <Card>
            <Text className="mb-1 text-lg font-bold text-brand-ink">{creatingCoordinator ? 'Recinto asignado' : 'JRV asignada'}</Text>
            <Text className="mb-3 text-sm text-brand-muted">
              {creatingCoordinator
                ? 'La asignación se registra junto con la cuenta.'
                : 'La asignación se registra junto con la cuenta. Si la JRV ya tiene veedor, se conserva su historial y se asigna el nuevo titular.'}
            </Text>
            {!options.length && !('error' in (resultado ?? {})) ? <StatusBanner tone="info" busy title="Cargando territorio autorizado" /> : null}
            {options.map((option) => (
              <View key={option.id} className="mb-2">
                <AppButton
                  label={option.label}
                  variant={scopeId === option.id ? 'primary' : 'secondary'}
                  onPress={() => setScopeId(option.id)}
                />
              </View>
            ))}
          </Card>
          <AppButton label="Crear cuenta y asignar" onPress={submit} loading={form.formState.isSubmitting} disabled={!options.length} />
        </>
      )}
      <AppButton
        label="Volver"
        variant="secondary"
        onPress={() => router.replace(creatingCoordinator ? '/provincial' : '/recinto')}
      />
    </AppPage>
  );
}
