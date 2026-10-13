# Documentación - Sistema de Gestión Dental

## Descripcion
Sistema web profesional para la gestión integral de una clínica dental. Permitirá administrar autenticación, pacientes, citas, historias clínicas, tratamientos, pagos, inventario, panel de indicadores y reportes.

## Stack
- Frontend: React + TypeScript.
- Backend: NestJS + TypeScript, API REST.
- Base de datos: PostgreSQL en Supabase.
- ORM: Prisma.
- Autenticacion: Supabase Auth.
- Autorizacion: usuario unico autenticado por Supabase Auth, validacion de JWT en backend y Row Level Security simple para usuarios autenticados.
- Archivos: Supabase Storage.
- Documentacion API: Swagger.
- Pruebas: Jest.
- CI: GitHub Actions.
- Contenedores: no se usara Docker.

## Usuarios
Sistema de usuario único (sin roles). El registro público está desactivado en Supabase. El usuario operativo se crea manualmente desde el panel de Supabase y tiene acceso total al sistema.

## Estructura del proyecto
```text
sistema-dental/
├── docs/
│   ├── SPRINT.md
│   └── DOCUMENTACION.md
├── backend/
│   ├── prisma/
│   ├── scripts/
│   ├── src/
│   │   ├── common/
│   │   ├── config/
│   │   ├── modulos/
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── public/
    └── src/
        ├── app/
        ├── shared/
        ├── features/
        └── main.tsx
```

## Reglas
- Backend y frontend son proyectos independientes, cada uno con su propio `package.json`.
- El frontend se comunica solo con el backend por API REST.
- Un modulo no importa directamente de otro modulo; lo comun vive en `common/` en backend o `shared/` en frontend.
- Nombres de negocio en espanol y nombres tecnicos en ingles.
- Backend por capas: controller -> service -> repository.
- DTOs con validacion.
- Manejo centralizado de errores, logs y variables de entorno.
- `.env` nunca se sube ni se muestra.
- `SUPABASE_SERVICE_ROLE_KEY` y `DATABASE_URL` solo existen en backend.
- Frontend usa solamente la anon key de Supabase cuando sea necesaria para autenticacion.
- Commits convencionales.
- Ramas: `main`, `develop`, `feature/*`.
- Seguridad con validacion de entradas, RLS simple para usuarios autenticados y auditoria en historias clinicas.
- Pruebas unitarias por servicio y pruebas e2e en flujos criticos.
- Definition of Done: codigo revisado, probado y documentado en Swagger.

## Variables de entorno
### Backend
- `DATABASE_URL`
- `DIRECT_URL`
- `SUPABASE_URL`
- `SUPABASE_JWT_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PORT`
- `NODE_ENV`
- `CORS_ORIGIN`

### Frontend
- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Configuracion inicial de Supabase
- Crear un proyecto en Supabase desde la cuenta de la clinica.
- Copiar la URL del proyecto en `SUPABASE_URL` y `VITE_SUPABASE_URL`.
- Copiar la anon key en `VITE_SUPABASE_ANON_KEY`.
- Copiar la service role key solo en `backend/.env` como `SUPABASE_SERVICE_ROLE_KEY`.
- Copiar el JWT secret solo en `backend/.env` como `SUPABASE_JWT_SECRET`.
- Copiar la cadena de conexion transaccional en `DATABASE_URL`.
- Copiar la cadena directa en `DIRECT_URL`.
- Ejecutar migraciones Prisma cuando existan credenciales reales.
- Ejecutar `backend/scripts/supabase-rls.sql` despues de crear las tablas.

## Comandos de desarrollo
### Backend
- Instalar dependencias: `npm install`.
- Generar cliente Prisma: `npm run prisma:generate`.
- Crear migraciones: `npm run prisma:migrate`.
- Ejecutar desarrollo: `npm run start:dev`.
- Ejecutar pruebas: `npm test -- --runInBand`.
- Compilar: `npm run build`.
- Swagger local: `http://localhost:3000/api/docs`.
- Salud API: `GET http://localhost:3000/api/health`.

