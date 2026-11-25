// Guía: Presenta la lista de recintos y el formulario de registro territorial.

import { useState } from 'react';
import { Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';

import AuthField from '@/modules/authentication/presentation/components/AuthField';
import SubmitButton from '@/modules/authentication/presentation/components/SubmitButton';
import { MesasAutorizadas } from '@/modules/territorio/presentation/MesasAutorizadas';
import SaveCelebrationCard from '@/shared/presentation/SaveCelebrationCard';
import { AppButton, AppPage, Card, ScreenHeader, StatusBanner, TricolorStripe } from '@/shared/presentation/Ui';
import { recintos } from '../recintosProvider';

const schema = z.object({
  nombre: z.string().trim().min(2, 'Ingresa el nombre oficial del recinto.').max(150),
  parroquia: z.string().trim().min(2, 'Ingresa la parroquia del cantón.').max(100),
  numeroJrv: z.number().int().min(1, 'Debe existir al menos una JRV.').max(200, 'Máximo 200 JRV.'),
});

export default function RecintosScreen() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: '', parroquia: '', numeroJrv: 1 },
  });

  const submit = form.handleSubmit(async (values) => {
    setError('');
    setCreated(false);
    try {
      await recintos.crear(values);
      form.reset({ nombre: '', parroquia: '', numeroJrv: 1 });
      setCreated(true);
      setRefreshKey((current) => current + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo registrar el recinto.');
    }
  });

  return (
    <AppPage>
      <ScreenHeader
        eyebrow="ORGANIZACIÓN TERRITORIAL"
        title="Territorio electoral"
        subtitle="Administra los recintos y las mesas electorales de Pichincha · Cantón Rumiñahui."
      />
      {created ? (
        <SaveCelebrationCard
          tone="success"
          scene="record"
          eyebrow="PADRÓN ACTUALIZADO"
          title="Recinto y mesas registrados"
          detail="Las mesas consecutivas quedaron habilitadas y disponibles en el padrón electoral."
        />
      ) : null}
      {error ? <StatusBanner tone="error" title="No se completó el registro" detail={error} /> : null}
      <Card>
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="font-electoral-bold text-lg text-brand-ink">Agregar nuevo recinto electoral</Text>
          <TricolorStripe width={32} height={4} />
        </View>
        <Text className="font-electoral mb-4 text-xs leading-5 text-brand-muted">
          Se crearán automáticamente las Juntas Receptoras del Voto (JRV) numeradas desde la 1.
        </Text>
        <View className="gap-3.5">
          <Controller
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <AuthField
                label="Nombre del recinto electoral"
                icon={{ ios: 'building.columns', android: 'account_balance', web: 'account_balance' }}
                error={form.formState.errors.nombre?.message}
                autoCapitalize="words"
                maxLength={150}
                placeholder="Ej. Unidad Educativa Juan de Salinas"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
          <Controller
            control={form.control}
            name="parroquia"
            render={({ field }) => (
              <AuthField
                label="Parroquia (Cantón Rumiñahui)"
                icon={{ ios: 'map', android: 'map', web: 'map' }}
                error={form.formState.errors.parroquia?.message}
                autoCapitalize="words"
                maxLength={100}
                placeholder="Ej. Sangolquí / San Pedro de Taboada"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
          <Controller
            control={form.control}
            name="numeroJrv"
            render={({ field }) => (
              <AuthField
                label="Cantidad de JRV en el recinto"
                icon={{ ios: 'number.square', android: 'pin', web: 'pin' }}
                error={form.formState.errors.numeroJrv?.message}
                keyboardType="number-pad"
                value={String(field.value)}
                onChangeText={(text) => {
                  if (/^\d{0,3}$/.test(text)) field.onChange(Number(text));
                }}
              />
            )}
          />
          <SubmitButton
            label="Registrar recinto y generar JRV"
            loadingLabel="Guardando recinto…"
            loading={form.formState.isSubmitting}
            onPress={submit}
          />
        </View>
      </Card>
      <Text accessibilityRole="header" className="font-electoral-bold text-base text-brand-ink">
        Catálogo de recintos y JRV autorizados
      </Text>
      <MesasAutorizadas refreshKey={refreshKey} />
      <AppButton label="Volver al panel provincial" variant="secondary" onPress={() => router.replace('/provincial')} />
    </AppPage>
  );
}
