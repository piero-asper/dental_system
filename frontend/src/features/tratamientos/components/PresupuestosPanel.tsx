import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ListaPaginacion } from '@/shared/components/ListaPaginacion';
import { RequestError } from '@/shared/components/RequestError';
import { confirmDiscard } from '@/shared/components/UnsavedChanges';
import { mostrarImporte } from '@/shared/lib/importes';
import { formatDate } from '@/shared/lib/clinical';
import { tratamientosApi, type EstadoPresupuesto, type Presupuesto } from '../api/tratamientosApi';
import { PresupuestoForm } from './PresupuestoForm';

const labels: Record<EstadoPresupuesto, string> = { BORRADOR: 'Borrador', ENVIADO: 'Enviado', ACEPTADO: 'Aceptado', RECHAZADO: 'Rechazado', FINALIZADO: 'Finalizado' };
const acciones: Record<EstadoPresupuesto, EstadoPresupuesto[]> = { BORRADOR: ['ENVIADO'], ENVIADO: ['ACEPTADO', 'RECHAZADO'], ACEPTADO: ['FINALIZADO'], RECHAZADO: [], FINALIZADO: [] };
export function PresupuestosPanel() {
  const [params, setParams] = useSearchParams();
  const pacienteId = params.get('pacienteId') ?? '';
  const client = useQueryClient();
  const [q, setQ] = useState(''), [estado, setEstado] = useState(''), [pagina, setPagina] = useState(1);
  const [editor, setEditor] = useState<Presupuesto | 'nuevo' | null>(null), [detailId, setDetailId] = useState(params.get('presupuestoId') ?? '');
  const [success, setSuccess] = useState(''), [error, setError] = useState(''), [saving, setSaving] = useState(false);
  const query = new URLSearchParams({ q, pagina: String(pagina) });
  if (estado) query.set('estadoPresupuesto', estado);
  if (pacienteId) query.set('pacienteId', pacienteId);
  const list = useQuery({ queryKey: ['presupuestos', query.toString()], queryFn: ({ signal }) => tratamientosApi.presupuestos(query, signal), retry: false });
  const detail = useQuery({ queryKey: ['presupuesto', detailId], enabled: !!detailId, queryFn: ({ signal }) => tratamientosApi.presupuesto(detailId, signal), retry: false });
  async function refresh() { await Promise.all([client.invalidateQueries({ queryKey: ['presupuestos'] }), client.invalidateQueries({ queryKey: ['presupuesto'] })]); }
  async function cambiarEstado(estadoNuevo: EstadoPresupuesto) {
    if (saving || !detail.data || !window.confirm(`¿Marcar este presupuesto como ${labels[estadoNuevo].toLowerCase()}?${estadoNuevo === 'ENVIADO' ? ' Sus importes dejarán de ser editables. Esta acción no envía correos.' : ''}`)) return;
    setSaving(true); setError('');
    try { await tratamientosApi.estado(detail.data.id, estadoNuevo, detail.data.updatedAt); setSuccess('Estado actualizado.'); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cambiar el estado.'); }
    finally { setSaving(false); }
  }
  return <>
    {pacienteId && <p className="notice-warning">Presupuestos del paciente seleccionado. <button className="secondary-button" onClick={() => { if (confirmDiscard()) setParams({ tab: 'presupuestos' }); }}>Ver todos los pacientes</button></p>}
    <div className="patient-search surface"><label>Buscar por paciente<input type="search" maxLength={100} value={q} onChange={(e) => { setQ(e.target.value); setPagina(1); }} /></label>
      <label>Estado del presupuesto<select value={estado} onChange={(e) => { setEstado(e.target.value); setPagina(1); }}><option value="">Todos</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button className="primary-button" onClick={() => { if (confirmDiscard()) { setEditor('nuevo'); setDetailId(''); setSuccess(''); } }}>Nuevo presupuesto</button></div>
    {success && <p className="success-message" role="status">{success}</p>}
    {editor && <PresupuestoForm key={editor === 'nuevo' ? 'nuevo' : editor.id} pacienteInicial={pacienteId} presupuesto={editor === 'nuevo' ? undefined : editor} onClose={() => setEditor(null)} onSave={async (data) => {
      const saved = await tratamientosApi.guardarPresupuesto(data, editor === 'nuevo' ? undefined : editor.id);
      setEditor(null); setDetailId(saved.id); setSuccess('Presupuesto guardado.'); await refresh();
    }} />}
    {detailId && !editor && <section className="surface patient-form"><h2>Detalle del presupuesto</h2>
      {detail.isPending && <p role="status">Cargando presupuesto…</p>}
      {detail.isError && <RequestError error={detail.error} retry={() => { void detail.refetch(); }} />}
      {detail.data && <><p><strong>{detail.data.paciente.apellidos}, {detail.data.paciente.nombres}</strong> · {labels[detail.data.estado]}</p>
        <p>Fecha: {formatDate(detail.data.createdAt)}</p>
        <div className="table-scroll"><table className="patients-table"><thead><tr><th>Tratamiento</th><th>Pieza</th><th>Cantidad</th><th>Precio acordado</th><th>Subtotal</th></tr></thead><tbody>
          {detail.data.items.map((item) => <tr key={item.id}><td>{item.tratamiento.codigo} · {item.tratamiento.nombre}{item.observaciones && <p>{item.observaciones}</p>}</td><td>{item.pieza || '—'}</td><td>{item.cantidad}</td><td>{mostrarImporte(item.precioUnitario)}</td><td>{mostrarImporte(item.subtotal)}</td></tr>)}
        </tbody></table></div><p>Subtotal: {mostrarImporte(detail.data.subtotal)} · Descuento: {mostrarImporte(detail.data.descuento)} · <strong>Total: {mostrarImporte(detail.data.total)}</strong></p>
        {detail.data.observaciones && <p className="preserve-text">{detail.data.observaciones}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="inline-actions">{detail.data.estado === 'BORRADOR' && <button className="secondary-button" onClick={() => { setEditor(detail.data!); setError(''); }}>Editar borrador</button>}
          {['ACEPTADO', 'FINALIZADO'].includes(detail.data.estado) && <Link className="primary-button" to={`/pagos?presupuestoId=${detail.data.id}&pacienteId=${detail.data.pacienteId}`}>Consultar saldo y registrar abonos</Link>}
          {acciones[detail.data.estado].map((value) => <button className="secondary-button" disabled={saving} key={value} onClick={() => { void cambiarEstado(value); }}>Marcar como {labels[value].toLowerCase()}</button>)}
          <button className="secondary-button" disabled={saving} onClick={() => { setDetailId(''); setError(''); }}>Cerrar detalle</button></div>
      </>}
    </section>}
    {list.isPending && <p role="status">Cargando presupuestos…</p>}
    {list.isError && <RequestError error={list.error} retry={() => { void list.refetch(); }} />}
    {list.data && <div className="surface patient-list"><div className="list-summary">{list.data.total} presupuestos</div>
      {list.data.items.length ? <div className="table-scroll"><table className="patients-table"><thead><tr><th>Paciente</th><th>Fecha</th><th>Estado</th><th>Total</th><th>Acciones</th></tr></thead><tbody>
        {list.data.items.map((item) => <tr key={item.id}><td>{item.paciente.apellidos}, {item.paciente.nombres}</td><td>{formatDate(item.createdAt)}</td><td>{labels[item.estado]}</td><td>{mostrarImporte(item.total)}</td>
          <td><button className="secondary-button" onClick={() => { if (confirmDiscard()) { setEditor(null); setDetailId(item.id); setError(''); setSuccess(''); } }}>Ver presupuesto</button></td></tr>)}
      </tbody></table></div> : <p className="state-panel">No hay presupuestos para estos filtros.</p>}
      <ListaPaginacion pagina={pagina} totalPaginas={list.data.totalPaginas} onChange={setPagina} /></div>}
  </>;
}
