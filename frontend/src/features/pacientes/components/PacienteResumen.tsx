import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';
import { clinicDate,formatDateTime } from '@/shared/lib/clinical';
import { RequestError } from '@/shared/components/RequestError';
import { etiquetasEstado,EstadoCita } from '@/features/citas/api/citasApi';
type CitaResumen={id:string;fechaInicio:string;fechaFin:string;estado:EstadoCita;motivo:string|null};
type Resumen={ultima:CitaResumen|null;proxima:CitaResumen|null;tieneHistoria:boolean;totalCitas:number};
export function PacienteResumen({id}:{id:string}){
  const [pagina,setPagina]=useState(1);
  const resumen=useQuery({queryKey:['paciente-resumen-ficha',id],queryFn:()=>apiClient<Resumen>(`/pacientes/${id}/resumen`),retry:false});
  const citas=useQuery({queryKey:['paciente-citas',id,pagina],queryFn:()=>apiClient<{items:CitaResumen[];totalPaginas:number;total:number}>(`/pacientes/${id}/citas?pagina=${pagina}&tamanoPagina=10`),retry:false});
  return <>
    <div className="summary-grid">{resumen.data && <>
      <div className="surface summary-card"><span>Última atención</span><strong>{resumen.data.ultima ? formatDateTime(resumen.data.ultima.fechaInicio):'Sin atenciones'}</strong></div>
      <div className="surface summary-card"><span>Próxima cita</span><strong>{resumen.data.proxima ? formatDateTime(resumen.data.proxima.fechaInicio):'Sin cita programada'}</strong></div>
      <div className="surface summary-card"><span>Historia clínica</span><strong>{resumen.data.tieneHistoria?'Abierta':'Pendiente de abrir'}</strong></div>
    </>}</div>
    {resumen.isError && <RequestError error={resumen.error} retry={()=>void resumen.refetch()}/>}
    <div className="form-actions"><Link className="primary-button button-icon" to={`/citas?pacienteId=${id}&reservar=1`}>Reservar cita</Link><Link className="secondary-button" to={`/historias-clinicas?pacienteId=${id}`}>Abrir historia clínica</Link></div>
    <section className="surface clinical-note"><div className="section-toolbar"><h2>Citas del paciente</h2><span>{citas.data?.total??0} registros</span></div>
      {citas.isPending && <p role="status">Cargando citas…</p>}{citas.isError && <RequestError error={citas.error} retry={()=>void citas.refetch()}/>}
      {citas.data?.items.length===0 && <p className="empty-state">Aún no hay citas registradas.</p>}
      {citas.data?.items.map((c)=><article className="patient-appointment" key={c.id}><div><strong>{formatDateTime(c.fechaInicio)}</strong><p>{c.motivo||'Sin motivo registrado'}</p></div><span className={`status-badge cita-${c.estado.toLowerCase()}`}>{etiquetasEstado[c.estado]}</span><Link className="text-link" to={`/citas?fecha=${clinicDate(c.fechaInicio)}&citaId=${c.id}`}>Ver cita</Link></article>)}
      {(citas.data?.totalPaginas??0)>1 && <nav className="pagination"><button className="secondary-button" disabled={pagina===1} onClick={()=>setPagina(pagina-1)}>Anterior</button><span>Página {pagina} de {citas.data?.totalPaginas}</span><button className="secondary-button" disabled={pagina>=citas.data!.totalPaginas} onClick={()=>setPagina(pagina+1)}>Siguiente</button></nav>}
    </section>
  </>;
}
