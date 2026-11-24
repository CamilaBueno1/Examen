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

### 4.1 ADR-01: Clean Architecture por módulos y estado compartido con Zustand

#### Requerimientos relacionados

RF-05, RF-09, RF-12; RNF-01, RNF-02, RNF-05

#### Contexto

El examen exige Clean Architecture, pero no fija cómo organizarla. Se comparó una organización por capas globales (domain, data y presentation para toda la aplicación) con una organización por funcionalidades. Se eligió la segunda porque la autenticación, el registro de actas y la sincronización cambian por separado: con módulos, cada flujo puede probarse y modificarse sin alterar los demás.

#### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| --- | --- | --- | --- |
| Módulos por funcionalidad con domain/data/presentation internos y Zustand | Camila (módulos); Gelen y Mateo (Zustand); consenso V2-P1 | Cada función tiene sus casos de uso, contratos, adaptadores y pantallas próximos; Zustand queda limitado al estado de presentación. | Sin disciplina pueden duplicarse entidades y validadores; requiere módulo compartido para reglas comunes. |
| Capas globales domain, data y presentation | Gelen; Mateo inicialmente defendió capas; luego aceptó módulos | Dependencias visibles y reglas de dominio agrupadas. | Los directorios de datos y presentación crecen con funcionalidades distintas y se navega más entre carpetas. |
| Módulos con React Context y useReducer | Camila (alternativa individual previa) | Sin dependencia externa y API conocida de React. | Los contextos grandes pueden generar renders innecesarios y los procesos de sincronización requieren adaptadores claros. |

#### Decisión

Se adopta Clean Architecture organizada por módulos: autenticación, territorio y asignaciones, actas, sincronización y seguimiento. Dentro de cada módulo, domain contiene entidades (por ejemplo, Acta), validaciones puras (por ejemplo, validarVotos), casos de uso con nombre de intención (RegistrarActa, CorregirActa, ConsultarActa) e interfaces de repositorio; data implementa los repositorios y los servicios externos (ActaLocalService, ActaRemoteService, CameraService, LocationService); presentation contiene pantallas, componentes y hooks que solo invocan casos de uso. El dominio no importa React, Expo, SQLite, Supabase ni interfaces gráficas. Expo Router conserva únicamente las rutas y delega las operaciones en casos de uso.

Zustand administra sesión, rol, conectividad y estados temporales de la interfaz; SQLite conserva catálogo, actas y operaciones pendientes. Los servicios externos se conectan mediante contratos de repositorio, de modo que cambiar la base de datos o la cámara no obliga a modificar las reglas electorales.

#### Consecuencias

Se gana la posibilidad de probar las reglas electorales sin iniciar la aplicación y de localizar los cambios por módulo. Se pierde simplicidad inicial, porque hay que mantener contratos y mapeos entre capas sin duplicar reglas. Se asume el riesgo de que los módulos compartan entidades o validadores de forma descuidada. Durante el desarrollo, cada módulo debe respetar la regla de dependencia: domain no importa React, Expo, SQLite ni Supabase, y el estado de Zustand no sustituye al almacenamiento persistente.

#### Minuto del video

Minuto de referencia del video final: 00:35:45

### 4.2 ADR-02: Supabase/PostgreSQL para el backend relacional

#### Requerimientos relacionados

RF-01, RF-03, RF-05, RF-08, RF-10, RF-11; RNF-03, RNF-04

#### Contexto

La relación entre usuarios, recintos, JRV, asignaciones, candidaturas, actas y correcciones requiere integridad referencial y control de acceso. En V2-P1 se contrastó Supabase/PostgreSQL con Firebase y otras alternativas; la elección permite manejar restricciones relacionales y consultas agregadas desde una fuente común.

#### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| --- | --- | --- | --- |
| Supabase: PostgreSQL + Auth + Storage + Realtime | Camila, Gelen y Mateo; propuesta en la reunión V2-P1 | Claves foráneas, restricciones UNIQUE/CHECK, consultas agregadas y servicios administrados bajo un proveedor. | Se debe diseñar el esquema y probar políticas; el servicio remoto no reemplaza la persistencia offline. |
| Firebase Auth + Firestore + Storage | Gelen y Mateo (comparación) | Servicios móviles integrados y actualizaciones en tiempo real. | La relación asignación vigente → JRV → recinto y las agregaciones requieren más diseño específico. |
| Appwrite o API propia | Gelen y Mateo (comparación) | Mayor flexibilidad de despliegue o control de endpoints. | La gestión de permisos y agregaciones para este alcance añade trabajo al equipo. |

#### Decisión

Se utiliza Supabase con Auth para identidad, PostgreSQL para perfiles, territorio, recintos, JRV, asignaciones vigentes e históricas, organizaciones, candidatos por dignidad, actas, votos y revisiones; Storage privado para fotografías y Realtime para avisos de cambios. Se establecen claves foráneas, unicidad de cédula, UNIQUE(recinto_id, numero) en JRV y UNIQUE(jrv_id, dignidad) para el acta vigente. La cuadratura de votos se verifica con una operación íntegra del servidor, no solo con CHECK por fila.

El servidor registra transaccionalmente cada revisión del acta y conserva la versión vigente para las consultas. Las operaciones privilegiadas verifican identidad, rol y ámbito; ninguna clave service_role se incorpora al APK. Las consultas agregadas y las fotografías respetan las mismas restricciones de autorización territorial.

#### Consecuencias

Se gana integridad relacional, auditoría y totales únicos para el seguimiento, con un solo proveedor para datos, autenticación y archivos. Se pierde independencia respecto de ese proveedor y se asume el costo de diseñar el esquema y las políticas de acceso. Durante el desarrollo, las migraciones deben versionarse, las restricciones de unicidad deben probarse y la clave service_role debe permanecer fuera de la aplicación.

#### Minuto del video

Minuto de referencia del video final: 00:44:29

### 4.3 ADR-03: Precarga versionada y catálogo offline en SQLite

#### Requerimientos relacionados

RF-03, RF-05, RF-12, RF-14; RNF-04, RNF-05; S-01, S-03

#### Contexto

El examen obliga a precargar recintos, JRV y cinco organizaciones con candidatos para dos dignidades. La opción de conservar todo únicamente en la nube impide capturar actas sin red; por eso en V2-P1 y V2-P2 se compararon la precarga SQL, la copia SQLite y los catálogos fijos dentro del APK.

#### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| --- | --- | --- | --- |
| Seed SQL de catálogo con versión y réplica por usuario en SQLite | Camila y Mateo; consenso anotado | Carga inicial auditada, índices únicos y consulta sin señal. | Se necesita una estrategia incremental para descargar recintos y asignaciones nuevas. |
| Script SQL solo remoto, sin copia local | Gelen (precarga SQL), alternativa de despliegue | Una sola base editable por el provincial. | El formulario no podrá cargar mesas ni candidatos en un recinto sin cobertura. |
| Catálogo fijo dentro del APK | Mateo (alternativa examinada) | Disponible desde la instalación sin sincronización inicial. | No recibe cambios de recintos ni asignaciones sin actualizar la aplicación. |

#### Decisión

PostgreSQL es la fuente maestra de un catálogo versionado mediante script SQL idempotente (INSERT ... ON CONFLICT) con índices y claves únicas. Se define Pichincha, cantón Rumiñahui, como jurisdicción de implementación; la carga debe corresponder a recintos y JRV verificables de ese territorio y a cinco organizaciones con candidatos de alcaldía y prefectura. No se presentarán datos ficticios como padrón real.

Después de un acceso inicial con conexión, la aplicación descarga a SQLite el catálogo y las asignaciones autorizadas; los formularios consultan esa copia en modo avión. Los cambios remotos se actualizan por versión o updated_at sin borrar actas ni operaciones pendientes. Un recinto nuevo será visible localmente tras sincronizar.

#### Consecuencias

