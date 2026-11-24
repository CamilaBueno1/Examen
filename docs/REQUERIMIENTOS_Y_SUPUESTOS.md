# Documento consolidado de requerimientos y decisiones técnicas

Examen I - Desarrollo de Aplicaciones Móviles

Control Electoral para Organización Política

## 1. Datos del equipo

| Dato | Detalle |
| --- | --- |
| Integrante 1 | Camila Bueno |
| Integrante 2 | Gelen Ortiz |
| Integrante 3 | Mateo Piedra |
| Fecha de la reunión | 22/11/2026 |
| Duración de la reunión | 02 h 13 min 43 s |
| Enlace del video | https://drive.google.com/file/d/1MPoyKaOzMcuzNPmsEVt7FmAk2LDbD6f1/view?usp=sharing |

## 2. Requerimientos acordados

Los requerimientos se consolidaron por proceso a partir de los análisis individuales de los tres integrantes. Cada requerimiento identifica la necesidad del enunciado que lo origina.

### 2.1 Requerimientos funcionales

| Código | Requerimiento | Necesidad que lo origina |
| --- | --- | --- |
| RF-01 | Crear y desactivar cuentas exclusivamente según jerarquía provincial → coordinador de recinto → veedor. Registrar cédula ecuatoriana válida y única, nombres, apellidos, teléfono y correo. Conservar historial de cuentas desactivadas. | Acceso de los usuarios: el autorregistro produjo datos incompletos y la organización exige que nadie ingrese sin habilitación. |
| RF-02 | Autenticar con correo y contraseña; exigir verificación de correo y sustitución de clave temporal en el primer acceso; permitir recuperación autónoma de contraseña. | Acceso de los usuarios: quien crea la cuenta conoce la clave inicial y el provincial no debe actuar como soporte de contraseñas. |
| RF-03 | Permitir al coordinador provincial consultar y agregar recintos con cantón, parroquia, nombre y JRV, y designar un único coordinador de recinto vigente. | Organización del territorio: el provincial administra recintos y existe un solo responsable por recinto. |
| RF-04 | Asignar un veedor vigente por JRV; una persona puede cubrir varias JRV. Permitir reemplazo de ausentes sin perder autoría ni historial de asignaciones. | Organización del personal: escasez de veedores y sustituciones imprevistas durante la jornada electoral. |
| RF-05 | Registrar por cada JRV dos actas (alcaldía y prefectura), con votos enteros no negativos para cinco organizaciones, blancos, nulos y sufragantes; validar que la suma de los siete valores coincida con los sufragantes. | Registro de resultados: números imposibles y sumas inconsistentes recibidas en elecciones anteriores. |
| RF-06 | Tomar con cámara una fotografía por acta, evaluar automáticamente indicios de desenfoque y permitir repetir la captura. Identificar de forma distinta las fotografías de calidad dudosa. | Registro de resultados: fotografías borrosas inutilizables para revisar o impugnar actas. |
| RF-07 | Capturar latitud, longitud, precisión y hora originales del acta; conservarlas al sincronizar y permitir consultar la ubicación de captura y la del recinto dentro de la aplicación. | Registro y seguimiento: cuestionamientos sobre el lugar de obtención de las fotografías. |
| RF-08 | Corregir actas según la responsabilidad vigente: veedor en sus JRV y coordinador en su recinto; registrar autor, hora, motivo y valores anteriores sin perder el historial. | Registro de resultados: errores frecuentes de transcripción y necesidad de ayuda de los coordinadores. |
| RF-09 | Mostrar el estado local/remoto de cada envío, reconocer reintentos y evitar registros duplicados de una misma JRV y dignidad. | Registro de resultados: usuarios repetían envíos al no conocer su resultado y provocaban duplicados. |
| RF-10 | Restringir consultas y modificaciones al territorio y responsabilidad vigentes de cada rol: veedor/JRV, coordinador/recinto y provincial/jurisdicción. | Confidencialidad: divulgación de información de mesas a personas no autorizadas. |
| RF-11 | Mostrar resultados preliminares por recinto, dignidad y candidatura, así como avance de JRV reportadas y respaldadas; reflejar actas nuevas y correcciones desde su versión vigente, sin duplicar votos. | Seguimiento del escrutinio: contar con información preliminar sin esperar al CNE. |
| RF-12 | Registrar votos, foto y coordenadas sin internet; recuperar pendientes después de cerrar la app y sincronizar cuando vuelva la conexión. | Conectividad electoral: recintos rurales sin señal y registros perdidos al transferirlos posteriormente. |
| RF-13 | Registrar fallos fatales y no fatales con datos técnicos suficientes para identificarlos, sin incorporar datos personales ni resultados electorales. | Estabilidad: cierres inesperados que el equipo técnico no pudo diagnosticar mediante mensajes de los usuarios. |
| RF-14 | Mantener precargado el catálogo de recintos, JRV, cinco organizaciones y candidaturas de alcaldía/prefectura para la jurisdicción elegida. | Restricción de datos precargados establecida expresamente en el examen. |

