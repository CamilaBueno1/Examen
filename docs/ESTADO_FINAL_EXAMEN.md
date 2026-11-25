# Estado de verificación — Examen EPN

## Compilación y configuración

- La [compilación con el icono de Control Electoral](https://expo.dev/accounts/camilabuenor/projects/examen/builds/2b63aff4-e987-4be2-b80f-712eeb16c2d9) se envió a EAS. Usa el icono adaptativo de urna, su variante monocromática y una pantalla inicial con la misma identidad. Android mantiene el identificador del paquete y la firma de las versiones anteriores.

- La [compilación con catálogo versionado](https://expo.dev/accounts/camilabuenor/projects/examen/builds/64bc16d7-5bee-4ab5-89b9-95e5d89058cc) se envió a EAS después de pasar TypeScript, lint y las 18 pruebas automatizadas.

- La [compilación con validación de evidencia y candidaturas offline](https://expo.dev/accounts/camilabuenor/projects/examen/builds/e11916d4-a32c-440a-94aa-9f62d1c0cede) se envió a EAS para verificar la revisión actual. Metro generó el bundle Android de esta revisión y se comprobó la inclusión de las tres variables públicas. Solo hay un emulador conectado para esta revisión.

- La [compilación con la corrección de acceso offline](https://expo.dev/accounts/camilabuenor/projects/examen/builds/240b51a8-4ae0-4641-9fe6-4c1100afbf08) incorpora la restauración del perfil activo desde SQLite en modo avión y un mensaje de conexión en español para el ingreso con correo y contraseña. Las pruebas del adaptador cubren además el fallo DNS, la cuenta pendiente, la separación de perfiles y el cierre de sesión sin red.

- Proyecto EAS individual `@camilabuenor/examen`. Perfil `preview`, ambiente `preview`, distribución interna, formato Android APK y paquete `ec.controlelectoral.examen`.
- EAS confirmó la carga de `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` y `EXPO_PUBLIC_SENTRY_DSN`. El archivo `.env` permanece ignorado. Los demás nombres locales no tienen consumidores en el bundle de la aplicación.
- EAS completó la compilación inicial y la final. La versión final incorpora la corrección de precarga offline. [Compilación inicial](https://expo.dev/accounts/camilabuenor/projects/examen/builds/ee3dc9b7-64a6-42a4-a390-46ee7bc1ac89) · [Compilación final](https://expo.dev/accounts/camilabuenor/projects/examen/builds/87da77e1-74d1-4bac-94f0-8f8525d9e85e) · [Descargar APK final](https://expo.dev/artifacts/eas/O95tVQowL9yEEYVOu4lPQQNDnJH9AdN8P-K_jJsyhqo.apk).
- Ambas APK se instalaron en un emulador Android 15. La final arrancó en frío, mostró el inicio de sesión, validó correo y contraseña vacíos al enviar y permitió abrir recuperación y volver al inicio. No se registraron errores de `AndroidRuntime` ni `ReactNativeJS` durante el recorrido. `apksigner` verificó la firma Android v2 y la inspección de la APK confirmó los tres valores públicos incorporados y ningún archivo `.env` empaquetado.
- Los mapas de código de Sentry requieren una carga autenticada. El perfil de APK deshabilita la carga automática mediante `SENTRY_DISABLE_AUTO_UPLOAD`. El DSN público sigue habilitado para eventos de ejecución.

## Requisitos funcionales

La inspección de 131 archivos TypeScript confirmó las tres capas en los cinco módulos, sin ciclos en importaciones de ejecución ni importaciones directas del dominio hacia interfaz, adaptadores o SDK externos. `ActaVoteCard` referencia un tipo del formulario mediante `import type`, que TypeScript elimina del JavaScript.

**Local** indica una prueba ejecutada sin cuentas de producción. **Inspección** indica evidencia del código o catálogo, con la prueba del flujo aún pendiente.

| Requisito | ADR | Archivo o componente | Prueba y resultado |
| --- | --- | --- | --- |
| RF-01 Alta y baja jerárquica | 04, 05 | `create-user/index.ts`, `registerUser.ts`, `authAdapter.ts` | Local. Validación y normalización pasan. Se desactivó el autorregistro en Examen y la API confirmó el cambio. Alta y baja completas por rol pendientes. |
| RF-02 Login, OTP y recuperación | 04, 12 | `FirstAccessScreen.tsx`, `firstAccess.ts`, `resetPassword.ts` | Local. Delegación del OTP y cambio pasan. Se corrigió la plantilla de recuperación que mandaba un enlace. Entrega del código y recuperación en APK pendientes. |
| RF-03 Recintos y coordinador | 02, 05, 06 | `RecintosScreen.tsx`, `recintosAdapter.ts` | Índice remoto de asignación vigente verificado. Creación desde APK pendiente. |
| RF-04 Asignación y reemplazo | 05, 06 | `AsignacionesScreen.tsx`, migración `202611250001` | Local. Reemplazo, historial, varias JRV por veedor, rechazo de duplicados. Integración autenticada pendiente. |
| RF-05 Dos dignidades y cuadratura | 02, 07 | `ActaCaptureScreen.tsx`, `recibir_acta` | Local. Casos válidos e inválidos de votos pasan. Captura y recepción reales pendientes. |
| RF-06 Cámara y nitidez | 09 | `ActaCaptureScreen.tsx`, `AnalizadorNitidez.tsx` | Local. Imágenes nítida, borrosa, oscura y con reflejo pasan. Cámara física pendiente. |
| RF-07 GPS y mapa | 09 | `ActaCaptureScreen.tsx`, `ActaMap.tsx` | Inspección. Metadatos originales y advertencias. Validación del GPS y mapa en teléfono pendiente. |
| RF-08 Corrección y auditoría | 05, 07 | `revisarActas.ts`, `corregir_acta` | Local. Motivo, cuadratura y revocación pasan. Corrección autorizada en app pendiente. |
| RF-09 Estado e idempotencia | 02, 08, 12 | `estadoActa.ts`, `enviarPendientes.ts`, `recibir_acta` | Local. Estados terminales verificados. Reintentos reales pendientes. |
| RF-10 Acceso territorial | 05, 06 | `mesas_autorizadas`, migración `202611250001` | Local PostgreSQL. Pruebas negativas RLS y RPC pasan. En Examen se confirmaron seis tablas con RLS y el bucket privado. La lectura de JRV, actas y fotos coincide con el ámbito de tres perfiles activos, uno por rol, mediante una transacción de solo lectura. |
| RF-11 Resultados preliminares | 10 | `AvanceElectoral.tsx`, `avanceAdapter.ts` | Local. Reportada y respaldada diferenciadas. La publicación remota incluye `cambio_electoral`. Agregado y entrega de eventos al cliente pendientes. |
| RF-12 Offline | 03, 08 | `mesasProvider.ts`, `catalogoAutorizado.ts`, `actaDao.ts`, `colaActasSqlite.ts` | El panel del veedor ahora precarga JRV y organizaciones. Una prueba de regresión verifica la escritura de ambas y su lectura sin llamadas remotas. Reinicio y reconexión en APK pendientes. |
| RF-13 Diagnóstico | 11 | `sentry.ts`, `ProvincialDashboard.tsx` | DSN confirmado por EAS. La ingesta Sentry aceptó un evento de transporte sin datos personales (HTTP 200, ID `db89baf39ffe4b82bb7340deb0c8693b`). Evento desde APK pendiente. |
| RF-14 Catálogo | 03 | `catalogoAutorizado.ts`, `consultarMesas.ts`, `202611250003` | La descarga conserva las candidaturas de ambas dignidades en SQLite y valida que el catálogo incluya cinco organizaciones completas. Examen confirmó cinco candidaturas por dignidad y lectura restringida a perfiles activos. Falta acreditar la correspondencia y cobertura de los datos instalados; las semillas son de prueba. |

## Requisitos no funcionales y supuestos

| Elemento | ADR | Archivo o componente | Evidencia y resultado |
| --- | --- | --- | --- |
| RNF-01 APK y Android físico | 12 | `eas.json` | APK final firmada, instalada y probada en emulador Android 15. Teléfono físico pendiente. |
| RNF-02 Clean Architecture | 01 | `src/modules` y `src/app` | Inspección de capas y rutas. TypeScript pasa. |
| RNF-03 Confidencialidad | 05 | RLS, Storage, adaptador Supabase | RLS negativo en PostgreSQL aislado. La API de Examen bloqueó lectura anónima y el SQL de solo lectura verificó los tres ámbitos reales. Descarga autenticada de archivos desde APK pendiente. |
| RNF-04 Integridad | 02, 06, 07, 08 | Validadores de dominio, índices y RPC | PostgreSQL aislado rechazó una segunda acta de la misma JRV y dignidad y permitió la segunda dignidad. El índice único se aplicó y confirmó en Supabase Examen. |
| RNF-05 Persistencia antes de avisar | 08 | `actaDao.ts`, outbox | Inspección del guardado transaccional. Cierre forzado en APK pendiente. |
| RNF-06 Operación visible | 07, 12 | `Ui.tsx`, pantallas protegidas | Linter pasa. Diseño conservado. Recorrido completo de roles pendiente. |
| RNF-07 Privacidad de diagnósticos | 11 | `sentry.ts` | Inspección de filtros, etiquetas y cola de errores. Validación desde APK pendiente. |
| RNF-08 Resultados en vivo | 10 | `avanceAdapter.ts`, `AvanceElectoral.tsx` | Inspección de eventos y consultas. Validación de actualización online pendiente. |
| S-01 Pichincha / Rumiñahui | 03 | Catálogo autorizado de Supabase/SQLite | Jurisdicción verificada en RPC. Fuente oficial del padrón pendiente. |
| S-02 Alta provincial externa y precarga | 03, 04 | `create-user`, restauración de sesión | Inspección del rol y estado. Escenario de primera descarga pendiente. |
| S-03 Reemplazo por JRV | 06 | Migración `202611250001` | Local PostgreSQL. Otras JRV y el historial se conservan. |
| S-04 Reportada / respaldada | 08, 10 | `calcularAvanceJrv.ts`, `RevisionActasScreen.tsx`, `validar_evidencia_recinto` | El detalle permite validar la foto cargada al coordinador activo. PostgreSQL aislado confirmó el paso de recibida a respaldada; la interfaz distingue ambos estados. Recorrido autenticado pendiente. |
| S-05 Umbral 300 m y 100 m | 09 | `ActaCaptureScreen.tsx` | Inspección de umbrales. Prueba física pendiente. |
| S-06 Tres intentos de foto | 09 | `ActaCaptureScreen.tsx`, analizador | Local. Clasificación orientativa pasa. Secuencia física pendiente. |
| S-07 Versiones en correcciones | 07 | `revisionActasAdapter.ts`, `corregir_acta` | Contrato y SQL inspeccionados. Conflicto concurrente real pendiente. |
| S-08 Revocación offline | 05, 06, 08 | `enviarPendientes.ts`, `recibir_acta` | Local. Operación retenida con `PERMISO_REVOCADO` y acta intacta. |

## Auditoría de ADR

| ADR | Decisión y alternativas descartadas | Implementación y verificación |
| --- | --- | --- |
| 01 | Tres capas por módulo y Zustand. Evita capas globales y estado persistente en el store. | Cinco módulos en `src/modules`, composición por módulo. Inspección de imports y TypeScript. |
| 02 | Supabase/PostgreSQL relacional. Prioriza integridad transaccional frente a bases documentales o backend propio. | Adaptadores Supabase, tablas, RPC e índices remotos inspeccionados. |
| 03 | Catálogo versionado y copia SQLite. Descarta depender de red o de un catálogo ficticio fijo. | Caché por usuario, compatible con copias anteriores. La revisión `202611250004` permite reutilizar organizaciones y candidaturas de la misma versión. Las asignaciones se refrescan en línea. La prueba aislada confirmó que repetir la semilla no duplica registros y que una edición de candidatura avanza la versión. Falta acreditar la fuente y cobertura del catálogo instalado. |
| 04 | Alta administrativa con Auth Admin, Edge Function y OTP. Descarta autorregistro, consulta de cédula externa y activación basada solo en enlaces. | `create-user`, dominio de autenticación y plantilla OTP. Prueba de entrega pendiente. |
| 05 | RLS, Storage privado y autorización vigente. Descarta depender del filtro de pantalla o añadir backend propio. | Migración auditada y probada en PostgreSQL aislado. |
| 06 | Historial y reemplazo transaccional, con índice parcial. Descarta sobrescribir la asignación o reemplazar todas las JRV a la vez. | `cambiar_veedor_jrv`, pantalla de asignación y pruebas SQL. |
| 07 | React Hook Form + Zod, reglas puras y SQL con versión. Descarta última escritura gana. | Formularios, validadores y RPC. Pruebas locales de reglas pasan. |
| 08 | SQLite, archivos privados, outbox y NetInfo. Descarta depender solo de red o usar estado temporal como almacenamiento. | DAO local y caso de uso de sincronización. Falta probar reinicio físico. |
| 09 | Expo Camera, Expo Location, Leaflet/WebView y nitidez orientativa. Descarta galería y validación manual como única señal. | Pantalla de captura y mapa. Comparación de imágenes ejecutada. |
| 10 | SQL sobre actas vigentes y Supabase Realtime. Descarta sumar historiales o acumular eventos en el cliente. | Adaptador de avance y consulta remota. Realtime extremo a extremo pendiente. |
| 11 | Sentry con eventos sanitizados y mapas de código. Descarta depender solo de logs del dispositivo. | DSN en EAS y filtros existentes. Faltan mapas de código y recepción del reporte de la APK. |
| 12 | Expo Router, Uniwind, Lottie y Reanimated. Descarta un navegador único con alertas genéricas. | APK final y navegación pública verificadas en Android. Recorridos autenticados por rol pendientes. |

## Rúbrica y pruebas

| Criterio | Evidencia actual |
| --- | --- |
| Acceso de usuarios | RF-01/02, pruebas de dominio y configuración de correo. Validación real pendiente. |
| Registro del veedor | RF-05–09 y RF-12, pruebas de reglas y cola. Cámara/GPS/SQLite físico pendientes. |
| Gestión de recinto | RF-04/10, 10 escenarios SQL aislados. Recorrido autenticado pendiente. |
| Gestión y seguimiento provincial | RF-03/11, índices reales y pruebas de conteo. Realtime real pendiente. |
| Detección de fallos | RF-13, diagnóstico y DSN en código. Captura de evento de la APK pendiente. |
| Capas y estado | RNF-02, módulos, contratos y store inspeccionados. |
| Navegación, retroalimentación y consistencia | RNF-06, rutas protegidas, mensajes y animaciones existentes. Diseño conservado. |
| Fase grupal | Consolidado e individuales disponibles. Video y evaluación del equipo corresponden a la entrega académica. |
| Defensa oral | Guion de seis minutos, decisiones y archivos de referencia en `DEFENSA_EPN.md`. |

En la revisión actual pasaron `npx tsc --noEmit`, `npx expo lint`, `npx expo install --check`, `npx expo-doctor` (20/20) y las 18 pruebas de `node --test scripts/prueba-roles.cjs`. La exportación Android de validación compiló el bundle JavaScript; no se generó una APK y se eliminó el directorio temporal. Metro recuperó un caché incompatible mediante un rastreo completo y compiló correctamente. Persisten advertencias del paquete `expo-router` por una ruta de exportación ausente (resuelta mediante fallback) y de Sentry por no tener `organization`/`project` configurados para la carga de símbolos. Los recorridos con teléfono, credenciales de prueba y catálogo verificable siguen pendientes.

La migración de asignaciones `202611250001` y la actualización de `create-user` se aplicaron con autorización explícita en Examen. Se confirmó la presencia de la RPC de reemplazo y la publicación de la función tras recargar. La verificación en PostgreSQL usó el rol `authenticated` y el ámbito de tres perfiles reales dentro de una transacción de solo lectura. Las operaciones autenticadas desde la APK siguen pendientes de probar.

La cadena base `01`–`09` se recuperó del commit `9193a5d`. Las trece migraciones actuales se ejecutaron en orden sobre PostgreSQL aislado, con esquemas mínimos que simulan Auth y Storage. La instalación limpia con los servicios reales de Supabase sigue pendiente. Se aplicaron las migraciones `202611250002` y `202611250003` con autorización explícita en Examen. Una consulta de solo lectura confirmó el índice único, RLS y la política restrictiva de perfiles activos.

Se localizó la hoja oficial de recintos de las Seccionales y CPCCS 2027, cuyo nombre identifica el corte del 14 de octubre de 2026, y el portal oficial de candidaturas. El intento de descarga directa devolvió un CAPTCHA, por lo que la cobertura y correspondencia de las filas de Rumiñahui quedan sin certificar. Las semillas existentes siguen identificadas como datos de prueba. [Distributivo del CNE](https://www.cne.gob.ec/distributivo-de-recintos-electorales-2/) · [Portal Voto Informado](https://votoinformado.cne.gob.ec/voto-informado/).

El CNE publicó también el distributivo de electores y JRV, actualizado el 14 de agosto de 2026. Las descargas automatizadas de las dos hojas respondieron con HTML en lugar de Excel. Se encontró un distributivo histórico de Pichincha con recintos de Rumiñahui y planes individuales de candidaturas para Alcaldía y Prefectura. Estos documentos no bastan para identificar todas las JRV y candidaturas del mismo proceso. No se importaron filas al catálogo. [Electores y JRV](https://www.cne.gob.ec/download/distributivos-de-electores-y-juntas-receptoras-del-voto/) · [Distributivo histórico](https://delegaciones.cne.gob.ec/wp-content/uploads/2018/02/Distributivos_de_los_recintos_electorales_de_Pichincha.pdf) · [Plan de Alcaldía](https://backend-apps.cne.gob.ec/vi/api/Catalogos/PlanTrabajo/140/6878/200) · [Plan de Prefectura](https://backend-apps.cne.gob.ec/vi/api/Catalogos/PlanTrabajo/140/10464/5352).

Para ADR-05 se consultó el consolidado oficial. El archivo individual `ADR-05 (3).md` del árbol de trabajo contiene SQL y no la transcripción de la decisión.

La migración `202611250004` se aplicó con autorización explícita en Supabase Examen. La API devolvió HTTP 401 al consultar la versión sin una sesión. La cadena de catorce migraciones pasó en PostgreSQL aislado junto con la repetición de la semilla y la comprobación del incremento de versión tras cambiar una candidatura. Este cambio conserva las actas y la cola de sincronización local.
