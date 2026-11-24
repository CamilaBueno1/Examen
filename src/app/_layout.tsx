import '@/global.css';
import * as Sentry from '@sentry/react-native';

import { connectivityRepository } from '@/modules/sincronizacion/data/repositories/connectivityRepository';
import { observeConnectivity } from '@/modules/sincronizacion/domain/usecases/observeConnectivity';
import { useConnectivityMonitor } from '@/modules/sincronizacion/presentation/useConnectivityMonitor';
import { useSincronizarActas } from '@/modules/sincronizacion/presentation/useSincronizarActas';
import { initializeMonitoring } from '@/shared/monitoring/sentry';
import RootLayout from '@/shared/presentation/RootLayout';

initializeMonitoring();

const observeNetwork = observeConnectivity(connectivityRepository);

function ExpoRootLayout() {
  useConnectivityMonitor(observeNetwork);
  useSincronizarActas();
  return <RootLayout />;
}

export default Sentry.wrap(ExpoRootLayout);
