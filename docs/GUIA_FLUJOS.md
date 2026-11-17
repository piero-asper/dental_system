# Guía de uso y flujos del sistema dental

Actualizado: 2026-11-05 · America/Bogota.

La misma guía está disponible en el programa, en **Ayuda → Guía de uso**. El menú agrupa funciones por el trabajo de la clínica. Se mantiene una cuenta operativa y una agenda.

## Organización del lateral

| Sección | Módulos | Para qué se utiliza |
|---|---|---|
| Resumen | Panel y Reportes | Revisar actividad, pendientes de atención y cobros. |
| Pacientes y citas | Pacientes y Citas | Registrar a la persona y organizar su atención. |
| Atención clínica | Historias y Tratamientos | Documentar la atención y preparar presupuestos. |
| Pagos | Saldos pendientes, Cobros y recibos, Caja | Registrar abonos recibidos, consultar deuda y conciliar movimientos. |
| Inventario | Insumos y movimientos | Mantener existencias e historial de consumo. |
| Ayuda | Guía de uso | Consultar los recorridos y las reglas del sistema. |

## Recorrido completo de una atención

1. Buscar al paciente para evitar una ficha duplicada; registrarlo si es nuevo.
2. Reservar una cita dentro del horario disponible.
3. Durante la atención, revisar su historia, registrar la evolución y actualizar el odontograma cuando corresponda.
4. Crear el presupuesto de los tratamientos acordados, presentarlo y registrar la aceptación.
5. Registrar cada abono recibido y entregar su recibo interno. Consultar el saldo para el siguiente pago.
6. Registrar las salidas de insumos utilizados y revisar los pendientes y la caja.

El presupuesto puede prepararse antes o después de una cita. Una cita atendida, una evolución finalizada, un presupuesto finalizado y un presupuesto saldado son hechos diferentes y se registran en sus módulos.

## Pacientes

1. Buscar por nombre, apellido o teléfono. Revisar las posibles coincidencias antes de crear otra ficha.
2. Registrar nombres y apellidos. El teléfono es opcional.
3. Abrir la ficha para ver datos de contacto, última/próxima atención y las citas del paciente.
4. Usar los accesos a reservar cita, historia clínica, presupuestos y pagos. El paciente se conserva seleccionado entre esos pasos.
5. Editar la ficha cuando cambien sus datos. Desactivarla si deja de utilizarse; sus registros se conservan.

Los saldos anteriores de un paciente inactivo siguen disponibles para su cobro. Para crear nuevos presupuestos se requiere un paciente activo.

## Citas

1. Configurar el horario real, descansos y fecha de vigencia. Registrar bloqueos por ausencias.
2. Seleccionar al paciente, día, franja disponible, duración y motivo.
3. Guardar la reserva y marcar Confirmada cuando corresponda.
4. Reprogramar desde el detalle si se necesita otra franja. El sistema evita cruces con reservas vigentes.
5. Al terminar, marcar Atendida y abrir la evolución desde esa cita. Para una ausencia marcar No asistió; para cancelar indicar el motivo.

La agenda ofrece calendario diario/semanal y listado. Los horarios se interpretan en Colombia. Los cambios y cancelaciones se conservan en el historial.

## Historias clínicas

1. Seleccionar al paciente o entrar desde su ficha/cita.
2. Abrir la historia si todavía no existe.
3. Revisar antecedentes, alergias y medicamentos; indicar expresamente cuando fueron revisados.
4. Crear una evolución con la información de la atención. Vincularla a la cita y a las piezas cuando corresponda.
5. Guardar como borrador si está incompleta; finalizarla cuando el registro esté terminado.
6. Consultar el odontograma por pieza/superficie y el historial de cada pieza. Utilizar correcciones con motivo y la auditoría para revisar cambios.

Una evolución histórica sin cita vinculada se conserva; no se le asigna automáticamente una cita.

## Tratamientos y presupuestos

1. En **Catálogo**, crear servicios con nombre y precio base. El sistema asigna el código consecutivo automáticamente. Se pueden editar o desactivar conservando los presupuestos anteriores.
2. En **Presupuestos**, elegir al paciente activo y agregar tratamientos activos, cantidades y precios acordados. Las piezas FDI y notas son opcionales.
3. Revisar subtotal, descuento como importe fijo y total. Guardar en Borrador; se puede editar mientras está en ese estado.
4. Marcar Enviado al presentar la propuesta por el canal de la clínica. Registrar Aceptado o Rechazado según la decisión del paciente.
5. Desde un presupuesto Aceptado abrir Pagos para registrar abonos. Marcar Finalizado cuando concluya lo presupuestado.

Transiciones permitidas: `BORRADOR → ENVIADO → ACEPTADO → FINALIZADO` y `ENVIADO → RECHAZADO`.

Enviado registra el estado administrativo de presentación. La entrega al paciente se realiza por el canal habitual de la clínica. Para modificar una propuesta presentada o rechazada se prepara otro presupuesto, conservando el anterior. Los precios guardados en sus ítems se mantienen cuando cambia el catálogo.

