// Guía: Adapta los eventos de conectividad de NetInfo al módulo.

import NetInfo from '@react-native-community/netinfo';

export interface NetworkState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}

export function subscribeToNetInfo(onChange: (state: NetworkState) => void): () => void {
  return NetInfo.addEventListener(onChange);
}
