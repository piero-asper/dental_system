# Avance guardado para continuar

Fecha: 2026-10-24 (America/Bogota).
Rama: `codex/s3-s4-citas-historias`.
Estado: punto de pausa solicitado por el usuario. Avance en curso; apariencia, aceptación manual e integración pendientes.

Trabajo actual: **FE-8, rediseño visual del panel**, a partir de la referencia dental elegida el 24 de octubre. Seguimiento separado en [backend](SPRINTS_BACKEND.md) y [frontend](SPRINTS_FRONTEND.md); [índice general](SPRINT.md).

**Para retomar:** continuar la [apariencia del sistema](APARIENCIA_PENDIENTE.md). Los colores actuales no fueron aceptados. La última muestra utiliza `#0C4A6E`, `#2B6CB0`, `#1C3F72` y `#EBF8FF`, con tarjetas blancas; sigue pendiente de aprobación y no está aplicada al código. Guardar este avance en GitHub no cierra el diseño ni los sprints pendientes.

## Alcance

Mejoras de Pacientes, Citas e Historias clínicas y BI integrado en Panel/Reportes, según [el plan](PLAN_MEJORAS_BI.md). IA descartada. Se conserva una cuenta operativa, una agenda y los datos personales mínimos acordados.

## Avance implementado

- Pacientes: fecha de registro sin hora, botón A–Z, resumen de última/próxima atención, citas por paciente, accesos con paciente preseleccionado, filtros de seguimiento, normalización de búsqueda y control de versión al editar.
- Citas: calendario diario/semanal y lista accesible, franjas disponibles, configuración versionada de horarios, bloqueos, detalle, edición de motivo/notas, historial e idempotencia de reservas.
- Historias: resumen clínico, revisión explícita de alergias/medicamentos, evoluciones paginadas con filtros, borradores/finalización y vínculo con cita/piezas; odontograma con superficies seleccionables e historial por pieza; filtros de auditoría.
- BI: indicadores operativos, comparación de periodos, gráficos diarios, demanda por día/hora, detalles y CSV sobre un corte temporal del reporte. Los cortes se guardan en memoria del proceso por cinco minutos y se invalidan al reiniciar la API.
- Estabilidad: mensajes diferenciados, protección de cambios sin guardar y diagnóstico de dependencias. Quedan por completar los casos extremos y la comprobación integral.
- Diseño FE-8: navegación azul petróleo, acentos verde azulado, indicadores compactos, próximas citas, próxima atención y seguimiento. Panel y Reportes comparten la consulta y exportación por corte. Búsqueda de pacientes, filtros de próximas citas y puntos del gráfico operativos; sin copiar datos de la referencia ni simular módulos pendientes.

## Base de datos

La migración aditiva `20261018060000_mejoras_bi` fue validada primero con `ROLLBACK` y después aplicada con `prisma migrate deploy` en Supabase. Añade horarios, bloqueos, eventos de citas y campos/vínculos clínicos sin borrar registros anteriores. Prisma encontró tres migraciones aplicadas.

No hay un horario real de atención configurado por el usuario. El formulario ofrece una propuesta editable, que requiere guardado explícito. Las nuevas reservas exigen disponibilidad configurada; los horarios históricos ausentes se señalan en BI. Las evoluciones existentes se conservan como finalizadas y no se vinculan automáticamente a citas.

## Comprobaciones realizadas

El 24 de octubre se retomaron las comprobaciones. Supabase inicialmente no resolvía por DNS; tras iniciar sesión y restaurar el proyecto desde el panel, autenticación y PostgreSQL volvieron a responder. `auth:check` verificó la cuenta operativa, las políticas de las 17 tablas y el bloqueo de escrituras clínicas directas. No se crearon cuentas ni se cambiaron credenciales.

Correcciones de esta revisión:

- Un solo bloqueo de navegación para todos los formularios abiertos; protección de fechas, estados y bloqueos sin guardar, y confirmaciones en las acciones de la lista de citas.
- La edición de pacientes conserva la versión original aunque se actualice la caché; escritura y lectura del resultado dentro de una transacción.
- Coincidencias por nombre y teléfono, búsqueda del teléfono completo sin separadores y actualización de los resúmenes relacionados.
- Quitar una cita de una evolución envía un nulo explícito; cambiar sólo la fecha también protege el formulario. La recarga confirmada restaura los campos aunque no cambie la versión.
- BI cuenta la unión de los intervalos reservados, excluye citas futuras de la tasa de inasistencia y proporciona su detalle específico. El panel muestra las cinco próximas citas.
- Citas canceladas conservadas fuera de los bloques horarios para que no tapen reservas vigentes. Franjas de la cuadrícula cada 30 minutos; el selector ofrece los inicios disponibles cada 15 minutos.
- Parámetros de agenda y BI documentados en Swagger; códigos seguros en el diagnóstico de conexión.

