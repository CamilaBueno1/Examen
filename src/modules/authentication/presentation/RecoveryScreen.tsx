// Guía: Permite solicitar un código y establecer una nueva contraseña.

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
import { requestPasswordResetUseCase, restablecerClave } from './authUseCaseProvider';
import { useSessionStore } from './sessionStore';
import AuthField from './components/AuthField';
import PasswordStrengthMeter from './components/PasswordStrengthMeter';
import SubmitButton from './components/SubmitButton';

const schema = z.object({ email: z.string().trim().email('Ingresa un correo electrónico válido') });
const resetSchema = z
  .object({
    code: z.string().trim().regex(/^\d{6,8}$/, 'Ingresa el código de 6 a 8 dígitos recibido en tu correo.'),
    password: z
      .string()
      .refine(
        (val) => evaluarSeguridadClave(val).esSegura,
        'Elige una contraseña segura (mínimo 8 caracteres, mayúsculas, minúsculas y números).',
      ),
    confirmation: z.string(),
  })
  .refine((value) => value.password === value.confirmation, {
    path: ['confirmation'],
    message: 'Las contraseñas no coinciden.',
  });

export default function RecoveryScreen() {
  const [emailSent, setEmailSent] = useState('');
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState('');
  const [visiblePassword, setVisiblePassword] = useState(false);
  const setUser = useSessionStore((state) => state.setUser);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
    reValidateMode: 'onBlur',
  });
  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { code: '', password: '', confirmation: '' },
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
  });

  const nuevaClave = useWatch({ control: resetForm.control, name: 'password', defaultValue: '' });

  const submit = form.handleSubmit(async ({ email }) => {
    setError('');
    try {
      if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error('La recuperación de cuenta requiere conexión al servicio.');
      }
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
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ContourLines />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.shell}>
            <Animated.View entering={FadeIn.duration(320)} className="items-center">
              <ElectionMotion
                scene="welcome"
                width={168}
                height={140}
                loop={form.formState.isSubmitting || resetForm.formState.isSubmitting}
              />
              <Text accessibilityRole="header" className="font-electoral-bold mt-1 text-center text-3xl text-brand-ink">
                {emailSent ? 'Restablecer contraseña' : 'Recuperar contraseña'}
              </Text>
              <View className="my-2.5">
                <TricolorStripe width={96} height={4.5} />
              </View>
              <Text className="font-electoral text-center text-sm text-brand-muted">
                {emailSent
                  ? `Enviamos un código de verificación a ${emailSent}`
                  : 'Ingresa tu correo registrado para recibir un código de verificación.'}
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(140).springify().damping(16)} style={styles.card}>
              {completed ? (
                <StatusBanner
                  tone="success"
                  election="account"
                  title="Contraseña actualizada con éxito"
                  detail="Ya puedes iniciar sesión con tu nueva clave personal."
                />
              ) : null}
              {form.formState.isSubmitting ? (
                <StatusBanner tone="info" election="account" busy title="Enviando el código de recuperación" />
              ) : null}
              {resetForm.formState.isSubmitting ? (
                <StatusBanner tone="info" election="account" busy title="Verificando código y guardando contraseña" />
              ) : null}
              {error ? (
                <StatusBanner tone="error" title="No se pudo completar la recuperación" detail={error} />
              ) : null}

              {!emailSent ? (
                <>
                  <Controller
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <AuthField
                        label="Correo electrónico registrado"
                        icon={{ ios: 'envelope', android: 'mail', web: 'mail' }}
                        error={form.formState.errors.email?.message}
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        autoCapitalize="none"
                        autoComplete="email"
                        keyboardType="email-address"
                        placeholder="correo@organizacion.ec"
                      />
                    )}
                  />
                  <SubmitButton
                    label="Enviar código de recuperación"
                    loadingLabel="Enviando código…"
                    loading={form.formState.isSubmitting}
                    onPress={submit}
                  />
                </>
              ) : !completed ? (
                <>
                  <Controller
                    control={resetForm.control}
                    name="code"
                    render={({ field }) => (
                      <AuthField
                        label="Código de recuperación"
                        icon={{ ios: 'number.circle', android: 'pin', web: 'pin' }}
                        error={resetForm.formState.errors.code?.message}
                        value={field.value}
                        onChangeText={(t) => field.onChange(t.replace(/\D/g, '').slice(0, 8))}
                        onBlur={field.onBlur}
                        keyboardType="number-pad"
                        maxLength={8}
                        placeholder="6 a 8 dígitos"
                      />
                    )}
                  />
                  <Controller
                    control={resetForm.control}
                    name="password"
                    render={({ field }) => (
                      <AuthField
                        label="Nueva contraseña"
                        icon={{ ios: 'lock', android: 'lock', web: 'lock' }}
                        error={resetForm.formState.errors.password?.message}
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        autoCapitalize="none"
                        secureTextEntry={!visiblePassword}
                        placeholder="Crea una contraseña segura"
                        trailing={
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={visiblePassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            hitSlop={8}
                            onPress={() => setVisiblePassword((v) => !v)}
                            style={styles.eyeButton}>
                            <AppIcon
                              name={
                                visiblePassword
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

                  <PasswordStrengthMeter password={nuevaClave} />

                  <Controller
                    control={resetForm.control}
                    name="confirmation"
                    render={({ field }) => (
                      <AuthField
                        label="Confirmar contraseña"
                        icon={{ ios: 'lock.shield', android: 'verified_user', web: 'verified_user' }}
                        error={resetForm.formState.errors.confirmation?.message}
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        autoCapitalize="none"
                        secureTextEntry={!visiblePassword}
                        placeholder="Repite tu nueva contraseña"
                      />
                    )}
                  />
                  <SubmitButton
                    label="Guardar nueva contraseña"
                    loadingLabel="Actualizando contraseña…"
                    loading={resetForm.formState.isSubmitting}
                    onPress={complete}
                  />
                  <AppButton
                    label="Solicitar otro código"
                    variant="secondary"
                    disabled={resetForm.formState.isSubmitting}
                    onPress={() => {
                      resetForm.reset();
                      setError('');
                      setEmailSent('');
                    }}
                  />
                </>
              ) : null}

              <AppButton label="Volver al inicio de sesión" variant="secondary" onPress={() => router.replace('/login')} />
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