Se gana disponibilidad del catálogo aunque no haya cobertura en el recinto. Se pierde tiempo en la preparación de datos verificables y en la sincronización incremental de los dispositivos desconectados. Se asume el riesgo de un catálogo incompleto o desactualizado. Durante el desarrollo, la carga debe ejecutarse dos veces sin duplicar registros, y ninguna sincronización puede eliminar recintos o JRV referenciados por actas locales.

#### Minuto del video

Minuto de referencia del video final: 00:50:38

### 4.4 ADR-04: Alta jerárquica con Supabase Auth, Edge Function y correo OTP

#### Requerimientos relacionados

RF-01, RF-02, RF-04; RNF-03, RNF-06; S-02

#### Contexto

El alta de usuarios es administrativa. Cada titular debe cambiar la clave inicial y poder recuperar el acceso por correo. En la revisión posterior se descartó consultar una fuente externa para comprobar la cédula porque no se pudo verificar el origen autorizado de los datos ni la política de conservación de las consultas. No se envían cédulas a servicios externos.

#### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| --- | --- | --- | --- |
| Supabase Auth Admin desde Edge Function protegida + OTP y nueva clave | Camila y Mateo (seed/copia); propuesta en la reunión V2-P1/V2-P2 | La función valida creador, rol y recinto sin exponer una clave privilegiada; permite alta asistida. | La secuencia de Auth Admin, verificación OTP y cambio obligatorio requiere prueba real y servicio de correo funcional. |
| Invitación por enlace de correo | Gelen y Mateo (comparación) | El titular elige contraseña sin que el creador la conozca. | Depende de apertura de enlaces y exige más pasos autónomos a usuarios con poca experiencia. |
| signUp público desde el móvil | Mateo (alternativa descartada) | Implementación inicial corta. | No controla el alta por jerarquía; puede modificar sesión del coordinador y contradice el enunciado. |

#### Decisión

Una Edge Function autenticada verifica el rol y el ámbito territorial del responsable del alta. El coordinador provincial crea las cuentas de los coordinadores de recinto y cada coordinador de recinto crea las de sus veedores. Una función en TypeScript comprueba el formato y el dígito verificador de la cédula incluso sin conexión. Al tramitar el alta en línea, el servidor repite la validación y PostgreSQL aplica una restricción de unicidad. Supabase Auth Admin crea la cuenta con una clave temporal y el perfil queda PENDIENTE. El backend activa el perfil cuando el titular verifica su correo mediante OTP y cambia la clave temporal. La recuperación de la contraseña se realiza por correo. La consulta externa de cédulas está descartada.

#### Consecuencias

Se gana un alta jerárquica en la que cada titular define su propia clave y recupera su acceso sin intervención del coordinador provincial. Se pierde la sencillez de un registro directo, porque el proceso tiene varios pasos. Se asume el riesgo de cuentas creadas parcialmente, códigos OTP no entregados y activaciones prematuras. Durante el desarrollo, debe probarse el flujo completo de creación, verificación, cambio y activación, y el usuario pendiente no debe acceder a datos electorales.

#### Minuto del video

Minuto de referencia del video final: 00:59:05

### 4.5 ADR-05: Autorización territorial con RLS y Storage privado

#### Requerimientos relacionados

RF-01, RF-04, RF-08, RF-10; RNF-03, RNF-04; S-03, S-08

#### Contexto

El alcance territorial no puede protegerse solo ocultando pantallas: un cliente modificado podría solicitar registros ajenos directamente a Supabase. En V2-P2 se debatió la autorización RLS sobre tablas y fotografías, y se distinguió esta defensa remota de la protección física de los archivos locales del teléfono.

#### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| --- | --- | --- | --- |
| RLS sobre tablas y políticas para objetos de Storage | Camila, Gelen y Mateo; debatido V2-P2 | El servidor comprueba el alcance vigente para leer o modificar, independientemente de la interfaz. | Las políticas cruzan perfiles, JRV y asignaciones; necesitan funciones y pruebas negativas. |
| Filtrar datos únicamente en la aplicación | Camila y Mateo (alternativa descartada) | Menos reglas SQL y menús fáciles de mostrar. | Un cliente modificado podría solicitar información de otros recintos. |
| API propia con autorización por endpoint | Mateo (comparación) | Criterios de seguridad concentrados en un backend administrado por el equipo. | Duplica infraestructura, pruebas y código respecto al modelo seleccionado. |

