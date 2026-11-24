# ESTADO_PROYECTO

## Interfaz y pruebas por rol

- Las pantallas de rol usan los módulos funcionales y sus puntos de composición. La paleta de Uniwind utiliza blanco cálido y azul petróleo, con contornos en encabezados.
- `03_mesas_autorizadas.sql` agrega consultas de JRV y avance por ámbito del usuario activo. `04_gestion_veedor.sql` agrega historial y asignación transaccional de veedores ya ligados al recinto.
- El registro del veedor usa JRV autorizadas e identificadores del catálogo. El adaptador copia la foto al almacenamiento del dispositivo y guarda acta, votos y operación pendiente en una transacción SQLite. El detalle local incluye coordenadas y mapa.
- Se agregó restablecimiento y primer acceso con OTP, cierre de sesión para los tres roles y una caché SQLite de mesas y organizaciones vinculada a cada cuenta. La semilla `supabase/seed/prueba_roles.sql` vincula cuentas Auth previamente confirmadas en un proyecto de pruebas. El procedimiento está en `docs/PRUEBAS_POR_ROL.md`.
- Queda pendiente desplegar las migraciones y verificar los flujos autenticados. Estado funcional pendiente: alta jerárquica completa, gestión provincial de recintos y coordinadores, restauración de sesión offline al reiniciar, envío idempotente y evidencia, correcciones con control de versión, estadísticas por candidatura y Realtime.

## ADR-01 — Clean Architecture por módulos

Se revisó la decisión oficial en la sección 4.1 del consolidado. En `docs/` hay diez archivos individuales, cuyos títulos internos cubren ADR-01 a ADR-10. Las ADR-11 y ADR-12 constan en el consolidado.

| Módulo | Implementación actual |
| --- | --- |
| `authentication` | Entidades, contrato y caso de uso `RegisterUser` en `domain`. Adaptadores de Supabase y SQLite en `data/adapters`. Store temporal de sesión y rol en `presentation`, pendiente de conexión al flujo de autenticación. |
| `territorio` | Entidades y contrato en `domain`. Adaptadores de Supabase y SQLite en `data/adapters`. Pantallas y casos de uso propios pendientes. |
| `actas` | Entidades y contrato en `domain`. Adaptadores de Supabase y SQLite en `data/adapters`. Casos de uso, pantallas y servicios de captura pendientes. |
| `sincronizacion` | Tipo, contrato y caso de uso de conectividad en `domain`. Adaptador NetInfo y repositorio de conectividad en `data`. Store y hook en `presentation`. El layout raíz activa la observación de red. Cola local y envío pendientes. |
| `seguimiento` | Modelo de actas vigentes y caso de uso de avance por JRV en `domain`. Consulta agregada, Realtime y panel pendientes. |

Los adaptadores Supabase existentes implementan directamente los contratos de repositorio del dominio. `SqliteActaDao` declara explícitamente el mismo contrato que el adaptador remoto de actas. El repositorio de conectividad traduce las señales del adaptador NetInfo a estados del dominio. `src/app/_layout.tsx` compone el caso de uso con el repositorio de conectividad. El layout visual de `src/shared/presentation/` tiene únicamente dependencias de interfaz. Zustand mantiene estado temporal en memoria. SQLite sigue siendo la tecnología acordada para persistencia local.

## Verificaciones

### Corrección del arranque

- La ruta inicial muestra el login directamente cuando no hay sesión activa y su contenedor establece `flex: 1` mediante estilos nativos. Se verificó que `/` y `/login` devuelven HTTP 200 con el formulario y que el bundle Android se exporta.

- Se corrigió la declaración duplicada del tema del login y se conectó la pantalla de recuperación con su caso de uso existente.
- El adaptador SQLite de actas abre la misma base local de forma asíncrona al realizar la primera operación. Importar la pantalla ya no abre la base.
- `npx.cmd tsc --noEmit` y `npx.cmd expo lint` pasan en el estado actual. Las verificaciones de la reorganización inicial se conservan abajo como historial.
- Se exportaron por separado los bundles web y Android. En el servidor web local, `/login` y `/recover` devolvieron HTTP 200 y el contenido esperado. Queda pendiente abrir Expo Go en un dispositivo conectado.

- Se verificó la resolución de importaciones internas sin la declaración comodín que aceptaba cualquier alias `@/`. El grafo de 46 archivos y cinco módulos quedó libre de ciclos. El dominio solo importa otros archivos de dominio y la presentación no importa la capa data.
- Pasaron las pruebas en memoria de `RegisterUser`, avance de JRV y suscripción y cancelación de conectividad.
- La exportación web de Expo pasó. El servidor local devolvió HTTP 200 y el contenido esperado para `/` y `/explore`.
- Expo exportó correctamente el bundle JavaScript de Android. La ejecución en dispositivo queda sin verificar.
- `npx tsc --noEmit` conserva 55 errores previos, concentrados en dependencias de persistencia y UUID ausentes, callbacks SQLite sin tipos y desajustes entre `User` y los adaptadores.
- `npx expo lint` conserva 12 errores y 1 advertencia de código previo. Ambos comandos se ejecutaron mediante `npx.cmd`.

## PostgreSQL, precarga y seguridad

`supabase/` contiene la migración inicial, políticas RLS y el seed de catálogo. Sigue pendiente ejecutar los scripts y verificar los adaptadores contra el esquema y SQLite con una aplicación en ejecución.
