// Guía: Dibuja las líneas de contorno decorativas del fondo.

import { StyleSheet, View } from 'react-native';

/**
 * Fondo sutil sobre blanco cálido (#FAF9F5) acorde a la referencia visual de
 * Control Electoral · Organización Política: curvas topográficas discretas y halo superior suave.
 */
export default function ContourLines({ strokeColor }: { strokeColor?: string } = {}) {
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={styles.canvas}>
      <View style={styles.softTopWave} />
      <View style={styles.contourLayer}>
        {Array.from({ length: 8 }, (_, index) => (
          <View
            key={index}
            style={[
              styles.contourArc,
              {
                width: 230 + index * 24,
                height: 82 + index * 18,
                borderRadius: 124 + index * 6,
                borderColor: strokeColor ?? styles.contourArc.borderColor,
                right: -44 - index * 8,
                bottom: 8 - index * 7,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FAF9F5',
    overflow: 'hidden',
  },
  softTopWave: {
    position: 'absolute',
    top: -130,
    left: -70,
    right: -70,
    height: 300,
    borderBottomLeftRadius: 220,
    borderBottomRightRadius: 220,
    backgroundColor: '#FFFFFF',
    opacity: 0.85,
  },
  contourLayer: {
    ...StyleSheet.absoluteFill,
    opacity: 0.6,
    transform: [{ rotate: '-16deg' }],
  },
  contourArc: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#E3E7E9',
  },
});