#### Decisión

Se habilita RLS en tablas electorales y políticas equivalentes en Storage privado. Cada solicitud se autoriza con auth.uid(), perfil ACTIVO, rol y territorio vigente: el veedor accede solo a sus JRV asignadas; el coordinador de recinto, solo a las de su recinto; el provincial, solo a su jurisdicción. Edge Functions y operaciones RPC privilegiadas repiten la validación en servidor.

Las fotos se consultan por permisos sobre objetos privados o URLs firmadas de corta duración; ningún usuario puede otorgarse otro rol. La baja o reemplazo revoca escrituras remotas posteriores, incluidas las enviadas desde una outbox offline. La copia local conserva exclusivamente datos previamente autorizados; no se considera protegida únicamente por RLS.

#### Consecuencias

Se gana una protección en el servidor que impide consultar datos ajenos aunque la aplicación se modifique. Se pierde facilidad de depuración, porque cada política debe escribirse y probarse por separado. Se asume el riesgo de que una política mal escrita abra el acceso. Durante el desarrollo, cada política debe tener una prueba negativa que confirme que un usuario de otro recinto no obtiene filas.

#### Minuto del video

Minuto de referencia del video final: 01:10:35

### 4.6 ADR-06: Asignaciones históricas y reemplazo transaccional de veedores

#### Requerimientos relacionados

RF-03, RF-04, RF-08, RF-10; RNF-04; S-03, S-08

#### Contexto

El coordinador de recinto debe asignar un responsable por mesa y sustituir ausentes durante la jornada; una persona puede cubrir varias JRV. Guardar únicamente el identificador actual eliminaría la trazabilidad necesaria para comprobar quién pudo registrar o corregir una acta.

#### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| --- | --- | --- | --- |
| Tablas de asignación histórica, unicidad de vigente y operación transaccional | Alternativa documentada en la reunión; criterio adoptado para implementación | Permite consultar vigencias y evitar duplicidad de responsables al reemplazar. | Requiere restricciones parciales y tratamiento de escrituras antiguas almacenadas offline. |
| Guardar únicamente veedor_id en JRV | Camila (alternativa comparada) | Actualización de una columna, CRUD simple. | Sobrescribe la relación anterior y dificulta reconstruir quién tenía la mesa al registrar una acta. |
| Control de asignaciones solo en Zustand/cliente | Alternativa descartada por exigencia de confidencialidad | Interfaz rápida y sin transacciones remotas. | Dos teléfonos pueden presentar responsables incompatibles. |

#### Decisión

Se conserva asignaciones_veedor(jrv_id, veedor_id, desde, hasta, motivo, asignado_por) y una restricción UNIQUE parcial WHERE hasta IS NULL para impedir dos veedores vigentes en la misma JRV. Cada recinto mantiene, asimismo, un único coordinador vigente, con su historial separado. Un veedor puede estar activo en varias JRV sin límite artificial.

El reemplazo se realiza para una JRV determinada mediante transacción de servidor: validar rol y recinto, comprobar asignación vigente, cerrarla, registrar la nueva y confirmar; ante error se revierte todo. Se conservan las asignaciones de otras JRV del veedor sustituido y la autoría de actas anteriores. La revocación se aplica a toda escritura futura no autorizada, incluso si se capturó offline.

#### Consecuencias

Se gana un único responsable vigente por JRV y un historial que permite reconstruir quién registró o corrigió cada acta. Se pierde la simplicidad de un campo único de veedor. Se asume el riesgo de concurrencia durante el reemplazo y de capturas pendientes del veedor sustituido. Durante el desarrollo, el reemplazo debe ejecutarse en una transacción y comprobarse que no quedan dos asignaciones vigentes en la misma JRV.

#### Minuto del video

Minuto de referencia del video final: 01:17:24

### 4.7 ADR-07: Validación de formularios con React Hook Form, Zod y reglas SQL

