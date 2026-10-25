import { FormEvent, useEffect,useRef, useState } from 'react';
import { Link,useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PacienteSelector } from '@/shared/components/PacienteSelector';
import { RequestError } from '@/shared/components/RequestError';
import { addDays, agendaRange, clinicDate, clinicInput, clinicISO, errorMessage, formatTime } from '@/shared/lib/clinical';
import { Cita, citasApi, EstadoCita, estadosCita, etiquetasEstado } from '../api/citasApi';
import { agendaApi } from '../api/agendaApi';
import { AgendaConfiguracion } from '../components/AgendaConfiguracion';
import { AgendaCalendario } from '../components/AgendaCalendario';
import { CitaDetalle } from '../components/CitaDetalle';
import { confirmDiscard,UnsavedChanges } from '@/shared/components/UnsavedChanges';

export function CitasPage() {
  const client = useQueryClient();
  const [params]=useSearchParams();
  const [date, setDate] = useState(/^\d{4}-\d{2}-\d{2}$/.test(params.get('fecha')??'')?params.get('fecha')!:clinicDate()), [week, setWeek] = useState(false), [estado, setEstado] = useState('');
  const [form, setForm] = useState<Cita | 'nueva' | null>(params.get('reservar')?'nueva':null), [action, setAction] = useState<Cita | null>(null), [saved, setSaved] = useState('');
  const [formato,setFormato]=useState('calendario'),[config,setConfig]=useState(false),[slot,setSlot]=useState(''),[detalle,setDetalle]=useState<Cita|null>(null);
  const range = agendaRange(date, week);
  const list = useQuery({ queryKey: ['citas', range.desde, range.hasta, estado], queryFn: ({ signal }) => citasApi.listar(range.desde, range.hasta, estado, signal), retry: false });
  const opened=useRef(false);
  useEffect(()=>{if(!opened.current&&params.get('citaId')&&list.data){const cita=list.data.find((c)=>c.id===params.get('citaId'));if(cita){opened.current=true;setDetalle(cita);}}},[list.data,params]);
  async function refresh(message: string) { setSaved(message); setForm(null); setAction(null);setDetalle(null); await Promise.all([client.invalidateQueries({ queryKey: ['citas'] }),client.invalidateQueries({queryKey:['disponibilidad']}),client.invalidateQueries({queryKey:['paciente-resumen-ficha']}),client.invalidateQueries({queryKey:['paciente-citas']}),client.invalidateQueries({queryKey:['bi']})]); }
  return <section className="patients-page clinical-page">
    <header className="module-header page-header"><div><p className="eyebrow">Agenda de la clínica</p><h1>Citas</h1><p>Agenda única · Hora de Colombia (UTC−5)</p></div><div className="inline-actions"><button className="secondary-button" onClick={()=>{if(confirmDiscard())setConfig(!config);}}>Horario y bloqueos</button><button className="primary-button" onClick={() => {if(!confirmDiscard())return;setSlot('');setDetalle(null);setAction(null); setForm('nueva'); setSaved(''); }}>Reservar cita</button></div></header>
    {config&&<AgendaConfiguracion/>}
    {saved && <p className="success-message" role="status">{saved}</p>}
    <div className="patient-search surface"><label>Fecha<input type="date" required value={date} onChange={(e) => { if (e.target.value) setDate(e.target.value); }} /></label>
      <label>Vista<select value={week ? 'semana' : 'dia'} onChange={(e) => setWeek(e.target.value === 'semana')}><option value="dia">Día</option><option value="semana">Semana</option></select></label>
      <label>Formato<select value={formato} onChange={(e)=>setFormato(e.target.value)}><option value="calendario">Calendario</option><option value="lista">Lista accesible</option></select></label>
      <label>Estado<select value={estado} onChange={(e) => setEstado(e.target.value)}><option value="">Todos</option>{estadosCita.map((s) => <option key={s} value={s}>{etiquetasEstado[s]}</option>)}</select></label>
      <button className="secondary-button" onClick={() => setDate(addDays(date, week ? -7 : -1))}>Anterior</button><button className="secondary-button" onClick={() => setDate(clinicDate())}>Hoy</button><button className="secondary-button" onClick={() => setDate(addDays(date, week ? 7 : 1))}>Siguiente</button>
      <button className="secondary-button" onClick={() => { void list.refetch(); }}>Actualizar</button>
    </div>
    {form && <CitaForm key={typeof form === 'string' ? `nueva-${slot}` : form.id} cita={form === 'nueva' ? undefined : form} date={date} inicioInicial={slot} pacienteInicial={params.get('pacienteId')??''} onCancel={() => {if(confirmDiscard())setForm(null);}} onSaved={() => refresh(form === 'nueva' ? 'Cita reservada.' : 'Cita reprogramada.')} />}
    {detalle&&<CitaDetalle key={detalle.updatedAt} cita={detalle} onClose={()=>setDetalle(null)} onHorario={(c)=>{setDetalle(null);setForm(c);setAction(null);}} onEstado={(c)=>{setDetalle(null);setAction(c);setForm(null);}}/>}
    {action && <EstadoForm key={action.id} cita={action} onCancel={() => setAction(null)} onSaved={() => refresh('Estado de la cita actualizado.')} />}
    {list.isPending && <p className="surface state-panel" role="status">Cargando agenda…</p>}
    {list.isError && <div className="surface"><RequestError error={list.error} retry={() => { void list.refetch(); }} /></div>}
    {list.data && formato==='calendario'&&<AgendaCalendario first={range.first} week={week} citas={list.data} onReservar={(inicio)=>{if(confirmDiscard()){setSlot(inicio);setForm('nueva');setDetalle(null);setAction(null);}}} onDetalle={(c)=>{if(confirmDiscard()){setDetalle(c);setForm(null);setAction(null);}}}/>}
    {list.data && formato==='lista'&& <div className="agenda-days">{Array.from({ length: week ? 7 : 1 }, (_, i) => addDays(range.first, i)).map((day) => {
      const dayStart = new Date(`${day}T00:00:00-05:00`).getTime(), dayEnd = new Date(`${addDays(day, 1)}T00:00:00-05:00`).getTime();
      const items = list.data.filter((c) => new Date(c.fechaInicio).getTime() < dayEnd && new Date(c.fechaFin).getTime() > dayStart);
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

function CitaForm({ cita, date,inicioInicial,pacienteInicial, onCancel, onSaved }: { cita?: Cita; date: string;inicioInicial:string;pacienteInicial:string; onCancel: () => void; onSaved: () => Promise<void> }) {
  const [initialStart]=useState(()=>cita ? clinicInput(cita.fechaInicio) : inicioInicial||`${date}T09:00`);
  const [initialEnd]=useState(()=>cita ? clinicInput(cita.fechaFin):clinicInput(new Date(new Date(clinicISO(initialStart)).getTime()+1800000).toISOString()));
  const [pacienteId, setPaciente] = useState(cita?.pacienteId ?? pacienteInicial), [inicio, setInicio] = useState(initialStart), [fin, setFin] = useState(initialEnd),[duracion,setDuracion]=useState(30);
  const [motivo, setMotivo] = useState(''), [notas, setNotas] = useState(''), [error, setError] = useState('');
  const solicitud=useRef({contenido:'',clave:''});
  const disponibles=useQuery({queryKey:['disponibilidad',inicio.slice(0,10),duracion,cita?.id],enabled:!!inicio,queryFn:()=>agendaApi.disponibilidad(inicio.slice(0,10),duracion,cita?.id),retry:false});
  const mutation = useMutation({ mutationFn: () => {if(cita)return citasApi.reprogramar(cita.id,{fechaInicio:clinicISO(inicio),fechaFin:clinicISO(fin),version:cita.updatedAt});const data={ pacienteId, fechaInicio: clinicISO(inicio), fechaFin: clinicISO(fin), motivo: motivo.trim() || null, notas: notas.trim() || null };const contenido=JSON.stringify(data);if(solicitud.current.contenido!==contenido)solicitud.current={contenido,clave:crypto.randomUUID()};return citasApi.crear({...data,claveSolicitud:solicitud.current.clave});}, onSuccess: onSaved });
  function submit(e: FormEvent) { e.preventDefault(); setError(''); if (!pacienteId) return setError('Selecciona un paciente.'); if (fin <= inicio) return setError('El fin debe ser posterior al inicio.'); mutation.mutate(); }
  return <form className="surface patient-form" onSubmit={submit}><h2>{cita ? 'Reprogramar cita' : 'Nueva cita'}</h2><fieldset disabled={mutation.isPending}>
    <UnsavedChanges dirty={(!!motivo||!!notas||pacienteId!==(cita?.pacienteId??pacienteInicial)||inicio!==initialStart||fin!==initialEnd)&&!mutation.isPending&&!mutation.isSuccess}/>
    {cita ? <p>{cita.paciente.nombres} {cita.paciente.apellidos}</p> : <PacienteSelector value={pacienteId} onChange={setPaciente} activos />}
    <div className="form-grid"><label>Inicio<input type="datetime-local" required value={inicio} onChange={(e) => {setInicio(e.target.value);if(e.target.value)setFin(clinicInput(new Date(new Date(clinicISO(e.target.value)).getTime()+duracion*60000).toISOString()));}} /></label><label>Fin<input type="datetime-local" required value={fin} onChange={(e) => setFin(e.target.value)} /></label>
      <label>Duración rápida<select value={duracion} onChange={(e)=>{const n=Number(e.target.value);setDuracion(n);if(inicio)setFin(clinicInput(new Date(new Date(clinicISO(inicio)).getTime()+n*60000).toISOString()));}}>{[15,30,45,60,90,120].map((n)=><option key={n} value={n}>{n} minutos</option>)}</select></label>
      <label>Franjas disponibles<select value="" onChange={(e)=>{if(e.target.value){setInicio(clinicInput(e.target.value));setFin(clinicInput(new Date(new Date(e.target.value).getTime()+duracion*60000).toISOString()));}}}><option value="">Selecciona un horario libre</option>{disponibles.data?.franjas.map((f)=><option key={f.inicio} value={f.inicio}>{formatTime(f.inicio)} — {formatTime(f.fin)}</option>)}</select></label>
      {!cita && <><label>Motivo<input maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} /></label><label>Notas<textarea maxLength={2000} value={notas} onChange={(e) => setNotas(e.target.value)} /></label></>}
    </div><p className="field-hint">Horarios en Colombia (UTC−5). Se comprueba la disponibilidad nuevamente al guardar.</p>{disponibles.isError&&<RequestError error={disponibles.error} retry={()=>void disponibles.refetch()}/>}{disponibles.data&&!disponibles.data.configurada&&<p className="notice-warning">Configura el horario de atención desde “Horario y bloqueos” antes de reservar.</p>}{(error || mutation.isError) && <p className="form-error" role="alert">{error || errorMessage(mutation.error)}</p>}
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

