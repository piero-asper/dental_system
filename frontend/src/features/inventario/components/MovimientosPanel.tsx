import { FormEvent, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ListaPaginacion } from '@/shared/components/ListaPaginacion';
import { RequestError } from '@/shared/components/RequestError';
import { UnsavedChanges, confirmDiscard } from '@/shared/components/UnsavedChanges';
import { mostrarImporte } from '@/shared/lib/importes';
import { inventarioApi, type Insumo, type TipoMovimiento } from '../api/inventarioApi';

export function MovimientosPanel({ original, onClose }: { original: Insumo; onClose: () => void }) {
  const client = useQueryClient();
  const [insumo, setInsumo] = useState(original), [tipo, setTipo] = useState<TipoMovimiento>('ENTRADA');
  const [cantidad, setCantidad] = useState(''), [motivo, setMotivo] = useState(''), [pagina, setPagina] = useState(1);
  const [saving, setSaving] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');
  const list = useQuery({ queryKey: ['inventario-movimientos', insumo.id, pagina], queryFn: ({ signal }) => inventarioApi.movimientos(insumo.id, pagina, signal), retry: false });
  async function submit(event: FormEvent) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const result = await inventarioApi.movimiento(insumo.id, { tipo, cantidad, motivo: motivo.trim(), version: insumo.updatedAt });
      setInsumo(result.insumo); setCantidad(''); setMotivo(''); setPagina(1); setSuccess('Movimiento registrado.');
      await Promise.all([client.invalidateQueries({ queryKey: ['inventario'] }), client.invalidateQueries({ queryKey: ['inventario-movimientos', insumo.id] })]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo registrar el movimiento.'); }
    finally { setSaving(false); }
  }
  return <section className="surface patient-form">
    <h2>Movimientos de {insumo.nombre}</h2><p>Existencias: <strong>{mostrarImporte(insumo.stockActual)} {insumo.unidadMedida}</strong></p>
    <UnsavedChanges dirty={!!cantidad || !!motivo} />
    {insumo.activo ? <form onSubmit={(e) => { void submit(e); }} aria-busy={saving}><fieldset disabled={saving}><legend>Registrar movimiento</legend><div className="form-grid">
      <label>Tipo de movimiento<select value={tipo} onChange={(e) => setTipo(e.target.value as TipoMovimiento)}><option value="ENTRADA">Entrada</option><option value="SALIDA">Salida</option><option value="AJUSTE">Ajuste de existencias</option></select></label>
      <label>{tipo === 'AJUSTE' ? 'Existencia final *' : 'Cantidad *'}<input type="number" required min={tipo === 'AJUSTE' ? '0' : '0.01'} max="9999999999.99" step="0.01" value={cantidad} onChange={(e) => setCantidad(e.target.value)} /></label>
      <label className="full-width">Motivo *<textarea required maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} /></label>
    </div>{tipo === 'AJUSTE' && <p className="field-hint">Introduce el total contado físicamente. El historial conservará las existencias anteriores y las nuevas.</p>}
      <button className="primary-button" disabled={saving}>{saving ? 'Registrando…' : 'Registrar movimiento'}</button></fieldset></form> : <p className="notice-warning">Este insumo está inactivo. Su historial se conserva; actívalo para registrar movimientos.</p>}
    {success && <p className="success-message" role="status">{success}</p>}{error && <p className="form-error" role="alert">{error}</p>}
    <h3>Kardex de movimientos</h3>{list.isPending && <p role="status">Cargando movimientos…</p>}
    {list.isError && <RequestError error={list.error} retry={() => { void list.refetch(); }} />}
    {list.data && <>{list.data.items.length ? <div className="table-scroll"><table className="patients-table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Cantidad</th><th>Anterior</th><th>Resultado</th><th>Motivo</th></tr></thead><tbody>
      {list.data.items.map((item) => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</td><td>{item.tipo === 'AJUSTE' ? 'Ajuste a existencia final' : item.tipo === 'ENTRADA' ? 'Entrada' : 'Salida'}</td><td>{mostrarImporte(item.cantidad)}</td><td>{mostrarImporte(item.stockAnterior)}</td><td>{mostrarImporte(item.stockNuevo)}</td><td>{item.motivo}</td></tr>)}
    </tbody></table></div> : <p>Este insumo todavía no tiene movimientos.</p>}<ListaPaginacion pagina={pagina} totalPaginas={list.data.totalPaginas} onChange={setPagina} /></>}
    <div className="form-actions"><button className="secondary-button" disabled={saving} onClick={() => { if (confirmDiscard()) onClose(); }}>Cerrar movimientos</button></div>
  </section>;
}
