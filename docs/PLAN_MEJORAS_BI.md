# Plan de mejoras: Pacientes, Citas, Historias clínicas y BI

Fecha: 2026-10-18.
Estado: implementación retomada el 2026-10-24 para comprobaciones y correcciones; aceptación e integración pendientes. Véase [el estado de avance](ESTADO_AVANCE.md).

## Objetivo y decisiones

Convertir los tres módulos actuales en un flujo integrado de atención y añadir inteligencia de negocios (BI) dentro del sistema: indicadores calculados, gráficos, filtros y acceso a los registros que explican cada cifra.

- Decisión del usuario: descartar IA. Este plan no incluye chat, modelos generativos, predicciones ni asistentes de IA.
- Mantener una cuenta operativa y una agenda para un odontólogo.
- Mantener nombres y apellidos obligatorios y teléfono opcional. No reincorporar los datos personales descartados anteriormente.
- Conservar fecha de registro sin hora y botón de orden alfabético A a Z por apellidos.
- BI integrado en Panel y Reportes. La primera entrega no requiere contratar ni incrustar una plataforma externa de BI.
- Preservar las fichas existentes, los registros clínicos, las versiones y la auditoría.
- Las funciones descritas a continuación son el alcance de trabajo. Existe una implementación inicial de M0–M4; cada bloque sigue pendiente de completar su verificación y aceptación.

## Punto de partida

Pacientes ya permite registro, edición, búsqueda, paginación, activación/inactivación y consulta de ficha. Citas incluye agenda diaria/semanal en tarjetas, reserva, reprogramación, estados y prevención de cruces. Historias incluye antecedentes, evoluciones, odontograma FDI por pieza/superficie y auditoría.

La ficha administrativa todavía ofrece poco contexto; la agenda no tiene cuadrícula horaria ni disponibilidad configurable; el odontograma tiene una representación sencilla; las evoluciones se cargan completas con la historia y no están vinculadas a citas. Panel y Reportes muestran el aviso de construcción.

Los Sprints 3 y 4 y los ajustes recientes tienen trabajo local pendiente de aceptación e integración. Este plan no los marca como cerrados, no renumera los sprints históricos y no autoriza por sí mismo una publicación o integración.

## Orden de entregas

| Entrega | Prioridad | Resultado | Dependencias |
|---|---|---|---|
| M0. Estabilidad y base de datos analítica | Alta | Formularios seguros y reglas de medición definidas | Estado actual |
| M1. Pacientes | Alta | Ficha integral y seguimiento del paciente | M0 |
| M2. Citas | Alta | Calendario visual y disponibilidad real | M0; integración con M1 |
| M3. Historias clínicas | Alta | Registro clínico visual y conectado a las atenciones | M0; integración con M1 y M2 |
| M4. BI operativo | Alta | Panel, reportes y detalle verificable de indicadores | Contrato de M0; datos de M1–M3 |
| M5. Validación e integración | Alta | Recorrido completo verificado y entrega revisable | M1–M4 |

Diseñar los indicadores en M0 permite preparar las relaciones y eventos necesarios mientras se desarrollan los módulos. Cada entrega tendrá revisión funcional y visual; M5 reúne la comprobación entre módulos.

## M0. Estabilidad y base para medir

### Frontend

- Diferenciar errores de conexión, sesión, tiempo de espera, validación y conflicto; ofrecer una acción apropiada en cada caso.
- Conservar los campos escritos cuando falle una operación.
- Avisar antes de abandonar un formulario, cambiar de paciente o cambiar de pestaña con cambios sin guardar.
- Unificar encabezados, acciones, mensajes, estados vacíos y presentación en pantallas pequeñas.

### Backend

- Diagnosticar por separado el proceso API, la conexión de base de datos y la autenticación, sin exponer credenciales ni contenido clínico en los registros técnicos.
- Estabilizar el procedimiento de arranque/desarrollo y comprobar frontend, API y origen permitido antes de la prueba manual.
- Incorporar idempotencia a la reserva de citas: una solicitud repetida con la misma clave y contenido devuelve el resultado original; contenido distinto con la misma clave se rechaza. No repetir automáticamente escrituras sin esta protección.
- Añadir control de versión a la edición de pacientes para evitar sobrescrituras entre pestañas.
- Definir el contrato de indicadores, fechas y estados descrito en este documento.

