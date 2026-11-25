// Guía: Presenta el botón de autenticación y su estado de carga.

import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import AppIcon from '@/shared/presentation/AppIcon';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Botón píldora azul marino profundo fiel a la referencia visual (como «Comenzar»),
 * sin adornos artificiales ni cajas internas.
 */
export default function SubmitButton({
  label,
  loadingLabel,
  loading,
  showArrow = false,
  onPress,
}: {
  label: string;
  loadingLabel: string;
  loading: boolean;
  showArrow?: boolean;
  onPress: () => void;
}) {
  const press = useSharedValue(1);
  const sheen = useSharedValue(-1);

  useEffect(() => {
    if (loading) {
      sheen.set(-1);
      sheen.set(
        withRepeat(
          withTiming(1, { duration: 1150, easing: Easing.inOut(Easing.quad) }),
          -1,
          false,
        ),
      );
    } else {
      cancelAnimation(sheen);
      sheen.set(-1);
    }
  }, [loading, sheen]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }],
  }));

  const sheenStyle = useAnimatedStyle(
    () => ({
      opacity: loading ? 0.22 : 0,
      transform: [{ translateX: sheen.value * 260 }, { rotate: '18deg' }],
    }),
    [loading],
  );

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: loading, busy: loading }}
      disabled={loading}
      onPress={onPress}
      onPressIn={() => press.set(withSpring(0.975, { damping: 16, stiffness: 320 }))}
      onPressOut={() => press.set(withSpring(1, { damping: 14, stiffness: 260 }))}
      style={[styles.button, buttonStyle]}>
      <Animated.View pointerEvents="none" style={[styles.sheen, sheenStyle]} />
      {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
      <Text style={styles.label}>{loading ? loadingLabel : label}</Text>
      {showArrow && !loading ? (
        <AppIcon
          accessible={false}
          name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
          size={18}
          tintColor="#FFFFFF"
        />
      ) : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: 999,
    backgroundColor: '#0E364C',
    borderWidth: 1,
    borderColor: '#1B4B66',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 28,
    overflow: 'hidden',
    shadowColor: '#092332',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 5,
  },
  label: {
    fontFamily: 'LatoBold',
    fontSize: 16.5,
    letterSpacing: 0.2,
    color: '#FFFFFF',
  },
  sheen: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    width: 64,
    backgroundColor: '#FFFFFF',
  },
});