### Frontend
- Instalar dependencias: `npm install`.
- Ejecutar desarrollo: `npm run dev`.
- Ejecutar pruebas: `npm test -- --run`.
- Compilar: `npm run build`.
- URL local: `http://localhost:5173`.

## Requisitos funcionales
### autenticacion
- Permitir login y cierre de sesion con Supabase Auth.
- Mantener sesion del usuario en frontend.
- Validar JWT en backend para endpoints protegidos.
- Bloquear acceso a rutas y acciones cuando no exista sesion activa.
- Mantener el registro publico de usuarios desactivado en Supabase.

### pacientes
- Registrar pacientes con datos personales, contacto y datos administrativos.
- Editar datos de pacientes existentes.
- Buscar pacientes por nombre, documento, telefono o correo.
- Consultar detalle del paciente.
- Proteger el acceso con autenticacion obligatoria.

### citas
- Consultar agenda diaria y semanal.
- Reservar citas para pacientes.
- Reprogramar citas existentes.
- Cancelar citas con motivo.
- Gestionar estados de cita: programada, confirmada, atendida, cancelada y no asistio.
- Evitar cruces de horarios en la agenda.

### historias-clinicas
- Crear y consultar historia clinica por paciente.
- Registrar antecedentes, diagnosticos, notas clinicas y evoluciones.
- Gestionar odontograma.
- Registrar auditoria de cambios clinicos.
- Proteger informacion sensible con autenticacion obligatoria y RLS.

### tratamientos
- Gestionar catalogo de tratamientos.
- Registrar precios base.
- Crear presupuestos asociados a pacientes.
- Asociar tratamientos a presupuestos.
- Gestionar estados de presupuesto: borrador, enviado, aceptado, rechazado y finalizado.

### pagos
- Registrar cobros asociados a pacientes, citas, tratamientos o presupuestos.
- Consultar caja diaria.
- Generar comprobantes.
- Consultar deudas y saldos pendientes.
- Registrar anulaciones o ajustes sensibles con trazabilidad.

### inventario
- Registrar insumos dentales.
- Consultar stock disponible.
- Registrar entradas y salidas de stock.
- Alertar bajo stock.
- Mantener historial de movimientos.

### panel
- Mostrar indicadores del dia.
- Mostrar citas del dia.
- Mostrar pagos/cobros del dia.
- Mostrar alertas operativas: citas pendientes, deudas y bajo stock.

### reportes
- Generar reportes de citas, pacientes, tratamientos, pagos e inventario.
- Filtrar reportes por fecha, estado, profesional y modulo.
- Exportar reportes segun alcance definido.
- Proteger reportes con autenticacion obligatoria.

## Requisitos no funcionales
- Seguridad: autenticacion obligatoria en endpoints privados y RLS simple para usuarios autenticados.
- Privacidad: no exponer secretos ni datos sensibles fuera del backend.
- Auditoria: registrar cambios relevantes en historias clinicas y operaciones sensibles.
- Mantenibilidad: arquitectura modular por capas y separacion estricta frontend/backend.
- Escalabilidad: diseno preparado para agregar nuevos modulos sin romper contratos existentes.
- Calidad: pruebas unitarias por servicio y e2e en flujos criticos.
- Observabilidad: logs centralizados en backend para errores y eventos relevantes.
- Documentacion: endpoints documentados en Swagger.
- Usabilidad: interfaz clara para flujos frecuentes de atencion clinica y administracion.
- Disponibilidad: manejo consistente de errores y estados de carga en frontend.
- Rendimiento: busquedas y listados con paginacion o filtros cuando aplique.
- Configuracion: variables por entorno usando `.env.example` sin valores reales.

## Historias de usuario
### autenticacion
- Como usuario unico, quiero iniciar sesion para acceder al sistema de la clinica.
- Como usuario unico, quiero mantener mi sesion activa para trabajar sin iniciar sesion en cada pantalla.
- Como usuario unico, quiero acceder solo cuando mi cuenta exista en Supabase Auth.
- Como usuario autenticado, quiero cerrar sesion para proteger mi cuenta.

