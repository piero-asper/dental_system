import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, CalendarDays, ChevronRight, ClipboardCheck, FileText, Plus, RefreshCw, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { RequestError } from '@/shared/components/RequestError';
import { addDays, clinicDate, formatDate, formatTime } from '@/shared/lib/clinical';
import { etiquetasEstado, type EstadoCita } from '@/features/citas/api/citasApi';
import { ActivityChart, appointmentStates } from '../components/DashboardCharts';
import { useBiReport, type Resumen } from '../useBiReport';
import '../dashboard.css';

export function DashboardPage() {
  const report = useBiReport(true), { data, query } = report;
  const navigate = useNavigate();
  const isToday = report.desde === report.today && report.hasta === addDays(report.today, 1);
  const citas = data ? appointmentStates.reduce((sum, s) => sum + (data.indicadores[s.key] ?? 0), 0) : 0;
  const verReportes = () => navigate(`/reportes?${new URLSearchParams({ desde: report.desde, hasta: report.hasta })}`);
  return <section className="dental-dashboard">
    <div className="dashboard-workspace">
      <header className="dashboard-welcome"><div><h1>Panel de la clínica</h1><p>Tu clínica, en un vistazo. Una atención más organizada comienza aquí.</p></div><div className="dashboard-welcome-actions"><Link className="dashboard-outline" to="/pacientes/nuevo"><Users size={14} aria-hidden="true"/>Nuevo paciente</Link><Link className="dashboard-primary" to="/citas?reservar=1"><Plus size={15} aria-hidden="true"/>Nueva cita</Link></div></header>
      <section className="dashboard-period" aria-label="Periodo de los indicadores"><form onSubmit={(e) => { e.preventDefault(); report.setParams({ desde: report.draftDesde, hasta: report.draftHasta }); }}><span className="dashboard-period-label">Consultar actividad</span><label>Desde<input type="date" required max={report.today} value={report.draftDesde} onChange={(e) => report.setDesde(e.target.value)}/></label><label>Hasta (sin incluir)<input type="date" required value={report.draftHasta} onChange={(e) => report.setHasta(e.target.value)}/></label><button className="dashboard-primary" type="submit">Consultar</button><div className="dashboard-period-shortcuts"><button type="button" className={isToday ? 'selected' : ''} onClick={() => report.setParams({ desde: report.today, hasta: addDays(report.today, 1) })}>Hoy</button><button type="button" className={!isToday && report.desde === report.today.slice(0, 7) + '-01' ? 'selected' : ''} onClick={() => report.setParams({ desde: report.today.slice(0, 7) + '-01', hasta: addDays(report.today, 1) })}>Este mes</button></div><button type="button" className="dashboard-refresh" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw size={14} className={query.isFetching ? 'is-spinning' : ''} aria-hidden="true"/>{query.isFetching ? 'Actualizando…' : 'Actualizar'}</button></form></section>
      {query.isError && <div className="dashboard-error"><RequestError error={query.error} retry={() => void query.refetch()}/></div>}
      {query.isPending && <div className="dashboard-card dashboard-loading" role="status"><RefreshCw size={21} className="is-spinning" aria-hidden="true"/>Consultando la actividad de tu clínica…</div>}
      {data && <>
        <div className="dashboard-stat-grid">
          <StatTile title={isToday ? 'Citas de hoy' : 'Citas del periodo'} value={citas} icon={CalendarDays} hint={`${data.indicadores.atendidas ?? 0} atendidas · ${data.indicadores.confirmadas ?? 0} confirmadas`} note="Ver análisis y registros del periodo" bars={data.series.map((s) => s.citas)} onClick={verReportes}/>
          <StatTile title="Pacientes atendidos" value={data.indicadores.atendidos ?? 0} icon={Users} hint="Personas distintas en el periodo" note={variation(data, 'atendidos')} onClick={verReportes}/>
          <StatTile title="Pacientes nuevos" value={data.indicadores.nuevos ?? 0} icon={Users} hint="Registrados durante el periodo" note={variation(data, 'nuevos')} bars={data.series.map((s) => s.pacientes)} onClick={verReportes}/>
          <StatTile title="Evolución pendiente" value={data.indicadores.pendientes ?? 0} icon={ClipboardCheck} hint="Atenciones sin evolución finalizada" note="Revisar en los reportes" onClick={verReportes}/>
        </div>
        <div className="dashboard-columns"><div className="dashboard-primary-column">
          <NextAppointments data={data}/>
          <section className="dashboard-card dashboard-activity"><div className="dashboard-card-heading"><div><h2>Actividad por día</h2><p className="dashboard-caption">Pacientes registrados y citas previstas en el periodo.</p></div><div className="dashboard-chart-legend"><span><i className="dashboard-dot"/>Pacientes nuevos</span><span><i className="dashboard-dot appointments"/>Citas previstas</span></div></div><ActivityChart series={data.series} onSelect={verReportes}/></section>
          <div className="dashboard-secondary-metrics"><button type="button" className="dashboard-card" onClick={verReportes}><span>Tasa de inasistencia</span><strong>{data.tasaInasistencia === null ? 'Sin base de cálculo' : `${data.tasaInasistencia} %`}</strong><small>Solo citas ya iniciadas; excluye pendientes y canceladas.</small><ArrowUpRight size={16} aria-hidden="true"/></button><button type="button" className="dashboard-card" onClick={verReportes}><span>Sin próxima cita</span><strong>{data.indicadores.sin_proxima ?? 0}</strong><small>Pacientes activos sin reserva futura.</small><ArrowUpRight size={16} aria-hidden="true"/></button></div>
        </div><aside className="dashboard-secondary-column" aria-label="Atención y seguimiento">
          <NextAttention data={data}/>
          <section className="dashboard-card dashboard-agenda-status"><div className="dashboard-card-heading"><h2>Estado de la agenda</h2><CalendarDays size={16} aria-hidden="true"/></div><div className="dashboard-state-legend">{appointmentStates.map((s) => <button type="button" key={s.key} onClick={verReportes} aria-label={`${s.label}: ${data.indicadores[s.key] ?? 0} citas. Ver reportes`}><span className="dashboard-dot" style={{ background: s.color }}/><span>{s.label}</span><strong>{data.indicadores[s.key] ?? 0}</strong><ChevronRight size={12} aria-hidden="true"/></button>)}</div><button className="dashboard-occupancy" type="button" onClick={verReportes}><span>Ocupación de agenda<strong>{data.ocupacion.porcentaje === null ? 'No disponible' : `${data.ocupacion.porcentaje} %`}</strong></span><span className="dashboard-progress" aria-hidden="true"><i style={{ width: `${data.ocupacion.porcentaje ?? 0}%` }}/></span><small>{data.ocupacion.diasSinHorario ? `${data.ocupacion.diasSinHorario} días sin horario registrado.` : `${Math.round(data.ocupacion.minutosReservados)} / ${Math.round(data.ocupacion.minutosDisponibles)} minutos disponibles.`}</small></button></section>
          <section className="dashboard-card dashboard-pending"><div className="dashboard-card-heading"><h2>Necesitan tu atención</h2><Link to="/reportes">Ver todo <ArrowUpRight size={12} aria-hidden="true"/></Link></div>{[{ key: 'pendientes', title: 'Evoluciones por finalizar', hint: 'Completar el registro de la atención', icon: ClipboardCheck }, { key: 'sin_historia', title: 'Pacientes sin historia', hint: 'Abrir su historia clínica', icon: FileText }, { key: 'vencidas', title: 'Citas sin resolver', hint: 'Revisar su estado en la agenda', icon: CalendarDays }].map(({ key, title, hint, icon: Icon }) => <button type="button" key={key} onClick={verReportes}><span className={`dashboard-pending-icon ${key}`}><Icon size={16} aria-hidden="true"/></span><span><strong>{data.indicadores[key] ?? 0} {title.toLowerCase()}</strong><small>{hint}</small></span><ChevronRight size={13} aria-hidden="true"/></button>)}</section>
        </aside></div>
      </>}
    </div>
  </section>;
}

