import type { ConnectivitySource } from '../repositories/connectivitySource';

export type ObserveConnectivity = ConnectivitySource['subscribe'];

export function observeConnectivity(source: ConnectivitySource): ObserveConnectivity {
  return (onChange) => source.subscribe(onChange);
}
