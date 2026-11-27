import { FormEvent, MouseEvent, type ReactNode, useEffect,useRef, useState } from 'react';
import { Link,useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CalendarPlus, Eye, Pencil, Search, X } from 'lucide-react';
import { PacienteSelector } from '@/shared/components/PacienteSelector';
import { RequestError } from '@/shared/components/RequestError';
import { addDays, agendaRange, clinicDate, clinicInput, clinicISO, errorMessage, formatDate, formatTime } from '@/shared/lib/clinical';
import { Cita, citasApi, EstadoCita, estadosCita, etiquetasEstado } from '../api/citasApi';
import { AgendaCalendario } from '../components/AgendaCalendario';
import { CitaDetalle } from '../components/CitaDetalle';
import { confirmDiscard,UnsavedChanges } from '@/shared/components/UnsavedChanges';

export function CitasPage() {
  const client = useQueryClient();
  const [params]=useSearchParams();
  const [date, setDate] = useState(/^\d{4}-\d{2}-\d{2}$/.test(params.get('fecha')??'')?params.get('fecha')!:clinicDate()), [week, setWeek] = useState(false), [estado, setEstado] = useState('');
  const [form, setForm] = useState<Cita | 'nueva' | null>(params.get('reservar')?'nueva':null), [action, setAction] = useState<Cita | null>(null), [saved, setSaved] = useState('');
  const [formato,setFormato]=useState<'tabla'|'calendario'|'lista'>('tabla'),[slot,setSlot]=useState(''),[detalle,setDetalle]=useState<Cita|null>(null),[search,setSearch]=useState(''),[scheduleConflict,setScheduleConflict]=useState(false);
  const range = agendaRange(date, week);
  const list = useQuery({ queryKey: ['citas', range.desde, range.hasta, estado], queryFn: ({ signal }) => citasApi.listar(range.desde, range.hasta, estado, signal), retry: false });
  const visibleCitas = list.data?.filter((cita) => `${cita.paciente.nombres} ${cita.paciente.apellidos} ${cita.paciente.telefono ?? ''} ${cita.motivo ?? ''}`.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')));
  const opened=useRef(false);
  useEffect(()=>{if(!opened.current&&params.get('citaId')&&list.data){const cita=list.data.find((c)=>c.id===params.get('citaId'));if(cita){opened.current=true;setDetalle(cita);}}},[list.data,params]);
  async function refresh(message: string) { setSaved(message); setForm(null); setAction(null);setDetalle(null); await Promise.all([client.invalidateQueries({ queryKey: ['citas'] }),client.invalidateQueries({queryKey:['disponibilidad']}),client.invalidateQueries({queryKey:['paciente-resumen-ficha']}),client.invalidateQueries({queryKey:['paciente-citas']}),client.invalidateQueries({queryKey:['bi']})]); }
  return <section className="patients-page clinical-page appointments-page">
    <header className="module-header page-header"><div><p className="eyebrow">Agenda de la clínica</p><h1>Registro de citas</h1><p>Consulta, organiza y actualiza las citas de tu clínica.</p></div><div className="inline-actions"><button className="primary-button button-icon" onClick={() => {if(!confirmDiscard())return;setSlot('');setDetalle(null);setAction(null); setForm('nueva'); setSaved(''); }}><CalendarPlus size={18} aria-hidden="true" />Nueva cita</button></div></header>
    {saved && <p className="success-message" role="status">{saved}</p>}
    <div className="patient-search appointments-toolbar surface"><label className="appointment-search-field">Buscar cita<span className="search-input"><Search size={18} aria-hidden="true" /><input type="search" placeholder="Paciente, teléfono o motivo" value={search} onChange={(e) => setSearch(e.target.value)} /></span></label>
      <label>Fecha<input type="date" required value={date} onChange={(e) => { if (e.target.value) setDate(e.target.value); }} /></label>
      <label>Periodo<select value={week ? 'semana' : 'dia'} onChange={(e) => setWeek(e.target.value === 'semana')}><option value="dia">Día</option><option value="semana">Semana</option></select></label>
      <label>Estado<select value={estado} onChange={(e) => setEstado(e.target.value)}><option value="">Todos</option>{estadosCita.map((s) => <option key={s} value={s}>{etiquetasEstado[s]}</option>)}</select></label>
      <label>Vista<select aria-label="Vista" value={formato} onChange={(e)=>setFormato(e.target.value as typeof formato)}><option value="tabla">Registro</option><option value="calendario">Calendario</option><option value="lista">Lista accesible</option></select></label>
    </div>
    {form && <CitaModal cita={form === 'nueva' ? undefined : form} onClose={() => { if (confirmDiscard()) setForm(null); }}><CitaForm key={typeof form === 'string' ? `nueva-${slot}` : form.id} cita={form === 'nueva' ? undefined : form} date={date} inicioInicial={slot} pacienteInicial={params.get('pacienteId')??''} onCancel={() => {if(confirmDiscard())setForm(null);}} onConflict={() => setScheduleConflict(true)} onSaved={() => refresh(form === 'nueva' ? 'Cita reservada.' : 'Cita reprogramada.')} /></CitaModal>}
    {scheduleConflict && <CitaConflictToast onDismiss={() => setScheduleConflict(false)} />}
    {detalle&&<CitaDetalle key={detalle.updatedAt} cita={detalle} onClose={()=>setDetalle(null)} onHorario={(c)=>{setDetalle(null);setForm(c);setAction(null);}} onEstado={(c)=>{setDetalle(null);setAction(c);setForm(null);}}/>}
    {action && <EstadoForm key={action.id} cita={action} onCancel={() => setAction(null)} onSaved={() => refresh('Estado de la cita actualizado.')} />}
    {list.isPending && <p className="surface state-panel" role="status">Cargando agenda…</p>}
    {list.isError && <div className="surface"><RequestError error={list.error} retry={() => { void list.refetch(); }} /></div>}
    {list.data && formato==='tabla'&&<div className="surface appointments-registry"><div className="list-summary" role="status">{visibleCitas?.length ?? 0} {(visibleCitas?.length ?? 0) === 1 ? 'cita encontrada' : 'citas encontradas'}</div><div className="table-scroll"><table className="appointments-table"><thead><tr><th scope="col">ID</th><th scope="col">Paciente</th><th scope="col">Fecha y hora</th><th scope="col">Motivo</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead><tbody>{visibleCitas?.length ? visibleCitas.map((c)=><tr key={c.id}><td><span className="appointment-code">{c.codigo ?? '—'}</span></td><td><strong>{c.paciente.apellidos}, {c.paciente.nombres}</strong><small>{c.paciente.telefono || 'Sin teléfono'}</small></td><td><time dateTime={c.fechaInicio}>{formatDate(c.fechaInicio)}</time><small>{formatTime(c.fechaInicio)} – {formatTime(c.fechaFin)}</small></td><td>{c.motivo || 'Sin motivo registrado'}</td><td><span className={`status-badge cita-${c.estado.toLowerCase()}`}>{etiquetasEstado[c.estado]}</span></td><td><div className="appointment-row-actions"><button className="appointment-action-button appointment-action-view" type="button" aria-label={`Ver cita de ${c.paciente.nombres} ${c.paciente.apellidos}`} title="Ver detalle" onClick={()=>{if(confirmDiscard()){setDetalle(c);setForm(null);setAction(null);}}}><Eye size={18} aria-hidden="true" /></button>{['PROGRAMADA','CONFIRMADA'].includes(c.estado)&&<><button className="appointment-action-button appointment-action-edit" type="button" aria-label={`Reprogramar cita de ${c.paciente.nombres} ${c.paciente.apellidos}`} title="Reprogramar" onClick={()=>{if(confirmDiscard()){setForm(c);setDetalle(null);setAction(null);}}}><Pencil size={17} aria-hidden="true" /></button></>}</div></td></tr>):<tr><td className="appointments-empty" colSpan={6}>Sin citas.</td></tr>}</tbody></table></div></div>}
    {list.data && formato==='calendario'&&<AgendaCalendario first={range.first} week={week} citas={visibleCitas ?? []} onReservar={(inicio)=>{if(confirmDiscard()){setSlot(inicio);setForm('nueva');setDetalle(null);setAction(null);}}} onDetalle={(c)=>{if(confirmDiscard()){setDetalle(c);setForm(null);setAction(null);}}}/>}
    {list.data && formato==='lista'&& <div className="agenda-days">{Array.from({ length: week ? 7 : 1 }, (_, i) => addDays(range.first, i)).map((day) => {
      const dayStart = new Date(`${day}T00:00:00-05:00`).getTime(), dayEnd = new Date(`${addDays(day, 1)}T00:00:00-05:00`).getTime();
      const items = (visibleCitas ?? []).filter((c) => new Date(c.fechaInicio).getTime() < dayEnd && new Date(c.fechaFin).getTime() > dayStart);
      return <section className="surface agenda-day" key={day}><h2>{new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${day}T12:00:00-05:00`))}</h2>
        {!items.length && <p className="empty-state">Sin citas{estado ? ' con este estado' : ''}.</p>}
        {items.map((c) => <article className="appointment" key={c.id}><div className="appointment-time">{formatTime(c.fechaInicio)} – {formatTime(c.fechaFin)}{clinicDate(c.fechaInicio) !== clinicDate(c.fechaFin) && <small>Termina el {clinicDate(c.fechaFin)}</small>}</div>
          <div className="appointment-detail"><strong>{c.paciente.apellidos}, {c.paciente.nombres}</strong><span className={`status-badge cita-${c.estado.toLowerCase()}`}>{etiquetasEstado[c.estado]}</span><p>{c.motivo || 'Sin motivo registrado'}</p>{c.notas && <p className="preserve-text">{c.notas}</p>}{c.motivoCancelacion && <p>Cancelación: {c.motivoCancelacion}</p>}<small>{c.paciente.telefono || 'Sin teléfono'}</small></div>
          <div className="inline-actions"><Link className="text-link" to={`/historias-clinicas?pacienteId=${c.pacienteId}&citaId=${c.id}&tab=evoluciones`}>Historia clínica</Link><button className="secondary-button" onClick={()=>{if(confirmDiscard()){setDetalle(c);setForm(null);setAction(null);}}}>Ver detalle</button>{['PROGRAMADA', 'CONFIRMADA'].includes(c.estado) && <><button className="secondary-button" onClick={() => {if(!confirmDiscard())return; setDetalle(null);setAction(null); setForm(c); }}>Reprogramar</button><button className="secondary-button" onClick={() => {if(!confirmDiscard())return;setDetalle(null); setForm(null); setAction(c); }}>Cambiar estado</button></>}</div>
        </article>)}
      </section>;
    })}</div>}
  </section>;
}

function CitaModal({ cita, onClose, children }: { cita?: Cita; onClose: () => void; children: ReactNode }) {
  const isNew = !cita;
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }
  return <div className="patient-modal-backdrop" onMouseDown={closeFromBackdrop}>
    <section className="patient-modal" role="dialog" aria-modal="true" aria-labelledby="cita-modal-title">
      <header className="patient-modal-header"><div><p className="eyebrow">{isNew ? 'Agenda de la clínica' : 'Gestión de cita'}</p><h2 id="cita-modal-title">{isNew ? 'Nueva cita' : 'Reprogramar cita'}</h2><p>{isNew ? 'Selecciona al paciente y el horario para registrar la atención.' : 'Actualiza el horario asignado para esta cita.'}</p></div>
        <button className="patient-modal-close" type="button" aria-label={isNew ? 'Cerrar nueva cita' : 'Cerrar reprogramación'} onClick={onClose}><X size={20} aria-hidden="true" /></button></header>
      <div className="patient-modal-content">{children}</div>
    </section>
  </div>;
}

function CitaConflictToast({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(onDismiss, 6000);
    return () => window.clearTimeout(timeout);
  }, [onDismiss]);
  return <div className="appointment-conflict-toast" role="alert"><AlertTriangle size={21} aria-hidden="true" /><div><strong>Hay un conflicto en el horario.</strong><span>Ya existe una cita en ese intervalo. Elige otro horario.</span></div><button type="button" aria-label="Cerrar notificación" onClick={onDismiss}><X size={18} aria-hidden="true" /></button></div>;
}

function CitaForm({ cita, date,inicioInicial,pacienteInicial, onCancel, onConflict, onSaved }: { cita?: Cita; date: string;inicioInicial:string;pacienteInicial:string; onCancel: () => void; onConflict: () => void; onSaved: () => Promise<void> }) {
  const [initialStart]=useState(()=>cita ? clinicInput(cita.fechaInicio) : inicioInicial||`${date}T09:00`);
  const [initialEnd]=useState(()=>cita ? clinicInput(cita.fechaFin):clinicInput(new Date(new Date(clinicISO(initialStart)).getTime()+1800000).toISOString()));
  const [pacienteId, setPaciente] = useState(cita?.pacienteId ?? pacienteInicial), [inicio, setInicio] = useState(initialStart), [fin, setFin] = useState(initialEnd);
  const [motivo, setMotivo] = useState(''), [error, setError] = useState('');
  const solicitud=useRef({contenido:'',clave:''});
  const mutation = useMutation({ mutationFn: () => {if(cita)return citasApi.reprogramar(cita.id,{fechaInicio:clinicISO(inicio),fechaFin:clinicISO(fin),version:cita.updatedAt});const data={ pacienteId, fechaInicio: clinicISO(inicio), fechaFin: clinicISO(fin), motivo: motivo.trim() || null };const contenido=JSON.stringify(data);if(solicitud.current.contenido!==contenido)solicitud.current={contenido,clave:crypto.randomUUID()};return citasApi.crear({...data,claveSolicitud:solicitud.current.clave});}, onError: (cause) => { if (errorMessage(cause).toLocaleLowerCase('es').includes('cruza')) onConflict(); }, onSuccess: onSaved });
  function submit(e: FormEvent) { e.preventDefault(); setError(''); if (!pacienteId) return setError('Selecciona un paciente.'); if (fin <= inicio) return setError('El fin debe ser posterior al inicio.'); mutation.mutate(); }
  return <form className="patient-form cita-form" onSubmit={submit}><fieldset disabled={mutation.isPending}>
    <UnsavedChanges dirty={(!!motivo||pacienteId!==(cita?.pacienteId??pacienteInicial)||inicio!==initialStart||fin!==initialEnd)&&!mutation.isPending&&!mutation.isSuccess}/>
    {cita ? <p>{cita.paciente.nombres} {cita.paciente.apellidos}</p> : <PacienteSelector value={pacienteId} onChange={setPaciente} activos />}
    <div className="form-grid"><label>Inicio<input type="datetime-local" required value={inicio} onChange={(e) => {setInicio(e.target.value);if(e.target.value)setFin(clinicInput(new Date(new Date(clinicISO(e.target.value)).getTime()+1800000).toISOString()));}} /></label><label>Fin<input type="datetime-local" required value={fin} onChange={(e) => setFin(e.target.value)} /></label>
      {!cita && <label className="full-width">Motivo<textarea className="appointment-reason-field" rows={5} maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} /></label>}
    </div>{(error || mutation.isError) && <p className="form-error" role="alert">{error || errorMessage(mutation.error)}</p>}
    <div className="form-actions"><button className="primary-button" type="submit">{mutation.isPending ? 'Guardando…' : cita ? 'Guardar horario' : 'Reservar'}</button><button type="button" className="secondary-button" onClick={onCancel}>Cerrar</button></div>
  </fieldset></form>;
}

function EstadoForm({ cita, onCancel, onSaved }: { cita: Cita; onCancel: () => void; onSaved: () => Promise<void> }) {
  const [estado, setEstado] = useState<EstadoCita>(cita.estado === 'PROGRAMADA' ? 'CONFIRMADA' : 'ATENDIDA'), [motivo, setMotivo] = useState('');
  const mutation = useMutation({ mutationFn: () => citasApi.estado(cita.id, { estado, version: cita.updatedAt, ...(estado === 'CANCELADA' ? { motivoCancelacion: motivo.trim() } : {}) }), onSuccess: onSaved });
  return <form className="surface patient-form" onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}><UnsavedChanges dirty={(!!motivo||estado!==(cita.estado==='PROGRAMADA'?'CONFIRMADA':'ATENDIDA'))&&!mutation.isPending&&!mutation.isSuccess}/><h2>Cambiar estado de cita</h2><p>{cita.paciente.nombres} {cita.paciente.apellidos}</p><fieldset disabled={mutation.isPending}>
    <label>Nuevo estado<select value={estado} onChange={(e) => setEstado(e.target.value as EstadoCita)}>{(cita.estado === 'PROGRAMADA' ? ['CONFIRMADA', 'ATENDIDA', 'CANCELADA', 'NO_ASISTIO'] : ['ATENDIDA', 'CANCELADA', 'NO_ASISTIO']).map((s) => <option value={s} key={s}>{etiquetasEstado[s as EstadoCita]}</option>)}</select></label>
    {estado === 'CANCELADA' && <label>Motivo de cancelación<textarea required maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} /></label>}
    {mutation.isError && <p className="form-error" role="alert">{errorMessage(mutation.error)}</p>}<div className="form-actions"><button type="submit" className="primary-button">{mutation.isPending ? 'Guardando…' : 'Guardar estado'}</button><button type="button" className="secondary-button" onClick={()=>{if(confirmDiscard())onCancel();}}>Cerrar</button></div>
  </fieldset></form>;
}

