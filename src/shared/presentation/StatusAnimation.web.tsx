import { ActivityIndicator, Text, View } from 'react-native';

export default function StatusAnimation({
  tone,
  busy,
}: {
  tone: 'success' | 'warning' | 'error' | 'info';
  busy: boolean;
}) {
  if (busy) return <ActivityIndicator size="small" color="#163D77" />;
  const symbol = tone === 'success' ? '✓' : tone === 'error' ? '!' : '';
  return (
    <View
      accessibilityElementsHidden
      className="h-6 w-6 items-center justify-center rounded-full"
      style={{ backgroundColor: tone === 'success' ? '#067647' : tone === 'error' ? '#B42318' : tone === 'warning' ? '#B54708' : '#163D77' }}>
      {symbol ? <Text className="text-xs font-black text-white">{symbol}</Text> : null}
    </View>
  );
}
