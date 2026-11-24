# Pruebas de Control Electoral

Usa un proyecto de Supabase de pruebas. Configura `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` y `EXPO_PUBLIC_SENTRY_DSN` localmente. No guardes claves administrativas en la app.

1. Aplica en orden las migraciones `01_init.sql` a `09_create_user_service_role_grants.sql`. Despliega la Edge Function `create-user` con la verificación JWT activada; `SUPABASE_SERVICE_ROLE_KEY` debe permanecer como secreto del backend. Si la app muestra `HTTP_404`, comprueba que `create-user` esté desplegada en el mismo proyecto que usa `EXPO_PUBLIC_SUPABASE_URL`; el archivo local por sí solo no despliega la función.
2. `supabase/seed/catalog.sql` es únicamente para pruebas: usa organizaciones/candidatos de ejemplo y tres recintos reducidos. No lo presentes como padrón electoral real. Para la entrega se requiere cargar un catálogo verificable de Pichincha/Rumiñahui y nombres autorizados para las cinco organizaciones y sus candidaturas.
3. En **Authentication → Users**, crea y confirma tres cuentas de prueba con contraseñas distintas. Sustituye en `supabase/seed/prueba_roles.sql` los tres correos por los que elegiste y ejecuta el archivo en SQL Editor. Esto vincula los perfiles y asigna al coordinador a Recinto Central y al veedor a la JRV 1. El script aborta antes de reemplazar una asignación vigente incompatible.
4. Para subir símbolos de depuración de Sentry durante compilaciones configura `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` y `SENTRY_PROJECT` como secretos del proceso de build. La integración nativa requiere una development build o APK Android.
5. Arranca el proyecto en PowerShell con `npx.cmd expo start --go --clear` y abre el QR en Expo Go. Usa un teléfono Android para probar cámara y ubicación.

| Sesión | Qué comprobar |
| --- | --- |
| Provincial | Abre **Territorio y recintos**. Con el catálogo de ejemplo completo deben aparecer seis JRV; el avance por recinto distingue reportadas y respaldadas. Registra un recinto de prueba y comprueba que las JRV queden en el catálogo. Crea un coordinador ligado a un recinto. |
| Recinto | Solo ve las JRV del Recinto Central. Con la semilla sin cambios deben aparecer las mesas 1 y 2. Crea un veedor y asígnalo a una JRV; luego, en **Veedores y asignaciones**, comprueba el historial y prueba la desactivación de una cuenta de veedor de prueba. |
| Veedor | Solo ve la JRV 1 del Recinto Central. Elige una dignidad y completa cinco votos, blancos, nulos y total. Un total incorrecto debe bloquear el guardado. Tras guardar con cámara y GPS, abre **Consultar actas** y revisa foto, conteo, estado y mapa en el detalle. |

Cierra sesión entre pruebas. Comprueba que la sesión del veedor solo abra su panel y que un enlace a una JRV ajena deje la cámara cerrada. Abre una captura con red para precargar asignaciones y organizaciones. Después activa modo avión para comprobar que puedes volver a abrir esa captura, guardar y consultar el historial en la misma sesión.

Ejecuta `node --test scripts/prueba-roles.cjs` para las pruebas de dominio. En la semilla reducida las coordenadas del recinto no están cargadas, por lo que la app mostrará la ubicación de captura sin un marcador de recinto. El envío remoto de actas requiere desplegar las migraciones de sincronización y un proyecto Supabase configurado.

Para probar **Recuperar contraseña**, configura la plantilla **Reset Password** de Supabase Auth para incluir `{{ .Token }}`. Para **Primer acceso**, usa un perfil de prueba pendiente con clave temporal y configura también `{{ .Token }}` en la plantilla **Magic Link**. Usa una cuenta de pruebas con acceso al correo. La semilla deja activas las tres cuentas para las pruebas de paneles.
