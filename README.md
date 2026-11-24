# Control Electoral

Aplicación móvil React Native para registrar actas de alcaldía y prefectura, conservar evidencia, trabajar sin conexión y dar seguimiento al escrutinio interno. La organización por módulos aplica Clean Architecture; la interfaz usa Expo Router, Uniwind, Lottie y Reanimated.

## Preparar el proyecto

1. Instala las dependencias con `npm install`.
2. Configura `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` y `EXPO_PUBLIC_SENTRY_DSN` en el entorno local. No incluyas una clave `service_role` en la app.
3. En el proyecto Supabase, aplica en orden las migraciones `supabase/migrations/01_init.sql` a `08_gestion_recintos_cuentas.sql`.
4. Despliega la Edge Function `create-user`. El backend debe conservar `SUPABASE_SERVICE_ROLE_KEY` como secreto.
5. Carga el catálogo electoral verificado antes de usar la app. `supabase/seed/catalog.sql` es solo un catálogo reducido de pruebas; sus organizaciones y candidatos de ejemplo no son datos electorales reales.

Las cuentas de prueba, el primer acceso y la configuración del proyecto Supabase se describen en [docs/PRUEBAS_POR_ROL.md](./docs/PRUEBAS_POR_ROL.md).

## Desarrollo y verificaciones

```bash
npx expo start
npx expo lint
npx tsc --noEmit
node --test scripts/prueba-roles.cjs
```

Para validar el bundle Android:

```bash
npx expo export --platform android
```

La integración nativa de Sentry requiere reconstruir la aplicación. Para publicar la APK en Android se necesita una compilación Expo/EAS y probarla en un dispositivo físico; exportar el bundle no genera por sí mismo una APK.
