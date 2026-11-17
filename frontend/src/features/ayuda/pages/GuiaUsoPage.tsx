import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
const secciones = [
  { id: 'pacientes', titulo: 'Pacientes y citas', pasos: [
    'Busca por nombre, apellido o teléfono antes de crear una ficha. Registra nombres y apellidos; el teléfono es opcional.',
    'Configura el horario real y los descansos en Citas. Añade bloqueos para ausencias.',
    'Selecciona al paciente, una franja disponible, la duración y el motivo. Guarda la reserva y confirma cuando corresponda.',
    'Utiliza Reprogramar para cambiar el horario. Después de la atención marca Atendida; para ausencias o cancelaciones registra el estado y motivo correspondientes.',
    'Abre la historia desde la cita para registrar la evolución vinculada. Marcar Atendida y finalizar la evolución son pasos separados.'
  ], nota: 'La ficha permite abrir historia, presupuestos y pagos con el paciente seleccionado. Los pacientes inactivos conservan su información y pueden pagar saldos anteriores.', enlace: '/pacientes' },
  { id: 'clinica', titulo: 'Historias clínicas', pasos: [
    'Selecciona al paciente o abre su historia desde la ficha o cita.',
    'Revisa antecedentes, alergias y medicamentos. Señala explícitamente cuando se hayan revisado.',
    'Registra la evolución de la atención y su cita. Puedes guardar un borrador y finalizarlo después.',
    'Selecciona la pieza y superficie del odontograma para registrar hallazgos. Revisa el historial y la auditoría para consultar cambios.'
  ], nota: 'Al corregir registros clínicos conserva su trazabilidad e indica el motivo cuando se solicite.', enlace: '/historias-clinicas' },
  { id: 'tratamientos', titulo: 'Tratamientos y presupuestos', pasos: [
    'En Catálogo crea cada servicio con nombre y precio base; el código consecutivo se asigna automáticamente.',
    'En Presupuestos elige un paciente activo y agrega tratamientos activos, cantidades, precios acordados y piezas opcionales.',
    'Revisa el descuento y total. Guarda el borrador y edítalo mientras preparas la propuesta.',
    'Marca Enviado cuando presentes la propuesta por el canal de la clínica. Después registra Aceptado o Rechazado según la decisión del paciente.',
    'Desde un presupuesto aceptado abre Pagos para registrar abonos. Marca Finalizado cuando concluya lo presupuestado.'
  ], nota: 'Los precios anteriores se conservan al cambiar el catálogo. Finalizado indica el estado del presupuesto; Saldado significa que no queda importe por cobrar. Enviado registra la presentación de la propuesta y el envío se realiza por el canal de la clínica.', enlace: '/tratamientos' },
  { id: 'pagos', titulo: 'Pagos, recibos y caja', pasos: [
    'En Saldos pendientes busca al paciente. Aparecen presupuestos aceptados o finalizados con total, abonos vigentes y saldo.',
    'Pulsa Registrar abono e introduce el importe recibido, medio y referencia. Se admiten pagos parciales hasta completar el saldo.',
    'Confirma el cobro: se guardan juntos el abono, el recibo interno REC y el ingreso en caja con la fecha actual.',
    'En Cobros y recibos abre la constancia para consultarla o imprimirla.',
    'Para anular un cobro comprueba cualquier devolución con el paciente, abre el recibo e indica el motivo. Se conserva el registro, se anula el recibo y se añade una reversión a la caja de hoy. El saldo vuelve a estar pendiente.',
    'En Caja consulta el periodo: Desde se incluye y Hasta se excluye. Revisa cobros, reversiones y neto por medio de pago. El detalle y CSV comparten un corte de cinco minutos; actualiza para incorporar cambios.'
  ], nota: 'Los recibos REC son constancias internas. La clínica definirá por separado cualquier integración de facturación electrónica. Los importes usan la misma unidad monetaria que el catálogo. El saldo pendiente reúne la cartera actual; no es una deuda histórica al cierre del periodo.', enlace: '/pagos' },
  { id: 'inventario', titulo: 'Inventario', pasos: [
    'Crea el insumo con nombre, unidad de medida y existencia mínima; el código consecutivo se asigna automáticamente.',
    'Registra una Entrada con motivo para incorporar existencias iniciales o reposiciones.',
    'Registra una Salida por el material utilizado. No puede superar las existencias disponibles.',
    'Después de un conteo físico utiliza Ajuste e introduce la existencia final contada, incluso si es cero, junto con el motivo.',
    'Consulta el historial y filtra En mínimo o por debajo para preparar reposiciones.'
  ], nota: 'Después del primer movimiento se conserva la unidad. El consumo se registra explícitamente porque una atención puede utilizar cantidades distintas de insumos. Los errores se corrigen con otro movimiento para conservar el historial.', enlace: '/inventario' },
  { id: 'reportes', titulo: 'Panel y reportes', pasos: [
    'Abre el Panel para revisar próximas citas, pendientes de atención e indicadores operativos y de cobros.',
    'En Reportes selecciona el periodo, abre las cifras para consultar sus registros y exporta los datos del mismo corte.',
    'Revisa las advertencias sobre días sin horario y vínculos clínicos históricos incompletos. Actualiza los estados y registros en su módulo correspondiente.'
  ], nota: 'El reporte operativo y el financiero indican sus cortes de actualización. Una anulación de un cobro antiguo se refleja como reversión en el día de la anulación.', enlace: '/reportes' }
];
export function GuiaUsoPage() {
  const { hash } = useLocation();
  useEffect(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView?.({ block: 'start' }); }, [hash]);
  return <section className="patients-page clinical-page"><header className="module-header"><p className="eyebrow">Guía de trabajo</p><h1>Cómo utilizar el sistema</h1><p>El paciente conecta la agenda, la atención clínica, los presupuestos y los cobros.</p></header>
    <section className="surface patient-form"><h2>Recorrido de una atención</h2><p>Paciente → cita → historia y evolución → presupuesto aceptado → abonos y recibos → seguimiento.</p><p>Registra también los insumos consumidos y revisa la actividad y la caja. Puedes iniciar un presupuesto sin cita si corresponde a la atención de ese paciente.</p></section>
    {secciones.map((item) => <section className="surface patient-form" id={item.id} key={item.id}><h2>{item.titulo}</h2><ol className="workflow-steps">{item.pasos.map((paso) => <li key={paso}>{paso}</li>)}</ol><p className="field-hint">{item.nota}</p><Link className="text-link" to={item.enlace}>Abrir módulo</Link></section>)}
    <section className="surface patient-form"><h2>Si hay un error al guardar</h2><p>Conserva el formulario y revisa el mensaje. Ante una versión desactualizada consulta el registro más reciente. Si se corta la conexión durante un cobro, comprueba Cobros y recibos antes de iniciar otra operación; reintentar el mismo formulario conserva su identificador de solicitud.</p></section>
  </section>;
}