### pacientes
- Como usuario unico, quiero registrar pacientes para que puedan agendar citas.
- Como usuario unico, quiero buscar pacientes rapidamente para atender llamadas o visitas.
- Como usuario unico, quiero consultar los datos de un paciente para preparar su atencion.
- Como usuario unico, quiero editar datos administrativos del paciente para mantener la informacion actualizada.

### citas
- Como usuario unico, quiero reservar citas para organizar la agenda de la clinica.
- Como usuario unico, quiero reprogramar citas para atender cambios solicitados por pacientes.
- Como usuario unico, quiero cancelar citas con motivo para mantener historial operativo.
- Como usuario unico, quiero ver la agenda diaria para preparar las atenciones.
- Como usuario unico, quiero consultar la agenda completa para supervisar la operacion.

### historias-clinicas
- Como usuario unico, quiero crear y actualizar historias clinicas para documentar la atencion del paciente.
- Como usuario unico, quiero registrar evoluciones para mantener seguimiento clinico.
- Como usuario unico, quiero usar un odontograma para registrar hallazgos dentales.
- Como usuario unico, quiero auditar cambios clinicos para cumplir controles internos.
- Como usuario unico, quiero proteger informacion clinica con autenticacion y RLS.

### tratamientos
- Como usuario unico, quiero gestionar el catalogo de tratamientos para mantener precios y servicios actualizados.
- Como usuario unico, quiero crear presupuestos para proponer planes de tratamiento a pacientes.
- Como usuario unico, quiero consultar presupuestos aceptados para coordinar citas y pagos.
- Como usuario unico, quiero revisar presupuestos por estado para controlar la gestion comercial.

### pagos
- Como usuario unico, quiero registrar cobros para mantener la caja actualizada.
- Como usuario unico, quiero emitir comprobantes para entregar soporte al paciente.
- Como usuario unico, quiero consultar caja diaria para controlar ingresos.
- Como usuario unico, quiero revisar deudas para dar seguimiento financiero.
- Como usuario unico, quiero consultar el estado de pago de tratamientos cuando aplique.

### inventario
- Como usuario unico, quiero registrar insumos para controlar el inventario de la clinica.
- Como usuario unico, quiero registrar entradas y salidas para mantener stock actualizado.
- Como usuario unico, quiero consultar disponibilidad de insumos relevantes para planificar atenciones.
- Como usuario unico, quiero ver alertas de bajo stock.

### panel
- Como usuario unico, quiero ver indicadores del dia para supervisar la operacion.
- Como usuario unico, quiero ver citas del dia para organizar mi jornada.
- Como usuario unico, quiero ver citas pendientes y confirmaciones para coordinar la atencion.

### reportes
- Como usuario unico, quiero generar reportes de pagos para analizar ingresos.
- Como usuario unico, quiero generar reportes de citas para medir ocupacion.
- Como usuario unico, quiero generar reportes de inventario para controlar consumo de insumos.
- Como usuario unico, quiero consultar reportes de atenciones para revisar productividad clinica.
- Como usuario unico, quiero consultar reportes operativos para apoyar la gestion diaria.

## Modulos
### autenticacion
- Funcion: login, sesión y protección de rutas.
- Endpoints: pendiente de definir en Sprint 1.
- Tablas: no aplica; se usa Supabase Auth sin tabla `profiles`.
- Notas: backend validara JWT emitido por Supabase Auth. El registro público debe estar desactivado en Supabase.
- Estado: pendiente.

### pacientes
- Funcion: registro, datos y busqueda de pacientes.
- Endpoints: pendiente de definir en Sprint 2.
- Tablas: `pacientes`.
- Notas: informacion sensible con acceso controlado.
- Estado: pendiente.