#### Requerimientos relacionados

RF-01, RF-05, RF-08; RNF-04, RNF-06; S-04, S-07

#### Contexto

Un veedor sin señal debe detectar sumas imposibles antes de guardar; además, el servidor no puede confiar exclusivamente en el formulario. La corrección por parte del veedor o coordinador requiere conservar valores anteriores y resolver ediciones simultáneas sin sobrescribir información válida.

#### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| --- | --- | --- | --- |
| React Hook Form + Zod en formulario, reglas puras del dominio y CHECK/trigger SQL | Camila y Mateo; función de dominio propuesta por Gelen | Mensajes por campo y validación offline; reglas importantes comprobables y defendibles en servidor. | Doble implementación exige pruebas para que JavaScript y PostgreSQL acepten los mismos casos. |
| Formulario controlado + validación TypeScript manual | Gelen Ortiz | Menos dependencias y lógica totalmente visible. | Incrementa código de estado, errores por campo, reinicio y validación cruzada. |
| Validar solo desde PostgreSQL | Alternativa comparada y descartada | Una implementación central remota. | No permite detectar números imposibles sin internet y genera reintentos evitables. |

#### Decisión

Se utilizan React Hook Form y Zod en presentación para campos obligatorios, formato y errores visibles. Una función pura del dominio exige cinco votos por organizaciones, blancos, nulos y sufragantes como enteros no negativos; la suma de siete valores debe igualar a sufragantes. PostgreSQL vuelve a validar la operación completa en el servidor, incluso frente a clientes modificados.

Toda corrección autorizada exige motivo y conserva autor, hora del servidor, versión y valores previos. Se adopta expected_version: el servidor actualiza solo si coincide con la versión vigente y devuelve CONFLICTO_VERSION en caso contrario, sin sobrescribir. La propuesta local queda pendiente de revisión y puede rehacerse sobre la versión actual. Se descarta la regla de última escritura gana por riesgo de pérdida de correcciones.

#### Consecuencias

Se gana una validación coherente en línea y sin conexión, con historial completo de correcciones. Se pierde simplicidad, porque las reglas se mantienen en TypeScript y en PostgreSQL. Se asume el riesgo de divergencia entre ambas implementaciones y la necesidad de resolver los conflictos de edición. Durante el desarrollo, las pruebas deben cubrir los mismos casos en el dominio y en la base de datos, y toda corrección debe enviar la versión que modifica.

#### Minuto del video

Minuto de referencia del video final: 01:23:53

### 4.8 ADR-08: Registro de actas sin conexión y sincronización con SQLite y NetInfo

#### Requerimientos relacionados

RF-05, RF-06, RF-07, RF-09, RF-12; RNF-04, RNF-05; S-02, S-04, S-08

#### Contexto

La conectividad rural obliga a conservar votos, foto y GPS durante desconexiones y cierres forzados. Zustand no persiste las operaciones y un simple reintento sin identificador estable podría duplicar actas o correcciones. El diseño se vincula con la integridad, permisos y versiones fijados en las demás ADR.

#### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| --- | --- | --- | --- |
| expo-sqlite + archivos locales de foto + outbox + NetInfo + UUID | Camila, Gelen y Mateo | Estados transaccionales, consultas por JRV y reintentos después del reinicio. | El equipo implementa cola, recuperación de fallos y manejo de conflictos. |
| AsyncStorage con lista de pendientes | Camila y Mateo (comparación) | Pocas dependencias y facilidad inicial. | Carece de las mismas herramientas relacionales y transaccionales para actas, versiones y cola. |
#### Decisión

La fotografía se guarda primero en un archivo privado local; después, una transacción SQLite registra acta, ruta del archivo, metadatos originales y outbox (operation_id UUID, JRV, dignidad, payload, estado, intentos). Solo después del commit se muestra «guardada localmente». No se afirma atomicidad entre el sistema de archivos y SQLite: si hay un archivo sin referencia o una fila sin archivo, se detecta y recupera el caso.

