import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { AppButton, Card, StatusBanner } from '@/shared/presentation/Ui';
import { Colors } from '@/constants/theme';
import { loginUseCase } from './authUseCaseProvider';
import { useSessionStore } from './sessionStore';

const schema = z.object({
  email: z.string().trim().email('Revisa el formato del correo electrónico'),
  password: z.string().min(6, 'Ingresa una contraseña de al menos 6 caracteres'),
});

type FormValues = z.infer<typeof schema>;

function VisibilityGlyph({ hidden }: { hidden: boolean }) {
  return (
    <View accessible={false} style={styles.eyeFrame}>
      <View style={styles.eyeShape}>
        <View style={styles.eyePupil} />
      </View>
      {hidden ? <View style={styles.eyeSlash} /> : null}
    </View>
  );
}

export default function LoginScreen() {
  const [operation, setOperation] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const setUser = useSessionStore((state) => state.setUser);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
  });

  const submit = form.handleSubmit(async (values) => {
    setOperation('loading');
    setMessage('');
    try {
      if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error('Falta configurar la conexión con Supabase. No se enviaron tus credenciales.');
      }
      const user = await loginUseCase(values.email.trim(), values.password);
      setUser(user);
      if (user.status === 'PENDING') router.replace('/first-access');
      else if (user.role === 'provincial') router.replace('/provincial');
      else if (user.role === 'coordinator') router.replace('/recinto');
      else router.replace('/veedor');
    } catch (error) {
      setOperation('error');
      setMessage(error instanceof Error ? error.message : 'No se pudo completar el inicio de sesión.');
    }
  });

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          className="flex-1 bg-brand-paper"
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <View style={styles.shell}>
            <View className="overflow-hidden rounded-3xl bg-brand-navy px-6 py-6">
              <View style={styles.brandRow}>
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-gold">
                  <Text className="text-sm font-black text-brand-navy">CE</Text>
                </View>
                <View>
                  <Text className="text-xs font-extrabold tracking-widest text-white">CONTROL ELECTORAL</Text>
                  <Text className="mt-1 text-xs text-white/75">Organización política · EPN</Text>
                </View>
              </View>
              <Text className="mt-6 text-3xl font-extrabold leading-9 text-white">
                Tu jornada,{'\n'}clara y segura.
              </Text>
              <Text className="mt-2 text-sm leading-5 text-white/80">
                Ingresa con las credenciales que te entregó tu coordinador.
              </Text>
              <View className="absolute -bottom-8 -right-7 h-24 w-24 rounded-full border-[10px] border-white/10" />
            </View>

            <Animated.View entering={FadeInDown.duration(350)}>
              <Card>
                <View style={styles.formHeading}>
                  <Text className="text-xl font-extrabold text-brand-ink">Iniciar sesión</Text>
                  <Text className="mt-1 text-sm leading-5 text-brand-muted">
                    Tu cuenta y tus permisos dependen del rol asignado.
                  </Text>
                </View>

                {operation === 'error' ? (
                  <View style={{ marginBottom: 16 }}>
                    <StatusBanner tone="error" title="No se pudo iniciar sesión" detail={message} />
                  </View>
                ) : null}

                <Text className="mb-2 mt-1 text-sm font-bold text-brand-ink">Correo electrónico</Text>
                <Controller
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <TextInput
                      accessibilityLabel="Correo electrónico"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                      keyboardType="email-address"
                      onBlur={field.onBlur}
                      onChangeText={field.onChange}
                      placeholder="nombre@organizacion.ec"
                      placeholderTextColor={colors.textSecondary}
                      returnKeyType="next"
                      textContentType="emailAddress"
                      value={field.value}
                      style={styles.input}
                    />
                  )}
                />
                {form.formState.errors.email ? (
                  <Text accessibilityRole="alert" className="mt-1 text-xs font-semibold text-brand-danger">
                    {form.formState.errors.email.message}
                  </Text>
                ) : null}

                <View style={styles.passwordLabelRow}>
                  <Text className="text-sm font-bold text-brand-ink">Contraseña</Text>
                  <Pressable
                    accessibilityRole="link"
                    hitSlop={8}
                    onPress={() => router.push('/recover')}>
                    <Text className="text-xs font-bold text-brand-navy">¿La olvidaste?</Text>
                  </Pressable>
                </View>
                <View style={styles.passwordBox}>
                  <Controller
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <TextInput
                        accessibilityLabel="Contraseña"
                        autoCapitalize="none"
                        autoComplete="password"
                        onBlur={field.onBlur}
                        onChangeText={field.onChange}
                        onSubmitEditing={() => {
                          void submit();
                        }}
                        placeholder="Ingresa tu contraseña"
                        placeholderTextColor={colors.textSecondary}
                        returnKeyType="go"
                        secureTextEntry={!passwordVisible}
                        textContentType="password"
                        value={field.value}
                        style={styles.passwordInput}
                      />
                    )}
                  />
                  <Pressable
                    accessibilityLabel={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    accessibilityRole="button"
                    accessibilityState={{ selected: passwordVisible }}
                    hitSlop={10}
                    onPress={() => setPasswordVisible((visible) => !visible)}
                    style={styles.visibilityButton}>
                    <VisibilityGlyph hidden={!passwordVisible} />
                    <Text className="ml-1 text-xs font-bold text-brand-navy">
                      {passwordVisible ? 'Ocultar' : 'Ver'}
                    </Text>
                  </Pressable>
                </View>
                {form.formState.errors.password ? (
                  <Text accessibilityRole="alert" className="mt-1 text-xs font-semibold text-brand-danger">
                    {form.formState.errors.password.message}
                  </Text>
                ) : null}

                <View style={{ marginTop: 22 }}>
                  <AppButton
                    label="Ingresar"
                    loading={operation === 'loading'}
                    onPress={submit}
                    disabled={operation === 'loading'}
                  />
                </View>
                {operation === 'loading' ? (
                  <View style={{ marginTop: 12 }}>
                    <StatusBanner
                      tone="info"
                      busy
                      title="Validando acceso"
                      detail="Conectando con el servicio de autenticación."
                    />
                  </View>
                ) : null}
              </Card>
            </Animated.View>

            <View style={styles.footer}>
              <View className="h-2 w-2 rounded-full bg-brand-gold" />
              <Text className="text-center text-xs leading-5 text-brand-muted">
                Acceso privado para personal habilitado.{'\n'}Si no puedes ingresar, contacta a tu coordinador.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const colors = Colors.light;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  shell: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: 16 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  formHeading: { marginBottom: 20 },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    color: colors.text,
    fontSize: 16,
  },
  passwordLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 8 },
  passwordBox: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingLeft: 15,
    paddingRight: 10,
  },
  passwordInput: { flex: 1, height: 52, color: colors.text, fontSize: 16 },
  visibilityButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  eyeFrame: { width: 23, height: 20, alignItems: 'center', justifyContent: 'center' },
  eyeShape: {
    width: 18,
    height: 13,
    borderWidth: 1.6,
    borderColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
  },
  eyePupil: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary },
  eyeSlash: { position: 'absolute', width: 25, height: 1.5, backgroundColor: colors.primary, transform: [{ rotate: '-45deg' }] },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 2 },
});
