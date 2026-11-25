// Guía: Configura Sentry, filtra datos sensibles y guarda diagnósticos pendientes en SQLite.

import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as SQLite from 'expo-sqlite';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() ?? '';
const appVersion = Constants.expoConfig?.version ?? '1.0.0';
const environment = __DEV__ ? 'development' : 'production';

function resolveDeviceType(): string {
  const map: Record<number, string> = {
    [Device.DeviceType.PHONE]: 'phone',
    [Device.DeviceType.TABLET]: 'tablet',
    [Device.DeviceType.DESKTOP]: 'desktop',
    [Device.DeviceType.TV]: 'tv',
  };
  return map[Device.deviceType ?? Device.DeviceType.UNKNOWN] ?? 'unknown';
}

const deviceType = resolveDeviceType();

export interface PendingErrorRow {
  id: string;
  code: string;
  screen: string;
  version: string;
  fecha: string;
  intentos: number;
}

export function isSentryConfigured(): boolean {
  return dsn.length > 0;
}

let errorDbPromise: Promise<SQLite.SQLiteDatabase> | undefined;

async function getErrorDb(): Promise<SQLite.SQLiteDatabase | null> {
  if (Platform.OS === 'web') return null;
  errorDbPromise ??= (async () => {
    const db = await SQLite.openDatabaseAsync('local.db');
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS errores_pendientes (
        id TEXT PRIMARY KEY NOT NULL,
        code TEXT NOT NULL,
        screen TEXT NOT NULL,
        version TEXT NOT NULL,
        fecha TEXT NOT NULL,
        intentos INTEGER NOT NULL DEFAULT 0
      );
    `);
    return db;
  })().catch((err) => {
    errorDbPromise = undefined;
    throw err;
  });
  return errorDbPromise;
}

export function initializeMonitoring() {
  if (!dsn) return;

  Sentry.init({
    dsn,
    enabled: true,
    environment,
    release: `control-electoral@${appVersion}`,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeBreadcrumb() {
      // ADR-11 / RNF-07: Suprimir breadcrumbs automáticos que pudieran incluir rutas con parámetros, red o inputs
      return null;
    },
    beforeSend(event) {
      // ADR-11 / RNF-07: Omitir cédulas, correos, fotos, coordenadas GPS, tokens y votos
      event.user = undefined;
      event.request = undefined;
      event.breadcrumbs = [];
      event.extra = {};
      event.message = undefined;
      event.transaction = undefined;
      event.exception?.values?.forEach((exception) => {
        exception.value = exception.type ?? 'OperationalError';
      });
      event.tags = {
        app_version: event.tags?.app_version ?? appVersion,
        device_type: event.tags?.device_type ?? deviceType,
        os_name: Platform.OS,
        os_version: String(Platform.Version ?? 'unknown'),
        ...(event.tags?.screen ? { screen: event.tags.screen } : {}),
        ...(event.tags?.error_code ? { error_code: event.tags.error_code } : {}),
      };
      return event;
    },
  });
}

async function sendSanitizedException(code: string, screen: string, version = appVersion): Promise<boolean> {
  if (!dsn) return false;
  try {
    Sentry.withScope((scope) => {
      scope.setTag('error_code', code);
      scope.setTag('screen', screen);
      scope.setTag('app_version', version);
      scope.setTag('device_type', deviceType);
      const technicalError = new Error(code);
      technicalError.name = code;
      Sentry.captureException(technicalError);
    });
    const flushed = await Sentry.flush();
    if (!flushed) console.error(`[Sentry] No se confirmó el envío del evento ${code}.`);
    return flushed;
  } catch {
    console.error(`[Sentry] Falló el envío del evento ${code}.`);
    return false;
  }
}

/**
 * Registra un fallo operativo no fatal conforme a ADR-11:
 * - Si no hay conexión o aún no está configurado EXPO_PUBLIC_SENTRY_DSN, persiste en
 *   SQLite.errores_pendientes (UUID local, código, pantalla, versión, fecha, intentos),
 *   tabla independiente de outbox_actas.
 * - Si hay red y DSN configurado, envía el evento depurado de datos sensibles.
 */
export async function reportOperationalError(
  _error: unknown,
  code: string,
  screen: string,
  isOffline = false,
): Promise<{ queued: boolean; sent: boolean }> {
  if (!isOffline && dsn && (await sendSanitizedException(code, screen, appVersion))) {
    return { queued: false, sent: true };
  }

  try {
    const db = await getErrorDb();
    if (!db) {
      console.error(`[Sentry] No se pudo guardar el evento ${code} en este dispositivo.`);
      return { queued: false, sent: false };
    }
    const generated = await db.getFirstAsync<{ id: string }>(`
        SELECT lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
          substr(hex(randomblob(2)), 2) || '-' ||
          substr('89ab', (random() & 3) + 1, 1) || substr(hex(randomblob(2)), 2) || '-' ||
          hex(randomblob(6))) AS id
      `);
    if (!generated?.id) throw new Error('No se generó el identificador local del evento.');
    await db.runAsync(
      `INSERT OR REPLACE INTO errores_pendientes (id, code, screen, version, fecha, intentos)
         VALUES (?, ?, ?, ?, ?, 0)`,
      [generated.id, code, screen, appVersion, new Date().toISOString()],
    );
    return { queued: true, sent: false };
  } catch {
    console.error(`[Sentry] No se pudo persistir el evento ${code} en SQLite.`);
    return { queued: false, sent: false };
  }
}

/**
 * Reenvía errores pendientes desde SQLite.errores_pendientes al recuperar conexión
 * con política acotada de retención (máximo 5 intentos).
 */
// Reintenta los reportes técnicos de SQLite cuando vuelve la conexión.
export async function flushPendingErrors(): Promise<number> {
  if (!dsn) return 0;
  const db = await getErrorDb();
  if (!db) return 0;

  const rows = await db.getAllAsync<PendingErrorRow>(
    'SELECT id, code, screen, version, fecha, intentos FROM errores_pendientes ORDER BY fecha ASC LIMIT 25',
  );

  let sentCount = 0;
  for (const row of rows) {
    if (row.intentos >= 5) {
      await db.runAsync('DELETE FROM errores_pendientes WHERE id = ?', [row.id]);
      continue;
    }
    const ok = await sendSanitizedException(row.code, row.screen, row.version);
    if (ok) {
      await db.runAsync('DELETE FROM errores_pendientes WHERE id = ?', [row.id]);
      sentCount += 1;
    } else {
      await db.runAsync('UPDATE errores_pendientes SET intentos = intentos + 1 WHERE id = ?', [row.id]);
    }
  }
  return sentCount;
}

export async function listPendingErrors(): Promise<PendingErrorRow[]> {
  const db = await getErrorDb();
  if (!db) return [];
  return db.getAllAsync<PendingErrorRow>(
    'SELECT id, code, screen, version, fecha, intentos FROM errores_pendientes ORDER BY fecha DESC',
  );
}
