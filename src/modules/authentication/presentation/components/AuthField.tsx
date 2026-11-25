// Guía: Presenta los campos compactos de acceso con etiqueta y error.

import { useEffect, useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import AppIcon, { type AppIconName } from '@/shared/presentation/AppIcon';
import Animated, {
  FadeInDown,
  FadeOut,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '@/constants/theme';

const colors = Colors.light;

type Props = Omit<TextInputProps, 'style'> & {
  ref?: Ref<ComponentRef<typeof TextInput>>;
  label: string;
  icon: AppIconName;
  error?: string;
  hint?: string;
  trailing?: ReactNode;
  variant?: 'outlined' | 'filled';
};

/**
 * Campo limpio y natural de formulario (etiqueta en oración normal, nunca en mayúsculas gritadas,
 * 54px táctiles para escribir fluido sin interceptar toques).
 */
export default function AuthField({
  label,
  icon,
  error,
  hint,
  trailing,
  variant = 'outlined',
  editable = true,
  onFocus,
  onBlur,
  ...input
}: Props) {
  const [focused, setFocused] = useState(false);
  const focusAnim = useSharedValue(0);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (!error) return;
    shake.set(
      withSequence(
        withTiming(-6, { duration: 40 }),
        withRepeat(withTiming(6, { duration: 70 }), 3, true),
        withTiming(0, { duration: 40 }),
      ),
    );
  }, [error, shake]);

  const boxStyle = useAnimatedStyle(
    () => ({
      borderColor: error
        ? colors.danger
        : interpolateColor(focusAnim.value, [0, 1], [
            variant === 'filled' ? colors.border : '#D4DDE2',
            colors.primary,
          ]),
      backgroundColor: interpolateColor(focusAnim.value, [0, 1], [
        variant === 'filled' ? '#EEF2F3' : colors.backgroundElement,
        colors.backgroundElement,
      ]),
      transform: [{ translateX: shake.value }],
    }),
    [error, variant],
  );

  return (
    <View style={styles.fieldGroup}>
      <View style={styles.labelRow}>
        <Text
          style={[
            styles.label,
            { color: error ? colors.danger : focused ? colors.primary : '#223642' },
          ]}>
          {label}
        </Text>
        {hint && !error ? <Text style={styles.hintText}>{hint}</Text> : null}
      </View>

      <Animated.View
        style={[
          styles.inputBox,
          variant === 'filled' && styles.inputBoxFilled,
          focused && styles.inputBoxFocused,
          boxStyle,
        ]}>
        <AppIcon
          name={icon}
          size={19}
          tintColor={error ? colors.danger : focused ? colors.primary : '#647783'}
        />

        <TextInput
          {...input}
          editable={editable}
          accessibilityLabel={label}
          placeholderTextColor="#91A1AB"
          underlineColorAndroid="transparent"
          onFocus={(event) => {
            setFocused(true);
            focusAnim.set(withTiming(1, { duration: 170 }));
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            focusAnim.set(withTiming(0, { duration: 170 }));
            onBlur?.(event);
          }}
          style={styles.textInput}
        />

        {trailing}
      </Animated.View>

      {error ? (
        <Animated.View
          entering={FadeInDown.duration(170)}
          exiting={FadeOut.duration(120)}
          style={styles.errorRow}>
          <View style={styles.errorDot} />
          <Text accessibilityRole="alert" style={styles.errorText}>
            {error}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  label: {
    fontFamily: 'LatoBold',
    fontSize: 13.5,
  },
  hintText: {
    fontFamily: 'LatoRegular',
    fontSize: 11.5,
    color: '#6B7E89',
  },
  inputBox: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  inputBoxFocused: {
    shadowColor: '#0E364C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  inputBoxFilled: {
    borderRadius: 12,
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    minHeight: 52,
    fontFamily: 'LatoRegular',
    fontSize: 15.5,
    color: '#142630',
    paddingVertical: 10,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 3,
  },
  errorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.danger,
  },
  errorText: {
    flex: 1,
    fontFamily: 'LatoBold',
    fontSize: 12,
    color: colors.danger,
  },
});
