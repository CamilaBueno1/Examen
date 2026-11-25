import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { useSessionStore } from '@/modules/authentication/presentation/sessionStore';
import { useSincronizacionActasStore } from '@/modules/sincronizacion/presentation/useSincronizarActas';
import { listarActasLocales } from '../actasProvider';
import type { ActaLocal } from '../domain/usecases/consultarActasLocales';

export function useActasLocales() {
  const user = useSessionStore((state) => state.user);
  const revision = useSincronizacionActasStore((state) => state.revision);
  const [result, setResult] = useState<{ owner: string; revision: number; actas?: ActaLocal[]; error?: string }>();
  useFocusEffect(useCallback(() => {
    if (user?.role !== 'veedor' || user.status !== 'ACTIVE') return;
    let focused = true;
    void listarActasLocales(user.id).then(
      (actas) => { if (focused) setResult({ owner: user.id, revision, actas }); },
      (error: unknown) => {
        if (focused) setResult({ owner: user.id, revision, error: error instanceof Error ? error.message : 'No se pudieron leer los registros locales.' });
      },
    );
    return () => { focused = false; };
  }, [user, revision]));
  return user?.status === 'ACTIVE' && user.id === result?.owner ? result : undefined;
}
