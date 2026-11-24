import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { AppButton, AppPage, Card, ScreenHeader, StatusBanner } from '@/shared/presentation/Ui';
import { Colors } from '@/constants/theme';
import { flujoPrimerAcceso } from './authUseCaseProvider';
import { useSessionStore } from './sessionStore';

const schema = z.object({
  otp: z.string().trim().regex(/^\d{6,8}$/, 'Ingresa el código de tu correo'),
  password: z.string().min(8, 'Usa al menos 8 caracteres'),
  confirm: z.string(),
}).refine((value) => value.password === value.confirm, { message: 'Las contraseñas no coinciden', path: ['confirm'] });

export default function FirstAccessScreen() {
  const user = useSessionStore((state) => state.user);
  const setUser = useSessionStore((state) => state.setUser);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [visibleFields, setVisibleFields] = useState({ password: false, confirm: false });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { otp: '', password: '', confirm: '' } });

  async function sendCode() {
    if (user?.status !== 'PENDING') return;
    setError('');
    setSending(true);
    try {
      await flujoPrimerAcceso.enviar(user.email);
      setCodeSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo enviar el código.');
    } finally {
      setSending(false);
    }
  }

  const submit = form.handleSubmit(async ({ otp, password }) => {
    setError('');
    if (user?.status !== 'PENDING') {
      setError('Inicia sesión nuevamente antes de cambiar la contraseña.');
      return;
    }
    try {
      await flujoPrimerAcceso.completar(user.id, user.email, otp, password);
      setUser({ ...user, status: 'ACTIVE' });
      setSaved(true);
    } catch (value) {
      setError(value instanceof Error ? value.message : 'No se pudo cambiar la contraseña.');
    }
  });

  return (
    <AppPage>
      <ScreenHeader eyebrow="PRIMER ACCESO" title="Verifica tu cuenta" subtitle="Confirma el código de tu correo y reemplaza tu clave temporal." />
      {saved ? <StatusBanner tone="success" title="Contraseña actualizada" detail="Tu cuenta ya está preparada para continuar." /> : null}
      {error ? <StatusBanner tone="error" title="Cambio no completado" detail={error} /> : null}
      {!saved ? <Card>
        <AppButton label={codeSent ? 'Reenviar código' : 'Enviar código al correo'} variant="secondary" onPress={sendCode} loading={sending} disabled={user?.status !== 'PENDING' || form.formState.isSubmitting} />
        {codeSent ? <View className="my-3">
          <Text className="mb-2 text-sm font-bold text-brand-ink">Código de verificación</Text>
          <Controller control={form.control} name="otp" render={({ field }) => (
            <TextInput accessibilityLabel="Código de verificación" keyboardType="number-pad" textContentType="oneTimeCode" style={styles.passwordBox} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />
          )} />
          {form.formState.errors.otp ? <Text accessibilityRole="alert" className="text-sm text-brand-danger">{form.formState.errors.otp.message}</Text> : null}
        </View> : null}
        {(['password', 'confirm'] as const).map((name) => (
          <View key={name} className="mb-4">
            <Text className="mb-2 text-sm font-bold text-brand-ink">{name === 'password' ? 'Nueva contraseña' : 'Confirmar contraseña'}</Text>
            <View style={styles.passwordBox}>
            <Controller control={form.control} name={name} render={({ field }) => (
              <TextInput
                accessibilityLabel={name === 'password' ? 'Nueva contraseña' : 'Confirmar contraseña'}
                autoComplete="new-password"
                value={field.value}
                onChangeText={field.onChange}
                style={styles.input}
                secureTextEntry={!visibleFields[name]}
              />
            )} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={visibleFields[name] ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              hitSlop={8}
              onPress={() => setVisibleFields((current) => ({ ...current, [name]: !current[name] }))}
              className="px-2 py-3">
              <Text className="text-xs font-bold text-brand-navy">{visibleFields[name] ? 'Ocultar' : 'Ver'}</Text>
            </Pressable>
            </View>
            {form.formState.errors[name] ? <Text accessibilityRole="alert" className="mt-1 text-xs font-semibold text-brand-danger">{form.formState.errors[name]?.message}</Text> : null}
          </View>
        ))}
        <AppButton label="Verificar y guardar contraseña" onPress={submit} loading={form.formState.isSubmitting} disabled={!codeSent || sending} />
      </Card> : <AppButton label="Continuar" onPress={() => router.replace('/')} />}
    </AppPage>
  );
}

const colors = Colors.light;
const styles = StyleSheet.create({
  passwordBox: { minHeight: 54, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: '#FFFFFF', paddingLeft: 15, paddingRight: 8 },
  input: { flex: 1, height: 52, color: colors.text, fontSize: 16 },
});