### 2.2 Requerimientos no funcionales

| Código | Requerimiento | Necesidad que lo origina |
| --- | --- | --- |
| RNF-01 | Entregar un APK React Native instalable y probado en un Android físico. La evaluación debe incluir cámara, GPS, almacenamiento local, navegación y reporte de fallos; registrar la versión de Android y las características del equipo. | Restricción obligatoria de plataforma y formato de entrega; penalización del examen por ausencia de APK. |
| RNF-02 | Aplicar Clean Architecture: el dominio no importa React, Expo, SQLite ni Supabase; las dependencias externas se conectan mediante contratos y adaptadores. | Restricción arquitectónica y defensa de código: demostrar separación de responsabilidades. |
| RNF-03 | Restringir desde servidor el acceso a filas y fotografías según rol, recinto y JRV vigentes; emplear transporte cifrado y no incorporar credenciales administrativas en el APK. | Filtración previa de datos y sensibilidad de cédulas, correos, fotos y resultados. |
| RNF-04 | Validar integridad tanto local como remotamente; aplicar unicidad de actas, idempotencia de operaciones y auditoría no editable por usuarios ordinarios. | Valores imposibles, actas duplicadas y necesidad de conocer el origen de cada cambio. |
| RNF-05 | No indicar «guardado» antes de persistir votos, metadatos y referencia a fotografía. Recuperar pendientes tras cierre forzado y tolerar pérdidas de conexión sin duplicaciones. | Jornada con conectividad irregular y equipos de recursos limitados. |
| RNF-06 | Presentar rutas por rol y estados de operación comprensibles, errores junto a los campos y mensajes explícitos, y mantener la identidad visual de la organización. | Usuarios de poca experiencia y criterios explícitos de diseño de la rúbrica. |
| RNF-07 | Distinguir fallos fatales y no fatales con versión, pantalla y tipo de dispositivo; suprimir cédulas, claves, fotos, ubicación y votos de todo reporte. | Necesidad de identificar el fallo y los dispositivos afectados sin depender del usuario. |
| RNF-08 | Calcular resultados desde la versión vigente de las actas en el servidor, actualizar mediante Supabase Realtime y refrescar tras reconexión; mostrar última actualización y distinguir avance numérico de evidencia respaldada. | Seguimiento del escrutinio en tiempo real y correcciones posteriores. |

## 3. Supuestos adoptados

Situaciones en que el enunciado no alcanzó para decidir y el supuesto que adoptó el equipo, con su justificación.

