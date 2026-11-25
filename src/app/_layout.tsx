import '@/global.css';
import * as Sentry from '@sentry/react-native';

import { observeNetwork } from '@/modules/sincronizacion/sincronizacionProvider';
import { useConnectivityMonitor } from '@/modules/sincronizacion/presentation/useConnectivityMonitor';
import { useSincronizarActas } from '@/modules/sincronizacion/presentation/useSincronizarActas';
import { initializeMonitoring } from '@/shared/monitoring/sentry';
import RootLayout from '@/shared/presentation/RootLayout';

initializeMonitoring();

function ExpoRootLayout() {
  useConnectivityMonitor(observeNetwork);
  useSincronizarActas();
  return <RootLayout />;
}

export default Sentry.wrap(ExpoRootLayout);
