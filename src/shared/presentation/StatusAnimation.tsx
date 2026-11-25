// Guía: Muestra animaciones móviles según el resultado de una operación.

import { Text, View } from 'react-native';
import LottieView from 'lottie-react-native';

export default function StatusAnimation({
  tone,
  busy,
}: {
  tone: 'success' | 'warning' | 'error' | 'info';
  busy: boolean;
}) {
  if (busy) {
    return (
      <LottieView
        source={require('../../../assets/lottie/status-progress.json')}
        autoPlay
        loop
        style={{ width: 40, height: 40 }}
      />
    );
  }
  if (tone === 'success') {
    return (
      <LottieView
        source={require('../../../assets/lottie/status-success.json')}
        autoPlay
        loop={false}
        style={{ width: 44, height: 44 }}
      />
    );
  }
  if (tone === 'error') {
    return (
      <LottieView
        source={require('../../../assets/lottie/status-error.json')}
        autoPlay
        loop={false}
        style={{ width: 44, height: 44 }}
      />
    );
  }
  const color = tone === 'warning' ? '#B54708' : '#15464B';
  return (
    <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: color }}>
      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>{tone === 'warning' ? '!' : 'i'}</Text>
    </View>
  );
}
