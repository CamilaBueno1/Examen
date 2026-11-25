# Pruebas de Control Electoral

## Alcance de esta guía

No se generó una APK en esta revisión. La exportación Android usada para validar Metro fue solo un bundle JavaScript y se eliminó al terminar.

Comprobaciones locales ejecutadas:

```powershell
npx tsc --noEmit
npx expo lint
npx expo install --check
npx expo-doctor
node --test scripts/prueba-roles.cjs
```

Para abrir el proyecto en Expo Go desde PowerShell:

```powershell
npx.cmd expo start --go --clear
```

La cámara, el GPS, el almacenamiento offline y los permisos deben probarse en un teléfono Android. Expo Go no sustituye la validación de una APK de entrega.

## Bloqueos de datos y backend

La cadena base `01`–`09` se recuperó del commit `9193a5d` y se armonizó con las migraciones incrementales actuales. La migración inicial no habilita PostGIS ni crea las tablas remotas `outbox`/`error_log`: ADR-08 mantiene la cola de actas en SQLite y ADR-11 usa SQLite y Sentry para diagnósticos. Para un proyecto **desechable de pruebas**, el orden es `01_init.sql` a `09_create_user_service_role_grants.sql`, luego `202611240001_catalogo_organizaciones_lectura.sql` y `202611250001_asignaciones_y_permisos_vigentes.sql`. La cadena restaurada no se ha aplicado ni validado contra el proyecto remoto existente.

El seed `supabase/seed/catalog.sql` crea cinco organizaciones ficticias, candidaturas de ejemplo y tres recintos reducidos; `supabase/seed/prueba_roles.sql` usa cuentas y cédulas ficticias. Ambos son exclusivamente para pruebas, no para el catálogo electoral de entrega. La guía aún requiere una fuente verificable y fechada para los recintos, JRV y las cinco organizaciones con candidaturas. El ADR-03 prohíbe presentar ejemplos como padrón real.

No ejecutes la cadena sobre una base existente sin comparar antes su esquema y las migraciones ya aplicadas. No sustituyas el catálogo oficial con datos inventados. No compartas claves ni archivos `.env`. `supabase/policies.sql` es un archivo obsoleto no ejecutable; las políticas vigentes están en las migraciones versionadas.

La Edge Function está en `supabase/functions/create-user/index.ts`; el archivo local no implica que la función esté desplegada. Su secreto de servicio debe permanecer en el backend. La recuperación y el primer acceso también requieren que Supabase Auth tenga configuradas las plantillas OTP descritas por ADR-04.

## Recorridos manuales cuando el backend y el catálogo estén disponibles

Usa cuentas de prueba sin datos personales reales, una por rol, y cierra sesión entre recorridos.

| Rol | Recorrido |
| --- | --- |
| Provincial | Consultar el territorio, registrar un recinto y asignar un coordinador. Verificar que la creación y las JRV persistan en Supabase. |
| Coordinador de recinto | Consultar solo las JRV autorizadas, registrar un veedor y reemplazar una asignación con motivo. Comprobar que el historial anterior se conserve. |
| Veedor | Abrir solo las JRV asignadas, precargar catálogo con conexión, activar modo avión, registrar un acta de cada dignidad y consultar el historial local. Verificar cuadratura, foto, GPS, estado de sincronización y mapa en un teléfono. |
| Diagnóstico | Provocar un error controlado con y sin conexión. Confirmar que el evento pendiente queda en SQLite y que, al recuperar internet, la recepción final se verifica en Sentry. |

No se considerará aprobada una prueba de integración por pasar únicamente las pruebas de dominio de `scripts/prueba-roles.cjs`.
