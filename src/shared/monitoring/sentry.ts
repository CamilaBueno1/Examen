import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const appVersion = Constants.expoConfig?.version ?? 'unknown';
const deviceType = String(Device.deviceType ?? 'unknown');

export function initializeMonitoring() {
  if (!dsn) return;

  Sentry.init({
    dsn,
    enabled: true,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      event.user = undefined;
      event.request = undefined;
      event.contexts = undefined;
      event.breadcrumbs = [];
      event.extra = {};
      event.message = undefined;
      event.transaction = undefined;
      event.exception?.values?.forEach((exception) => {
        exception.value = exception.type ?? 'Error';
      });
      event.tags = {
        ...event.tags,
        app_version: appVersion,
        device_type: deviceType,
      };
      return event;
    },
  });
}

export function reportOperationalError(error: unknown, code: string, screen: string) {
  if (!dsn) return;

  Sentry.withScope((scope) => {
    scope.setTag('error_code', code);
    scope.setTag('screen', screen);
    Sentry.captureException(error);
  });
}
