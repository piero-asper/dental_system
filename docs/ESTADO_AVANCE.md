# Avance guardado para continuar

## Actualización del 5 de noviembre de 2026

**Continuación: módulos y flujos completos.** Pagos ya tiene API e interfaz: abonos sobre presupuestos aceptados/finalizados, cartera, recibos internos REC, anulaciones versionadas y caja. Se añadieron cortes financieros para resumen/detalle/CSV, enlaces desde pacientes y presupuestos, menú agrupado por secciones y guía de uso dentro del sistema y en [GUIA_FLUJOS.md](GUIA_FLUJOS.md). La migración `20261106020000_pagos_caja` pasó la validación con rollback y se aplicó. `auth:check` verificó 18 tablas y la cuenta operativa. Las cinco suites PostgreSQL pasaron con rollback, incluida la conservación de la numeración de recibos. Se validaron 54 pruebas unitarias y 133 HTTP del backend. Frontend: 72 casos validados; dos casos de BI agotaron su tiempo en la ejecución conjunta y la suite completa de BI pasó al repetirse aislada. El usuario inició sesión con la contraseña nueva y se comprobó el panel. Se conservan pendientes la aceptación de los flujos con la clínica, el diseño definitivo y PR/CI.

Verificación final en ejecución: ambas imágenes reconstruidas y contenedores saludables; API, PostgreSQL y autenticación `ok`. Rutas de Pagos/Cartera/Caja/Anulación publicadas y petición sin sesión rechazada con 401. Con la sesión real se verificaron el lateral por secciones, consulta de cartera, resumen y detalle de caja sin movimientos, descarga CSV y la guía de uso. La guía quedó abierta para el usuario. No se registraron cobros ni cambios clínicos reales durante esta comprobación.

Nueva lista acordada: [herramientas, recuperación de acceso y módulos](LISTA_TRABAJO.md). Supabase fue reactivado por el usuario. Se implementaron Tratamientos/Presupuestos e Inventario en API e interfaz, además del flujo de recuperación de contraseña. La migración `20261106010000_tratamientos_inventario` se validó con rollback y se aplicó; restringe escrituras directas, valida importes y existencias y hace inmutables los movimientos de inventario. Continúan pendientes aceptación con la cuenta real, apariencia, Pagos e integración por PR/CI. El correo de recuperación encontró HTTP 429; se abrió una recuperación directa de un solo uso. El usuario indicó haber completado el cambio y se observó el retorno al login; no se leyeron ni introdujeron contraseñas. Falta comprobar el nuevo inicio de sesión.

La sección siguiente conserva el punto de avance anterior como referencia histórica.

Validación de los módulos nuevos: 49 pruebas unitarias del backend y 65 del frontend correctas. Las 91 pruebas HTTP anteriores pasaron y las 25 nuevas de Tratamientos/Inventario pasaron al corregir la respuesta simulada de autenticación del ensayo. PostgreSQL: prueba de repositorios con precios históricos, edición obsoleta, estados, stock, historial inmutable y permisos correcta, con rollback y comprobación de ausencia de residuos. `auth:check` confirmó una cuenta operativa y las políticas de las 17 tablas, con escrituras directas bloqueadas para los módulos nuevos. Las pruebas Jest requirieron ejecutarse fuera del aislamiento por un bloqueo de escritura de su caché en Windows.

Fecha: 2026-10-26 (America/Bogota).
Rama: `codex/s3-s4-citas-historias`.
Estado: avance en curso; entorno local con Podman incorporado. Apariencia, aceptación manual e integración pendientes.

Trabajo actual: **BE-9/FE-9, entorno local con Podman**, implementado y verificado el 26 de octubre. **FE-8, rediseño visual del panel**, conserva su aceptación pendiente a partir de la referencia dental elegida el 24 de octubre. Seguimiento separado en [backend](SPRINTS_BACKEND.md) y [frontend](SPRINTS_FRONTEND.md); [índice general](SPRINT.md).

**Para retomar:** continuar la [apariencia del sistema](APARIENCIA_PENDIENTE.md). Los colores actuales no fueron aceptados. La última muestra utiliza `#0C4A6E`, `#2B6CB0`, `#1C3F72` y `#EBF8FF`, con tarjetas blancas; sigue pendiente de aprobación y no está aplicada al código. Guardar este avance en GitHub no cierra el diseño ni los sprints pendientes.

**Podman (BE-9/FE-9):** máquina WSL2 `dental-system` creada e iniciada, Compose instalado y arranque conjunto del frontend React y el backend NestJS comprobado. PostgreSQL y autenticación permanecen en Supabase. Ver [instrucciones de arranque y diagnóstico](PODMAN.md). La apariencia de FE-8 se retomará después y conserva su aceptación pendiente.

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

## Resultado de validación de Podman del 26 de octubre

- Podman 6.1.4, máquina WSL2 `dental-system` en modo rootless y Docker Compose 5.6.1. El proveedor se descargó de la distribución oficial y se verificó su SHA256.
- Añadidos `compose.yaml`, ambos `Containerfile` y exclusiones de construcción. Construcciones con `npm ci` y Node.js 22, Prisma generado dentro de Linux y backend compilado correctamente. Frontend compilado también dentro de su contenedor.
- Los dos contenedores quedaron `healthy`, publicados sólo en `127.0.0.1:3000` y `127.0.0.1:5173`. Los procesos utilizan usuarios sin privilegios y se comprobó que no hay `.env` dentro de sus sistemas de archivos.
- API, PostgreSQL y Supabase Auth respondieron `ok`; frontend HTTP 200, CORS para el origen local correcto y `/api/pacientes` sin autenticación devolvió HTTP 401.
- Navegador: carga correcta de `/login`, con formulario de acceso. No se inició sesión ni se ejecutaron operaciones clínicas durante esta integración; la aceptación manual completa sigue pendiente.
- La compilación frontend conserva el aviso de tamaño del paquete. La instalación de las dependencias existentes informó avisos de seguridad; su revisión sigue pendiente en BE-9. No se actualizaron dependencias como parte de esta integración.

El programa queda ejecutándose en Podman: frontend `http://localhost:5173`, API `http://localhost:3000/api`. Para arrancar de nuevo, seguir la [guía de Podman](PODMAN.md). La configuración está preparada para uso local; no cierra la preparación de producción ni los criterios clínicos o visuales pendientes.

Los archivos `.env`, dependencias, compilaciones y registros de ejecución se mantienen fuera de Git según `.gitignore`.
