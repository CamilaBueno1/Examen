import type { ConnectivitySource } from '../../domain/repositories/connectivitySource';
import { subscribeToNetInfo } from '../adapters/netInfoConnectivity';

export const connectivityRepository: ConnectivitySource = {
  subscribe(onChange) {
    return subscribeToNetInfo(({ isConnected, isInternetReachable }) => {
      if (isConnected === false || isInternetReachable === false) {
        onChange('offline');
      } else if (isConnected === true && isInternetReachable === true) {
        onChange('online');
      } else {
        onChange('unknown');
      }
    });
  },
};