function variation(data: Resumen, key: string) {
  const v = data.variaciones[key];
  if (!v) return 'Consulta el detalle del periodo';
  return `${v.diferencia > 0 ? '+' : ''}${v.diferencia} frente al periodo equivalente${v.porcentaje === null ? '' : ` (${v.porcentaje > 0 ? '+' : ''}${v.porcentaje} %)`}`;
}
function StatTile({ title, value, hint, note, icon: Icon, bars, onClick }: { title: string; value: number; hint: string; note: string; icon: LucideIcon; bars?: number[]; onClick: () => void }) {
  const values = bars?.slice(-10), max = Math.max(1, ...(values ?? []));
  return <button type="button" className="dashboard-card dashboard-stat-card" onClick={onClick}><span className="dashboard-stat-label">{title}<Icon size={17} aria-hidden="true"/></span><span className="dashboard-stat-value">{value.toLocaleString('es-CO')}{values && values.length > 1 && <span className="dashboard-sparkbars" aria-hidden="true">{values.map((v, i) => <i key={i} style={{ height: `${v / max * 30}px` }}/>)}</span>}</span><span className="dashboard-stat-description">{hint}</span><span className="dashboard-stat-note">{note}</span></button>;
}
function NextAttention({ data }: { data: Resumen }) {
  const next = data.proximas?.[0];
  return <section className="dashboard-next-attention"><div className="dashboard-card-heading"><h2>Próxima atención</h2><span><i/> Agenda única</span></div>{next ? <><div className="dashboard-next-patient"><span className="dashboard-avatar" aria-hidden="true">{next.paciente.nombres.charAt(0)}{next.paciente.apellidos.charAt(0)}</span><div><strong>{next.paciente.nombres} {next.paciente.apellidos}</strong><span>{formatDate(next.fechaInicio)} · {formatTime(next.fechaInicio)}</span></div></div><div className="dashboard-next-summary"><CalendarDays size={15} aria-hidden="true"/><div><strong>{etiquetasEstado[next.estado as EstadoCita] ?? next.estado}</strong><span>Consulta su ficha antes de la atención.</span></div></div><div className="dashboard-next-actions"><Link to={`/historias-clinicas?pacienteId=${next.pacienteId}`}><FileText size={13} aria-hidden="true"/>Abrir historia clínica</Link><Link to={`/citas?fecha=${clinicDate(next.fechaInicio)}&citaId=${next.id}`}>Ver detalle</Link></div></> : <div className="dashboard-next-empty"><CalendarDays size={28} aria-hidden="true"/><p>No hay una atención programada.</p><Link to="/citas?reservar=1">Reservar una cita <ArrowRight size={13} aria-hidden="true"/></Link></div>}</section>;
}
function NextAppointments({ data }: { data: Resumen }) {
  const [filter, setFilter] = useState('TODAS');
  const items = (data.proximas ?? []).filter((c) => filter === 'TODAS' || c.estado === filter);
  return <section className="dashboard-card dashboard-appointments"><div className="dashboard-card-heading"><h2>Próximas citas</h2><Link className="dashboard-text-link" to="/citas">Abrir agenda <ArrowUpRight size={13} aria-hidden="true"/></Link></div><div className="dashboard-appointment-filters" aria-label="Filtrar próximas citas">{[['TODAS', 'Todas las próximas'], ['PROGRAMADA', 'Programadas'], ['CONFIRMADA', 'Confirmadas']].map(([key, label]) => <button type="button" key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div>
    {!items.length ? <div className="dashboard-empty"><CalendarDays size={27} aria-hidden="true"/><p>{data.proximas?.length ? 'No hay próximas citas con este estado.' : 'No hay próximas citas.'}</p><Link className="dashboard-text-link" to="/citas?reservar=1">Reservar cita <ArrowRight size={14} aria-hidden="true"/></Link></div> : <div className="dashboard-table-scroll"><table className="dashboard-table"><thead><tr><th scope="col">Hora</th><th scope="col">Paciente</th><th scope="col">Fecha</th><th scope="col">Estado</th><th scope="col"><span className="dashboard-sr-only">Acción</span></th></tr></thead><tbody>{items.map((c) => <tr key={c.id}><td className="dashboard-row-time">{formatTime(c.fechaInicio)}</td><td><span className="dashboard-patient"><span className="dashboard-avatar" aria-hidden="true">{c.paciente.nombres.charAt(0)}{c.paciente.apellidos.charAt(0)}</span><span>{c.paciente.apellidos}, {c.paciente.nombres}</span></span></td><td>{formatDate(c.fechaInicio)}</td><td><span className={`dashboard-status ${c.estado.toLowerCase()}`}><i/>{etiquetasEstado[c.estado as EstadoCita] ?? c.estado}</span></td><td><Link className="dashboard-table-action" to={`/citas?fecha=${clinicDate(c.fechaInicio)}&citaId=${c.id}`}>Ver cita <ChevronRight size={12} aria-hidden="true"/></Link></td></tr>)}</tbody></table></div>}
    <div className="dashboard-table-footer"><span>Hasta cinco próximas reservas · Hora de Colombia</span><Link to="/citas">Ver todas las citas <ArrowRight size={13} aria-hidden="true"/></Link></div>
  </section>;
}