### citas
- Funcion: agenda, reserva, reprogramacion y cancelacion.
- Endpoints: pendiente de definir en Sprint 3.
- Tablas: `citas`.
- Notas: requiere validacion para evitar cruces de agenda.
- Estado: pendiente.

### historias-clinicas
- Funcion: historia clinica, odontograma y evolucion.
- Endpoints: pendiente de definir en Sprint 4.
- Tablas: `historias_clinicas`, `evoluciones_clinicas`, `odontograma_piezas`, `auditoria_historias_clinicas`.
- Notas: requiere auditoria obligatoria de cambios.
- Estado: pendiente.

### tratamientos
- Funcion: catalogo, precios y presupuestos.
- Endpoints: pendiente de definir en Sprint 5.
- Tablas: `tratamientos`, `presupuestos`, `presupuesto_items`.
- Notas: presupuestos asociados a pacientes.
- Estado: pendiente.

### pagos
- Funcion: cobros, caja, comprobantes y deudas.
- Endpoints: pendiente de definir en Sprint 6.
- Tablas: `pagos`, `comprobantes`, `caja_movimientos`.
- Notas: operaciones sensibles protegidas por autenticacion y trazabilidad.
- Estado: pendiente.

### inventario
- Funcion: insumos y stock.
- Endpoints: pendiente de definir en Sprint 7.
- Tablas: `insumos`, `inventario_movimientos`.
- Notas: control de entradas, salidas y bajo stock.
- Estado: pendiente.

### panel
- Funcion: indicadores del dia solo frontend.
- Endpoints: consumira endpoints de modulos existentes.
- Tablas: no aplica directamente.
- Notas: muestra datos del usuario unico autenticado.
- Estado: pendiente.

### reportes
- Funcion: reportes y exportaciones.
- Endpoints: pendiente de definir en Sprint 8.
- Tablas: consultara datos de modulos existentes.
- Notas: reportes protegidos por autenticacion obligatoria.
- Estado: pendiente.

## Modelo de datos
### Convenciones generales
- Todas las tablas del dominio usaran `id` UUID como llave primaria.
- Todas las tablas principales usaran `created_at`, `updated_at` y, cuando aplique, `deleted_at` para borrado logico.
- Las relaciones usaran llaves foraneas explicitas.
- Los montos se guardaran como `decimal(12,2)`.
- Las fechas con hora se guardaran como `timestamptz`.
- Los estados se modelaran con enums controlados desde Prisma/PostgreSQL.
- Los campos sensibles se expondran solo segun permisos y RLS.

### Entidades principales
#### pacientes
- Modulo: pacientes.
- Campos: `id`, `tipo_documento`, `numero_documento`, `nombres`, `apellidos`, `fecha_nacimiento`, `sexo`, `telefono`, `email`, `direccion`, `contacto_emergencia_nombre`, `contacto_emergencia_telefono`, `activo`, `created_at`, `updated_at`, `deleted_at`.
- Relaciones: tiene citas, historia clinica, presupuestos, pagos y comprobantes.
- Notas: `numero_documento` debe ser unico cuando exista.

#### citas
- Modulo: citas.
- Campos: `id`, `paciente_id`, `fecha_inicio`, `fecha_fin`, `estado`, `motivo`, `notas`, `motivo_cancelacion`, `created_at`, `updated_at`, `deleted_at`.
- Relaciones: pertenece a un paciente.
- Notas: no debe existir cruce de horarios activos en la agenda.

#### historias_clinicas
- Modulo: historias-clinicas.
- Campos: `id`, `paciente_id`, `antecedentes_medicos`, `alergias`, `medicamentos`, `observaciones`, `created_at`, `updated_at`.
- Relaciones: pertenece a un paciente y tiene evoluciones, odontograma y auditoria.
- Notas: debe existir maximo una historia clinica activa por paciente.

#### evoluciones_clinicas
- Modulo: historias-clinicas.
- Campos: `id`, `historia_clinica_id`, `fecha`, `diagnostico`, `procedimiento`, `observaciones`, `created_at`, `updated_at`.
- Relaciones: pertenece a una historia clinica.
- Notas: los registros clinicos no se eliminan fisicamente.