NetInfo identifica conectividad y habilita reintentos controlados con espera creciente. PostgreSQL aplica unicidad de operation_id, autor y huella de payload: un duplicado idéntico recibe el resultado anterior y una carga distinta con el mismo UUID se rechaza. El envío de votos y la fotografía a Storage se confirman en etapas; EVIDENCIA_PENDIENTE no equivale a foto validada. La captura conserva GPS y hora originales.

Las correcciones incluyen expected_version; un CONFLICTO_VERSION o PERMISO_REVOCADO detiene reintentos automáticos y mantiene la operación local para revisión, sin sobrescritura. El archivo fotográfico solo se elimina después de confirmación del servidor y de su evidencia. Este mecanismo procura idempotencia, no entrega exactamente una vez.

#### Consecuencias

Se gana la recuperación de registros tras una pérdida de red o un cierre de la aplicación, y se evitan duplicados mediante identificadores estables. Se pierde simplicidad, porque hay que programar la cola, la secuencia de estados y la resolución de conflictos. Se asume el riesgo de fotos huérfanas, permisos vencidos y conflictos entre votos y evidencia. Durante el desarrollo, deben probarse el modo avión, el cierre forzado, la reconexión y la repetición de un mismo identificador.

#### Minuto del video

Minuto de referencia del video final: 01:33:00

### 4.9 ADR-09: Fotografía directa, nitidez y ubicación de origen (GPS)

#### Requerimientos relacionados

RF-06, RF-07, RF-12; RNF-04, RNF-05; S-05, S-06

#### Contexto

La evidencia electoral debe ser legible y demostrar la ubicación original de captura. En V1 se discutieron tres intentos ante fotos borrosas y se propusieron umbrales GPS de 300 m y 100 m; se mantiene una advertencia ante lecturas imprecisas, sin atribuir fraude automáticamente. La visualización solicitada para el aplicativo es Leaflet integrado mediante WebView, no un mapa externo.

#### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| --- | --- | --- | --- |
| Expo Camera + nitidez + Expo Location + mapa Leaflet integrado en WebView | Camila (alternativa seleccionada para la implementación) | Fotografía y GPS capturados en la app; ubicación y recinto visibles en el mapa interno sin salir de la aplicación. | El mapa base puede requerir red; deben comprobarse compatibilidad de WebView y calidad aproximada de las fotos. |
| Expo Camera + Expo Location + react-native-maps | Mateo (alternativa comparada) | Mapa nativo en la pantalla del acta, con marcadores de ubicación y recinto. | Configuración del proveedor cartográfico en Android y prueba en APK. |
| Captura simple, revisión visual y enlace a mapa externo | Gelen (alternativa comparada) | Menor desarrollo e inspección manual de la foto. | No permite la misma consulta contextual en la pantalla; la inspección manual puede dejar pasar desenfoques. |

#### Decisión

Se utiliza Expo Camera para tomar la fotografía directamente dentro de la aplicación, mostrarla y realizar una comprobación orientativa de desenfoque/iluminación. Se permite repetir; tras tres intentos fallidos se conserva, si el usuario continúa, como CALIDAD_DUDOSA para revisión humana. Esa etiqueta no equivale a evidencia validada.

Expo Location registra latitud, longitud, precisión y hora en el momento de captura. Se calcula la distancia a las coordenadas precargadas del recinto y se preservan esos valores al sincronizar. Si la precisión supera 100 m o la distancia excede 300 m, se muestra una advertencia, sin rechazo automático. Sin GPS válido se conserva el acta como borrador, sin enviarla como evidencia completa.

Se adopta Leaflet dentro de WebView en el detalle del acta, con marcadores de la posición de captura y del recinto, además de coordenadas, precisión, hora y distancia en texto. El visor permanece dentro de la app, sin abrir mapas externos. Los datos y marcadores pueden recuperarse offline; no se garantiza el mapa base de calles sin teselas previamente disponibles en caché.

#### Consecuencias

