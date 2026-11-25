# Defensa de Control Electoral — EPN

Control Electoral registra y respalda el escrutinio de alcaldía y prefectura en las JRV autorizadas de Rumiñahui. El provincial administra su jurisdicción, el coordinador administra su recinto y el veedor trabaja con sus juntas vigentes.

## Cómo explicar el código

| Módulo | Punto de entrada | Decisión que conviene explicar |
| --- | --- | --- |
| Autenticación | `authentication/authProvider.ts`, `domain/usecases/firstAccess.ts` y `supabase/functions/create-user/index.ts` | La Edge Function valida jerarquía y territorio. El titular activa la cuenta con OTP y cambia la clave temporal. El validador de cédula calcula el dígito de control localmente. |
| Territorio | `territorio/mesasProvider.ts`, `domain/usecases/gestionarAsignaciones.ts` | El índice parcial permite un responsable por JRV. El reemplazo usa la asignación esperada, cierra solo esa fila y conserva las demás JRV y el historial. |
| Actas | `actas/presentation/ActaCaptureScreen.tsx`, `data/adapters/sqlite/actaDao.ts` | El acta combina cinco conteos de organizaciones, blancos, nulos y sufragantes. La app guarda la foto privada y después persiste el acta y su outbox en SQLite. Los metadatos del GPS pertenecen a la captura original. |
| Sincronización | `sincronizacion/domain/usecases/enviarPendientes.ts` y `data/adapters/recepcionActasSupabase.ts` | Un UUID identifica cada operación en reintentos. NetInfo avisa la reconexión. PostgreSQL revisa la autorización vigente y, si devuelve `PERMISO_REVOCADO`, se conserva el registro local. |
| Seguimiento | `seguimiento/presentation/AvanceElectoral.tsx` y `data/adapters/avanceAdapter.ts` | Realtime avisa de cambios y se vuelve a consultar el agregado del servidor. Una JRV reportada tiene sus dos actas recibidas. Para quedar respaldada necesita ambas evidencias validadas. |

Expo Router lleva a la pantalla de cada rol. Presentación recibe entradas y muestra estados con Uniwind, Lottie y Reanimated. Los casos de uso aplican reglas de negocio mediante contratos. Los adaptadores conectan Supabase, SQLite y los servicios de Expo. Zustand mantiene la sesión y la conectividad en memoria. La autorización que protege los datos se aplica en PostgreSQL y Storage.

## Demostración en seis minutos

Usa un entorno de prueba con cuentas y JRV ya autorizadas. Prepara un caso de activación pendiente y una JRV que se pueda modificar sin afectar datos reales. Consulta los pendientes en `ESTADO_FINAL_EXAMEN.md` antes de presentar.

| Tiempo | Acción |
| --- | --- |
| 0:00–0:45 | Abre la APK. Entra con el usuario de prueba, explica la jerarquía y muestra la activación por OTP si la entrega está verificada. |
| 0:45–1:35 | Abre Asignación y reemplazo como coordinador. Muestra dos mesas a cargo de un veedor y el historial de la mesa del ejemplo. |
| 1:35–3:10 | Como veedor, elige una JRV y dignidad. Muestra el error de cuadratura, corrige números, fotografía el acta y consulta el GPS de captura. |
| 3:10–4:15 | Activa el modo avión, guarda el acta y vuelve a abrir la APK. Reconecta y muestra los estados de sincronización. |
| 4:15–5:10 | Muestra resultados por dignidad y recinto. Explica la diferencia entre JRV reportada y respaldada y cómo se conserva el historial al corregir. |
| 5:10–6:00 | En el panel provincial usa el diagnóstico controlado y muestra el evento recibido en Sentry si ya se comprobó. Señala en el código el caso de uso, su contrato y el adaptador. |

## Preguntas posibles

- **¿Dónde se impide el acceso lateral?** RLS y las RPC identifican al titular con `auth.uid()`, pasan por su perfil y verifican el territorio y la asignación vigente.
- **¿Cómo se conservan la autoría y el historial?** La asignación anterior recibe fecha de cierre. Una corrección usa `expected_version`, guarda valores previos, autor y motivo, y actualiza solo la versión esperada.
- **¿Qué pasa si se pierde la red?** La app usa el catálogo previamente guardado y registra la operación en SQLite. Al recuperar conexión, el mismo UUID se reintenta y el servidor vuelve a verificar el permiso.
- **¿Cómo se prueba que la foto corresponde a la captura?** Se conservan latitud, longitud, precisión y hora originales. Las advertencias de distancia y precisión son orientativas.
- **¿Qué envía Sentry?** Código técnico, pantalla, versión y tipo de dispositivo. El filtro omite datos personales, fotos, ubicación y resultados.