| Código | Ambigüedad que resuelve | Supuesto adoptado y justificación |
| --- | --- | --- |
| S-01 | El examen no fija provincia, cantón ni fuente exacta del padrón de recintos. | Se establece como alcance de implementación la provincia de Pichincha y el cantón Rumiñahui, propuestos durante la reunión (V1 21:25–21:46). El catálogo deberá contener los recintos y JRV correspondientes al territorio seleccionado, con fuente y fecha verificables, además de cinco organizaciones y sus candidaturas por dignidad. No se considerará suficiente un catálogo ficticio o parcial presentado como definitivo. |
| S-02 | No explica quién crea la primera cuenta provincial ni qué acciones pueden hacerse antes de disponer de una sesión. | La cuenta del coordinador provincial se provisiona de forma controlada fuera del APK. La creación de usuarios, verificación de correo, cambio de contraseña, recuperación y descarga inicial del catálogo requieren conexión. El registro offline se habilita después de iniciar sesión válidamente y disponer del catálogo y las asignaciones autorizadas en SQLite. |
| S-03 | No indica si el reemplazo de un veedor afecta una mesa o todas las asignadas. | El reemplazo se aplica a una JRV específica: se cierra únicamente su asignación vigente y se registra la nueva sin borrar el historial ni alterar las demás JRV a cargo del mismo veedor. Esta regla mantiene la trazabilidad y la posibilidad, exigida en el examen, de cubrir múltiples mesas. |
| S-04 | No define cuándo se considera completa una mesa ni cómo contar actas cuya fotografía sigue pendiente. | Se distinguen RESULTADO_RECIBIDO (valores de un acta confirmados en PostgreSQL), EVIDENCIA_PENDIENTE (fotografía sin confirmación), EN_REVISION (fotografía dudosa) y EVIDENCIA_RESPALDADA (fotografía aceptada). Una JRV se considera REPORTADA cuando están recibidas sus dos actas, alcaldía y prefectura; se considera RESPALDADA cuando ambas cuentan además con evidencia validada. El panel muestra por separado ambos avances para no ocultar fotos pendientes. |
| S-05 | No establece distancia máxima al recinto ni precisión mínima del GPS. | Se emplean 300 m como radio operativo de referencia y 100 m como umbral de precisión orientativa de GPS, valores debatidos en V1 (21:51–22:31 y 32:48–34:26). Si la lectura válida está fuera del radio o tiene precisión insuficiente, la aplicación advierte y conserva ambos valores, sin declarar fraude ni rechazar automáticamente la operación. Si no existe una lectura GPS válida, el acta permanece como borrador, no como evidencia enviada. |
| S-06 | No define una regla operativa ante fotografías que repetidamente resultan borrosas. | Ante indicios de desenfoque o mala iluminación se solicita repetir la captura; después de tres intentos fallidos puede conservarse la foto con estado CALIDAD_DUDOSA para revisión humana y no se considera evidencia validada. Este criterio recibió apoyo verbal durante V1 (30:30–31:03). |
| S-07 | El enunciado no establece cómo resolver correcciones realizadas sobre versiones distintas de una acta. | Las correcciones concurrentes se resuelven mediante control optimista de versiones: el cliente envía expected_version y el servidor modifica el acta solo si coincide con la versión vigente. Si difiere, devuelve CONFLICTO_VERSION, conserva la propuesta local y permite nueva corrección tras revisar el estado actual. No se emplea la regla de «última escritura gana», que podría sobrescribir una corrección válida. |
| S-08 | No aclara cómo tratar una operación pendiente enviada por un veedor que fue reemplazado mientras estaba sin conexión. | El servidor vuelve a verificar rol, recinto y asignación vigente cuando recibe cada operación pendiente. Si el veedor fue reemplazado durante la desconexión, rechaza la escritura remota, conserva el intento local con PERMISO_REVOCADO para revisión y no altera el acta. Los datos de otras mesas no se exponen al usuario sin autorización. |

## 4. Registro de decisiones técnicas (ADR)

Cada ficha presenta una decisión técnica del equipo con su contexto, las alternativas consideradas, sus consecuencias y el minuto de la reunión en que se discutió.

---

Las decisiones completas se encuentran en `ADR/` y `CONSOLIDADO_ADR_COMPLETO.md`.
