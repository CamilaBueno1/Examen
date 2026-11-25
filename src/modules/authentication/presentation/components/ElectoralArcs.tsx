// Guía: Dibuja los arcos decorativos del fondo de autenticación.

import { StyleSheet, Text, View } from 'react-native';

import ElectionMotion, { type ElectionScene } from '@/shared/presentation/ElectionMotion';

/**
 * Encabezado institucional limpio inspirado en las referencias de Control Electoral:
 * - Ícono Lottie de urna con papeleta inclinada (o mano votando)
 * - Tipografía fuerte "Control Electoral" + "Organización Política"
 * - Barra horizontal institucional minimalista (azul marino · rojo · amarillo)
 */
export default function ElectoralArcs({
  scene = 'welcome',
  size = 110,
  loop = true,
  badge,
}: {
  scene?: ElectionScene;
  size?: number;
  loop?: boolean;
  badge?: string;
}) {
  return (
    <View style={styles.wrapper} accessible={false} importantForAccessibility="no-hide-descendants">
      <ElectionMotion scene={scene} size={size} loop={loop} />
      {badge ? (
        <View style={styles.badgeRow}>
          <Text className="font-electoral-bold text-[11px] uppercase tracking-widest text-brand-navy">{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function EcuadorDivider({ width = 108 }: { width?: number }) {
  return (
    <View style={[styles.divider, { width }]}>
      <View style={[styles.segment, { flex: 2, backgroundColor: '#103B50' }]} />
      <View style={[styles.segment, { flex: 1, backgroundColor: '#C8322B' }]} />
      <View style={[styles.segment, { flex: 1, backgroundColor: '#E5A923' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    marginTop: 2,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F0F4F6',
  },
  divider: {
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    alignSelf: 'center',
  },
  segment: {
    height: '100%',
  },
});