Se gana evidencia visual y geográfica consultable dentro de la aplicación, sin depender de servicios externos. Se pierde la posibilidad de que el mapa base cargue sin conexión, salvo que existan teselas en caché. Se asume el riesgo de mala iluminación, precisión GPS limitada en interiores y permisos denegados. Durante el desarrollo, las advertencias de distancia y precisión no deben bloquear la captura, y las coordenadas originales deben conservarse al sincronizar.

#### Minuto del video

Minuto de referencia del video final: 01:42:38

### 4.10 ADR-10: Resultados preliminares consistentes con SQL y Supabase Realtime

#### Requerimientos relacionados

RF-05, RF-08, RF-11; RNF-04, RNF-08; S-04, S-07

#### Contexto

El provincial necesita seguimiento por recinto, mesa y dignidad sin esperar cifras oficiales. Los eventos Realtime no deben sumarse como votos nuevos: una corrección reemplaza valores de la versión vigente. También es necesario diferenciar datos numéricos recibidos de evidencia fotográfica validada para que el avance no sea engañoso.

#### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| --- | --- | --- | --- |
| SQL agregado de actas vigentes + notificación Supabase Realtime | Camila, Gelen y Mateo | Una fuente de cálculo y cambios reflejados al insertar/corregir registros. | Se debe manejar reconexión y controlar permisos de funciones/vistas. |
| Polling periódico de totales | Mateo (comparación) | Sencillo de depurar, sin suscripciones permanentes. | Más solicitudes y actualización retrasada según intervalo. |
| Suma local de todos los registros descargados | Alternativa descartada | Funciona sobre caché disponible. | Resultados divergentes por permisos y desconexión; obliga a descargar información ajena. |

#### Decisión

PostgreSQL calcula resultados por candidatura, recinto y dignidad desde las versiones vigentes de actas autorizadas. Supabase Realtime anuncia cambios; el cliente vuelve a consultar el agregado y, tras reconexión, refresca su estado. Nunca suma el historial ni incrementa totales directamente a partir de eventos.

Se establece que una JRV está REPORTADA cuando las dos actas, alcaldía y prefectura, tienen RESULTADO_RECIBIDO. Está RESPALDADA cuando ambas cuentan además con EVIDENCIA_RESPALDADA. El panel presenta por separado avance numérico y avance documental; muestra fotos pendientes o en revisión y actualiza votos tras correcciones sin doble conteo.

Las cifras se identifican como resultados preliminares de la organización, no como escrutinio oficial del CNE. Cada pantalla muestra última actualización y estado sin conexión. Las consultas agregadas respetan RLS y el alcance del coordinador provincial.

#### Consecuencias

Se gana un cálculo de resultados preliminares consistente, que distingue las actas recibidas de la evidencia validada. Se pierde inmediatez cuando hay desconexión, porque el panel conserva el último dato hasta reconectar. Se asume el riesgo de permisos mal configurados en las consultas agregadas y de atrasos de Realtime. Durante el desarrollo, el panel debe mostrar el estado de cada foto y no sumar los eventos de cambio como votos nuevos.

#### Minuto del video

Minuto de referencia del video final: 01:55:10

### 4.11 ADR-11: Diagnóstico de fallos de la APK con Sentry

#### Requerimientos relacionados

RF-13; RNF-01, RNF-07, RNF-05

#### Contexto

Se requiere registrar errores técnicos sin depender de la explicación del usuario, incluso si el fallo ocurre sin conectividad. Sentry permite observar fallos fatales y no fatales; el almacenamiento local de errores operativos es independiente de la cola de actas para no mezclar datos electorales con telemetría.

#### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| --- | --- | --- | --- |
| Sentry para React Native/Expo | Camila, Gelen y Mateo (alternativa seleccionada) | Agrupa excepciones, muestra release, pantalla, dispositivo y errores no fatales. | Requiere configurar compilación, símbolos/source maps, privacidad y probar reportes offline. |
| Firebase Crashlytics | Gelen y Mateo (comparación) | Análisis sólido de fallos nativos. | Añade segundo proveedor y exige evaluar el tratamiento de errores JS y Expo. |
| Enviar errores a una tabla de Supabase | Alternativa comparada | Registra fallos no fatales si hay conexión. | No aporta automáticamente el diagnóstico de cierres ni almacenamiento ante desconexión. |

