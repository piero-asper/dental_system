# Sprints de backend

Actualizado: 2026-10-24 · America/Bogota.

Este documento sigue API, reglas de negocio, datos, autenticación, migraciones y permisos. El diseño de pantallas se sigue por separado en [Sprints de frontend](SPRINTS_FRONTEND.md). La numeración conserva los módulos del plan original: BE-3 y FE-3 pertenecen a Citas, pero tienen tareas y aceptación propias.

Estados: ✅ cerrado y entregado · 🟨 implementado o en curso, pendiente de cierre · ⬜ pendiente. Una comprobación técnica correcta no equivale a aceptación de toda la entrega.

## Estado actual

**BE-8 · BI operativo:** API implementada y verificada, pendiente de aceptación e integración. El rediseño visual actual corresponde a FE-8 y no añade funciones de negocio al backend.

BE-3 y BE-4 también conservan su cierre pendiente. Última validación funcional registrada: 42 pruebas unitarias, 91 HTTP y las tres suites con PostgreSQL real, rollback y verificación de residuos. `auth:check` verificó la cuenta operativa y las 17 tablas. Evidencia y contexto en [Estado de avance](ESTADO_AVANCE.md).

## BE-0 · Base técnica — ✅ cerrado

- [x] NestJS, configuración, validación, Swagger, logs y manejo de errores.
- [x] Prisma y PostgreSQL en Supabase; modelo inicial y migración versionada.
- [x] Variables locales fuera de Git y ejemplos de configuración.
- [x] CI inicial y convenciones de repositorio.

## BE-1 · Autenticación — ✅ cerrado, v0.1.0

- [x] Verificación del token con Supabase Auth y `GET /api/autenticacion/sesion`.
- [x] Usuario único; registro público y acceso anónimo desactivados.
- [x] RLS y permisos iniciales verificados en Supabase.
- [x] Pruebas de acceso, Swagger e integración mediante PR/CI.

## BE-2 · Pacientes — ✅ entrega base cerrada, v0.2.0

- [x] Crear, consultar y editar; activar/inactivar conservando la ficha.
- [x] Nombres y apellidos obligatorios, teléfono opcional; DTO y validaciones.
- [x] Búsqueda, filtros y paginación; pruebas HTTP y de repositorio.
- [x] Entrega mediante PR/CI.

Mejoras posteriores aún pendientes de integrar: resumen y citas del paciente, búsqueda normalizada, coincidencias y control de versión. Se siguen en BE-M0/BE-M1, no se atribuyen a la versión ya entregada.

## BE-3 · Citas — 🟨 implementado y verificado; cierre pendiente

- [x] Agenda única, intervalos con zona horaria y estados de cita.
- [x] Reservas y reprogramaciones para pacientes activos; prevención transaccional de cruces y exclusión PostgreSQL.
- [x] Cancelación con motivo, conservación del registro y control de versión.
- [x] Pruebas unitarias, HTTP y PostgreSQL con rollback.
- [ ] Aceptación conjunta del flujo con FE-3.
- [ ] PR con CI hacia develop/main y entrega versionada.

## BE-4 · Historias clínicas — 🟨 implementado y verificado; cierre pendiente

- [x] Historia única, antecedentes, alergias, medicamentos y observaciones.
- [x] Evoluciones y odontograma FDI por pieza/superficie.
- [x] Auditoría atómica, versiones e historial inmutable; protección contra borrado físico.
- [x] Migración de integridad aplicada y permisos verificados.
- [x] Pruebas unitarias, HTTP y PostgreSQL con rollback.
- [ ] Aceptación conjunta del flujo con FE-4.
- [ ] PR con CI e integración de la entrega.

## BE-M0 a BE-M3 · Mejoras de estabilidad y atención — 🟨 validación y aceptación pendientes

- [x] BE-M0: diagnóstico separado de dependencias, idempotencia al reservar y edición versionada de pacientes.
- [x] BE-M1: resumen, citas paginadas, normalización de nombres/teléfonos, seguimiento y posibles coincidencias.
- [x] BE-M2: disponibilidad versionada, descansos, bloqueos, franjas e historial de citas.
- [x] BE-M3: evoluciones paginadas, borradores/finalización, vínculos con citas y piezas, correcciones con motivo y filtros de auditoría.
- [x] Migraciones aditivas aplicadas; se preservaron registros anteriores.
- [ ] Aceptar los criterios completos del [plan M0–M5](PLAN_MEJORAS_BI.md) junto a frontend.

## BE-5 · Tratamientos — ⬜ pendiente

- [ ] Catálogo, precios y validaciones.
- [ ] Presupuestos e ítems por paciente; reglas de cambio de estado.
- [ ] Endpoints autenticados y contratos para FE-5.
- [ ] Pruebas de negocio, repositorio y HTTP; Swagger y migraciones/permisos.

## BE-6 · Pagos — ⬜ pendiente

- [ ] Registro de cobros y conciliación con presupuestos.
- [ ] Caja diaria, deudas y comprobantes.
- [ ] Definir numeración de comprobantes con la clínica.
- [ ] Consistencia de importes, pruebas, contratos para FE-6 y Swagger.

## BE-7 · Inventario — ⬜ pendiente

- [ ] Insumos, existencias y movimientos.
- [ ] Validaciones y consistencia del stock; alertas de mínimo.
- [ ] Endpoints para FE-7, pruebas, migraciones y Swagger.

## BE-8 · BI y reportes — 🟨 parte operativa implementada; parte financiera pendiente

- [x] Indicadores operativos, periodos de Colombia, comparación y series diarias.
- [x] Demanda, ocupación con disponibilidad histórica y registros que explican cada cifra.
- [x] Corte compartido para resumen, detalle paginado y CSV; límites y autenticación.
- [x] Exportación administrativa sin narrativas clínicas y protección de fórmulas CSV.
- [x] Próximas citas y pruebas con datos conocidos; parámetros documentados.
- [ ] Aceptación de conciliación de cifras, detalles y exportación con FE-8.
- [ ] Indicadores financieros después de BE-5/BE-6; no se simulan ingresos ni deudas.
- [ ] Integración por PR/CI.

## BE-9 · Preparación de producción — ⬜ pendiente

- [ ] Evaluar e incorporar un entorno local con Podman y Compose para la API, coordinado con FE-9. Propuesta conversada con el usuario; todavía sin implementar ni validar. Mantener inicialmente PostgreSQL y Auth en Supabase; no migrar los datos clínicos. Documentar variables externas a las imágenes, puertos y arranque conjunto.
- [ ] QA de API y reglas de negocio; revisión de consultas según mediciones.
- [ ] Seguridad, permisos, dependencias y estrategia de respaldo/restauración.
- [ ] Revisión con la clínica de conservación y tratamiento de datos.
- [ ] Configuración de despliegue, diagnóstico y documentación operativa final.

## Criterio de cierre de backend

Contrato documentado, pruebas relevantes correctas, migraciones/permisos comprobados, integración con su sprint frontend y aceptación de reglas de negocio. Guardar por PR con CI; una pantalla rediseñada no cambia por sí sola el estado de backend.
