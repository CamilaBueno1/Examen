import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { useSessionStore } from '@/modules/authentication/presentation/sessionStore';
import { reportOperationalError } from '@/shared/monitoring/sentry';
import { sincronizarActas } from '../sincronizacionProvider';
import { useConnectivityStore } from './useConnectivityMonitor';

export const useSincronizacionActasStore = create<{ revision: number; error: boolean }>(() => ({
  revision: 0, error: false,
}));

export function useSincronizarActas() {
  const user = useSessionStore((state) => state.user);
  const online = useConnectivityStore((state) => state.connectivity === 'online');
  const running = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web' || !online || user?.role !== 'veedor' || user.status !== 'ACTIVE') return;
    let active = true;
    const autorId = user.id;
    async function poll() {
      if (running.current) return;
      running.current = true;
      try {
        await sincronizarActas(autorId, () => active, () => {
          useSincronizacionActasStore.setState((state) => ({ revision: state.revision + 1, error: false }));
        });
      } catch (error) {
        if (active) {
          useSincronizacionActasStore.setState({ error: true });
          reportOperationalError(error, 'SYNC_FAILED', 'sincronizacion');
        }
      } finally {
        running.current = false;
      }
    }
    void poll();
    const interval = setInterval(() => { void poll(); }, 10_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user, online]);
}
