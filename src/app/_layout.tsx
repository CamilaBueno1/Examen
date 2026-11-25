// Guía: Arranca la aplicación y monta conectividad, sincronización y Sentry.

import '@/global.css';
import * as Sentry from '@sentry/react-native';

import { observeNetwork } from '@/modules/sincronizacion/sincronizacionProvider';
import { useConnectivityMonitor } from '@/modules/sincronizacion/presentation/useConnectivityMonitor';
import { useSincronizarActas } from '@/modules/sincronizacion/presentation/useSincronizarActas';
import { initializeMonitoring } from '@/shared/monitoring/sentry';
import RootLayout from '@/shared/presentation/RootLayout';

initializeMonitoring();

// Monta el monitor de red y la sincronización una sola vez para toda la app.
function ExpoRootLayout() {
  useConnectivityMonitor(observeNetwork);
  useSincronizarActas();
  return <RootLayout />;
}

// Sentry envuelve el arranque para observar fallos de la aplicación.
export default Sentry.wrap(ExpoRootLayout);
