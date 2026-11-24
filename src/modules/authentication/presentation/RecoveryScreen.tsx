import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { AppButton, AppPage, Card, ScreenHeader, StatusBanner } from '@/shared/presentation/Ui';
import { Colors } from '@/constants/theme';
import { requestPasswordResetUseCase, restablecerClave } from './authUseCaseProvider';
import { useSessionStore } from './sessionStore';

const schema = z.object({ email: z.string().trim().email('Ingresa un correo válido') });
const resetSchema = z.object({
  code: z.string().trim().regex(/^\d{6,8}$/, 'Ingresa el código que recibiste.'),
  password: z.string().min(8, 'Usa al menos 8 caracteres.'),
  confirmation: z.string(),
}).refine((value) => value.password === value.confirmation, {
  path: ['confirmation'], message: 'Las contraseñas no coinciden.',
});

export default function RecoveryScreen() {
  const [emailSent, setEmailSent] = useState('');
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState('');
  const setUser = useSessionStore((state) => state.setUser);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: '' } });
  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { code: '', password: '', confirmation: '' },
  });

  const submit = form.handleSubmit(async ({ email }) => {
    setError('');
    try {
      if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) throw new Error('La recuperación requiere conexión y configuración de Supabase.');
      await requestPasswordResetUseCase(email);
      setEmailSent(email);
    } catch (value) {
      setError(value instanceof Error ? value.message : 'No se pudo enviar el correo de recuperación.');
    }
  });
  const complete = resetForm.handleSubmit(async ({ code, password }) => {
    setError('');
    try {
      await restablecerClave(emailSent, code, password);
      setUser(null);
      resetForm.reset();
      setCompleted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cambiar la contraseña.');
    }
  });

  return (
    <AppPage>
      <ScreenHeader eyebrow="Acceso" title={emailSent ? 'Restablecer contraseña' : 'Recuperar contraseña'} subtitle={emailSent ? 'Usa el código recibido en tu correo.' : 'Solicita un código en tu correo habilitado.'} />
      {completed ? <StatusBanner tone="success" title="Contraseña actualizada" detail="Ya puedes iniciar sesión con tu nueva clave." /> : null}
      {error ? <StatusBanner tone="error" title="No se pudo completar la recuperación" detail={error} /> : null}
      {!emailSent ? <Card>
        <Text className="mb-2 text-sm font-bold text-brand-ink">Correo electrónico</Text>
        <Controller control={form.control} name="email" render={({ field }) => (
          <TextInput value={field.value} onChangeText={field.onChange} style={styles.input} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="nombre@organizacion.ec" />
        )} />
        {form.formState.errors.email ? <Text accessibilityRole="alert" className="mt-1 text-xs font-semibold text-brand-danger">{form.formState.errors.email.message}</Text> : null}
        <View style={{ height: 16 }} />
        <AppButton label="Enviar código" onPress={submit} loading={form.formState.isSubmitting} />
      </Card> : !completed ? <Card>
        {([
          ['code', 'Código de recuperación'], ['password', 'Nueva contraseña'], ['confirmation', 'Confirmar contraseña'],
        ] as const).map(([name, label]) => (
          <View key={name} className="mb-3">
            <Text className="mb-2 text-sm font-bold text-brand-ink">{label}</Text>
            <Controller control={resetForm.control} name={name} render={({ field }) => (
              <TextInput
                accessibilityLabel={label}
                style={styles.input}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                keyboardType={name === 'code' ? 'number-pad' : 'default'}
                secureTextEntry={name !== 'code'}
              />
            )} />
            {resetForm.formState.errors[name] ? <Text accessibilityRole="alert" className="mt-1 text-sm text-brand-danger">{resetForm.formState.errors[name]?.message}</Text> : null}
          </View>
        ))}
        <AppButton label="Guardar nueva contraseña" onPress={complete} loading={resetForm.formState.isSubmitting} />
        <View className="mt-2"><AppButton label="Solicitar otro código" variant="secondary" disabled={resetForm.formState.isSubmitting} onPress={() => {
          resetForm.reset();
          setError('');
          setEmailSent('');
        }} /></View>
      </Card> : null}
      <AppButton label="Volver al inicio de sesión" variant="secondary" onPress={() => router.replace('/login')} />
    </AppPage>
  );
}

const colors = Colors.light;
const styles = StyleSheet.create({
  input: { height: 54, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: '#FFFFFF', paddingHorizontal: 15, color: colors.text, fontSize: 16 },
});
