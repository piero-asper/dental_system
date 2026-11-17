import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { finanzasApi } from '../lib/finanzasApi';
import { mostrarImporte } from '../lib/importes';
import { formatDateTime } from '../lib/clinical';
import { RequestError } from './RequestError';
import { ListaPaginacion } from './ListaPaginacion';
const medios: Record<string, string> = { EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', TRANSFERENCIA: 'Transferencia', OTRO: 'Otro' };
export function ReporteFinanciero({ desde, hasta, compacto = false }: { desde: string; hasta: string; compacto?: boolean }) {
  const query = useQuery({ queryKey: ['finanzas', desde, hasta], queryFn: ({ signal }) => finanzasApi.resumen(desde, hasta, signal), retry: false });
  const [pagina, setPagina] = useState(1), [exportando, setExportando] = useState(false), [error, setError] = useState<unknown>(null);
  const corte = query.data?.corte ?? '';
  const detalle = useQuery({ queryKey: ['finanzas-detalle', corte, pagina], enabled: !!corte && !compacto,
    queryFn: ({ signal }) => finanzasApi.detalle(corte, pagina, signal), retry: false });
  async function exportar() {
    if (!corte || exportando) return; setExportando(true); setError(null);
    try {
      const csv = await finanzasApi.csv(corte), url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `caja-${desde}-${hasta}.csv`; anchor.click(); URL.revokeObjectURL(url);
    } catch (cause) { setError(cause); } finally { setExportando(false); }
  }
  return <section className="surface patient-form financial-summary"><div className="section-toolbar"><div><p className="eyebrow">Cobros y saldos</p><h2>Resumen financiero</h2></div>
    <div className="inline-actions"><button className="secondary-button" disabled={query.isFetching} onClick={() => { setPagina(1); void query.refetch(); }}>{query.isFetching ? 'Actualizando…' : 'Actualizar caja'}</button>
      {compacto ? <Link className="text-link" to={`/pagos?${new URLSearchParams({ seccion: 'caja', desde, hasta })}`}>Ver caja y movimientos</Link> : <button className="secondary-button" disabled={!corte || exportando} onClick={() => { void exportar(); }}>{exportando ? 'Exportando…' : 'Exportar caja CSV'}</button>}</div></div>
    {query.isPending && <p role="status">Consultando cobros…</p>}{query.isError && <RequestError error={query.error} retry={() => { void query.refetch(); }} />}
    {query.data && <><div className="summary-grid">
      <div className="summary-card"><span>Cobros registrados en el periodo</span><strong>{mostrarImporte(query.data.ingresos)}</strong></div>
      <div className="summary-card"><span>Reversiones registradas en el periodo</span><strong>{mostrarImporte(query.data.reversiones)}</strong></div>
      <div className="summary-card"><span>Cobros netos del periodo</span><strong>{mostrarImporte(query.data.neto)}</strong></div>
      <Link className="summary-card text-link" to="/pagos?seccion=cartera"><span>Saldo pendiente actual</span><strong>{mostrarImporte(query.data.saldoPendiente)}</strong><small>{query.data.presupuestosPendientes} presupuestos con saldo</small></Link>
    </div><p className="field-hint">Corte financiero: {formatDateTime(query.data.actualizado)}. Los cobros y sus reversiones se cuentan por la fecha del movimiento. El saldo pendiente reúne los presupuestos aceptados o finalizados a la fecha del corte.</p>
      {!compacto && <><div className="table-scroll"><table className="patients-table"><caption>Caja por medio de pago</caption><thead><tr><th>Medio</th><th>Cobros</th><th>Reversiones</th><th>Neto</th></tr></thead><tbody>{query.data.porMetodo.map((row) => <tr key={row.metodoPago}><td>{medios[row.metodoPago] ?? row.metodoPago}</td><td>{mostrarImporte(row.ingresos)}</td><td>{mostrarImporte(row.reversiones)}</td><td>{mostrarImporte(row.neto)}</td></tr>)}</tbody></table></div>
        <h3>Movimientos del mismo corte</h3>{detalle.isPending && <p role="status">Cargando movimientos de caja…</p>}{detalle.isError && <RequestError error={detalle.error} retry={() => { setPagina(1); void query.refetch(); }} />}
        {detalle.data && <>{detalle.data.items.length ? <div className="table-scroll"><table className="patients-table"><thead><tr><th>Fecha</th><th>Paciente</th><th>Recibo</th><th>Movimiento</th><th>Medio</th><th>Importe</th></tr></thead><tbody>
          {detalle.data.items.map((row) => <tr key={row.id}><td>{formatDateTime(row.fecha)}</td><td><Link className="text-link" to={`/pacientes/${row.pacienteId}`}>{row.paciente}</Link></td><td><Link className="text-link" to={`/pagos?seccion=cobros&pagoId=${row.pagoId}`}>{row.recibo}</Link></td><td>{row.tipo === 'INGRESO' ? 'Cobro' : 'Reversión'}</td><td>{medios[row.metodoPago] ?? row.metodoPago}</td><td>{mostrarImporte(row.monto)}</td></tr>)}
        </tbody></table></div> : <p>No hay movimientos en este periodo.</p>}<ListaPaginacion pagina={pagina} totalPaginas={detalle.data.totalPaginas} onChange={setPagina} /></>}
      </>}
    </>}{error != null && <RequestError error={error} />}
  </section>;
}
