import { useEffect } from 'react';
import { create } from 'zustand';

import type { Connectivity } from '../domain/entities/connectivity';
import type { ObserveConnectivity } from '../domain/usecases/observeConnectivity';

export const useConnectivityStore = create<{ connectivity: Connectivity }>()(() => ({
  connectivity: 'unknown',
}));

export function useConnectivityMonitor(observe: ObserveConnectivity) {
  useEffect(
    () => observe((connectivity) => useConnectivityStore.setState({ connectivity })),
    [observe],
  );
}
