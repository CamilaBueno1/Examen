import { useEffect } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Card, TricolorStripe, BRAND_ACCENTS } from '@/shared/presentation/Ui';
import StatusAnimation from '@/shared/presentation/StatusAnimation';
import type { VoteValues } from './ActaCaptureScreen';

const organizations = ['organizacion1', 'organizacion2', 'organizacion3', 'organizacion4', 'organizacion5'] as const;
const orgColors = [BRAND_ACCENTS.navy, BRAND_ACCENTS.gold, BRAND_ACCENTS.red, '#2D5A70', '#B5893A'] as const;

export default function ActaVoteCard({
  form,
  names,
  validate,
}: {
  form: UseFormReturn<VoteValues>;
  names: string[];
  validate: (values: unknown) => boolean;
}) {
  const values = useWatch({ control: form.control, defaultValue: form.getValues() });
  const sumParcial =
    (values.organizacion1 ?? 0) +
    (values.organizacion2 ?? 0) +
    (values.organizacion3 ?? 0) +
    (values.organizacion4 ?? 0) +
    (values.organizacion5 ?? 0) +
    (values.blancos ?? 0) +
    (values.nulos ?? 0);
  const sufragantes = values.sufragantes ?? 0;
  const sinDatos = sumParcial === 0 && sufragantes === 0;
  const valid = !sinDatos && validate(values);
  const diff = sumParcial - sufragantes;
  const ratio = sufragantes > 0 ? Math.min(1, sumParcial / sufragantes) : 0;
  const barProgress = useSharedValue(ratio);
  useEffect(() => {
    barProgress.set(withSpring(ratio, { damping: 18, stiffness: 180 }));
  }, [barProgress, ratio]);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${Math.round(barProgress.value * 100)}%`,
  }));

  const rows: { name: keyof VoteValues; label: string; color?: string }[] = [
    ...organizations.map((name, index) => ({
      name,
      label: names[index],
      color: orgColors[index],
    })),
    { name: 'blancos', label: 'Votos en blanco' },
    { name: 'nulos', label: 'Votos nulos' },
    { name: 'sufragantes', label: 'Total de sufragantes del acta' },
  ];

  return (
    <Card compact>
      <View className="mb-2.5 flex-row items-center justify-between">
        <View className="flex-1 pr-2">
          <Text accessibilityRole="header" className="font-electoral-bold text-base text-brand-ink">
            Conteo de votos
          </Text>
          <Text className="font-electoral text-xs text-brand-muted">
            Copia los valores tal como figuran en el acta física
          </Text>
        </View>
        <TricolorStripe width={32} height={4} />
      </View>

      <View className="gap-1.5">
        {rows.map(({ name, label, color }) => {
          const total = name === 'sufragantes';
          return (
            <Controller
              key={name}
              control={form.control}
              name={name}
              render={({ field, fieldState }) => (
                <View
                  className={
                    total
                      ? 'mt-1.5 rounded-2xl border-1.5 border-brand-navy bg-brand-gold-soft px-3.5 py-2'
                      : 'rounded-xl border border-brand-line bg-brand-field px-3 py-1.5'
                  }>
                  <View className="min-h-10 flex-row items-center gap-2.5">
                    {color ? (
                      <View style={{ width: 5, height: 24, borderRadius: 3, backgroundColor: color }} />
                    ) : null}
                    <View className="flex-1">
                      <Text
                        className={`text-sm text-brand-ink ${
                          total ? 'font-electoral-bold' : 'font-electoral'
                        }`}>
                        {label}
                      </Text>
                    </View>
                    <TextInput
                      accessibilityLabel={label}
                      keyboardType="number-pad"
                      maxLength={6}
                      placeholder="0"
                      placeholderTextColor="#9AA7AE"
                      value={field.value === 0 ? '' : String(field.value)}
                      onBlur={field.onBlur}
                      onChangeText={(text) => {
                        if (/^\d{0,6}$/.test(text)) field.onChange(text === '' ? 0 : Number(text));
                      }}
                      className={`h-11 w-28 shrink-0 rounded-xl border px-3 text-right font-bold text-brand-ink ${
                        total
                          ? 'border-brand-navy bg-brand-surface text-base'
                          : 'border-brand-line bg-brand-surface text-base'
                      }`}
                      style={{ fontFamily: 'LatoBold', fontVariant: ['tabular-nums'], paddingVertical: 0 }}
                    />
                  </View>
                  {fieldState.error ? (
                    <Text accessibilityRole="alert" className="font-electoral-bold pt-1 text-xs text-brand-danger">
                      {fieldState.error.message}
                    </Text>
                  ) : null}
                </View>
              )}
            />
          );
        })}
      </View>

      <View
        accessibilityLiveRegion="polite"
        className={`mt-3 gap-2 rounded-2xl border px-3.5 py-2.5 ${
          sinDatos
            ? 'border-brand-line bg-brand-field'
            : valid
              ? 'border-brand-success bg-brand-success-soft'
              : 'border-brand-warning bg-brand-warning-soft'
        }`}>
        <View className="flex-row items-center gap-2.5">
          {valid ? (
            <StatusAnimation tone="success" busy={false} />
          ) : (
            <View
              className={`h-7 w-7 items-center justify-center rounded-full ${
                sinDatos ? 'bg-brand-navy' : 'bg-brand-warning'
              }`}>
              <Text className="font-electoral-bold text-xs text-white">{sinDatos ? '•' : '!'}</Text>
            </View>
          )}
          <View className="flex-1">
            <Text
              className={`font-electoral-bold text-xs ${
                sinDatos ? 'text-brand-ink' : valid ? 'text-brand-success' : 'text-brand-warning'
              }`}>
              {sinDatos
                ? 'Ingresa los votos y el total de sufragantes'
                : valid
                  ? 'Totales cuadrados correctamente'
                  : diff > 0
                    ? `Sobran ${diff} voto(s) respecto al total de sufragantes`
                    : `Faltan ${Math.abs(diff)} voto(s) para igualar a los sufragantes`}
            </Text>
            <Text className="font-electoral text-[11px] text-brand-muted">
              Suma de votos: {sumParcial} · Sufragantes: {sufragantes}
            </Text>
          </View>
        </View>
        {!sinDatos ? (
          <View className="h-2 overflow-hidden rounded-full bg-white/80">
            <Animated.View
              style={[
                {
                  height: '100%',
                  borderRadius: 999,
                  backgroundColor: valid ? '#067647' : '#D4B177',
                },
                progressStyle,
              ]}
            />
          </View>
        ) : null}
      </View>
    </Card>
  );
}
