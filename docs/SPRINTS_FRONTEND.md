# Sprints de frontend

Actualizado: 2026-10-24 · America/Bogota.

Este documento sigue pantallas, navegación, formularios, diseño visual, accesibilidad y conexión con la API. Las reglas de negocio y la base de datos se siguen en [Sprints de backend](SPRINTS_BACKEND.md). FE-3 y BE-3 comparten el módulo Citas, pero se verifican y cierran por separado.

Estados: ✅ cerrado y entregado · 🟨 implementado o en curso, pendiente de cierre · ⬜ pendiente.

## Sprint actual: FE-8 · Panel y reportes — 🟨 apariencia inconclusa; continuar en la próxima sesión

Objetivo: adaptar el panel a la referencia dental elegida el 24 de octubre: barra lateral, superficies claras, indicadores compactos, agenda y columna de seguimiento. La primera composición está implementada, pero los colores actuales no convencieron al usuario. La apariencia del sistema sigue pendiente; el detalle y la última paleta propuesta se conservan en [Apariencia pendiente](APARIENCIA_PENDIENTE.md).

- [x] Composición del panel y navegación lateral con la nueva identidad visual.
- [x] Indicadores reales, próximas citas, próxima atención y pendientes; estados vacíos sin datos ficticios.
- [x] Gráfico de actividad conservando fechas y accesos al detalle.
- [x] Búsqueda de pacientes y accesos a alta, reserva, historia y agenda.
- [x] Mantener detalle paginado y CSV del mismo corte que los indicadores.
- [x] Revisión visual de escritorio/móvil y texto con contraste moderado; prueba de activación del gráfico con teclado. Desplazamiento horizontal de tablas contenido en su tarjeta.
- [x] Compilación y 53 pruebas del frontend correctas.
- [ ] Acordar la paleta definitiva: última muestra con `#0C4A6E`, `#2B6CB0`, `#1C3F72` y `#EBF8FF`; todavía sin aprobación ni aplicación al código.
- [ ] Continuar los ajustes de apariencia y aplicar la identidad acordada a los módulos.
- [ ] Revisión y aceptación visual del usuario.
- [ ] PR/CI e integración.

No se copian nombres, cifras, ingresos, tratamientos, profesionales o gabinetes de la referencia. El sistema conserva una cuenta y una agenda. El 5 de noviembre se implementaron Tratamientos/Presupuestos, Inventario y Pagos, con accesos desde la ficha del paciente y reportes financieros. El lateral se agrupó por flujo; la revisión de diseño definitivo se deja para después por indicación del usuario.

La revisión visual se realizó en una entrada temporal con datos de demostración, retirada después de comprobar escritorio, móvil y descarga CSV. La aplicación normal utiliza la API existente. Los filtros de próximas citas actúan sobre las cinco reservas devueltas por la API; el listado completo está en Agenda.

## FE-0 · Base de interfaz — ✅ cerrado

- [x] React, TypeScript, Vite y estructura de módulos.
- [x] Estilos iniciales, navegación y configuración de API.
- [x] Variables de entorno públicas separadas de los secretos del backend.
- [x] CI inicial de compilación y pruebas.

## FE-1 · Acceso — ✅ cerrado, v0.1.0

- [x] Login, persistencia y renovación de sesión.
- [x] Protección de rutas y cierre de sesión.
- [x] Estados de carga/error y pruebas del flujo.
- [x] Aceptación manual e integración de la versión.

## FE-2 · Pacientes — ✅ entrega base cerrada, v0.2.0

- [x] Lista, búsqueda automática, estado y paginación.
- [x] Formulario de alta/edición y ficha administrativa.
- [x] Campos mínimos acordados: nombres, apellidos y teléfono opcional.
- [x] Pruebas y aceptación manual de registro, edición y retorno al listado.
- [x] Integración de la versión mediante PR/CI.

Las mejoras de ficha integral, seguimiento y protección de cambios son posteriores y siguen en FE-M0/FE-M1 hasta integrarlas.

## FE-3 · Citas — 🟨 funcional; aceptación pendiente

- [x] Vista diaria/semanal, lista accesible y hora de Colombia.
- [x] Reservar, reprogramar, cancelar y cambiar estado.
- [x] Selección de paciente y mensajes de conflicto de horario/versión.
- [x] Calendario, franjas, configuración de horarios/bloqueos y detalle con historial.
- [x] Protección de formularios y presentación de canceladas sin tapar reservas vigentes.
- [x] Pruebas de interfaz y revisión visual parcial en móvil/escritorio.
- [ ] Recorrido real con horario de la clínica y aceptación conjunta con BE-3/BE-M2.
- [ ] Integración por PR/CI.