**Finalizado** indica el estado del presupuesto. **Saldado** significa que el total está cubierto por abonos vigentes. Se puede finalizar un presupuesto con saldo pendiente y seguir cobrando ese saldo.

## Pagos y recibos internos

1. Abrir **Saldos pendientes**, buscar al paciente y elegir el presupuesto aceptado o finalizado.
2. Revisar total, abonos vigentes y saldo.
3. Pulsar **Registrar abono**. Introducir el importe que ya se recibió, medio y referencia si existe.
4. Confirmar. El sistema guarda el pago, su recibo interno `REC-00000001` y el ingreso de caja en una sola transacción.
5. Abrir **Cobros y recibos** para consultar el pago o imprimir su recibo. El diálogo de impresión del navegador permite elegir la impresora o guardar una copia.

Se admiten abonos parciales mayores que cero. No pueden superar el saldo. La fecha se toma al registrar la operación. Los importes utilizan la misma unidad monetaria que los precios del catálogo, con dos decimales.

Ejemplo de uso, sin crear datos: presupuesto de 100,00; primer abono de 30,00 → saldo de 70,00; segundo abono de 70,00 → saldo de cero.

Los recibos REC son constancias internas de los abonos. La integración de facturación electrónica y sus datos/series se definirá por separado con la clínica.

### Anular un cobro

1. Comprobar cualquier devolución con el paciente por el medio correspondiente.
2. Abrir el recibo y pulsar **Anular cobro**.
3. Introducir el motivo y confirmar.
4. El pago y recibo quedan anulados; los registros originales se conservan. Se añade una reversión a la fecha actual y el importe vuelve al saldo pendiente.

Un cobro anulado no se anula por segunda vez ni se modifica para reemplazar su importe. Si corresponde, después se registra otro cobro con los datos correctos. Registrar la anulación deja constancia de la operación administrativa; la devolución efectiva se resuelve con el paciente y su medio de pago.

### Caja y reporte financiero

- Desde se incluye; Hasta se excluye. Para consultar el 5 de noviembre se selecciona Desde 2026-11-05 y Hasta 2026-11-06.
- **Cobros registrados** suma ingresos del periodo. **Reversiones** suma anulaciones registradas en ese periodo. **Cobros netos** es la diferencia.
- Los medios se presentan por separado: efectivo, tarjeta, transferencia y otro. El neto de todos los medios no equivale al dinero físico disponible.
- Una anulación de un cobro de otro día se registra como reversión en el día de la anulación.
- **Saldo pendiente actual** reúne la cartera vigente de los presupuestos aceptados/finalizados. No representa la deuda histórica al final del periodo consultado.
- Resumen, detalle paginado y CSV comparten un corte de cinco minutos, con un máximo de 5000 movimientos por periodo. Actualizar crea un nuevo corte. El CSV contiene datos administrativos de cobros.
- Esta caja sigue los cobros y sus reversiones. La contabilidad completa de gastos, bancos y obligaciones tributarias corresponde a su proceso administrativo.

## Inventario

1. Crear cada insumo con nombre, unidad y existencia mínima. El sistema asigna el código consecutivo automáticamente.
2. Registrar una Entrada para las existencias iniciales y posteriores reposiciones, siempre con motivo.
3. Registrar una Salida por el material utilizado. El sistema rechaza salidas superiores a lo disponible.
4. Al realizar un conteo físico, utilizar Ajuste e introducir la **existencia final contada**, no la diferencia. Se admite cero y se exige un motivo.
5. Consultar el historial de movimientos y filtrar En mínimo o por debajo para preparar reposiciones.

Después del primer movimiento se conserva la unidad de medida. Los errores se corrigen con otro movimiento para mantener el historial. El consumo se registra de forma explícita, dado que una atención puede utilizar cantidades variables de material.

## Panel y reportes

El Panel muestra actividad operativa, próximas citas y pendientes clínicos, junto con el resumen de cobros y cartera. Reportes permite consultar periodos, registros de cada cifra y exportaciones. Las cifras financieras llevan su propio corte identificado y enlaces a los cobros.

Los días sin disponibilidad registrada, las citas pendientes de resolver y los vínculos clínicos históricos incompletos se señalan para revisión. Los cambios se realizan en el módulo que origina cada dato.

## Conservación y errores

Los formularios advierten sobre cambios sin guardar. Una edición con versión antigua se rechaza para evitar sobrescribir otra operación.

Si se interrumpe la conexión al registrar un cobro, revisar primero Cobros y recibos. Reintentar desde el mismo formulario conserva el identificador de la operación y devuelve el cobro anterior si ya se había guardado. Si se cambian datos después de una solicitud ya procesada, el sistema exige revisar el registro anterior.

Los historiales de caja e inventario son inmutables. La base mantiene las reglas de importes, numeración única y permisos; las escrituras de los módulos sensibles pasan por la API autenticada.