#### odontograma_piezas
- Modulo: historias-clinicas.
- Campos: `id`, `historia_clinica_id`, `pieza`, `superficie`, `estado`, `observaciones`, `created_at`, `updated_at`.
- Relaciones: pertenece a una historia clinica.
- Notas: `pieza` debe respetar numeracion dental definida por la clinica.

#### auditoria_historias_clinicas
- Modulo: historias-clinicas.
- Campos: `id`, `historia_clinica_id`, `accion`, `tabla_afectada`, `registro_id`, `valor_anterior`, `valor_nuevo`, `created_at`.
- Relaciones: pertenece a una historia clinica.
- Notas: `valor_anterior` y `valor_nuevo` se guardaran como JSON.

#### tratamientos
- Modulo: tratamientos.
- Campos: `id`, `codigo`, `nombre`, `descripcion`, `precio_base`, `activo`, `created_at`, `updated_at`, `deleted_at`.
- Relaciones: puede formar parte de items de presupuesto.
- Notas: `codigo` debe ser unico.

#### presupuestos
- Modulo: tratamientos.
- Campos: `id`, `paciente_id`, `estado`, `subtotal`, `descuento`, `total`, `observaciones`, `created_at`, `updated_at`, `deleted_at`.
- Relaciones: pertenece a paciente; tiene items y puede tener pagos asociados.
- Notas: el total se calcula a partir de los items, descuento e impuestos futuros si aplican.

#### presupuesto_items
- Modulo: tratamientos.
- Campos: `id`, `presupuesto_id`, `tratamiento_id`, `cantidad`, `precio_unitario`, `subtotal`, `pieza`, `observaciones`, `created_at`, `updated_at`.
- Relaciones: pertenece a un presupuesto y a un tratamiento.
- Notas: guarda precio historico para no depender de cambios futuros del catalogo.

#### pagos
- Modulo: pagos.
- Campos: `id`, `paciente_id`, `presupuesto_id`, `monto`, `metodo_pago`, `estado`, `fecha_pago`, `referencia`, `observaciones`, `created_at`, `updated_at`.
- Relaciones: pertenece a paciente, opcionalmente a presupuesto y puede tener comprobante.
- Notas: pagos anulados conservan registro y motivo en observaciones o auditoria futura.

#### comprobantes
- Modulo: pagos.
- Campos: `id`, `pago_id`, `paciente_id`, `numero`, `tipo`, `estado`, `fecha_emision`, `monto_total`, `archivo_url`, `created_at`, `updated_at`.
- Relaciones: pertenece a pago y paciente.
- Notas: estrategia de numeracion queda pendiente para Sprint 6.

#### caja_movimientos
- Modulo: pagos.
- Campos: `id`, `tipo`, `monto`, `metodo_pago`, `pago_id`, `descripcion`, `created_at`.
- Relaciones: puede asociarse a un pago.
- Notas: registra ingresos, egresos y ajustes operativos.

#### insumos
- Modulo: inventario.
- Campos: `id`, `codigo`, `nombre`, `descripcion`, `unidad_medida`, `stock_actual`, `stock_minimo`, `activo`, `created_at`, `updated_at`, `deleted_at`.
- Relaciones: tiene movimientos de inventario.
- Notas: `stock_actual` no puede ser negativo.

#### inventario_movimientos
- Modulo: inventario.
- Campos: `id`, `insumo_id`, `tipo`, `cantidad`, `stock_anterior`, `stock_nuevo`, `motivo`, `created_at`.
- Relaciones: pertenece a un insumo.
- Notas: cada entrada o salida debe dejar trazabilidad del stock anterior y nuevo.

