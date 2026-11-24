# Prueba 2- Desarrollo de Aplicaciones Móviles

Control Electoral para Organización Política

Tecnología Superior en Desarrollo de Software

## 1. Descripción general

Una organización política en Ecuador necesita una aplicación móvil para gestionar el escrutinio el día de las elecciones. Este enunciado no es una lista de funcionalidades: describe la situación de la organización y los problemas que ha vivido en procesos anteriores. Parte central del trabajo es analizar esas necesidades y deducir qué debe hacer la aplicación para resolverlas.

La prueba combina una fase grupal y una fase individual. En la fase grupal, equipos de tres/cuatro estudiantes analizan las necesidades, acuerdan los requerimientos del sistema y toman por consenso las decisiones técnicas del proyecto. En la fase individual, cada estudiante desarrolla su propia aplicación a partir de ese acuerdo y la defiende de forma presencial.

El uso de inteligencia artificial como herramienta de apoyo está permitido. Sin embargo, cada estudiante debe ser capaz de explicar y defender cualquier decisión presente en su código y en los documentos del equipo. Pasarse los repositorios de código asigna la nota de cero.

## 2. La organización y el proceso electoral

La organización trabaja en una provincia y un cantón que el estudiante elige. El territorio se divide en recintos electorales, y cada recinto se identifica por cantón, parroquia, nombre del recinto y número de JRV o mesa electoral. En esta elección se disputan dos dignidades, alcaldía y prefectura, y en cada una participan cinco organizaciones políticas con sus respectivos candidatos.

El trabajo de la organización se reparte en tres niveles. Un coordinador provincial dirige todo el proceso. En cada recinto hay un coordinador de recinto que responde por lo que ocurre allí. En las mesas están los veedores, que presencian el conteo de votos.

Cuando termina el conteo en una mesa, se elaboran dos actas de escrutinio, una por cada dignidad(alcalde, prefecto). Cada acta registra los votos obtenidos por cada organización política, los votos nulos, los votos en blanco y el total de sufragantes. El veedor recibe una copia de ambas actas. En el anexo se incluye un ejemplo de acta.

## 3. Necesidades de la organización

Lo que sigue es lo que la organización nos contó sobre sus problemas en elecciones anteriores y sobre lo que espera de la aplicación.

### 3.1 Acceso de los usuarios

Muchos de nuestros veedores y coordinadores son personas mayores o con poca experiencia en el uso del celular. Cuando les pedimos que se registraran por su cuenta en otras herramientas, la mayoría no lo logró o lo hizo con datos incompletos. Preferimos que otra persona de la organización les cree el acceso y se lo entregue listo: el coordinador provincial se encarga de sus coordinadores de recinto y cada coordinador de recinto se encarga de sus veedores. Nadie debería poder entrar al sistema sin que alguien de la organización lo haya habilitado.

Que otra persona cree el acceso nos preocupa por un lado: quien lo creó conoce la clave con la que la persona entra por primera vez. Necesitamos que, a partir de ese momento, solo el titular conozca su clave.

De cada persona necesitamos su cédula, sus nombres y apellidos completos, un teléfono y un correo electrónico. El año pasado se registraron cédulas mal digitadas y después no pudimos saber quién había reportado ciertas actas. El correo es el único medio confiable para comunicarnos con cada persona, así que necesitamos tener la certeza de que es real y de que le pertenece.

También ocurrió que, en plena jornada, varias personas olvidaron su clave y el coordinador provincial pasó horas atendiendo llamadas para resolverlo. Queremos que cada persona pueda recuperar su acceso sin depender de nadie.

### 3.2 Organización del territorio y del personal

El coordinador provincial necesita ver los recintos de su jurisdicción y poder agregar nuevos cuando haga falta, el esta a cargo de los coordinadores de recinto electoral. Cada recinto electoral solo tiene un único coordinador de recinto electoral y es el responsable de los veedores que hay por cada mesa.

