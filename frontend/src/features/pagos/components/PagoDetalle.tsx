import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RequestError } from '@/shared/components/RequestError';
import { UnsavedChanges, confirmDiscard } from '@/shared/components/UnsavedChanges';
import { formatDateTime } from '@/shared/lib/clinical';
import { mostrarImporte } from '@/shared/lib/importes';
import { pagosApi, mediosPago, type Pago } from '../api/pagosApi';

export function PagoDetalle({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => Promise<void> }) {
  const query = useQuery({ queryKey: ['pago', id], queryFn: ({ signal }) => pagosApi.obtener(id, signal), retry: false });
  const [anulando, setAnulando] = useState(false), [motivo, setMotivo] = useState(''), [saving, setSaving] = useState(false), [error, setError] = useState('');
  async function anular(event: FormEvent) {
    event.preventDefault(); if (saving || !query.data || !window.confirm('¿Confirmas la anulación de este cobro? Se conservará el recibo y el importe volverá a estar pendiente.')) return;
    setSaving(true); setError('');
    try { await pagosApi.anular(id, query.data.updatedAt, motivo.trim()); setAnulando(false); setMotivo(''); await onChanged(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo anular el cobro.'); }
    finally { setSaving(false); }
  }
  return <section className="surface patient-form"><UnsavedChanges dirty={!!motivo} />
    {query.isPending && <p role="status">Cargando cobro…</p>}
    {query.isError && <RequestError error={query.error} retry={() => { void query.refetch(); }} />}
    {query.data && <><ReciboInterno pago={query.data} />
      <div className="inline-actions no-print"><Link className="text-link" to={`/pacientes/${query.data.pacienteId}`}>Ficha del paciente</Link>
        {query.data.presupuestoId && <Link className="text-link" to={`/tratamientos?tab=presupuestos&pacienteId=${query.data.pacienteId}&presupuestoId=${query.data.presupuestoId}`}>Ver presupuesto</Link>}
        <button className="secondary-button" onClick={() => window.print()}>Imprimir recibo</button>
        {query.data.estado === 'REGISTRADO' && <button className="secondary-button" disabled={saving} onClick={() => setAnulando(!anulando)}>Anular cobro</button>}</div>
      {anulando && <form className="no-print" onSubmit={(e) => { void anular(e); }}><h3>Anular cobro</h3>
        <p className="field-hint">Comprueba cualquier devolución con el paciente antes de registrar la anulación. Se añadirá una reversión a la caja de hoy.</p>
        <label>Motivo de anulación *<textarea required maxLength={500} disabled={saving} value={motivo} onChange={(e) => setMotivo(e.target.value)} /></label>
        <button className="secondary-button" disabled={saving}>{saving ? 'Anulando…' : 'Confirmar anulación'}</button></form>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <details className="no-print"><summary>Movimientos del cobro</summary>{query.data.cajaMovimientos?.map((m) => <p key={m.id}>{formatDateTime(m.createdAt)} · {m.tipo === 'INGRESO' ? 'Ingreso' : 'Reversión'} · {mostrarImporte(m.monto)} · {m.descripcion}</p>)}</details>
    </>}
    <div className="form-actions no-print"><button className="secondary-button" disabled={saving} onClick={() => { if (confirmDiscard()) onClose(); }}>Cerrar cobro</button></div>
  </section>;
}
function ReciboInterno({ pago }: { pago: Pago }) {
  return <article className="receipt-print"><p className="eyebrow">Consultorio dental</p><h2>Recibo interno {pago.comprobante?.numero ?? 'histórico sin numeración'}</h2>
    <p><strong>{pago.estado === 'ANULADO' ? 'ANULADO' : 'Pago registrado'}</strong> · {formatDateTime(pago.fechaPago)}</p>
    <dl className="details-grid"><div><dt>Paciente</dt><dd>{pago.paciente.apellidos}, {pago.paciente.nombres}</dd></div><div><dt>Importe recibido</dt><dd>{mostrarImporte(pago.monto)}</dd></div>
      <div><dt>Medio</dt><dd>{mediosPago[pago.metodoPago]}</dd></div><div><dt>Referencia</dt><dd>{pago.referencia || 'Sin referencia'}</dd></div></dl>
    {pago.observaciones && <p className="preserve-text">{pago.observaciones}</p>}
    {pago.estado === 'ANULADO' && <p className="notice-warning">Anulado el {pago.anuladoAt ? formatDateTime(pago.anuladoAt) : 'día registrado'}: {pago.motivoAnulacion}</p>}
    <p className="field-hint">Constancia interna del abono a un presupuesto. Conserva este número para consultar el cobro.</p>
  </article>;
}
