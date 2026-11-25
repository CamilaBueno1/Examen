// Guía: Expone los cambios de red a través del contrato del dominio.

import type { ConnectivitySource } from '../repositories/connectivitySource';

export type ObserveConnectivity = ConnectivitySource['subscribe'];

export function observeConnectivity(source: ConnectivitySource): ObserveConnectivity {
  return (onChange) => source.subscribe(onChange);
}
