import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ListaPaginacion } from '@/shared/components/ListaPaginacion';
import { RequestError } from '@/shared/components/RequestError';
import { ReporteFinanciero } from '@/shared/components/ReporteFinanciero';
import { confirmDiscard } from '@/shared/components/UnsavedChanges';
import { addDays, clinicDate, formatDateTime } from '@/shared/lib/clinical';
import { mostrarImporte } from '@/shared/lib/importes';
import { pagosApi, mediosPago, type CuentaPresupuesto } from '../api/pagosApi';
import { PagoForm } from '../components/PagoForm';
import { PagoDetalle } from '../components/PagoDetalle';

export function PagosPage() {
  const [params, setParams] = useSearchParams(), client = useQueryClient();
  const seccion = ['cobros', 'caja'].includes(params.get('seccion') ?? '') ? params.get('seccion')! : 'cartera';
  const pacienteId = params.get('pacienteId') ?? '', presupuestoId = params.get('presupuestoId') ?? '';
  const [cuenta, setCuenta] = useState<CuentaPresupuesto | null>(null), [success, setSuccess] = useState('');
  const pagoId = params.get('pagoId') ?? '';
  const change = (values: Record<string, string>) => setParams({ ...Object.fromEntries(params), ...values });
  async function refresh() { await Promise.all(['cartera', 'pagos', 'pago', 'finanzas', 'presupuesto', 'presupuestos'].map((key) => client.invalidateQueries({ queryKey: [key] }))); }
  return <section className="patients-page clinical-page"><header className="module-header page-header"><div><p className="eyebrow">Administración</p><h1>Pagos</h1><p>Registra los cobros de presupuestos aceptados, consulta saldos y concilia la caja.</p></div><Link className="text-link" to="/guia#pagos">Cómo utilizar Pagos</Link></header>
    <div className="inline-actions module-tabs" role="group" aria-label="Secciones de pagos">{[['cartera', 'Saldos pendientes'], ['cobros', 'Cobros y recibos'], ['caja', 'Caja']].map(([key, label]) => <button key={key} className={seccion === key ? 'primary-button' : 'secondary-button'} aria-pressed={seccion === key} onClick={() => { if (seccion !== key && confirmDiscard()) { setCuenta(null); change({ seccion: key, pagoId: '' }); } }}>{label}</button>)}</div>
    {seccion !== 'caja' && (pacienteId || presupuestoId) && <p className="notice-warning">Mostrando los registros del {presupuestoId ? 'presupuesto seleccionado' : 'paciente seleccionado'}. <button className="secondary-button" onClick={() => { if (confirmDiscard()) { setCuenta(null); change({ pacienteId: '', presupuestoId: '', pagoId: '' }); } }}>Ver todos</button></p>}
    {success && <p className="success-message" role="status">{success}</p>}
    {cuenta && <PagoForm key={cuenta.id} cuenta={cuenta} onClose={() => setCuenta(null)} onSave={async (data) => {
      const pago = await pagosApi.registrar(data); setCuenta(null); setSuccess('Cobro guardado con su recibo interno.'); change({ seccion: 'cobros', pagoId: pago.id }); await refresh();
    }} />}
    {pagoId && <PagoDetalle key={pagoId} id={pagoId} onClose={() => change({ pagoId: '' })} onChanged={async () => { setSuccess('Cobro anulado. El saldo y la caja se actualizaron.'); await refresh(); }} />}
    {seccion === 'cartera' && <Cartera key={`${pacienteId}:${presupuestoId}`} pacienteId={pacienteId} presupuestoId={presupuestoId} onCobrar={(item) => { if (confirmDiscard()) { setCuenta(item); setSuccess(''); } }} />}
    {seccion === 'cobros' && <Cobros key={`${pacienteId}:${presupuestoId}`} pacienteId={pacienteId} presupuestoId={presupuestoId} onOpen={(id) => { if (confirmDiscard()) { setCuenta(null); change({ pagoId: id }); } }} />}
    {seccion === 'caja' && <Caja desdeInicial={params.get('desde') ?? undefined} hastaInicial={params.get('hasta') ?? undefined} />}
  </section>;
}
function Cartera({ pacienteId, presupuestoId, onCobrar }: { pacienteId: string; presupuestoId: string; onCobrar: (cuenta: CuentaPresupuesto) => void }) {
  const [q, setQ] = useState(''), [estadoSaldo, setEstado] = useState('pendientes'), [pagina, setPagina] = useState(1);
  const query = new URLSearchParams({ q, estadoSaldo, pagina: String(pagina) });
  if (pacienteId) query.set('pacienteId', pacienteId); if (presupuestoId) query.set('presupuestoId', presupuestoId);
  const list = useQuery({ queryKey: ['cartera', query.toString()], queryFn: ({ signal }) => pagosApi.cartera(query, signal), retry: false });
  return <><div className="patient-search surface"><label>Buscar por paciente<input type="search" maxLength={100} value={q} onChange={(e) => { setQ(e.target.value); setPagina(1); }} /></label>
    <label>Saldo<select value={estadoSaldo} onChange={(e) => { setEstado(e.target.value); setPagina(1); }}><option value="pendientes">Pendiente</option><option value="saldados">Saldado</option><option value="todos">Todos</option></select></label>
    <Link className="text-link" to={`/tratamientos?${new URLSearchParams({ tab: 'presupuestos', ...(pacienteId ? { pacienteId } : {}) })}`}>Consultar presupuestos</Link></div>
    {list.isPending && <p role="status">Consultando saldos…</p>}{list.isError && <RequestError error={list.error} retry={() => { void list.refetch(); }} />}
    {list.data && <div className="surface patient-list"><div className="list-summary">{list.data.total} presupuestos · Saldo de estos filtros: {mostrarImporte(list.data.saldoFiltrado)}</div>
      {list.data.items.length ? <div className="table-scroll"><table className="patients-table"><thead><tr><th>Paciente</th><th>Presupuesto</th><th>Total</th><th>Abonos vigentes</th><th>Saldo</th><th>Acciones</th></tr></thead><tbody>
        {list.data.items.map((item) => <tr key={item.id}><td><Link className="text-link" to={`/pacientes/${item.pacienteId}`}>{item.paciente.apellidos}, {item.paciente.nombres}</Link></td><td><Link className="text-link" to={`/tratamientos?tab=presupuestos&presupuestoId=${item.id}&pacienteId=${item.pacienteId}`}>{formatDateTime(item.createdAt)}</Link><p>{item.estado === 'ACEPTADO' ? 'Aceptado' : 'Finalizado'}</p></td><td>{mostrarImporte(item.total)}</td><td>{mostrarImporte(item.abonado)}</td><td><strong>{mostrarImporte(item.saldo)}</strong></td><td>{Number(item.saldo) > 0 ? <button className="primary-button" onClick={() => onCobrar(item)}>Registrar abono</button> : 'Saldado'}</td></tr>)}
      </tbody></table></div> : <p className="state-panel">No hay presupuestos con estos filtros. Para cobrar, primero crea y acepta un presupuesto en Tratamientos.</p>}
      <ListaPaginacion pagina={pagina} totalPaginas={list.data.totalPaginas} onChange={setPagina} /></div>}</>;
}
function Cobros({ pacienteId, presupuestoId, onOpen }: { pacienteId: string; presupuestoId: string; onOpen: (id: string) => void }) {
  const [q, setQ] = useState(''), [estado, setEstado] = useState(''), [pagina, setPagina] = useState(1);
  const query = new URLSearchParams({ q, pagina: String(pagina) });
  if (pacienteId) query.set('pacienteId', pacienteId); if (presupuestoId) query.set('presupuestoId', presupuestoId); if (estado) query.set('estadoPago', estado);
  const list = useQuery({ queryKey: ['pagos', query.toString()], queryFn: ({ signal }) => pagosApi.listar(query, signal), retry: false });
  return <><div className="patient-search surface"><label>Buscar paciente o recibo<input type="search" maxLength={100} value={q} onChange={(e) => { setQ(e.target.value); setPagina(1); }} /></label><label>Estado del cobro<select value={estado} onChange={(e) => { setEstado(e.target.value); setPagina(1); }}><option value="">Todos</option><option value="REGISTRADO">Registrados</option><option value="ANULADO">Anulados</option></select></label></div>
    {list.isPending && <p role="status">Cargando cobros…</p>}{list.isError && <RequestError error={list.error} retry={() => { void list.refetch(); }} />}
    {list.data && <div className="surface patient-list"><div className="list-summary">{list.data.total} cobros</div>{list.data.items.length ? <div className="table-scroll"><table className="patients-table"><thead><tr><th>Fecha</th><th>Paciente</th><th>Recibo</th><th>Medio</th><th>Importe</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{list.data.items.map((item) => <tr key={item.id}><td>{formatDateTime(item.fechaPago)}</td><td>{item.paciente.apellidos}, {item.paciente.nombres}</td><td>{item.comprobante?.numero ?? 'Histórico'}</td><td>{mediosPago[item.metodoPago]}</td><td>{mostrarImporte(item.monto)}</td><td>{item.estado === 'REGISTRADO' ? 'Registrado' : 'Anulado'}</td><td><button className="secondary-button" onClick={() => onOpen(item.id)}>Ver recibo</button></td></tr>)}</tbody></table></div> : <p className="state-panel">No hay cobros para estos filtros.</p>}<ListaPaginacion pagina={pagina} totalPaginas={list.data.totalPaginas} onChange={setPagina} /></div>}</>;
}
function Caja({ desdeInicial, hastaInicial }: { desdeInicial?: string; hastaInicial?: string }) {
  const hoy = clinicDate(new Date().toISOString()), [desde, setDesde] = useState(desdeInicial ?? hoy), [hasta, setHasta] = useState(hastaInicial ?? addDays(hoy, 1));
  const [periodo, setPeriodo] = useState({ desde, hasta });
  return <><form className="patient-search surface" onSubmit={(e) => { e.preventDefault(); setPeriodo({ desde, hasta }); }}><label>Desde<input type="date" required max={hoy} value={desde} onChange={(e) => setDesde(e.target.value)} /></label><label>Hasta (sin incluir)<input type="date" required value={hasta} onChange={(e) => setHasta(e.target.value)} /></label><button className="primary-button">Consultar caja</button></form>
    <ReporteFinanciero key={`${periodo.desde}:${periodo.hasta}`} desde={periodo.desde} hasta={periodo.hasta} /></>;
}