La revisión visual usa datos ficticios en una entrada temporal que se retira antes de entregar. Se comprobaron odontograma y superficies con teclado, panel y detalle de BI en móvil, descarga CSV y calendario. No sustituye la aceptación clínica con la cuenta real.

Referencia histórica del 18 de octubre (las ejecuciones del 24 se registran en la sección siguiente):

- Backend: 40 pruebas unitarias.
- Backend: 90 pruebas HTTP, incluidas las nuevas rutas de agenda y BI.
- Frontend: 38 pruebas.
- PostgreSQL: las pruebas de pacientes, clínica y mejoras/BI pasaron; se ejecutaron con rollback y verificaciones de ausencia de residuos. La prueba clínica se repitió después de ajustar la prioridad del error de hallazgo duplicado.
- Backend y frontend compilaron durante el trabajo. Es necesario recompilar el estado final antes de arrancar.
- Revisión visual parcial en navegador con información ficticia: panel BI, ficha integral y calendario. Las dos páginas temporales de esa revisión se retiraron antes de guardar el avance.

## Resultado de validación del 24 de octubre

| Comprobación | Resultado |
|---|---|
| Backend unitario | 42 pruebas correctas |
| Backend HTTP | 91 pruebas correctas |
| Frontend | 53 pruebas correctas en la comprobación final antes de guardar el avance en GitHub |
| PostgreSQL | Las tres suites pasaron con rollback y comprobación de residuos. Pacientes se repitió después de ampliar los casos de teléfono y tildes: correcto |
| Compilación | Backend y frontend correctos |
| Supabase | `auth:check` correcto: una cuenta confirmada, 17 tablas con RLS, sin permisos anónimos y escrituras clínicas directas bloqueadas |
| Salud local | API, PostgreSQL y autenticación responden correctamente |
| Visual | Datos ficticios: odontograma de 52 piezas, superficies con teclado, evoluciones, auditoría, panel/detalle/CSV móvil y calendario. Entrada temporal retirada |

## Pendientes para el cierre

La revisión de diseño FE-8 compiló y pasó 53 pruebas del frontend. Incluye nuevas comprobaciones del corte de BI, filtro de próximas citas, búsqueda y activación del gráfico mediante teclado. Revisión visual de escritorio/móvil y descarga CSV con datos de demostración; la entrada temporal se retiró. No se modificó el backend durante este rediseño.

Antes de guardar el punto de pausa en GitHub se repitieron las 42 pruebas unitarias del backend, las 91 HTTP, las 53 del frontend y ambas compilaciones: correctas. Las suites del backend requirieron ejecutarse fuera del aislamiento local por un bloqueo de escritura de la caché de Jest. Las comprobaciones previas de PostgreSQL se conservan como evidencia; no se repitieron para guardar este punto de avance.

1. Completar la aceptación de cada criterio del plan con el usuario. Las correcciones automatizadas y la revisión visual no cierran por sí mismas M0–M5.
2. Validar con la cuenta real: configurar el horario de la clínica, reservar/reprogramar/cancelar, registrar y finalizar una evolución, consultar odontograma y conciliar cifras/detalles/CSV. No se ha guardado un horario real en nombre del usuario.
3. Continuar la apariencia del sistema según [el pendiente de FE-8](APARIENCIA_PENDIENTE.md), acordar la paleta y obtener aceptación visual.
4. El avance se guarda como trabajo en curso en la rama `codex/s3-s4-citas-historias`, con PR en borrador hacia `develop`. Comprobar CI y realizar la integración hacia develop/main sólo tras la aceptación. No se ha hecho merge ni creado versión de entrega.

El programa queda ejecutándose localmente: frontend `http://localhost:5173`, API `http://localhost:3000/api`. La página de acceso se abrió para la revisión del usuario. Si se cierran los procesos, seguir los comandos de arranque de la documentación.

Los archivos `.env`, dependencias, compilaciones y registros de ejecución se mantienen fuera de Git según `.gitignore`.