Cada coordinador de recinto asigna un veedor a cada una de sus mesas. Como no siempre conseguimos suficientes veedores, una misma persona puede cubrir varias mesas, sin límite. Otro tema es que el día de la elección siempre falta alguien, así que el coordinador de recinto tiene que poder reemplazar a un veedor ausente en ese mismo momento con algún otro veedor, ya que en ocasiones hay gente que sin ser afiliada al movimiento político, se encuentra a las afueras del recinto electoral ofreciendo el servicio de veedor.

### 3.3 Registro de los resultados

Al terminar el conteo, el veedor debe transcribir los resultados de las dos actas de cada una de sus mesas. En elecciones anteriores llegaron actas con números imposibles, por ejemplo una organización con más votos que el total de sufragantes, y otras con sumas que no cuadraban. Necesitamos detectar esos errores en el momento en que se registran, no días después.

Cada acta debe quedar respaldada con una fotografía. La última vez, casi la mitad de las fotos que recibimos eran borrosas o ilegibles, y no sirvieron cuando tuvimos que impugnar resultados. Tampoco pudimos demostrar que ciertas fotos se habían tomado en el recinto, porque nos acusaron de que fueron tomadas en otro lugar. Necesitamos saber desde dónde se registró cada acta y poder consultarlo directamente al revisarla; un acta sin esa evidencia no nos sirve.

Los errores de transcripción son frecuentes, por lo que el veedor debe poder corregir sus actas cuando lo necesite. Además, muchos veedores no se manejan bien con la tecnología y piden ayuda a su coordinador de recinto, que debe poder corregir cualquier acta de su recinto.

Otro problema frecuente fue que las personas no sabían si la información se había enviado: la aplicación se quedaba quieta, volvían a intentarlo y terminaban duplicando registros o abandonando. Cada persona tiene que saber en todo momento si lo que hizo está en proceso, se guardó o falló.

### 3.4 Confidencialidad de la información

En un proceso anterior, información de algunas mesas llegó a personas que no tenían por qué verla. Cada veedor debe ver y modificar únicamente lo que corresponde a sus mesas, y cada coordinador de recinto únicamente lo de su recinto.

### 3.5 Seguimiento del escrutinio

Durante la jornada, el coordinador provincial necesita saber cómo avanza el registro en cada recinto: cuántas mesas ya reportaron y cuántas faltan. Al revisar un acta quiere ver desde dónde fue registrada. Además, quiere conocer cómo van los votos de cada candidato a la alcaldía y a la prefectura, por recinto y en total, a medida que llegan las actas y sin esperar el conteo oficial del CNE, que suele demorar más tiempo, ya que van a pagarle por una aplicación móvil lo ideal sería que sirva de Exit Poll en tiempo real, conforme se va subiendo la información de cada veedor y su mesa asignada.

### 3.6 Conectividad el día de la elección

En las elecciones pasadas, muchos veedores de recintos rurales no tenían señal al terminar el conteo. Algunos anotaron los resultados en papel y los dictaron por teléfono horas después, y varias actas se perdieron o llegaron con errores.

### 3.7 Estabilidad de la aplicación

En la elección anterior unos compañeros intentaron crear una aplicación móvil pero no funcionó ya que se cerraba sola en algunos celulares, nunca supimos por qué. Los veedores escribían por WhatsApp diciendo “se cerró” o “no me deja”, pero nunca pudimos saber qué había pasado, en qué pantalla estaban ni qué celular tenían, y el equipo técnico no logró reproducir los errores. Varias actas no se registraron por esa razón.

Esta vez no queremos depender de que la persona nos avise ni de que sepa explicar el problema. Necesitamos enterarnos por nuestra cuenta cuando la aplicación falle, saber a cuántas personas les ocurre, en qué dispositivos y versiones de Android, y en qué parte de la aplicación. También nos interesa conocer los errores que no cierran la aplicación pero impiden completar una tarea, por ejemplo cuando una foto no se sube. Si el fallo ocurre sin conexión, igual queremos recibir el reporte cuando el celular la recupere.

