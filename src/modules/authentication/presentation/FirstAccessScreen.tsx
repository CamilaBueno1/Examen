// Guía: Guía la verificación por correo y el primer cambio de contraseña.

import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import AppIcon from '@/shared/presentation/AppIcon';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { AppButton, StatusBanner, TricolorStripe } from '@/shared/presentation/Ui';
import ContourLines from '@/shared/presentation/ContourLines';
import ElectionMotion from '@/shared/presentation/ElectionMotion';
import { Colors } from '@/constants/theme';
import { evaluarSeguridadClave } from '../domain/usecases/passwordSecurity';
import { flujoPrimerAcceso } from './authUseCaseProvider';
import { useSessionStore } from './sessionStore';
import AuthField from './components/AuthField';
import SignOutButton from './SignOutButton';
import PasswordStrengthMeter from './components/PasswordStrengthMeter';
import SubmitButton from './components/SubmitButton';

const schema = z
  .object({
    otp: z.string().trim().regex(/^\d{6,8}$/, 'Ingresa el código de 6 a 8 dígitos enviado a tu correo'),
    password: z
      .string()
      .refine(
        (val) => evaluarSeguridadClave(val).esSegura,
        'Elige una contraseña segura (mínimo 8 caracteres, mayúsculas, minúsculas y números)',
      ),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  });

export default function FirstAccessScreen() {
  const user = useSessionStore((state) => state.user);
  const setUser = useSessionStore((state) => state.setUser);
  const [error, setError] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [visibleFields, setVisibleFields] = useState({ password: false, confirm: false });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { otp: '', password: '', confirm: '' },
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
  });

  const passwordActual = useWatch({ control: form.control, name: 'password', defaultValue: '' });

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
      router.replace('/');
    } catch (value) {
      setError(value instanceof Error ? value.message : 'No se pudo cambiar la contraseña.');
    }
  });

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ContourLines />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.shell}>
            {user?.status === 'PENDING' && (
              <SignOutButton label="Volver al inicio de sesión" disabled={sending || form.formState.isSubmitting} />
            )}
            <Animated.View entering={FadeIn.duration(320)} className="items-center">
              <ElectionMotion scene="welcome" width={168} height={140} loop={sending || form.formState.isSubmitting} />
              <Text accessibilityRole="header" className="font-electoral-bold mt-1 text-center text-3xl text-brand-ink">
                Activa tu cuenta
              </Text>
              <View className="my-2.5">
                <TricolorStripe width={96} height={4.5} />
              </View>
              <Text className="font-electoral text-center text-sm text-brand-muted">
                {user?.email ? `Correo: ${user.email}` : 'Verifica el código de tu correo y crea una contraseña segura.'}
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(140).springify().damping(16)} style={styles.card}>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View className={`h-7 w-7 items-center justify-center rounded-full ${codeSent ? 'bg-brand-success' : 'bg-brand-navy'}`}>
                    <Text className="font-electoral-bold text-xs text-white">{codeSent ? '✓' : '1'}</Text>
                  </View>
                  <Text className="font-electoral-bold text-sm text-brand-ink">Código y contraseña personal</Text>
                </View>
              </View>

              {sending ? (
                <StatusBanner tone="info" election="account" busy title="Enviando el código a tu correo" detail="Revisa tu bandeja de entrada." />
              ) : null}
              {form.formState.isSubmitting ? (
                <StatusBanner tone="info" election="account" busy title="Verificando código y activando cuenta" />
              ) : null}
              {error ? <StatusBanner tone="error" title="Cambio no completado" detail={error} /> : null}

              <AppButton
                label={codeSent ? 'Reenviar código al correo' : 'Enviar código a mi correo'}
                variant={codeSent ? 'secondary' : 'primary'}
                onPress={sendCode}
                loading={sending}
                disabled={user?.status !== 'PENDING' || form.formState.isSubmitting}
              />

              {codeSent ? (
                <Controller
                  control={form.control}
                  name="otp"
                  render={({ field }) => (
                    <AuthField
                      label="Código recibido en tu correo"
                      icon={{ ios: 'number.circle', android: 'pin', web: 'pin' }}
                      error={form.formState.errors.otp?.message}
                      keyboardType="number-pad"
                      maxLength={8}
                      textContentType="oneTimeCode"
                      placeholder="Ej. 123456"
                      value={field.value}
                      onChangeText={(t) => field.onChange(t.replace(/\D/g, '').slice(0, 8))}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              ) : null}

              <Controller
                control={form.control}
                name="password"
                render={({ field }) => (
                  <AuthField
                    label="Nueva contraseña personal"
                    icon={{ ios: 'lock.rotation', android: 'lock', web: 'lock' }}
                    error={form.formState.errors.password?.message}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    placeholder="Crea una contraseña segura"
                    secureTextEntry={!visibleFields.password}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    trailing={
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={visibleFields.password ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        hitSlop={8}
                        onPress={() => setVisibleFields((c) => ({ ...c, password: !c.password }))}
                        style={styles.eyeButton}>
                        <AppIcon
                          name={
                            visibleFields.password
                              ? { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' }
                              : { ios: 'eye', android: 'visibility', web: 'visibility' }
                          }
                          size={20}
                          tintColor="#4E6370"
                        />
                      </Pressable>
                    }
                  />
                )}
              />

              <PasswordStrengthMeter password={passwordActual} />

              <Controller
                control={form.control}
                name="confirm"
                render={({ field }) => (
                  <AuthField
                    label="Confirmar nueva contraseña"
                    icon={{ ios: 'lock.shield', android: 'verified_user', web: 'verified_user' }}
                    error={form.formState.errors.confirm?.message}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    placeholder="Repite la nueva contraseña"
                    secureTextEntry={!visibleFields.confirm}
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    trailing={
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={visibleFields.confirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        hitSlop={8}
                        onPress={() => setVisibleFields((c) => ({ ...c, confirm: !c.confirm }))}
                        style={styles.eyeButton}>
                        <AppIcon
                          name={
                            visibleFields.confirm
                              ? { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' }
                              : { ios: 'eye', android: 'visibility', web: 'visibility' }
                          }
                          size={20}
                          tintColor="#4E6370"
                        />
                      </Pressable>
                    }
                  />
                )}
              />

              <SubmitButton
                label="Verificar y activar cuenta"
                loadingLabel="Activando cuenta…"
                loading={form.formState.isSubmitting}
                onPress={() => {
                  if (!codeSent || sending) {
                    setError('Primero presiona «Enviar código a mi correo».');
                    return;
                  }
                  void submit();
                }}
              />
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const colors = Colors.light;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F8FA' },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 },
  shell: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 16 },
  card: {
    gap: 14,
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  eyeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
