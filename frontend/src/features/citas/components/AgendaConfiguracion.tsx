import { useState } from 'react';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import { agendaApi,Franja } from '../api/agendaApi';
import { addDays,clinicDate,clinicISO,errorMessage,formatDate,formatDateTime } from '@/shared/lib/clinical';
import { RequestError } from '@/shared/components/RequestError';
import { UnsavedChanges } from '@/shared/components/UnsavedChanges';
const dias=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
export function AgendaConfiguracion(){
  const query=useQuery({queryKey:['agenda-configuracion'],queryFn:agendaApi.configuracion,retry:false,refetchOnWindowFocus:false,refetchOnReconnect:false});
  return <section className="surface patient-form"><h2>Horario de atención</h2><p className="field-hint">Configura las franjas que atiende la clínica. Los espacios entre franjas son descansos. Las versiones anteriores se conservan.</p>{query.isPending&&<p>Cargando configuración…</p>}{query.isError&&<RequestError error={query.error} retry={()=>void query.refetch()}/>}{query.data&&<HorarioForm key={query.data[0]?.id??'nuevo'} actual={query.data[0]}/>}
    {!!query.data?.length&&<details><summary>Historial de horarios ({query.data.length})</summary>{query.data.map((v)=><p key={v.id}>Vigente desde {formatDate(`${v.vigenteDesde.slice(0,10)}T12:00:00-05:00`)} · {v.intervalos.length} franjas semanales</p>)}</details>}
    <Bloqueos/>
  </section>;
}
function HorarioForm({actual}:{actual?:{vigenteDesde:string;intervalos:Franja[]}}){
  const client=useQueryClient();const inicial=actual?.intervalos??[1,2,3,4,5].flatMap((dia)=>[{dia,inicio:'08:00',fin:'12:00'},{dia,inicio:'14:00',fin:'18:00'}]);
  const [intervalos,setIntervalos]=useState(inicial),[desde,setDesde]=useState(actual?addDays(clinicDate(),1):clinicDate());
  const [desdeInicial]=useState(desde);
  const mutation=useMutation({mutationFn:()=>agendaApi.guardar(desde,intervalos),onSuccess:async()=>{await client.invalidateQueries({queryKey:['agenda-configuracion']});await client.invalidateQueries({queryKey:['disponibilidad']});}});
  return <form onSubmit={(e)=>{e.preventDefault();mutation.mutate();}}><UnsavedChanges dirty={(desde!==desdeInicial||JSON.stringify(intervalos)!==JSON.stringify(inicial))&&!mutation.isPending&&!mutation.isSuccess}/>
    {!actual&&<p className="notice-warning">Este horario es una propuesta editable. No se aplica hasta guardarlo. Sin configuración no se ofrecen reservas.</p>}
    <label>Vigente desde<input type="date" required min={actual?addDays(clinicDate(),1):clinicDate()} value={desde} onChange={(e)=>setDesde(e.target.value)}/></label>
    <div className="schedule-editor">{[1,2,3,4,5,6,0].map((dia)=><section key={dia}><strong>{dias[dia]}</strong>{intervalos.map((f,index)=>f.dia===dia&&<div className="inline-actions" key={index}><label>Desde<input type="time" required value={f.inicio} onChange={(e)=>setIntervalos(intervalos.map((i,n)=>n===index?{...i,inicio:e.target.value}:i))}/></label><label>Hasta<input type="time" required value={f.fin} onChange={(e)=>setIntervalos(intervalos.map((i,n)=>n===index?{...i,fin:e.target.value}:i))}/></label><button className="text-link" type="button" onClick={()=>setIntervalos(intervalos.filter((_,n)=>n!==index))}>Quitar franja</button></div>)}{!intervalos.some((i)=>i.dia===dia)&&<span className="field-hint">Cerrado</span>}<button type="button" className="text-link" onClick={()=>setIntervalos([...intervalos,{dia,inicio:'09:00',fin:'13:00'}])}>Añadir franja</button></section>)}</div>
    {mutation.isError&&<RequestError error={mutation.error}/>}<div className="form-actions"><button className="primary-button" disabled={mutation.isPending}>{mutation.isPending?'Guardando…':'Guardar horario'}</button></div>
  </form>;
}
function Bloqueos(){
  const client=useQueryClient(),[fecha,setFecha]=useState(clinicDate()),[inicio,setInicio]=useState(`${addDays(clinicDate(),1)}T09:00`),[fin,setFin]=useState(`${addDays(clinicDate(),1)}T10:00`),[motivo,setMotivo]=useState('');
  const query=useQuery({queryKey:['disponibilidad',fecha,30],queryFn:()=>agendaApi.disponibilidad(fecha),retry:false});
  const [baseline,setBaseline]=useState({inicio,fin});
  const guardar=useMutation({mutationFn:()=>agendaApi.bloquear({fechaInicio:clinicISO(inicio),fechaFin:clinicISO(fin),motivo:motivo.trim()}),onSuccess:async()=>{setMotivo('');setBaseline({inicio,fin});setFecha(inicio.slice(0,10));await client.invalidateQueries({queryKey:['disponibilidad']});}});
  const cancelar=useMutation({mutationFn:agendaApi.cancelar,onSuccess:()=>client.invalidateQueries({queryKey:['disponibilidad']})});
  return <section className="schedule-blocks"><h2>Bloqueos y días cerrados</h2><p className="field-hint">Un bloqueo conserva su motivo y no puede desplazar citas existentes.</p><form onSubmit={(e)=>{e.preventDefault();guardar.mutate();}}><UnsavedChanges dirty={(!!motivo||inicio!==baseline.inicio||fin!==baseline.fin)&&!guardar.isPending}/><fieldset disabled={guardar.isPending}><div className="form-grid"><label>Inicio del bloqueo<input type="datetime-local" required value={inicio} onChange={(e)=>setInicio(e.target.value)}/></label><label>Fin del bloqueo<input type="datetime-local" required value={fin} onChange={(e)=>setFin(e.target.value)}/></label><label className="full-width">Motivo del bloqueo<input required maxLength={500} value={motivo} onChange={(e)=>setMotivo(e.target.value)}/></label></div>{guardar.isError&&<p role="alert" className="form-error">{errorMessage(guardar.error)}</p>}<div className="form-actions"><button className="secondary-button" disabled={guardar.isPending}>Crear bloqueo</button></div></fieldset></form>
    <label>Consultar bloqueos del día<input type="date" value={fecha} onChange={(e)=>setFecha(e.target.value)}/></label>{query.isError&&<RequestError error={query.error}/>}{cancelar.isError&&<RequestError error={cancelar.error}/>}
    {query.data?.bloqueos.filter((b)=>!b.canceladoAt).map((b)=><div className="patient-appointment" key={b.id}><div><strong>{b.motivo}</strong><p>{formatDateTime(b.fechaInicio)} — {formatDateTime(b.fechaFin)}</p></div><button type="button" disabled={cancelar.isPending} className="secondary-button" onClick={()=>cancelar.mutate(b)}>Cancelar bloqueo</button></div>)}
  </section>;
}
