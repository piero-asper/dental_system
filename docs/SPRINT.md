# Seguimiento de sprints — Sistema de Gestión Dental

Actualizado: 2026-10-24 · America/Bogota.

El seguimiento se divide por capa para distinguir el trabajo de datos y reglas de negocio del trabajo de diseño e interfaz. Se conserva la numeración histórica de los módulos.

- [Sprints de backend](SPRINTS_BACKEND.md): API, reglas de negocio, autenticación, datos, migraciones y permisos.
- [Sprints de frontend](SPRINTS_FRONTEND.md): pantallas, diseño, navegación, formularios, accesibilidad y conexión con la API.
- [Estado de avance](ESTADO_AVANCE.md): evidencia de comprobaciones, arranque local y pendientes para continuar.
- [Plan de mejoras M0–M5](PLAN_MEJORAS_BI.md): criterios funcionales y reglas de BI compartidas por ambas capas.

## Trabajo actual

**Frontend: FE-8 — apariencia del sistema pendiente de continuar.** La composición inicial del panel y la navegación está implementada, pero los colores no fueron aceptados. La última paleta explorada es `#0C4A6E`, `#2B6CB0`, `#1C3F72` y `#EBF8FF`, con tarjetas blancas; sólo se mostró en una muestra y todavía no está aplicada al código. Continuar desde [Apariencia pendiente](APARIENCIA_PENDIENTE.md). Es una tarea de presentación conectada a la API existente.

**Backend: BE-8 — BI operativo implementado y verificado, con aceptación e integración pendientes.** El rediseño no añade servicios, gabinetes, profesionales, ingresos ni tratamientos ficticios.

Citas e Historias clínicas conservan su aceptación conjunta pendiente. La aplicación mantiene una cuenta operativa, una agenda y los datos personales mínimos acordados. IA descartada por decisión del usuario.

## Resumen por módulo y capa

| Módulo | Backend | Frontend |
|---|---|---|
| 0. Base técnica | ✅ BE-0 cerrado | ✅ FE-0 cerrado |
| 1. Autenticación | ✅ BE-1, v0.1.0 | ✅ FE-1, v0.1.0 |
| 2. Pacientes | ✅ BE-2 base, v0.2.0 | ✅ FE-2 base, v0.2.0 |
| 3. Citas | 🟨 BE-3 implementado; cierre pendiente | 🟨 FE-3 funcional; aceptación pendiente |
| 4. Historias clínicas | 🟨 BE-4 implementado; cierre pendiente | 🟨 FE-4 funcional; aceptación pendiente |
| Mejoras M0–M3 | 🟨 BE-M0–M3 verificados; aceptación pendiente | 🟨 FE-M0–M3 verificados; aceptación pendiente |
| 5. Tratamientos | ⬜ BE-5 pendiente | ⬜ FE-5 pendiente |
| 6. Pagos | ⬜ BE-6 pendiente | ⬜ FE-6 pendiente |
| 7. Inventario | ⬜ BE-7 pendiente | ⬜ FE-7 pendiente |
| 8. Panel y reportes | 🟨 BE-8 operativo; financiera pendiente | 🟨 FE-8 operativo; rediseño en revisión |
| 9. QA y producción | ⬜ BE-9 pendiente | ⬜ FE-9 pendiente |

Las mejoras posteriores de Pacientes todavía no forman parte de la entrega v0.2.0. El BI operativo adelanta parte del Sprint 8; la parte financiera depende de Tratamientos y Pagos.

## Cómo registrar el avance

1. Identificar el sprint y la capa: por ejemplo, FE-8 para modificar el dashboard o BE-8 para cambiar un indicador/API.
2. Actualizar tareas y evidencias únicamente en esa capa; cambiar el diseño no cierra el backend ni reabre una versión entregada.
3. Si cambia un contrato entre capas, registrar la dependencia en ambos documentos.
4. Confirmar pruebas y aceptación correspondientes antes de cerrar. Mantener separada la aceptación visual de la aceptación de reglas de negocio.
5. Integrar mediante PR con CI hacia develop/main según el flujo del proyecto. No crear una versión sólo por completar una maqueta.

## Decisiones y pendientes compartidos

- Nombres y apellidos obligatorios; teléfono opcional. Se omiten DNI, fecha de nacimiento, sexo, correo, dirección y contacto de emergencia.
- Revisar con la clínica los requisitos de datos y conservación antes de producción.
- Definir la numeración de comprobantes antes de Pagos.
- Revisar dependencias y permisos como parte de BE-9/FE-9.
- Las entregas previas v0.1.0 y v0.2.0 se integraron mediante PR/CI. Citas, Historias y las mejoras todavía requieren aceptación e integración.