### Relaciones principales
- `pacientes` 1 a N `citas`.
- `pacientes` 1 a 1 `historias_clinicas`.
- `historias_clinicas` 1 a N `evoluciones_clinicas`.
- `historias_clinicas` 1 a N `odontograma_piezas`.
- `historias_clinicas` 1 a N `auditoria_historias_clinicas`.
- `pacientes` 1 a N `presupuestos`.
- `presupuestos` 1 a N `presupuesto_items`.
- `tratamientos` 1 a N `presupuesto_items`.
- `pacientes` 1 a N `pagos`.
- `presupuestos` 1 a N `pagos`.
- `pagos` 1 a 1 `comprobantes`.
- `insumos` 1 a N `inventario_movimientos`.

### Enums iniciales
- `EstadoCita`: `PROGRAMADA`, `CONFIRMADA`, `ATENDIDA`, `CANCELADA`, `NO_ASISTIO`.
- `EstadoPresupuesto`: `BORRADOR`, `ENVIADO`, `ACEPTADO`, `RECHAZADO`, `FINALIZADO`.
- `MetodoPago`: `EFECTIVO`, `TARJETA`, `TRANSFERENCIA`, `OTRO`.
- `EstadoPago`: `REGISTRADO`, `ANULADO`.
- `TipoComprobante`: `RECIBO`, `FACTURA`.
- `EstadoComprobante`: `EMITIDO`, `ANULADO`.
- `TipoMovimientoCaja`: `INGRESO`, `EGRESO`, `AJUSTE`.
- `TipoMovimientoInventario`: `ENTRADA`, `SALIDA`, `AJUSTE`.