### Restricciones del proyecto

Las siguientes condiciones no forman parte del análisis; son obligatorias:

- La aplicación se desarrolla en React Native y se entrega como APK instalable en Android(5 puntos menos a la nota final del Examen I sino está con apk).

- El sistema debe tener ya precargados los recintos de la provincia y el cantón elegidos, junto con las cinco organizaciones políticas y sus candidatos para la alcaldía y para la prefectura.

- El código debe estar organizado bajo Clean Architecture.

- Cuando el relato no alcance para tomar una decisión, el equipo debe documentar el supuesto que adopta y justificarlo.

## 4. Fase grupal: análisis y decisiones técnicas

Los equipos de tres/cuatro estudiantes son conformados por el docente y no son de libre elección. La intención es que cada estudiante trabaje con compañeros fuera de su círculo habitual y ejercite la colaboración y la negociación técnica.

Cada integrante analiza el enunciado por su cuenta, deduce los requerimientos que considera necesarios para atender las necesidades de la organización y prepara sus propias ADR (Architectural Decision Records) con la alternativa que propone para cada decisión técnica. Cada ADR debe indicar qué requerimiento la original.Usar la plantilla Analisis individual_ADR.

Luego el equipo se reúne de forma virtual, con los tres/cuatro integrantes presentes y las cámaras encendidas, y graban la sesión(buen audio y calidad, no hay limite de tiempo para el video). En ella cada estudiante expone los requerimientos que identificó en cuanto a la funcionalidad que debería tener la aplicación y sus ADR, y el grupo discute hasta llegar a un acuerdo. Por ejemplo, si para la autenticación un estudiante propone Supabase, otro Firebase y otro Appwrite, el equipo debe analizar cuál responde mejor a lo que la organización necesita, con sus ventajas, desventajas, limitaciones e implicaciones, antes de decidir. El mismo proceso se repite con cada decisión.

Los requerimientos y las ADR acordados constituyen la línea base del equipo. Aunque el desarrollo de la aplicación es individual, los  integrantes deben partir de esa misma línea base y no pueden cambiar la misma ya que al evaluar cada proyecto se verificará que la hayan respetado.

Además, cada integrante envía por correo electrónico a juan.gonzalez02@epn.edu.ec, de manera individual y confidencial, una evaluación de la participación de sus dos compañeros y una autoevaluación de su propio desempeño en la reunión de concenso en el siguiente formato.

| Estudiante | Nota /20 de participación en reunión de consenso |
| --- | --- |
|  |  |
|  |  |
|  |  |

El documento Plantilla_Documento_Consolidado_ADR y el enlace al video(se adjunta en el mismo documento) de la reunión de consenso deberán ser cargados en el aula virtual por un único integrante de cada equipo. Asimismo, cada estudiante deberá enviar de manera individual al correo del docente la nota correspondiente(tanto suya como la que cree que merecen sus compañeros integrantes, en base al aporte que hayan realizado).

Estos entregables deberán ser enviados hasta el lunes 23 de noviembre hasta las 23:59 máximo, sin excepción. Si no envían las notas, se entienden que se están poniendo cero tanto a sus compañeros como a usted mismo por default.

## 5. Entregables

Fase grupal, hasta el lunes 23 de noviembre a las 23:59 máximo.

- Video de la reunión virtual con los tres integrantes y las cámaras encendidas.

- Documento consolidado con los requerimientos acordados, los supuestos adoptados y las ADR definitivas, cada una vinculada al requerimiento que la original, y adjuntando el link del video donde hicieron la reunión de consenso.

- Evaluación de pares y autoevaluación, enviadas por correo de forma individual y confidencial al docente. Cada integrante del grupo enviada su propio correo, se harán promedio entre las notadas dadas por el estudiante que equivale al 50% y el 50% adicional lo pone el docente en base al video de la reunión que hayan entregado.

Fase individual, miércoles 25 de noviembre a las 14:00