#### Decisión

Se integra Sentry para React Native/Expo con identificación de versión, entorno, pantalla y tipo de dispositivo, además de source maps según el SDK. Se reportan fallos fatales y excepciones no fatales relevantes, como fallos de subida o sincronización. Se omiten datos personales, fotos, coordenadas, tokens y votos en mensajes, contexto y breadcrumbs.

Los errores no fatales que deban persistir sin red se registran en SQLite.errores_pendientes (UUID local, código, pantalla, versión, fecha, intentos), separada de outbox de actas. Al recuperar conexión se envían mediante el SDK y se aplica una política acotada de reintento/retención. El eventId local no prueba recepción remota; la demostración exigida consiste en provocar el fallo y constatarlo en el panel de Sentry.

Los fallos fatales se dejan al mecanismo compatible del SDK para su persistencia y envío, sin prometer garantías que no ofrece. La configuración se verifica con una compilación Android real al final del desarrollo.

#### Consecuencias

Se gana un diagnóstico de cierres y errores operativos sin depender de lo que informe el usuario. Se pierde parte de la privacidad de la telemetría, por lo que hay que filtrar los datos personales y electorales. Se asume el riesgo de eventos no recibidos, duplicados y datos sensibles en los breadcrumbs. Durante el desarrollo, debe comprobarse un error provocado en el panel de Sentry y revisar que ningún reporte contenga cédulas, fotos, coordenadas ni votos.

#### Minuto del video

Minuto de referencia del video final: 01:59:22

### 4.12 ADR-12: Navegación por rol con Expo Router, Uniwind y Lottie/Reanimated

#### Requerimientos relacionados

RF-02, RF-04, RF-09, RF-10; RNF-01, RNF-06

#### Contexto

Los usuarios tienen distintas responsabilidades y pueden repetir operaciones por no comprender el estado del envío. La rúbrica exige navegación por rol, retroalimentación sin modales genéricos y una identidad visual clara. Los apuntes recogen Expo Router, Uniwind, Lottie y Reanimated como las herramientas de interfaz.

#### Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
| --- | --- | --- | --- |
| Expo Router + tema Uniwind + Lottie/Reanimated | Camila (Router); propuesta en la reunión (Uniwind); los tres (Lottie) | Rutas por archivos, tema central reutilizable y feedback visual coherente. | Debe comprobarse la compatibilidad real de Uniwind y las animaciones con el SDK/compilación. |
| React Navigation + StyleSheet + Lottie/Reanimated | Mateo Piedra | Flujos por rol explícitos y estilos nativos sin capa adicional. | La configuración manual de rutas y pantallas es distinta a la anotada en el consenso. |
| Navegador único con Alert.alert genérico | Alternativa descartada por la rúbrica | Implementación inicial mínima. | No diferencia bien los roles ni ofrece la retroalimentación visual exigida. |

#### Decisión

Expo Router organiza rutas de autenticación y grupos protegidos para provincial, coordinador de recinto y veedor. Las pantallas consumen casos de uso de presentación; los layouts verifican sesión y estado, pero la seguridad efectiva de datos sigue a cargo de RLS.

Uniwind centraliza los colores y componentes de la organización; Lottie expresa progreso, éxito y error, y Reanimated anima transiciones pertinentes. Cada animación acompaña textos comprensibles: guardada localmente, pendiente, sincronizando, evidencia en revisión, confirmada o error. No se utilizan modales genéricos como única respuesta a las operaciones.

#### Consecuencias

Se gana una navegación separada por rol y un diseño coherente que reduce los reenvíos por incertidumbre. Se pierde simplicidad en la configuración de rutas y animaciones. Se asume el riesgo de incompatibilidad con la versión de Expo y de animaciones costosas en equipos modestos. Durante el desarrollo, debe confirmarse la compatibilidad de Uniwind con la versión del SDK y comprobarse cada rol en un dispositivo Android.

#### Minuto del video

Minuto de referencia del video final: 02:02:45
