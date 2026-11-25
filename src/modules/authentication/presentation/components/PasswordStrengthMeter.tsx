// Guía: Muestra visualmente los criterios de seguridad de la contraseña.

import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { evaluarSeguridadClave, type NivelSeguridadClave } from '../../domain/usecases/passwordSecurity';

const PALETA: Record<
  NivelSeguridadClave,
  { barra: string; fondo: string; borde: string; texto: string }
> = {
  vacia: {
    barra: '#D5DFE5',
    fondo: '#F6F8FA',
    borde: '#E1E8EC',
    texto: '#5A6E7A',
  },
  no_segura: {
    barra: '#C8322B',
    fondo: '#FEF3F2',
    borde: '#F8C9C6',
    texto: '#B42318',
  },
  poco_segura: {
    barra: '#D97706',
    fondo: '#FEF7EC',
    borde: '#F7D9A8',
    texto: '#B54708',
  },
  segura: {
    barra: '#067647',
    fondo: '#EDF7EF',
    borde: '#B7E4C7',
    texto: '#067647',
  },
  muy_segura: {
    barra: '#05603A',
    fondo: '#E6F5EC',
    borde: '#95D5B2',
    texto: '#05603A',
  },
};

export default function PasswordStrengthMeter({ password }: { password: string }) {
  const resultado = evaluarSeguridadClave(password);
  const tema = PALETA[resultado.nivel];

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      accessibilityLiveRegion="polite"
      style={[styles.box, { backgroundColor: tema.fondo, borderColor: tema.borde }]}>
      <View style={styles.headerRow}>
        <Text style={styles.caption}>Nivel de seguridad</Text>
        <Text style={[styles.badgeText, { color: tema.texto }]}>
          {resultado.esSegura ? `${resultado.etiqueta} ✓` : resultado.etiqueta}
        </Text>
      </View>

      <View style={styles.barsRow}>
        {[1, 2, 3, 4].map((step) => {
          const active = resultado.puntos >= step;
          return (
            <View
              key={step}
              style={[
                styles.barSegment,
                { backgroundColor: active ? tema.barra : '#DCE4E9' },
              ]}
            />
          );
        })}
      </View>

      <View style={styles.rulesGrid}>
        {resultado.reglas.map((regla) => (
          <View key={regla.id} style={styles.ruleItem}>
            <View
              style={[
                styles.ruleDot,
                { backgroundColor: regla.cumple ? '#067647' : '#B8C5CD' },
              ]}>
              <Text style={styles.ruleMark}>{regla.cumple ? '✓' : ''}</Text>
            </View>
            <Text
              style={[
                styles.ruleLabel,
                { color: regla.cumple ? '#142630' : '#647783' },
              ]}>
              {regla.texto}
            </Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 9,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  caption: {
    fontFamily: 'LatoRegular',
    fontSize: 12,
    color: '#526570',
  },
  badgeText: {
    fontFamily: 'LatoBold',
    fontSize: 12.5,
  },
  barsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  barSegment: {
    flex: 1,
    height: 6,
    borderRadius: 999,
  },
  rulesGrid: {
    gap: 5,
    marginTop: 2,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleMark: {
    fontFamily: 'LatoBold',
    fontSize: 10,
    color: '#FFFFFF',
  },
  ruleLabel: {
    fontFamily: 'LatoRegular',
    fontSize: 12,
  },
});
