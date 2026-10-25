import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RequestError } from '@/shared/components/RequestError';
import { clinicISO,formatDateTime } from '@/shared/lib/clinical';
import { historiasApi } from '../api/historiasApi';

const fieldNames: Record<string, string> = { antecedentes_medicos: 'Antecedentes médicos', alergias: 'Alergias', medicamentos: 'Medicamentos', observaciones: 'Observaciones', diagnostico: 'Diagnóstico', procedimiento: 'Procedimiento', fecha: 'Fecha de atención', pieza: 'Pieza', superficie: 'Superficie', estado: 'Estado',alergias_revisadas:'Alergias revisadas',medicamentos_revisados:'Medicamentos revisados',cita_id:'Cita vinculada',piezas:'Piezas atendidas',motivo_correccion:'Motivo de corrección' };
const tableNames: Record<string, string> = { historias_clinicas: 'Antecedentes', evoluciones_clinicas: 'Evolución clínica', odontograma_piezas: 'Odontograma' };
export function Auditoria({ pacienteId }: { pacienteId: string }) {
  const [pagina, setPagina] = useState(1);
  const [desde,setDesde]=useState(''),[hasta,setHasta]=useState(''),[tabla,setTabla]=useState('');
  const filters={...(desde?{desde:clinicISO(`${desde}T00:00`)}:{}),...(hasta?{hasta:clinicISO(`${hasta}T00:00`)}:{}),...(tabla?{tabla}:{})};
  const query = useQuery({ queryKey: ['auditoria-clinica', pacienteId, pagina,filters], queryFn: ({ signal }) => historiasApi.auditoria(pacienteId, pagina, signal,filters), retry: false, refetchOnWindowFocus: false });
  return <section className="surface clinical-note"><div className="section-toolbar"><h2>Auditoría de cambios</h2><button className="secondary-button" onClick={() => { void query.refetch(); }}>Actualizar auditoría</button></div>
    <div className="patient-search"><label>Desde<input type="date" value={desde} onChange={(e)=>{setDesde(e.target.value);setPagina(1);}}/></label><label>Hasta (sin incluir)<input type="date" value={hasta} onChange={(e)=>{setHasta(e.target.value);setPagina(1);}}/></label><label>Tipo de cambio<select value={tabla} onChange={(e)=>{setTabla(e.target.value);setPagina(1);}}><option value="">Todos</option>{Object.entries(tableNames).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select></label></div>
    {query.isPending && <p role="status">Cargando auditoría…</p>}{query.isError && <RequestError error={query.error} retry={() => { void query.refetch(); }} />}
    {query.data && <><p>{query.data.total} cambios registrados.</p>{query.data.items.map((item) => <details className="audit-item" key={item.id}><summary>{formatDateTime(item.createdAt)} · {tableNames[item.tablaAfectada] ?? item.tablaAfectada} · {item.accion === 'INSERT' ? 'Creación' : 'Modificación'}</summary>
      <p className="field-hint">Responsable: {item.authUserId ? 'cuenta operativa' : 'operación de base de datos sin usuario de aplicación'}</p><div className="table-scroll"><table className="patients-table"><thead><tr><th>Campo</th><th>Valor anterior</th><th>Valor nuevo</th></tr></thead><tbody>{Object.entries(fieldNames).filter(([key]) => key in (item.valorNuevo ?? {}) && (item.accion === 'INSERT' || item.valorAnterior?.[key] !== item.valorNuevo?.[key])).map(([key, title]) => <tr key={key}><th scope="row">{title}</th><td className="preserve-text">{String(item.valorAnterior?.[key] ?? 'Sin registrar')}</td><td className="preserve-text">{String(item.valorNuevo?.[key] ?? 'Sin registrar')}</td></tr>)}</tbody></table></div>
    </details>)}{query.data.totalPaginas > 1 && <nav className="pagination" aria-label="Paginación de auditoría"><button className="secondary-button" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>Anterior</button><span>Página {pagina} de {query.data.totalPaginas}</span><button className="secondary-button" disabled={pagina >= query.data.totalPaginas} onClick={() => setPagina(pagina + 1)}>Siguiente</button></nav>}</>}
  </section>;
}
