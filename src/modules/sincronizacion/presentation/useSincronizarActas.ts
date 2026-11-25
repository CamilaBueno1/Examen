// Guía: Inicia los envíos al reconectar y evita ejecuciones simultáneas.

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { useSessionStore } from '@/modules/authentication/presentation/sessionStore';
import { flushPendingErrors, reportOperationalError } from '@/shared/monitoring/sentry';
import { sincronizarCorrecciones } from '@/modules/actas/actasProvider';
import { isNetworkFailure } from '@/shared/data/networkFailure';
import { sincronizarActas } from '../sincronizacionProvider';
import { useConnectivityStore } from './useConnectivityMonitor';

export const useSincronizacionActasStore = create<{
  revision: number;
  trigger: number;
  syncing: boolean;
  error: boolean;
}>(() => ({
  revision: 0,
  trigger: 0,
  syncing: false,
  error: false,
}));

export function solicitarSincronizacionInmediata() {
  useSincronizacionActasStore.setState((state) => ({ trigger: state.trigger + 1 }));
}

export function useSincronizarActas() {
  const user = useSessionStore((state) => state.user);
  const connectivity = useConnectivityStore((state) => state.connectivity);
  const online = connectivity === 'online';
  const trigger = useSincronizacionActasStore((state) => state.trigger);
  const running = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web' || !online) return;
    void flushPendingErrors().catch(() => {
      console.error('[Sentry] No se pudo vaciar la cola local de diagnósticos.');
    });
  }, [online, trigger]);

  useEffect(() => {
    if (Platform.OS === 'web' || !online || user?.status !== 'ACTIVE' || user.role === 'provincial') return;
    let active = true;
    const autorId = user.id;
    async function poll() {
      if (running.current) return;
      running.current = true;
      useSincronizacionActasStore.setState({ syncing: true });
      try {
        const actualizar = () => {
          useSincronizacionActasStore.setState((state) => ({ revision: state.revision + 1, error: false }));
        };
        if (user?.role === 'veedor') await sincronizarActas(
          autorId,
          () => active,
          actualizar,
          (cause, code) => {
            const nowOffline = useConnectivityStore.getState().connectivity === 'offline';
            if (!nowOffline && !isNetworkFailure(cause)) void reportOperationalError(cause, code, 'sincronizacion/outbox', false);
          },
        );
        await sincronizarCorrecciones(autorId, () => active, actualizar);
      } catch (error) {
        if (active) {
          useSincronizacionActasStore.setState({ error: true });
          const nowOffline = useConnectivityStore.getState().connectivity === 'offline';
          if (!nowOffline && !isNetworkFailure(error)) void reportOperationalError(error, 'SYNC_QUEUE_READ_FAILED', 'sincronizacion/outbox', false);
        }
      } finally {
        running.current = false;
        useSincronizacionActasStore.setState({ syncing: false });
      }
    }
    void poll();
    const interval = setInterval(() => {
      void poll();
    }, 10_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user, online, trigger]);
}
