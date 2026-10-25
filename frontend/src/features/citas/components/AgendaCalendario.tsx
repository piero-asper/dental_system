import { useEffect,useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Cita,etiquetasEstado } from '../api/citasApi';
import { agendaApi } from '../api/agendaApi';
import { addDays,clinicDate,clinicInput,formatTime } from '@/shared/lib/clinical';
export function AgendaCalendario({first,week,citas,onReservar,onDetalle}:{first:string;week:boolean;citas:Cita[];onReservar:(inicio:string)=>void;onDetalle:(cita:Cita)=>void}){
  return <div className="calendar-scroll"><div className="calendar-grid" style={{gridTemplateColumns:`repeat(${week?7:1}, minmax(180px, 1fr))`}}>{Array.from({length:week?7:1},(_,i)=>addDays(first,i)).map((fecha)=>{
    const inicio=new Date(`${fecha}T00:00:00-05:00`),fin=new Date(`${addDays(fecha,1)}T00:00:00-05:00`);
    return <Dia key={fecha} fecha={fecha} citas={citas.filter((c)=>new Date(c.fechaInicio)<fin&&new Date(c.fechaFin)>inicio)} onReservar={onReservar} onDetalle={onDetalle}/>;
  })}</div></div>;
}
function Dia({fecha,citas,onReservar,onDetalle}:{fecha:string;citas:Cita[];onReservar:(inicio:string)=>void;onDetalle:(cita:Cita)=>void}){
  const query=useQuery({queryKey:['disponibilidad',fecha,30],queryFn:()=>agendaApi.disponibilidad(fecha),retry:false});
  const [now,setNow]=useState(new Date());useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(timer);},[]);
  const horas=[...citas.map((c)=>Number(clinicInput(c.fechaInicio).slice(11,13))),...(query.data?.intervalos??[]).map((i)=>Number(clinicInput(i.inicio).slice(11,13)))];
  const desde=Math.min(7,...horas),hasta=Math.max(20,...citas.map((c)=>clinicDate(c.fechaFin)>fecha?24:Number(clinicInput(c.fechaFin).slice(11,13))+1),...(query.data?.intervalos??[]).map((i)=>Number(clinicInput(i.fin).slice(11,13))+1));
  const minutos=(iso:string)=>{const local=clinicInput(iso);return clinicDate(iso)<fecha?0:clinicDate(iso)>fecha?1440:Number(local.slice(11,13))*60+Number(local.slice(14,16));};
  return <section className="calendar-day surface"><h2>{new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',weekday:'short',day:'numeric',month:'short'}).format(new Date(`${fecha}T12:00:00-05:00`))}</h2>
    {query.data&&!query.data.configurada&&<p className="field-hint">Configura el horario para ofrecer franjas libres.</p>}
    <div className="calendar-track" style={{height:(hasta-desde)*60}}>
      {Array.from({length:hasta-desde},(_,n)=>desde+n).map((h)=><div key={h} className="calendar-hour" style={{top:(h-desde)*60}}><span>{String(h).padStart(2,'0')}:00</span></div>)}
      {query.data?.franjas.filter((f)=>new Date(f.inicio)>=now&&minutos(f.inicio)%30===0).map((f)=><button type="button" key={f.inicio} title={`Reservar ${formatTime(f.inicio)}`} aria-label={`Reservar el ${fecha} a las ${formatTime(f.inicio)}`} className="calendar-free" style={{top:minutos(f.inicio)-desde*60,height:28}} onClick={()=>onReservar(clinicInput(f.inicio))}>+ {formatTime(f.inicio)}</button>)}
      {citas.filter((c)=>c.estado!=='CANCELADA').map((c)=><button type="button" className={`calendar-appointment cita-${c.estado.toLowerCase()}`} style={{top:Math.max(0,minutos(c.fechaInicio)-desde*60),height:Math.max(30,minutos(c.fechaFin)-Math.max(minutos(c.fechaInicio),desde*60))}} key={c.id} onClick={()=>onDetalle(c)}><strong>{formatTime(c.fechaInicio)} · {c.paciente.apellidos}, {c.paciente.nombres}</strong><span>{etiquetasEstado[c.estado]}</span><small>{c.motivo||'Sin motivo registrado'}</small></button>)}
      {clinicDate(now.toISOString())===fecha&&minutos(now.toISOString())>=desde*60&&minutos(now.toISOString())<=hasta*60&&<div className="calendar-now" style={{top:minutos(now.toISOString())-desde*60}} aria-label="Hora actual"/>}
    </div>
    {citas.some((c)=>c.estado==='CANCELADA')&&<div className="calendar-cancelled"><h3>Citas canceladas</h3>{citas.filter((c)=>c.estado==='CANCELADA').map((c)=><p key={c.id}><button type="button" className="secondary-button" onClick={()=>onDetalle(c)}>{formatTime(c.fechaInicio)} · {c.paciente.apellidos}, {c.paciente.nombres} · Cancelada</button></p>)}</div>}
  </section>;
}