- Hasta  el miércoles 13:59 debe ya estar subido el link de GitHub con el link del repositorio.

- La presentación del  aplicativo de software y la defensa(se contrastará que hayan hecho uso del documento de consenso de ADR).

## 6. Rúbrica de evaluación

La nota práctica es sobre 20 puntos: 14 corresponden al producto de software, 3 a la fase grupal(consenso en ADR) y 3 a la defensa presencial.

#### Funcionalidad y calidad técnica: 10 puntos

Acceso de los usuarios resuelto conforme a las necesidades descritas por la organización: 1,6 puntos.

Registro de resultados por parte del veedor, con las garantías de confiabilidad y evidencia que la organización exige: 3 puntos.

Gestión del recinto por parte de su coordinador: 1,6 puntos.

Gestión del territorio y seguimiento del escrutinio por parte del coordinador provincial: 1,6 puntos.

Detección y reporte de fallos de la aplicación conforme a la necesidad descrita por la organización(el estudiante debe provocar un fallo en la aplicación y mostrar el reporte recibido en su herramienta de monitoreo): 1 punto.

Organización del código en capas(clean architecture), manejo del estado y coherencia con los requerimientos y las ADR acordados por el equipo: 1,2 puntos.

#### Diseño e interfaz: 4 puntos

- Navegación coherente e intuitiva entre pantallas y flujos claramente diferenciados por rol: 1,4 puntos.

- Retroalimentación visual clara al usuario en operaciones en proceso, exitosas, fallidas y en validaciones: 2 puntos. Usando lootie, reanimated y mensajes claros sin  modales genéricos.

- Consistencia visual adaptada a los colores de la organización política: 0,6 punto.

### 6.1 Fase grupal — 3 puntos

La nota resulta del promedio entre la evaluación realizada por los integrantes del equipo y la valoración docente del video y del documento consolidado. Se considera la participación de cada integrante, la calidad del análisis de necesidades, que las decisiones se justifiquen a partir de requerimientos y no de preferencias personales, la argumentación técnica y la calidad de la deliberación.

### 6.2 Defensa presencial — 3 puntos

Preparar una exposición de no más de 6 minutos, donde el estudiante muestre todo lo implementado en su aplicación móvil , ya tener planificados datos de prueba, escenarios donde demostrarían ciertas funcionalidades, etc.

Luego de esta exposición el docente realiza la defensa oral, donde cada estudiante debe demostrar dominio de su proyecto, identificar en el código las funcionalidades implementadas y justificar las decisiones técnicas adoptadas.

- Explica qué hace el código cuando se le señala un bloque específico: 1,2 puntos.

- Justifica las decisiones técnicas: 1 punto.

- Defiende y explica como implementó y funciona su arquitectura de software: 0,8 puntos.

## 7. Sanción

Las siguientes situaciones aplican descuento directo sobre la nota práctica obtenida, independientemente del puntaje alcanzado en los bloques anteriores:

- La ausencia de APK reduce 5 puntos a la nota del exámen práctico.

![Imagen del enunciado: aviso_enunciado.png](EXAMEN/imagenes/aviso_enunciado.png)

Hay un antipremio de -4 puntos al entregable de software, a la aplicación más genérica/simple en cuanto a su diseño visual, en caso de empate, con el apoyo de estudiantes se seleccionaría la que gana el antipremio.

No haber respetado completamente la línea base, del documento de ADR consensuado, reduce a la mitad la calificación obtenida.

La construcción del aplicativo de software es individual, parte de la línea base del equipo, pero su construcción es individual, en ese sentido, se pasará revisión de código y de detectarse que se han copiado el aplicativo, se asigna cero.

No se acepta por ningún motivo entregas tardías.

Link Repositorio Github:

Anexos Ejemplo Acta de Escrutinio a subirse en la App(pueden buscar de internet actas de escrutinio llenas para sus pruebas).

![Imagen del enunciado: ejemplo_acta_escrutinio.png](EXAMEN/imagenes/ejemplo_acta_escrutinio.png)
