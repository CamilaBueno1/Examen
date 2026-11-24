import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';

import { MesasAutorizadas } from '@/modules/territorio/presentation/MesasAutorizadas';
import { recintos } from '../recintosProvider';

import { AppButton, AppPage, Card, ScreenHeader, StatusBanner } from '@/shared/presentation/Ui';

const schema = z.object({
  nombre: z.string().trim().min(2, 'Ingresa el nombre del recinto.').max(150),
  parroquia: z.string().trim().min(2, 'Ingresa la parroquia.').max(100),
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
        eyebrow="GESTIÓN TERRITORIAL"
        title="Territorio electoral"
        subtitle="Administra los recintos y las JRV de Pichincha · Rumiñahui."
      />
      {created ? <StatusBanner tone="success" title="Recinto creado" detail="Las JRV quedaron registradas y el catálogo se actualizó." /> : null}
      {error ? <StatusBanner tone="error" title="No se completó el registro" detail={error} /> : null}
      <Card>
        <Text className="mb-1 text-lg font-bold text-brand-ink">Agregar recinto</Text>
        <Text className="mb-4 text-sm leading-5 text-brand-muted">Se crearán las JRV consecutivas desde la número 1.</Text>
        {([
          { name: 'nombre', label: 'Nombre del recinto', placeholder: 'Ej. Unidad Educativa' },
          { name: 'parroquia', label: 'Parroquia', placeholder: 'Ej. Sangolquí' },
        ] as const).map(({ name, label, placeholder }) => (
          <View key={name} className="mb-3">
            <Text className="mb-1 text-sm font-bold text-brand-ink">{label}</Text>
            <Controller control={form.control} name={name} render={({ field }) => (
              <TextInput
                accessibilityLabel={label}
                autoCapitalize="words"
                maxLength={name === 'nombre' ? 150 : 100}
                placeholder={placeholder}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                className="min-h-14 rounded-2xl border border-brand-line bg-brand-paper px-4 text-brand-ink"
              />
            )} />
            {form.formState.errors[name] ? <Text accessibilityRole="alert" className="mt-1 text-sm text-brand-danger">{form.formState.errors[name]?.message}</Text> : null}
          </View>
        ))}
        <Text className="mb-1 text-sm font-bold text-brand-ink">Cantidad de JRV</Text>
        <Controller control={form.control} name="numeroJrv" render={({ field }) => (
          <TextInput
            accessibilityLabel="Cantidad de JRV"
            keyboardType="number-pad"
            value={String(field.value)}
            onChangeText={(text) => { if (/^\d{0,3}$/.test(text)) field.onChange(Number(text)); }}
            className="min-h-14 rounded-2xl border border-brand-line bg-brand-paper px-4 text-brand-ink"
          />
        )} />
        {form.formState.errors.numeroJrv ? <Text accessibilityRole="alert" className="mt-1 text-sm text-brand-danger">{form.formState.errors.numeroJrv.message}</Text> : null}
        <View className="mt-4">
          <AppButton label="Guardar recinto" onPress={submit} loading={form.formState.isSubmitting} />
        </View>
      </Card>
      <Text accessibilityRole="header" className="text-lg font-bold text-brand-ink">Recintos y mesas asignados</Text>
      <MesasAutorizadas refreshKey={refreshKey} />
      <AppButton label="Volver al panel" variant="secondary" onPress={() => router.replace('/provincial')} />
    </AppPage>
  );
}