## FE-4 · Historias clínicas — 🟨 funcional; aceptación pendiente

- [x] Antecedentes y resumen del paciente, alergias y medicamentos con revisión explícita.
- [x] Evoluciones con filtros, borradores, finalización, correcciones y vínculo con cita.
- [x] Odontograma de 52 piezas, superficies y leyenda; selección con teclado.
- [x] Historial por pieza y auditoría legible.
- [x] Pruebas de interfaz y comprobación visual con datos ficticios.
- [ ] Aceptación clínica con la cuenta real, junto con BE-4/BE-M3.
- [ ] Integración por PR/CI.

## FE-M0 a FE-M3 · Mejoras entre módulos — 🟨 implementación verificada; cierre pendiente

- [x] FE-M0: mensajes diferenciados, conservar formularios ante fallos y aviso de cambios sin guardar.
- [x] FE-M1: ficha integral, accesos con paciente preseleccionado, filtros de seguimiento, coincidencias por nombre/teléfono y orden A–Z.
- [x] FE-M2: calendario visual, franjas, horarios, bloqueos y acciones de agenda conectadas a historia.
- [x] FE-M3: lectura clínica, superficies, línea de tiempo, filtros y auditoría.
- [ ] Aceptación completa del [plan de mejoras](PLAN_MEJORAS_BI.md) y cierre conjunto con backend.

## FE-5 · Tratamientos — 🟨 primera implementación del 5 de noviembre; aceptación pendiente

- [x] Catálogo y precios conectados a BE-5, búsqueda, paginación y activación/desactivación.
- [x] Presupuestos por paciente, ítems, precio acordado, descuento, edición de borrador, detalle y estados.
- [x] Formularios protegidos ante cambios sin guardar y estados de carga/error/vacío.
- [ ] Aceptación con cuenta real y revisión final en escritorio/móvil; integración por PR/CI.

## FE-6 · Pagos — 🟨 implementado el 5 de noviembre; aceptación pendiente

- [x] Vistas Saldos pendientes, Cobros y recibos y Caja conectadas a BE-6.
- [x] Abonos parciales, recibos internos REC imprimibles y anulación con motivo/confirmación.
- [x] Totales, abonos vigentes y saldo por presupuesto; contexto de paciente/presupuesto conservado entre módulos.
- [x] Resumen financiero en Panel/Reportes, detalle y CSV del mismo corte; formularios conservados ante errores y claves de reintento.
- [x] Pruebas de flujos de cobro, recibos, anulación y reportes.
- [ ] Aceptación con cuenta real y revisión visual final; integración por PR/CI.

## FE-7 · Inventario — 🟨 primera implementación del 5 de noviembre; aceptación pendiente

- [x] Insumos, existencias, entradas/salidas/ajustes y consulta paginada del historial conectados a BE-7.
- [x] Búsqueda, estado, filtro de reposición y formularios con control de versión y conservación ante errores.
- [x] Estados de carga/error/vacío y aviso de existencias bajas.
- [ ] Aceptación con cuenta real y revisión final en escritorio/móvil; integración por PR/CI.

## FE-8 · Panel y reportes — 🟨 operativo; diseño actual en revisión

- [x] Páginas operativas de BI con indicadores, comparaciones y gráficos.
- [x] Filtros de fecha, demanda, detalle y exportación CSV.
- [x] Mostrar cero, ausencia de base y disponibilidad insuficiente correctamente.
- [x] Rediseño visual implementado según el sprint actual descrito al inicio; aceptación del usuario pendiente.
- [ ] Aceptación del panel, reportes y cifras junto con BE-8.
- [x] Resumen financiero conectado a BE-6, con su corte identificado y acceso a caja/detalle.

## FE-9 · QA y entrega — ⬜ pendiente

- [x] Frontend incorporado al entorno local de Podman/Compose junto con BE-9: Vite con variables al arrancar, usuario sin privilegios y espera de salud de la API. Compilación dentro del contenedor y carga de `/login` comprobadas el 26 de octubre; API y Supabase Auth disponibles. [Guía operativa](PODMAN.md). La aceptación con cuenta real y la apariencia de FE-8 siguen pendientes.
- [ ] Recorrido completo con cuenta real, escritorio/móvil y teclado.
- [ ] Revisión de accesibilidad, mensajes, contraste y navegación.
- [ ] Rendimiento de carga medido y ajustes justificados.
- [ ] Documentación de uso final, aceptación y preparación del frontend para despliegue.

## Criterio de cierre de frontend

Comportamiento conectado a la API, datos reales sin simular funciones pendientes, diseño revisado en escritorio/móvil, navegación y formularios accesibles, pruebas relevantes correctas y aceptación del usuario. El cierre se registra por separado del backend y se integra por PR/CI.
