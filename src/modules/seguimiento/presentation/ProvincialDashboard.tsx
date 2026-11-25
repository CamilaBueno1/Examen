import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { useConnectivityStore } from '@/modules/sincronizacion/presentation/useConnectivityMonitor';
import {
  flushPendingErrors,
  isSentryConfigured,
  listPendingErrors,
  reportOperationalError,
  type PendingErrorRow,
} from '@/shared/monitoring/sentry';
import { ActionRow, AppButton, AppPage, Card, ScreenHeader, StatusBanner, TricolorStripe } from '@/shared/presentation/Ui';
import AvanceElectoral from './AvanceElectoral';

export default function ProvincialDashboard() {
  const connectivity = useConnectivityStore((state) => state.connectivity);
  const [pendingErrors, setPendingErrors] = useState<PendingErrorRow[]>([]);
  const [diagBanner, setDiagBanner] = useState<{ tone: 'info' | 'success' | 'warning'; title: string; detail: string }>();
  const [busyDiag, setBusyDiag] = useState(false);
  const sentryActive = isSentryConfigured();

  const refreshErrors = useCallback(() => {
    void listPendingErrors().then(setPendingErrors).catch(() => {
      console.error('[Sentry] No se pudo consultar la cola local de diagnósticos.');
      setDiagBanner({
        tone: 'warning',
        title: 'No se pudo consultar el diagnóstico',
        detail: 'No se logró leer la cola local de eventos técnicos. Revisa el almacenamiento del dispositivo.',
      });
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshErrors();
    }, [refreshErrors]),
  );

  async function triggerTestReport() {
    setBusyDiag(true);
    try {
      const offline = connectivity === 'offline';
      const result = await reportOperationalError(
        new Error('FALLO_OPERATIVO_DEMOSTRACION'),
        'FALLO_OPERATIVO_DEMOSTRACION',
        'provincial/dashboard',
        offline,
      );
      refreshErrors();
      if (result.sent) {
        setDiagBanner({
          tone: 'success',
          title: 'El SDK procesó el evento técnico',
          detail: 'El transporte local se vació. Confirma la recepción final en el panel de Sentry.',
        });
      } else if (result.queued) {
        setDiagBanner({
          tone: 'warning',
          title: 'Evento guardado en el teléfono',
          detail: offline
            ? 'Estás sin señal: el registro se enviará automáticamente en cuanto recuperes internet.'
            : 'Quedó registrado en el dispositivo listo para despacharse al servicio de monitoreo.',
        });
      } else {
        setDiagBanner({
          tone: 'warning',
          title: 'No se pudo registrar el evento técnico',
          detail: 'No se pudo confirmar el envío ni guardar el evento en el dispositivo.',
        });
      }
    } catch {
      setDiagBanner({
        tone: 'warning',
        title: 'Falló la prueba de diagnóstico',
        detail: 'No se pudo completar el registro. Revisa la conexión y el almacenamiento del dispositivo.',
      });
    } finally {
      setBusyDiag(false);
    }
  }

  async function retryFlush() {
    setBusyDiag(true);
    try {
      if (connectivity !== 'online') {
        setDiagBanner({
          tone: 'warning',
          title: 'Se necesita conexión a internet',
          detail: 'La cola local se conserva. Reintenta el envío cuando la conexión esté disponible.',
        });
        return;
      }
      const sent = await flushPendingErrors();
      const remaining = await listPendingErrors();
      setPendingErrors(remaining);
      setDiagBanner({
        tone: remaining.length > 0 ? 'warning' : sent > 0 ? 'success' : 'info',
        title: remaining.length > 0
          ? `Quedan ${remaining.length} registro(s) pendientes`
          : sent > 0
            ? `El SDK procesó ${sent} registro(s)`
            : 'No había registros por enviar',
        detail: remaining.length > 0
          ? 'Los eventos no confirmados se conservan en el dispositivo para otro intento.'
          : sent > 0
            ? 'Confirma la recepción final en el panel de Sentry.'
            : sentryActive
              ? 'La cola local está vacía.'
              : 'No hay registros pendientes y Sentry no está configurado.',
      });
    } catch {
      console.error('[Sentry] No se pudo vaciar la cola local de diagnósticos.');
      setDiagBanner({
        tone: 'warning',
        title: 'No se pudo enviar el diagnóstico',
        detail: 'La cola local no pudo actualizarse. Reintenta más tarde y verifica el almacenamiento.',
      });
    } finally {
      setBusyDiag(false);
    }
  }

  return (
    <AppPage>
      <ScreenHeader
        eyebrow="RUMIÑAHUI · PICHINCHA"
        title="Control Electoral Provincial"
        subtitle="Resultados preliminares en vivo y seguimiento de mesas del cantón"
      />
      {connectivity === 'offline' ? (
        <StatusBanner
          tone="warning"
          title="Sin conexión a internet"
          detail="Se muestra el último conteo recibido. Los datos se actualizarán al volver la señal."
        />
      ) : null}

      <AvanceElectoral />

      <View className="mt-1 gap-2.5">
        <Text accessibilityRole="header" className="font-electoral-bold text-base text-brand-ink">
          Gestión provincial
        </Text>
        <ActionRow
          title="Actas y evidencias recibidas"
          subtitle="Consultar votos, fotografías y ubicación de captura por mesa"
          onPress={() => router.push('/provincial/actas')}
        />
        <ActionRow
          title="Registrar coordinador de recinto"
          subtitle="Crear cuenta para el responsable de un recinto electoral"
          onPress={() => router.push('/provincial/coordinador')}
        />
        <ActionRow
          title="Recintos y mesas electorales"
          subtitle="Consultar recintos de Rumiñahui y agregar nuevos con sus mesas"
          onPress={() => router.push('/provincial/recintos')}
        />
      </View>

      <Card compact>
        <View className="mb-2 flex-row items-center justify-between">
          <View className="flex-1 pr-2">
            <Text className="font-electoral-bold text-sm text-brand-ink">Diagnóstico de la aplicación</Text>
            <Text className="font-electoral text-xs text-brand-muted">
              {sentryActive ? 'Monitoreo en línea activo' : 'Registro local en el dispositivo'}
              {pendingErrors.length > 0 ? ` · ${pendingErrors.length} por enviar` : ''}
            </Text>
          </View>
          <TricolorStripe width={32} height={4} />
        </View>
        {diagBanner ? (
          <View className="mb-2.5">
            <StatusBanner tone={diagBanner.tone} title={diagBanner.title} detail={diagBanner.detail} />
          </View>
        ) : null}
        <View className="flex-row gap-2">
          <View className="flex-1">
            <AppButton
              label="Registrar prueba técnica"
              variant="secondary"
              loading={busyDiag}
              onPress={() => void triggerTestReport()}
            />
          </View>
          {pendingErrors.length > 0 ? (
            <View className="flex-1">
              <AppButton
                label={`Enviar (${pendingErrors.length})`}
                variant="primary"
                loading={busyDiag}
                onPress={() => void retryFlush()}
              />
            </View>
          ) : null}
        </View>
      </Card>
    </AppPage>
  );
}