### Aceptación

- Una interrupción no borra el formulario ni produce dos citas al reintentar la misma solicitud.
- Dos pestañas no sobrescriben silenciosamente los datos de un paciente.
- La interfaz diferencia un error de red de un conflicto de horario o de versión.
- Se conserva una referencia verificable del estado actual antes de aplicar migraciones.

## M1. Pacientes: ficha integral y seguimiento

### Frontend

- Cabecera con nombre, estado, teléfono y fecha de registro.
- Resumen de última atención, próxima cita y existencia de historia clínica.
- Secciones de resumen, citas próximas/anteriores y accesos clínicos.
- Reservar con el paciente preseleccionado; abrir su historia sin volver a buscarlo.
- Búsqueda tolerante a tildes y formato de teléfono; conservar filtros y página al regresar.
- Filtros de pacientes sin historia, sin próxima cita y por última atención.
- Aviso de posibles duplicados al registrar, con acceso a las coincidencias y opción de continuar.

### Backend

- Consultas paginadas de citas por paciente y endpoint de resumen con campos acotados.
- Calcular última atención desde citas ATENDIDA y próxima cita desde PROGRAMADA/CONFIRMADA con inicio futuro.
- Normalizar búsqueda de nombres y teléfonos; comprobar el orden A a Z con mayúsculas, tildes y nombres repetidos.
- Buscar posibles duplicados sin imponer unicidad a nombres o teléfonos, que pueden compartirse.
- Implementar filtros sobre todas las coincidencias antes de paginar; evitar cargar historias completas para cada fila.

### Aceptación

- Desde una ficha se puede reservar o abrir la historia del paciente correcto.
- Resumen y filtros coinciden con las citas existentes; los estados sin datos se presentan expresamente.
- Acentos, teléfonos con separadores y homónimos tienen un comportamiento comprobado.
- Los pacientes inactivos conservan todos sus registros y las restricciones de reserva existentes.

## M2. Citas: calendario y disponibilidad

### Frontend

- Cuadrícula diaria/semanal por horas, bloques con duración visual, estados identificables mediante texto y color y línea de hora actual.
- Reserva al seleccionar una franja libre; inicio preseleccionado y duración editable con opciones rápidas.
- Panel de detalle con paciente, motivo, notas, horario, estado y acciones disponibles.
- Editar motivo y notas, además de reprogramar.
- Configurar horarios de atención, descansos, días cerrados y bloqueos puntuales.
- Acceso a la historia y, tras M3, a las evoluciones asociadas a la cita.
- Vista compacta utilizable en móvil y alternativa accesible a la cuadrícula.

### Backend

- Modelo de horario de atención y bloqueos, con vigencia e historial para poder medir disponibilidad pasada.
- Endpoint de franjas disponibles; revalidar horario, bloqueos, paciente activo y cruces en la transacción que guarda la reserva.
- Conservar la exclusión PostgreSQL y las reglas de estados actuales.
- Historial de creación, reprogramación, cambios de estado y edición de datos, con fecha y responsable.
- Al cambiar disponibilidad, señalar las citas existentes afectadas y rechazar cambios incompatibles hasta resolverlas explícitamente. No mover ni cancelar citas automáticamente.
- Conservar los datos anteriores y no inventar disponibilidad o eventos históricos que no fueron registrados.

### Aceptación

- Los horarios ocupados, cerrados y bloqueados no se ofrecen como disponibles.
- Dos reservas simultáneas no ocupan la misma franja, aunque ambos clientes la vieran libre.
- Cancelar libera el horario y conserva la cita y su historial.
- Navegar entre días y semanas respeta Colombia (UTC−5), incluidos los límites de medianoche.
- El cambio de horario de atención no altera silenciosamente reservas existentes.

## M3. Historias clínicas: lectura, registro y odontograma

### Frontend

- Cabecera persistente del paciente y resumen de antecedentes, alergias y medicamentos registrados.
- Distinguir información sin registrar de una ausencia expresamente reportada; no deducirla de campos vacíos.
- Odontograma con superficies seleccionables, leyenda de símbolos/colores y vistas permanente, temporal y mixta.
- Detalle e historial de cada pieza; mantener la diferencia entre sin evaluar, registro parcial y hallazgo registrado.
- Evoluciones como línea de tiempo, paginadas y filtrables por fechas y texto; filtro por pieza cuando se registre su relación.
- Abrir una evolución desde una cita con paciente y cita preseleccionados.
- Guardado explícito de borradores y finalización de evoluciones. Mostrar estado y solicitar motivo para corregir una evolución finalizada.
- Auditoría filtrable por fecha y tipo de cambio, con comparación legible de valores anteriores/nuevos.