## Configuracion tecnica inicial
### Repositorio
- Git inicializado en rama `main`.
- Estrategia definida: `main`, `develop`, `feature/*`.
- Commits esperados: convencionales (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`).

### Backend
- Proyecto NestJS configurado manualmente sin Docker.
- Estructura modular creada en `backend/src/modulos`.
- Capa comun creada en `backend/src/common`.
- Swagger configurado en `/api/docs`.
- Prefijo global configurado en `/api`.
- Validacion global configurada con `ValidationPipe`.
- CORS configurado por variable `CORS_ORIGIN`.
- Seguridad HTTP configurada con `helmet`.
- Compresion HTTP configurada con `compression`.
- Filtro global de errores creado en `HttpExceptionFilter`.
- Guard global creado para JWT de Supabase.
- Prisma configurado con `schema.prisma` y `PrismaService`.
- Endpoint publico inicial creado: `GET /api/health`.

### Frontend
- Proyecto React + TypeScript configurado con Vite.
- Router principal creado con rutas por modulo.
- Layout base creado con navegacion lateral.
- Cliente API centralizado creado en `shared/lib/apiClient.ts`.
- Cliente Supabase preparado en `shared/lib/supabaseClient.ts`.
- Features creados con los mismos nombres de negocio definidos para el proyecto.
- Modulo `panel` creado solo en frontend.

### CI
- GitHub Actions configurado en `.github/workflows/ci.yml`.
- Flujo backend: instalar dependencias, generar Prisma Client, ejecutar pruebas y compilar.
- Flujo frontend: instalar dependencias, ejecutar pruebas y compilar.

### Validacion local ejecutada
- Backend: `npm run prisma:generate` ejecutado correctamente.
- Backend: `npm test -- --runInBand` ejecutado correctamente.
- Backend: `npm run build` ejecutado correctamente.
- Frontend: `npm test -- --run` ejecutado correctamente.
- Frontend: `npm run build` ejecutado correctamente.
- Nota: `npm audit` reporto vulnerabilidades transitivas; quedan registradas como pendiente antes de produccion.

## Reglas de datos
- El registro publico de usuarios debe permanecer desactivado en Supabase.
- El usuario operativo se crea manualmente desde el panel de Supabase.
- Un paciente no debe duplicarse por el mismo `tipo_documento` y `numero_documento`.
- La eliminacion de pacientes sera logica mediante `deleted_at`.
- No se pueden crear citas con `fecha_fin` menor o igual a `fecha_inicio`.
- No se pueden crear o reprogramar citas que crucen horarios activos en la agenda.
- Solo citas `PROGRAMADA` o `CONFIRMADA` pueden cancelarse.
- Una cita `ATENDIDA` no debe volver a estados previos sin una decision operativa registrada.
- Cada paciente puede tener una sola historia clinica activa.
- Las evoluciones clinicas y auditorias no se eliminan fisicamente.
- Todo cambio relevante en historias clinicas debe crear un registro en `auditoria_historias_clinicas`.
- Los precios historicos de presupuestos se guardan en `presupuesto_items.precio_unitario`.
- Un presupuesto `ACEPTADO` no debe modificarse libremente; los cambios requieren nueva version o trazabilidad futura.
- Un pago no puede tener monto menor o igual a cero.
- Un pago anulado no se borra; cambia a estado `ANULADO`.
- La caja diaria se calcula desde `caja_movimientos` y pagos registrados.
- Un insumo no puede quedar con `stock_actual` negativo.
- Todo movimiento de inventario debe guardar `stock_anterior` y `stock_nuevo`.
- Los reportes respetaran autenticacion obligatoria y no saltaran RLS.

## Decisiones tecnicas
| Fecha | Decision | Motivo |
|---|---|---|
| 2026-10-12 | Trabajar por sprints y modulo por modulo. | Mantener alcance controlado, trazabilidad y entregas verificables. |
| 2026-10-12 | Separar backend y frontend como proyectos independientes. | Evitar acoplamiento y mantener responsabilidades claras. |
| 2026-10-12 | Usar Supabase Auth con validacion JWT en backend. | Delegar autenticacion en Supabase y proteger endpoints desde NestJS. |
| 13/10/2026 | Sin tabla `profiles` ni roles | El sistema lo usa una sola persona |
| 2026-10-12 | No usar Docker. | Cumplir restriccion tecnica del proyecto. |
| 2026-10-12 | Mantener solo `docs/SPRINT.md` y `docs/DOCUMENTACION.md` como archivos de seguimiento. | Centralizar el estado del proyecto y evitar documentacion duplicada. |
| 2026-10-12 | Usar UUID como llave primaria en tablas del dominio. | Facilitar integracion con Supabase, seguridad y escalabilidad. |
| 2026-10-12 | Usar borrado logico en tablas operativas principales. | Conservar trazabilidad y evitar perdida accidental de informacion clinica o administrativa. |
| 2026-10-12 | Guardar precios historicos en items de presupuesto. | Evitar que cambios futuros del catalogo alteren presupuestos emitidos. |
| 2026-10-12 | Registrar auditoria obligatoria en historias clinicas. | Proteger informacion sensible y mantener trazabilidad clinica. |
| 2026-10-12 | Configurar proyectos backend y frontend independientes. | Cumplir la separacion requerida y permitir CI por proyecto. |
| 2026-10-12 | Crear script SQL inicial de RLS separado de Prisma. | Mantener las politicas de Supabase versionadas y revisables. |
| 2026-10-12 | Usar Vite para el frontend React. | Obtener una base TypeScript simple, rapida y mantenible sin Docker. |

## Historial de cambios
| Fecha | Sprint | Cambio |
|---|---|---|
| 2026-10-12 | Sprint 0 | Se definieron requisitos funcionales, requisitos no funcionales e historias de usuario por modulo. |
| 2026-10-12 | Sprint 0 | Se definio el modelo entidad-relacion inicial y las reglas de datos del sistema. |
| 2026-10-12 | Sprint 0 | Se creo la estructura base del backend NestJS, frontend React, Prisma, RLS inicial, variables de entorno, Git, CI y validaciones locales. |
| 2026-10-13 | Sprint 0 | Se completo la configuracion inicial real con Supabase, migracion Prisma, RLS inicial y validaciones locales. |
| 2026-10-13 | Fuera de sprint | Cambio de requisito antes de iniciar Sprint 1: sistema de usuario unico, sin tabla `profiles`, sin roles y con RLS simple para usuarios autenticados. |
