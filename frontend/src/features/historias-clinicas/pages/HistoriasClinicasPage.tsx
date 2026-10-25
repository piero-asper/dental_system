import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/lib/apiClient';
import { PacienteSelector } from '@/shared/components/PacienteSelector';
import { RequestError } from '@/shared/components/RequestError';
import { historiasApi } from '../api/historiasApi';
import { HistoriaForm } from '../components/HistoriaForm';
import { Evoluciones } from '../components/Evoluciones';
import { Odontograma } from '../components/Odontograma';
import { Auditoria } from '../components/Auditoria';
import { confirmDiscard } from '@/shared/components/UnsavedChanges';

const tabs = ['Antecedentes', 'Evoluciones', 'Odontograma', 'Auditoría'];
export function HistoriasClinicasPage() {
  const [params, setParams] = useSearchParams();
  const pacienteId = params.get('pacienteId') ?? '';
  return <section className="patients-page clinical-page"><header className="module-header"><p className="eyebrow">Atención del paciente</p><h1>Historias clínicas</h1><p>Antecedentes, evoluciones y odontograma con historial de cambios.</p></header>
    <div className="surface patient-form"><PacienteSelector value={pacienteId} onChange={(id) => setParams(id ? { pacienteId: id } : {})} /></div>
    {pacienteId ? <HistoriaPaciente key={pacienteId} pacienteId={pacienteId} citaId={params.get('citaId')??''} initialTab={params.get('tab')==='evoluciones'?1:0} /> : <p className="surface empty-state">Selecciona un paciente para consultar o abrir su historia clínica.</p>}
  </section>;
}
function HistoriaPaciente({ pacienteId,citaId,initialTab }: { pacienteId: string;citaId:string;initialTab:number }) {
  const client = useQueryClient(), [tab, setTab] = useState(initialTab), [saved, setSaved] = useState(false);
  const [reload,setReload]=useState(0);
  const query = useQuery({ queryKey: ['historia-clinica', pacienteId], queryFn: ({ signal }) => historiasApi.obtener(pacienteId, signal), retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false });
  const missing = query.error instanceof ApiError && query.error.status === 404;
  async function refresh() { await Promise.all([client.invalidateQueries({ queryKey: ['historia-clinica', pacienteId] }), client.invalidateQueries({ queryKey: ['auditoria-clinica', pacienteId] }),client.invalidateQueries({queryKey:['evoluciones',pacienteId]}),client.invalidateQueries({queryKey:['odontograma',pacienteId]}),client.invalidateQueries({queryKey:['paciente-resumen-ficha',pacienteId]}),client.invalidateQueries({queryKey:['pacientes']}),client.invalidateQueries({queryKey:['bi']})]); }
  async function onSaved(){setSaved(true);await refresh();}
  return <>{saved && <p className="success-message" role="status">Los datos clínicos se guardaron correctamente.</p>}
    {query.isPending && <p className="surface state-panel" role="status">Cargando historia clínica…</p>}
    {query.isError && !missing && <div className="surface"><RequestError error={query.error} retry={() => { void query.refetch(); }} /></div>}
    {missing && <HistoriaForm pacienteId={pacienteId} onSaved={onSaved} />}
    {query.data && <><div className="clinical-banner surface"><div><p className="eyebrow">Historia del paciente</p><h2>{query.data.paciente.apellidos}, {query.data.paciente.nombres}</h2></div><div className={query.data.alergias?'clinical-alert':'clinical-summary'}><strong>Alergias</strong><p>{query.data.alergias|| (query.data.alergiasRevisadas?'Ninguna reportada':'Sin registrar / pendiente de revisión')}</p></div><div className="clinical-summary"><strong>Medicamentos</strong><p>{query.data.medicamentos||(query.data.medicamentosRevisados?'Ninguno reportado':'Sin registrar / pendiente de revisión')}</p></div></div><div className="section-toolbar"><Link className="text-link" to={`/pacientes/${pacienteId}`}>Ver ficha del paciente</Link><button className="secondary-button" onClick={() => {if(!confirmDiscard())return; setSaved(false); setReload((n)=>n+1); void refresh(); }}>Recargar historia</button></div>
      <div className="clinical-tabs" aria-label="Secciones de historia">{tabs.map((title, i) => <button key={title} className={tab === i ? 'selected' : ''} aria-pressed={tab === i} onClick={() => {if(i!==tab&&!confirmDiscard())return; setTab(i); setSaved(false); }}>{title}</button>)}</div>
      {tab === 0 && <HistoriaForm key={`${query.data.updatedAt}-${reload}`} pacienteId={pacienteId} historia={query.data} onSaved={onSaved} />}
      {tab === 1 && <Evoluciones key={reload} historia={query.data} citaId={citaId} onSaved={onSaved} />}
      {tab === 2 && <Odontograma key={reload} historia={query.data} onSaved={onSaved} />}
      {tab === 3 && <Auditoria pacienteId={pacienteId} />}
    </>}
  </>;
}

