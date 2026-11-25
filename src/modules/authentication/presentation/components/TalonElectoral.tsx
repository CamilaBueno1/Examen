// Guía: Presenta el motivo gráfico electoral de la pantalla de acceso.

import { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ReduceMotion,
  ZoomIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Fonts } from '@/constants/theme';
import ElectionMotion from '@/shared/presentation/ElectionMotion';
import { TricolorStripe } from '@/shared/presentation/Ui';
import SubmitButton from './SubmitButton';
import type { User } from '../../domain/entities';

const colors = Colors.light;

const NOMBRE_CARGO: Record<
  User['role'],
  { cargo: string; ambito: string }
> = {
  provincial: {
    cargo: 'Coordinación Provincial',
    ambito: 'Pichincha · Cantón Rumiñahui',
  },
  coordinator: {
    cargo: 'Coordinación de Recinto Electoral',
    ambito: 'Administración de recinto, mesas y veedores',
  },
  veedor: {
    cargo: 'Veeduría de Mesa (JRV)',
    ambito: 'Captura de actas · Alcaldía y Prefectura',
  },
};

/**
 * Credencial animada de bienvenida tras autenticar al delegado:
 * muestra la confirmación visual de la credencial del cargo y avanza al panel correspondiente.
 */
export function TransicionSufragio({
  usuario,
  alFinalizar,
}: {
  usuario: User;
  alFinalizar: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const ejecutado = useRef(false);
  const progreso = useSharedValue(0);
  const opacidadSalida = useSharedValue(1);

  const continuar = useCallback(() => {
    if (ejecutado.current) return;
    ejecutado.current = true;
    alFinalizar();
  }, [alFinalizar]);

  useEffect(() => {
    const duracionMs = reducedMotion ? 1100 : 2500;
    if (!reducedMotion) {
      progreso.set(withTiming(1, { duration: duracionMs - 220, easing: Easing.linear }));
      opacidadSalida.set(withDelay(duracionMs - 220, withTiming(0, { duration: 200 })));
    }

    const timer = setTimeout(continuar, duracionMs);
    return () => clearTimeout(timer);
  }, [continuar, opacidadSalida, progreso, reducedMotion]);

  const estiloSalida = useAnimatedStyle(() => ({
    opacity: opacidadSalida.value,
  }));

  const estiloBarra = useAnimatedStyle(() => ({
    width: `${Math.round(progreso.value * 100)}%`,
  }));

  const nombreCorto = usuario.firstName?.trim() || usuario.fullName?.trim() || 'Delegado';
  const detalle = NOMBRE_CARGO[usuario.role];

  return (
    <View style={styles.centeredStage}>
      <Animated.View style={[styles.cardShell, estiloSalida]}>
        <Animated.View entering={FadeIn.duration(260).reduceMotion(ReduceMotion.System)} style={styles.credentialCard}>
          <View style={styles.credentialBanner}>
            <Text style={styles.credentialOverline}>CREDENCIAL VERIFICADA</Text>
            <TricolorStripe width={52} height={4} />
          </View>

          <View style={styles.credentialBody}>
            <Animated.View
              entering={ZoomIn.duration(330).easing(Easing.out(Easing.cubic)).reduceMotion(ReduceMotion.System)}
              style={styles.lottieMedallion}>
              <ElectionMotion scene="account" size={148} loop={false} />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(230).duration(360).reduceMotion(ReduceMotion.System)}
              style={styles.textCenter}>
              <Text accessibilityRole="header" style={[styles.greetingTitle, styles.welcomeTitle]}>
                Bienvenido, {nombreCorto}
              </Text>
              <View style={styles.roleBadge}>
                <Text style={styles.greetingRole}>{detalle.cargo}</Text>
              </View>
              <Text style={styles.greetingSub}>{detalle.ambito}</Text>
            </Animated.View>

            <View style={styles.actionArea}>
              {!reducedMotion && (
                <View accessible={false} style={styles.progressTrack}>
                  <Animated.View style={[styles.progressFill, estiloBarra]} />
                </View>
              )}
              <SubmitButton
                label="Continuar a mi panel"
                loadingLabel="Abriendo panel…"
                loading={false}
                onPress={continuar}
              />
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/**
 * Escena breve de cierre de sesión seguro.
 */
export function EscenaVuelvePronto({
  nombre,
  alTerminar,
}: {
  nombre: string;
  alTerminar: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const cerrado = useRef(false);
  const opacidad = useSharedValue(1);

  const finalizar = useCallback(() => {
    if (cerrado.current) return;
    cerrado.current = true;
    alTerminar();
  }, [alTerminar]);

  useEffect(() => {
    const duracionMs = reducedMotion ? 900 : 2000;
    opacidad.set(withDelay(duracionMs - 260, withTiming(0, { duration: 240 })));
    const timer = setTimeout(finalizar, duracionMs);
    return () => clearTimeout(timer);
  }, [finalizar, opacidad, reducedMotion]);

  const estiloContenedor = useAnimatedStyle(() => ({
    opacity: opacidad.value,
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Volver al inicio de sesión"
      onPress={finalizar}
      style={styles.centeredStage}>
      <Animated.View style={[styles.cardShell, estiloContenedor]}>
        <Animated.View entering={FadeIn.duration(240)} style={styles.farewellCard}>
          <Animated.View entering={ZoomIn.delay(60).springify().damping(15)} style={styles.farewellMedallion}>
            <ElectionMotion scene="farewell" size={148} loop />
          </Animated.View>

          <Text accessibilityRole="header" style={styles.greetingTitle}>
            Hasta pronto, {nombre}
          </Text>
          <View style={{ marginVertical: 10 }}>
            <TricolorStripe width={84} height={4} />
          </View>
          <Text style={styles.farewellMessage}>
            Tu sesión se cerró de forma segura. Tus registros locales permanecen protegidos en el dispositivo.
          </Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centeredStage: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  cardShell: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  credentialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#DCE4E8',
    overflow: 'hidden',
    shadowColor: '#0D3346',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    elevation: 5,
  },
  credentialBanner: {
    backgroundColor: '#0D3346',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  credentialOverline: {
    fontFamily: 'LatoBold',
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: '#F3DFBA',
  },
  credentialBody: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 24,
    alignItems: 'center',
  },
  lottieMedallion: {
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: '#FAF9F5',
    borderWidth: 1,
    borderColor: '#E6E0D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  farewellCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#DCE4E8',
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    shadowColor: '#0D3346',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  farewellMedallion: {
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: '#FAF9F5',
    borderWidth: 1,
    borderColor: '#E6E0D3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  textCenter: {
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  greetingTitle: {
    fontFamily: 'LatoBold',
    fontSize: 25,
    lineHeight: 31,
    color: colors.text,
    textAlign: 'center',
  },
  welcomeTitle: {
    fontFamily: Fonts.serif,
    fontWeight: '700',
  },
  roleBadge: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#F6EFE2',
    borderWidth: 1,
    borderColor: '#E2CEAA',
  },
  greetingRole: {
    fontFamily: 'LatoBold',
    fontSize: 13,
    color: colors.primary,
    textAlign: 'center',
  },
  greetingSub: {
    fontFamily: 'LatoRegular',
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  actionArea: {
    width: '100%',
    marginTop: 22,
    gap: 14,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 999,
    backgroundColor: '#E5ECEF',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#C9A25E',
  },
  farewellMessage: {
    fontFamily: 'LatoRegular',
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
