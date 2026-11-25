# Revisión de asignaciones de veedores

## Regla que se defiende

La asignación vigente se identifica porque su columna `hasta` es nula. PostgreSQL permite una asignación vigente por JRV y un coordinador vigente por recinto. Las filas cerradas permanecen disponibles como historial. El índice es por JRV, por lo que un veedor puede cubrir varias juntas. Esto implementa RF-04 y ADR-02/06.

El coordinador confirma una asignación si la mesa está libre. Si está ocupada, la pantalla muestra el responsable y confirma un reemplazo con el identificador de esa asignación. PostgreSQL bloquea la JRV, comprueba que el responsable vigente sea el que vio el coordinador y cambia las dos filas en la misma transacción. Si otro equipo modificó esa JRV primero, la solicitud se rechaza y la app vuelve a consultar el historial. La autoría y las actas permanecen intactas.

Un veedor nuevo también puede ser el reemplazo. El registro indica **Registrar y reemplazar**, y la Edge Function envía la asignación esperada a una RPC restringida a `service_role`. El titular sigue pendiente hasta completar su OTP y cambiar la clave. El alta sin confirmación solo admite JRV libres.

## Evidencia del proyecto Examen

Se consultó el catálogo del PostgreSQL remoto mediante consultas de lectura.

| Comprobación | Resultado remoto |
| --- | --- |
| Índice parcial de veedor vigente | Existe `idx_asignacion_veedor_jrv_vigente` sobre `jrv_id`, con `hasta IS NULL`. |
| Índice parcial de coordinador vigente | Existe `idx_asignacion_coordinador_recinto_vigente` sobre `recinto_id`, con `hasta IS NULL`. |
| Duplicados vigentes | Cero JRV y cero recintos con más de una fila vigente en la inspección. |
| RPC anterior | Serializaba el cambio por JRV y cerraba el historial correctamente, pero también reemplazaba desde una solicitud sin confirmación del responsable esperado. El alta jerárquica hacía lo mismo. |
| Lecturas directas | `jrv`, `recinto` y las dos tablas de asignación tenían RLS desactivado. Los roles móviles tampoco tenían SELECT directo en esas tablas durante la inspección. |
| Actas y fotos | RLS habilitado. Las políticas heredadas comparaban el ID de perfil asignado con el UID de Auth y declaraban escritura para el provincial. Los privilegios efectivos de las tablas ya impedían esas escrituras directas a roles móviles. |
| RPC de actas y Storage | La lectura de actas y sus historiales delega en `mesas_autorizadas`. Las políticas de Storage llaman a funciones de lectura y subida vinculadas a la JRV vigente. `recibir_acta` y `corregir_acta` bloquean la JRV y comprueban el ámbito antes de escribir. |

## Corrección preparada

- La migración `202611250001_asignaciones_y_permisos_vigentes.sql` conserva los índices y los datos. Activa RLS en territorio y asignaciones, y sustituye las políticas heredadas de actas y fotos por lecturas vinculadas al ámbito vigente. Las escrituras de la app pasan por las RPC existentes de registro y corrección con historial. El provincial conserva lectura dentro de su jurisdicción.
- `mesas_autorizadas` exige perfil activo y estado `ACTIVE`. La subida y el registro de evidencia comprueban de nuevo el ámbito y comparten el bloqueo de la JRV con el reemplazo. Las políticas del bucket privado conservan sus funciones de control.
- La pantalla de asignación muestra el responsable vigente y distingue **Confirmar asignación** de **Confirmar reemplazo**. La pantalla de alta distingue el reemplazo de una mesa libre. Se mantienen las rutas, el diseño y las animaciones.
- Si el servidor devuelve `PERMISO_REVOCADO` para un acta offline, la sincronización existente conserva la operación y la fotografía local en SQLite para revisión. Ese envío no modifica el acta del servidor.

## Pruebas

`supabase/tests/asignaciones_veedores.sql` usa datos sintéticos en una transacción con rollback. Se ejecutó tras la migración en un motor PostgreSQL aislado (PGlite) con un esquema de prueba y las RPC relevantes copiadas del catálogo remoto.

| Caso | Resultado aislado |
| --- | --- |
| 1. Asignar A a JRV 001 | Permitido. |
| 2. Asignar B a JRV 001 ya ocupada | Rechazado por la RPC y por el índice si se intenta una segunda fila. |
| 3. Asignar A también a JRV 002 | Permitido. |
| 4. Reemplazar A por B en 001 | Solo B queda vigente. Se rechaza confirmar nuevamente con una asignación desactualizada. |
| 5. Conservar A en 002 | Comprobado. |
| 6. Conservar el historial de 001 | La asignación anterior tiene fecha de cierre y se conserva la autoría del acta. |
| 7. A intenta consultar o corregir 001 | Lecturas de JRV, acta y foto filtradas. La RPC de corrección y la de evidencia devuelven `PERMISO_REVOCADO`. |
| 8. B intenta consultar otra JRV | Lectura filtrada. B sí puede leer el acta y la evidencia de 001. |
| 9. El coordinador intenta asignar en otro recinto | Rechazado. |
| 10. A sincroniza una operación capturada antes del reemplazo | Rechazada. Los votos, la versión y la autoría del acta permanecen iguales. |

También se verificó que el alta confirmada conserva el historial, el nuevo veedor pendiente no puede consultar la JRV, se rechaza otra asignación vigente de coordinador y el provincial no puede editar actas. La prueba local de sincronización comprueba el estado terminal `PERMISO_REVOCADO`.

## Despliegue y verificación pendiente

La revisión automática impidió ejecutar DDL y crear fixtures en Examen incluso dentro de una transacción de prueba. El inventario remoto se completó en modo de lectura. La migración, el despliegue de `create-user` y la validación autenticada en Android/Supabase quedan pendientes de autorización para el proyecto real. El orden de despliegue es **migración → Edge Function → cliente móvil**, porque los formularios usan las RPC nuevas.

Los índices remotos actuales impiden dos filas vigentes por JRV o recinto. El riesgo observado era un reemplazo involuntario, además de las reglas heredadas de permisos. La confirmación optimista y las políticas corregidas reducen ese riesgo una vez desplegada la migración.
