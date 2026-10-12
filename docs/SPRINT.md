# Plan de Sprints - Sistema de Gestión Dental

## Estados
- ⬜ Pendiente
- 🟨 En curso
- ✅ Terminado

## Sprint actual
- Sprint: Sprint 0
- Estado: 🟨 En curso
- Duración estimada: 2 semanas
- Objetivo: definir la base funcional, tecnica y documental del sistema antes de iniciar la implementacion.

## Sprint 0 - Requisitos, arquitectura inicial y preparacion
- ✅ Paso 1: definir requisitos funcionales, requisitos no funcionales e historias de usuario por módulo y rol.
- ✅ Paso 2: definir modelo entidad-relacion inicial y reglas de datos.
- 🟨 Paso 3: crear proyecto en Supabase y definir configuracion inicial.
- ✅ Paso 4: crear estructura base del repositorio sin Docker.
- ✅ Paso 5: crear `.gitignore` y `.env.example` para backend y frontend.
- ✅ Paso 6: configurar backend NestJS base con Swagger, validacion, logs y manejo centralizado de errores.
- ✅ Paso 7: configurar frontend React + TypeScript base.
- ✅ Paso 8: configurar Prisma y conexion a PostgreSQL Supabase.
- ✅ Paso 9: configurar GitFlow y GitHub Actions CI inicial.
- ✅ Paso 10: revisar Definition of Done del Sprint 0.

## Sprint 1 - autenticacion
- ⬜ Login con Supabase Auth.
- ⬜ Validacion de JWT en backend.
- ⬜ Tabla `profiles` con roles.
- ⬜ Guards y decoradores de permisos.
- ⬜ RLS basico en tablas iniciales.
- ⬜ Pruebas unitarias de servicios.
- ⬜ Documentacion Swagger.

## Sprint 2 - pacientes
- ⬜ Registro de pacientes.
- ⬜ Edicion de datos personales y contacto.
- ⬜ Busqueda y filtrado.
- ⬜ Validaciones y DTOs.
- ⬜ Pruebas unitarias y e2e del flujo critico.
- ⬜ Documentacion Swagger.

## Sprint 3 - citas
- ⬜ Agenda por odontologo.
- ⬜ Reserva de citas.
- ⬜ Reprogramacion de citas.
- ⬜ Cancelacion de citas.
- ⬜ Estados de cita.
- ⬜ Pruebas unitarias y e2e del flujo critico.
- ⬜ Documentacion Swagger.

## Sprint 4 - historias-clinicas
- ⬜ Historia clinica por paciente.
- ⬜ Odontograma.
- ⬜ Evoluciones clinicas.
- ⬜ Auditoria de cambios.
- ⬜ RLS para informacion sensible.
- ⬜ Pruebas unitarias y e2e del flujo critico.
- ⬜ Documentacion Swagger.

## Sprint 5 - tratamientos
- ⬜ Catalogo de tratamientos.
- ⬜ Precios.
- ⬜ Presupuestos por paciente.
- ⬜ Estados de presupuesto.
- ⬜ Pruebas unitarias y e2e del flujo critico.
- ⬜ Documentacion Swagger.

## Sprint 6 - pagos
- ⬜ Registro de cobros.
- ⬜ Caja diaria.
- ⬜ Comprobantes.
- ⬜ Deudas por paciente.
- ⬜ Pruebas unitarias y e2e del flujo critico.
- ⬜ Documentacion Swagger.

## Sprint 7 - inventario
- ⬜ Registro de insumos.
- ⬜ Control de stock.
- ⬜ Alertas de bajo stock.
- ⬜ Movimientos de inventario.
- ⬜ Pruebas unitarias y e2e del flujo critico.
- ⬜ Documentacion Swagger.

## Sprint 8 - reportes y panel
- ⬜ Indicadores del dia en panel frontend.
- ⬜ Reportes operativos.
- ⬜ Exportaciones.
- ⬜ Filtros por fecha, rol y modulo.
- ⬜ Pruebas unitarias y e2e del flujo critico.
- ⬜ Documentacion Swagger.

## Sprint 9 - QA, seguridad, optimizacion y despliegue
- ⬜ QA funcional completo.
- ⬜ Revision de seguridad.
- ⬜ Optimizacion de consultas.
- ⬜ Revision de RLS.
- ⬜ Preparacion de despliegue.
- ⬜ Documentacion final.

## Pendientes / Bugs
- 🟨 Crear el proyecto real en Supabase desde la cuenta de la clinica y copiar valores reales en `.env` local.
- ⬜ Ejecutar `npx prisma migrate dev` cuando `DATABASE_URL` y `DIRECT_URL` reales esten configurados.
- ⬜ Ejecutar `backend/scripts/supabase-rls.sql` en Supabase despues de crear las tablas.
- ⬜ Confirmar datos obligatorios de pacientes segun normativa/localidad de la clinica.
- ⬜ Definir estrategia de numeracion de comprobantes antes del modulo pagos.
- ⬜ Revisar vulnerabilidades reportadas por `npm audit` en dependencias transitivas antes de produccion.
