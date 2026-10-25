import { useState } from 'react';
import { useMutation,useQuery } from '@tanstack/react-query';
import { errorMessage } from '@/shared/lib/clinical';
import { estadosDentales, Historia, historiasApi, label, Pieza, superficies } from '../api/historiasApi';
import { confirmDiscard,UnsavedChanges } from '@/shared/components/UnsavedChanges';
import { RequestError } from '@/shared/components/RequestError';
import { formatDateTime } from '@/shared/lib/clinical';

const rows = [
  { title: 'Permanentes · arcada superior', teeth: ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'] },
  { title: 'Permanentes · arcada inferior', teeth: ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'] },
  { title: 'Temporales · arcada superior', teeth: ['55','54','53','52','51','61','62','63','64','65'] },
  { title: 'Temporales · arcada inferior', teeth: ['85','84','83','82','81','71','72','73','74','75'] }
];
export function Odontograma({ historia, onSaved }: { historia: Historia; onSaved: () => Promise<void> }) {
  const [pieza, setPieza] = useState('11'), [superficie, setSuperficie] = useState('GENERAL');
  const [vista,setVista]=useState('mixta');
  const query=useQuery({queryKey:['odontograma',historia.pacienteId],queryFn:()=>historiasApi.odontograma(historia.pacienteId),retry:false,refetchOnWindowFocus:false,refetchOnReconnect:false});
  const registros=query.data??[];
  const records = registros.filter((p) => p.pieza === pieza);
  const existing = records.find((p) => (p.superficie ?? 'GENERAL') === superficie);
  return <><div className="surface odontogram"><h2>Odontograma FDI</h2><p className="field-hint">Vista desde el paciente frente al profesional. Derecha del paciente a la izquierda. Selecciona una pieza y su superficie.</p>
    <label>Dentición<select value={vista} onChange={(e)=>{if(confirmDiscard()){setVista(e.target.value);setPieza(e.target.value==='temporal'?'51':'11');setSuperficie('GENERAL');}}}><option value="mixta">Mixta: permanentes y temporales</option><option value="permanente">Permanente</option><option value="temporal">Temporal</option></select></label>
    {query.isPending&&<p role="status">Cargando odontograma…</p>}{query.isError&&<RequestError error={query.error} retry={()=>void query.refetch()}/>}
    <div className="odontogram-legend"><span className="tooth-legend unexamined">Sin evaluar</span><span className="tooth-legend healthy">General sano</span><span className="tooth-legend partial">Registro parcial</span><span className="tooth-legend finding">Con hallazgos</span><span className="tooth-legend absent">Ausente</span></div>
    <div className="odontogram-scroll">{rows.filter((r)=>vista==='mixta'||(vista==='temporal'?r.title.startsWith('Temporales'):r.title.startsWith('Permanentes'))).map((row) => <div key={row.title}><h3>{row.title}</h3><div className="tooth-row">{row.teeth.map((tooth) => {
      const found = registros.filter((p) => p.pieza === tooth);
      const general = found.find((p) => !p.superficie || p.superficie === 'GENERAL');
      const state = !found.length ? 'unexamined' : general?.estado === 'AUSENTE' ? 'absent' : found.every((p) => p.estado === 'SANO') ? (general ? 'healthy' : 'partial') : 'finding';
      const description = !found.length ? 'sin evaluar' : general?.estado === 'AUSENTE' ? 'ausente' : found.map((p) => `${label(p.superficie ?? 'GENERAL')}: ${label(p.estado)}`).join(', ');
      return <button type="button" key={tooth} className={`tooth ${state}`} aria-label={`Pieza ${tooth}: ${description}`} aria-pressed={pieza === tooth} onClick={() => {if(!confirmDiscard())return; setPieza(tooth); setSuperficie('GENERAL'); }}><svg className="tooth-svg" viewBox="0 0 60 70" aria-hidden="true"><path d="M12 10 Q20 2 30 8 Q40 2 48 10 Q55 20 45 40 L39 63 Q35 68 31 44 Q27 68 22 63 L15 40 Q5 20 12 10Z"/><path d="M17 18 Q30 26 43 18 M30 26 L30 37"/><text x="30" y="30" textAnchor="middle">{state==='absent'?'×':state==='finding'?'!':found.length?'•':''}</text></svg><strong>{tooth}</strong></button>;
    })}</div></div>)}</div><p className="field-hint">Una pieza sin registros está sin evaluar. Un registro sano en una superficie no evalúa las demás.</p>
  </div><section className="surface patient-form"><h2>Pieza {pieza}</h2><Superficies pieza={pieza} superficie={superficie} records={records} seleccionar={(s)=>{if(confirmDiscard())setSuperficie(s);}}/><label>Superficie<select value={superficie} onChange={(e) => {if(confirmDiscard())setSuperficie(e.target.value);}}>{superficies.filter((s)=>s!=='OCLUSAL' || Number(pieza[1])>=4).filter((s)=>s!=='INCISAL'||Number(pieza[1])<=3).filter((s)=>s!=='PALATINA'||['1','2','5','6'].includes(pieza[0])).filter((s)=>s!=='LINGUAL'||['3','4','7','8'].includes(pieza[0])).map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></label>
    <PiezaForm key={`${pieza}-${superficie}-${existing?.updatedAt ?? 'nueva'}`} pacienteId={historia.pacienteId} pieza={pieza} superficie={superficie} existing={existing} onSaved={onSaved} />
    {!!records.length && <div className="piece-findings"><h3>Registros de esta pieza</h3>{records.map((p) => <p key={p.id}><strong>{label(p.superficie ?? 'GENERAL')}: {label(p.estado)}</strong>{p.observaciones && <span className="preserve-text"> · {p.observaciones}</span>}</p>)}</div>}
    <HistorialPieza key={pieza} pacienteId={historia.pacienteId} pieza={pieza}/>
  </section></>;
}
function PiezaForm({ pacienteId, pieza, superficie, existing, onSaved }: { pacienteId: string; pieza: string; superficie: string; existing?: Pieza; onSaved: () => Promise<void> }) {
  const [estado, setEstado] = useState(existing?.estado ?? ''), [observaciones, setObservaciones] = useState(existing?.observaciones ?? '');
  const mutation = useMutation({ mutationFn: () => existing ? historiasApi.editarPieza(pacienteId, existing.id, { estado, observaciones: observaciones.trim() || null, version: existing.updatedAt }) : historiasApi.pieza(pacienteId, { pieza, superficie, estado, observaciones: observaciones.trim() || null }), onSuccess: onSaved });
  return <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}><fieldset disabled={mutation.isPending}><div className="form-grid"><label>Estado dental<select value={estado} required onChange={(e) => setEstado(e.target.value)}><option value="" disabled>Selecciona un estado</option>{estadosDentales.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></label><label>Observaciones de la pieza<textarea rows={3} maxLength={5000} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} /></label></div>
    <UnsavedChanges dirty={(estado!==(existing?.estado??'')||observaciones!==(existing?.observaciones??''))&&!mutation.isPending&&!mutation.isSuccess}/>
    {mutation.isError && <p className="form-error" role="alert">{errorMessage(mutation.error)}</p>}<div className="form-actions"><button type="submit" className="primary-button">{mutation.isPending ? 'Guardando…' : existing ? 'Actualizar hallazgo' : 'Registrar hallazgo'}</button></div>
  </fieldset></form>;
}
function Superficies({pieza,superficie,records,seleccionar}:{pieza:string;superficie:string;records:Pieza[];seleccionar:(s:string)=>void}){
  const centro=Number(pieza[1])<=3?'INCISAL':'OCLUSAL',interior=['1','2','5','6'].includes(pieza[0])?'PALATINA':'LINGUAL',mesialDerecha=['1','4','5','8'].includes(pieza[0]);
  const areas=[{s:'VESTIBULAR',d:'M5 5 H95 L70 30 H30Z'},{s:interior,d:'M5 95 H95 L70 70 H30Z'},{s:mesialDerecha?'DISTAL':'MESIAL',d:'M5 5 L30 30 V70 L5 95Z'},{s:mesialDerecha?'MESIAL':'DISTAL',d:'M95 5 L70 30 V70 L95 95Z'},{s:centro,d:'M30 30 H70 V70 H30Z'}];
  return <div className="surface-selector"><svg viewBox="0 0 100 100" role="group" aria-label={`Superficies de la pieza ${pieza}`}>{areas.map(({s,d})=>{const estado=records.find((p)=>p.superficie===s)?.estado;return <g key={s} role="button" tabIndex={0} aria-label={`Seleccionar ${label(s)}`} aria-pressed={s===superficie} onClick={()=>seleccionar(s)} onKeyDown={(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();seleccionar(s);}}}><path d={d} className={`${s===superficie?'selected ':''}${estado==='SANO'?'healthy':estado?'finding':'unexamined'}`}/><title>{label(s)}: {estado?label(estado):'Sin evaluar'}</title></g>;})}</svg><div><strong>{label(superficie)}</strong><p>Selecciona una superficie del esquema o usa la lista. General se aplica a la pieza completa.</p></div></div>;
}
function HistorialPieza({pacienteId,pieza}:{pacienteId:string;pieza:string}){
  const [abierto,setAbierto]=useState(false),[pagina,setPagina]=useState(1);
  const query=useQuery({queryKey:['auditoria-clinica',pacienteId,'pieza',pieza,pagina],enabled:abierto,queryFn:()=>historiasApi.auditoria(pacienteId,pagina,undefined,{pieza}),retry:false});
  return <details onToggle={(e)=>setAbierto(e.currentTarget.open)}><summary>Historial de la pieza {pieza}</summary>{query.isError&&<RequestError error={query.error}/>} {query.data?.items.map((item)=><p key={item.id}>{formatDateTime(item.createdAt)} · {label(String(item.valorNuevo?.superficie??'GENERAL'))}: {String(item.valorAnterior?.estado??'Sin evaluar')} → {String(item.valorNuevo?.estado??'Sin registrar')}</p>)}{query.data?.total===0&&<p>Sin cambios registrados.</p>}{(query.data?.totalPaginas??0)>1&&<div className="pagination"><button className="secondary-button" disabled={pagina===1} onClick={()=>setPagina(pagina-1)}>Anterior</button><span>{pagina} / {query.data?.totalPaginas}</span><button className="secondary-button" disabled={pagina>=query.data!.totalPaginas} onClick={()=>setPagina(pagina+1)}>Siguiente</button></div>}</details>;
}