### Backend

- Separar la consulta de antecedentes, evoluciones, odontograma y auditoría para cargar lo necesario.
- Relación opcional de evolución con cita y piezas. Una evolución pertenece a una historia; si tiene cita, ambas deben corresponder al mismo paciente. Una cita puede tener varias evoluciones.
- Mantener evoluciones independientes para atenciones que no partieron de una cita.
- Estados de borrador/finalizada y reglas de corrección; conservar auditoría y versiones. Los borradores no cuentan como documentación finalizada.
- Para registros previos, conservar el contenido y documentar la migración de estados; no asociarlos automáticamente a citas por cercanía de fecha.
- Validar los estados y superficies permitidos por pieza, y la coherencia entre registros generales y de superficie.
- Mantener protección contra borrado físico de registros clínicos y auditoría inmutable.

### Aceptación

- Cambiar de pieza o paciente no descarta silenciosamente un formulario modificado.
- El odontograma representa los datos guardados sin declarar sanas las piezas sin evaluar.
- Las evoluciones se consultan por páginas y conservan sus filtros.
- No se puede vincular una evolución a una cita de otro paciente.
- Las correcciones finalizadas conservan el original, el motivo, la fecha y el responsable.

## M4. Inteligencia de negocios integrada

### Frontend

- Panel: resumen operativo del día, próximas citas y pendientes de registro.
- Reportes: filtros por periodo, evolución semanal/mensual, comparaciones y tablas de detalle.
- Gráficos de nuevos pacientes, citas por estado y demanda por día/hora.
- Acceso desde cada indicador a los registros exactos que lo componen, conservando filtros.
- Mostrar periodo, fecha de actualización y explicación breve de cada indicador.
- Distinguir cero, sin datos y no disponible; no presentar porcentajes con denominador cero.
- Exportar tablas administrativas y agregadas en CSV respetando los filtros. Proteger contra interpretación de fórmulas de hojas de cálculo.

### Backend

- Módulo BI con endpoints autenticados y DTOs de periodos/filtros.
- Cálculos agrupados en PostgreSQL con índices según consultas medidas; considerar caché o vistas materializadas únicamente si se necesita, con actualización y permisos explícitos.
- Utilizar las mismas reglas para indicador, gráfico, detalle y exportación; evitar duplicar pacientes al unir citas y evoluciones.
- Limitar intervalos, paginar detalles y acotar exportaciones. Devolver fecha de corte común para cada respuesta.
- Exponer inicialmente datos operativos y agregados; las exportaciones generales no incluirán narrativas clínicas.
- Probar cálculos con datos conocidos y comprobar conciliación entre cifras y detalles.

### Definición inicial de indicadores

Todos los periodos usan America/Bogota. El intervalo es inicio incluido y fin excluido. Los resultados reflejan los estados a la fecha de consulta; cuando se requiera reconstruir un estado pasado, se utilizará el historial disponible.

