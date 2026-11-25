import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  Image,
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
import AppIcon from '@/shared/presentation/AppIcon';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Colors, Fonts } from '@/constants/theme';
import ContourLines from '@/shared/presentation/ContourLines';
import ElectionMotion from '@/shared/presentation/ElectionMotion';
import { StatusBanner, TricolorStripe } from '@/shared/presentation/Ui';
import { loginUseCase } from './authUseCaseProvider';
import { useSessionStore } from './sessionStore';
import AuthField from './components/AuthField';
import SubmitButton from './components/SubmitButton';
import { EscenaVuelvePronto, TransicionSufragio } from './components/TalonElectoral';
import type { User } from '../domain/entities';

const esquemaCredenciales = z.object({
  email: z.string().trim().email('Revisa el formato del correo electrónico'),
  password: z.string().min(6, 'Ingresa una contraseña de al menos 6 caracteres'),
});

type ValoresCredenciales = z.infer<typeof esquemaCredenciales>;

export default function LoginScreen() {
  const [estadoProceso, setEstadoProceso] = useState<'idle' | 'loading' | 'error'>('idle');
  const [detalleError, setDetalleError] = useState('');
  const [mostrarClave, setMostrarClave] = useState(false);
  const [delegadoVerificado, setDelegadoVerificado] = useState<User>();

  const campoClave = useRef<ComponentRef<typeof TextInput>>(null);

  const guardarSesion = useSessionStore((state) => state.setUser);
  const farewellName = useSessionStore((state) => state.farewellName);
  const clearFarewell = useSessionStore((state) => state.clearFarewell);

  const formulario = useForm<ValoresCredenciales>({
    resolver: zodResolver(esquemaCredenciales),
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
  });

  const sacudida = useSharedValue(0);
  useEffect(() => {
    if (estadoProceso !== 'error') return;
    sacudida.set(
      withSequence(
        withTiming(-7, { duration: 42 }),
        withRepeat(withTiming(7, { duration: 74 }), 3, true),
        withTiming(0, { duration: 42 }),
      ),
    );
  }, [estadoProceso, sacudida]);

  const estiloSacudida = useAnimatedStyle(() => ({
    transform: [{ translateX: sacudida.value }],
  }));

  const autenticarDelegado = formulario.handleSubmit(async (valores) => {
    setEstadoProceso('loading');
    setDetalleError('');
    try {
      if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error('Falta configurar la conexión al servicio remoto.');
      }
      const perfil = await loginUseCase(valores.email.trim(), valores.password);
      if (perfil.status === 'ACTIVE') {
        setEstadoProceso('idle');
        setDelegadoVerificado(perfil);
      } else if (perfil.status === 'PENDING') {
        guardarSesion(perfil);
        router.replace('/first-access');
      } else {
        setEstadoProceso('error');
        setDetalleError('Esta cuenta se encuentra deshabilitada. Comunícate con tu coordinador.');
      }
    } catch (causa) {
      setEstadoProceso('error');
      setDetalleError(
        causa instanceof Error ? causa.message : 'No se pudo completar el inicio de sesión.',
      );
    }
  });

  const procesando = estadoProceso === 'loading';

  if (farewellName) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <ContourLines />
        <EscenaVuelvePronto nombre={farewellName} alTerminar={clearFarewell} />
      </SafeAreaView>
    );
  }

  if (delegadoVerificado) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <ContourLines />
        <TransicionSufragio
          usuario={delegadoVerificado}
          alFinalizar={() => {
            guardarSesion(delegadoVerificado);
            if (delegadoVerificado.role === 'provincial') router.replace('/provincial');
            else if (delegadoVerificado.role === 'coordinator') router.replace('/recinto');
            else router.replace('/veedor');
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image
          accessible={false}
          source={require('../../../../assets/images/login-paper.png')}
          resizeMode="cover"
          style={styles.loginBackground}
        />
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}>
          <View style={styles.shell}>
            <Animated.View
              entering={FadeInDown.duration(420).easing(Easing.out(Easing.cubic)).reduceMotion(ReduceMotion.System)}
              style={styles.heroBlock}>
              <View style={styles.brand}>
                <View style={styles.brandStripe}><TricolorStripe width={40} height={3} /></View>
                <Text accessibilityRole="header" style={styles.appTitle}>
                  Control Electoral
                </Text>
                <Text className="font-electoral text-sm text-brand-muted">Organización Política</Text>
              </View>
              <View
                pointerEvents="none"
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={styles.animationStage}>
                <View style={styles.ballotHalo} />
                <View style={styles.actaIllustration}>
                  <View style={styles.actaHeaderLine} />
                  {[0, 1, 2, 3].map((row) => (
                    <View key={row} style={styles.actaRow}>
                      <View style={styles.actaOption} />
                      <View style={styles.actaCount} />
                    </View>
                  ))}
                  <View style={styles.actaSignature} />
                </View>
                <ElectionMotion
                  key={procesando ? 'voting' : 'login-welcome'}
                  scene={procesando ? 'voting' : 'login-welcome'}
                  width={216}
                  height={176}
                  loop
                />
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeInUp.delay(100).duration(420).easing(Easing.out(Easing.cubic)).reduceMotion(ReduceMotion.System)}
              style={styles.formSection}>
              <View style={styles.formHeading}>
                <View style={styles.formAccent} />
                <Text accessibilityRole="header" style={styles.formTitle}>Iniciar sesión</Text>
              </View>
              <Animated.View style={[styles.fields, estiloSacudida]}>
                {estadoProceso === 'error' ? (
                  <StatusBanner
                    tone="error"
                    title="No se pudo iniciar sesión"
                    detail={detalleError}
                  />
                ) : null}

                <Controller
                  control={formulario.control}
                  name="email"
                  render={({ field }) => (
                    <AuthField
                      variant="filled"
                      label="Correo electrónico"
                      icon={{ ios: 'envelope', android: 'mail', web: 'mail' }}
                      error={formulario.formState.errors.email?.message}
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                      keyboardType="email-address"
                      onBlur={field.onBlur}
                      onChangeText={field.onChange}
                      placeholder="correo@organizacion.ec"
                      onSubmitEditing={() => campoClave.current?.focus()}
                      submitBehavior="submit"
                      returnKeyType="next"
                      textContentType="emailAddress"
                      value={field.value}
                      editable={!procesando}
                    />
                  )}
                />

                <Controller
                  control={formulario.control}
                  name="password"
                  render={({ field }) => (
                    <AuthField
                      variant="filled"
                      label="Contraseña"
                      icon={{ ios: 'lock', android: 'lock', web: 'lock' }}
                      error={formulario.formState.errors.password?.message}
                      autoCapitalize="none"
                      autoComplete="password"
                      autoCorrect={false}
                      onBlur={field.onBlur}
                      onChangeText={field.onChange}
                      onSubmitEditing={() => {
                        if (!procesando) void autenticarDelegado();
                      }}
                      placeholder="Ingresa tu contraseña"
                      ref={campoClave}
                      returnKeyType="go"
                      secureTextEntry={!mostrarClave}
                      textContentType="password"
                      value={field.value}
                      editable={!procesando}
                      trailing={
                        <Pressable
                          accessibilityLabel={
                            mostrarClave ? 'Ocultar contraseña' : 'Mostrar contraseña'
                          }
                          accessibilityRole="button"
                          accessibilityState={{ selected: mostrarClave }}
                          hitSlop={10}
                          onPress={() => setMostrarClave((actual) => !actual)}
                          style={styles.eyeButton}>
                          <AppIcon
                            name={
                              mostrarClave
                                ? { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' }
                                : { ios: 'eye', android: 'visibility', web: 'visibility' }
                            }
                            size={20}
                            tintColor={Colors.light.textSecondary}
                          />
                        </Pressable>
                      }
                    />
                  )}
                />
              </Animated.View>

              <View style={styles.submitWrap}>
                <SubmitButton
                  label="Ingresar"
                  loadingLabel="Verificando acceso…"
                  loading={procesando}
                  showArrow
                  onPress={autenticarDelegado}
                />
              </View>

              <View style={styles.recoveryFooter}>
                <View pointerEvents="none" style={styles.perforation} />
                <Pressable
                  accessibilityRole="link"
                  hitSlop={6}
                  onPress={() => router.push('/recover')}
                  style={({ pressed }) => [styles.recoverLink, pressed && { opacity: 0.65 }]}>
                  <Text className="text-center font-electoral-bold text-sm text-brand-navy">¿Olvidaste tu contraseña?</Text>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.background },
  loginBackground: {
    width: '100%',
    height: '100%',
    opacity: 0.80,
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  shell: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    flexGrow: 1,
    justifyContent: 'center',
  },
  heroBlock: {
    paddingBottom: 16,
    gap: 7,
  },
  brand: {
    gap: 4,
    alignItems: 'center',
  },
  brandStripe: {
    marginBottom: 3,
  },
  animationStage: {
    width: '100%',
    minHeight: 188,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ballotHalo: {
    position: 'absolute',
    width: 218,
    height: 144,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 253, 244, 0.62)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9C8AA',
    transform: [{ rotate: '-12deg' }],
  },
  actaIllustration: {
    position: 'absolute',
    width: 111,
    height: 135,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D7DC',
    backgroundColor: '#FDFCF7',
    transform: [{ translateX: -56 }, { translateY: -16 }, { rotate: '-14deg' }],
  },
  actaHeaderLine: {
    height: 4,
    width: '62%',
    borderRadius: 2,
    backgroundColor: Colors.light.accent,
    marginBottom: 8,
  },
  actaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 17,
    borderTopWidth: 1,
    borderTopColor: '#D9E4E7',
  },
  actaOption: {
    width: 7,
    height: 7,
    borderRadius: 1,
    borderWidth: 1,
    borderColor: '#8DB1BE',
  },
  actaCount: {
    marginLeft: 6,
    width: 24,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#C4D6DC',
  },
  actaSignature: {
    width: '50%',
    marginTop: 13,
    borderTopWidth: 1,
    borderTopColor: '#B2C8D0',
  },
  appTitle: {
    fontFamily: Fonts.serif,
    fontWeight: '700',
    fontSize: 33,
    color: Colors.light.primaryPressed,
    textAlign: 'center',
  },
  formSection: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.backgroundElement,
    shadowColor: Colors.light.primaryPressed,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.12,
    shadowRadius: 17,
    elevation: 3,
    gap: 13,
  },
  formHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 3,
  },
  formAccent: {
    width: 4,
    height: 23,
    borderRadius: 2,
    backgroundColor: Colors.light.accent,
  },
  formTitle: {
    fontFamily: Fonts.serif,
    fontWeight: '700',
    fontSize: 23,
    color: Colors.light.text,
  },
  fields: {
    gap: 12,
  },
  eyeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitWrap: {
    marginTop: 2,
  },
  recoveryFooter: {
    justifyContent: 'center',
    paddingVertical: 3,
  },
  perforation: {
    height: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 1,
    borderStyle: 'dashed',
    borderColor: Colors.light.border,
  },
  recoverLink: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