| Indicador | Regla | Dependencia |
|---|---|---|
| Nuevos pacientes | Pacientes registrados en el periodo, por createdAt; incluyen inactivos y excluyen eliminados lógicamente | Datos actuales |
| Pacientes atendidos | Pacientes distintos con al menos una cita ATENDIDA cuyo inicio esté en el periodo | Datos actuales |
| Pacientes recurrentes | De los atendidos en el periodo, quienes tuvieron una cita ATENDIDA antes de su inicio; cada paciente se cuenta una vez | Historial de citas |
| Citas por estado | Citas con fechaInicio en el periodo, agrupadas por estado actual; no agrupar por fecha de creación | Datos actuales |
| Tasa de inasistencia | NO_ASISTIO / (ATENDIDA + NO_ASISTIO) × 100, para citas iniciadas en el periodo y ya iniciadas al consultar | Datos actuales; mostrar aparte vencidas sin resolver |
| Tasa de cancelación | CANCELADA / total de citas con inicio previsto en el periodo × 100; mide la cohorte prevista, no cuándo se canceló | Datos actuales |
| Citas vencidas sin resolver | PROGRAMADA/CONFIRMADA con fechaFin anterior al momento de consulta, filtradas por inicio en el periodo | Datos actuales |
| Sin próxima cita | Pacientes activos sin PROGRAMADA/CONFIRMADA con inicio posterior al momento de consulta | Datos actuales; indicador de situación actual |
| Sin historia | Pacientes activos sin historia clínica | Datos actuales; indicador de situación actual |
| Atenciones con evolución pendiente | Citas ATENDIDA del periodo sin evolución finalizada vinculada; distinguir registros anteriores a la vinculación que no pueden verificarse | Relación y estados de M3 |
| Demanda por día/hora | Conteo de citas no canceladas por día de semana y hora de inicio local; se etiqueta como demanda registrada | Datos actuales |
| Ocupación de agenda | Minutos de la unión de intervalos PROGRAMADA/CONFIRMADA/ATENDIDA dentro de disponibilidad efectiva / minutos de disponibilidad efectiva × 100; recortar al periodo | Horarios, bloqueos e historial de M2 |

La ocupación mide tiempo reservado, no duración real de atención. Donde no exista disponibilidad histórica registrada se mostrará no disponible, no una estimación con el horario actual. Las comparaciones usarán periodos equivalentes e indicarán cuando el periodo actual sea parcial. Para periodos anteriores sin base distinta de cero, mostrar diferencia absoluta sin porcentaje engañoso.

### Aceptación

- Cada cifra permite consultar los registros que explican su resultado.
- No aparecen atenciones duplicadas al existir varias evoluciones para la misma cita.
- Fechas, estados y filtros coinciden entre tarjetas, gráficos, detalles y CSV a la misma fecha de corte.
- Los porcentajes manejan denominador cero y datos históricos insuficientes.
- El panel se actualiza tras cambios relevantes o permite actualización explícita con fecha visible.

## M5. Validación, documentación e integración

- Recorrido completo: registrar paciente, reservar, reprogramar, confirmar/atender, registrar evolución, revisar odontograma y comprobar BI.
- Pruebas de concurrencia, reintento de reservas, límites de fecha, datos vacíos, homónimos y conflictos de versión.
- Pruebas significativas de API, repositorio y frontend; PostgreSQL con rollback y comprobación de ausencia de residuos de prueba.
- Migraciones versionadas y comprobadas, preservando registros previos; verificar permisos de tablas/vistas nuevas y auditoría.
- Revisión visual de escritorio y móvil, teclado y mensajes accesibles.
- Actualizar Swagger, documentación de uso y diccionario de indicadores.
- Aceptación manual por entrega e integración por PR con CI requerido según el flujo del proyecto.

Una entrega se considera terminada cuando cumple su aceptación, sus comprobaciones pasan y su documentación refleja el comportamiento real. Las pruebas automatizadas no sustituyen la aceptación manual pendiente.

## Ampliaciones posteriores

Se registran como opciones fuera de la primera entrega, para priorizarlas según el uso real:

- Fotografías, radiografías y otros adjuntos con almacenamiento privado y validación de archivos.
- Impresión/PDF de ficha, historia y reportes, con alcance de datos explícito.
- Lista de espera, recordatorios y citas recurrentes.
- Notas administrativas separadas de los antecedentes clínicos.
- Indicadores de ingresos, deudas y tratamientos, después de implementar los módulos correspondientes.

Tratamientos, Pagos e Inventario siguen en la planificación general; sus datos no se simularán para completar los gráficos. El BI operativo de este plan adelanta parte del Sprint 8; la analítica financiera y otros reportes dependerán de las entregas posteriores.

## Seguimiento

- [x] Documentar la decisión de usar BI y descartar IA.
- [x] Revisar el estado real y preparar este plan.
- [ ] M0: estabilidad y contrato de medición.
- [ ] M1: ficha integral de pacientes.
- [ ] M2: agenda visual y disponibilidad.
- [ ] M3: historias clínicas y flujo de atención.
- [ ] M4: BI operativo.
- [ ] M5: validación e integración.

No hay fechas comprometidas todavía. Cada entrega se dividirá en tareas verificables al comenzar su implementación, y se actualizará este seguimiento con evidencia de las comprobaciones y de la aceptación del usuario.
