import { KeyboardEvent, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { errorMessage, formatDateTime } from '@/shared/lib/clinical';
import { estadosDentales, Historia, historiasApi, label, Pieza, superficies } from '../api/historiasApi';
import { confirmDiscard, UnsavedChanges } from '@/shared/components/UnsavedChanges';
import { RequestError } from '@/shared/components/RequestError';

type Denticion = 'permanente' | 'temporal' | 'mixta';
type Arcada = { id: string; title: string; teeth: string[]; denticion: Exclude<Denticion, 'mixta'>; posicion: 'superior' | 'inferior' };

const arcadas: Arcada[] = [
  { id: 'permanente-superior', title: 'Arcada superior permanente', teeth: ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'], denticion: 'permanente', posicion: 'superior' },
  { id: 'permanente-inferior', title: 'Arcada inferior permanente', teeth: ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'], denticion: 'permanente', posicion: 'inferior' },
  { id: 'temporal-superior', title: 'Arcada superior temporal', teeth: ['55', '54', '53', '52', '51', '61', '62', '63', '64', '65'], denticion: 'temporal', posicion: 'superior' },
  { id: 'temporal-inferior', title: 'Arcada inferior temporal', teeth: ['85', '84', '83', '82', '81', '71', '72', '73', '74', '75'], denticion: 'temporal', posicion: 'inferior' }
];

export function Odontograma({ historia, onSaved }: { historia: Historia; onSaved: () => Promise<void> }) {
  const [pieza, setPieza] = useState('11');
  const [superficie, setSuperficie] = useState('GENERAL');
  const [vista, setVista] = useState<Denticion>('permanente');
  const query = useQuery({ queryKey: ['odontograma', historia.pacienteId], queryFn: () => historiasApi.odontograma(historia.pacienteId), retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false });
  const registros = query.data ?? [];
  const records = registros.filter((registro) => registro.pieza === pieza);
  const existing = records.find((registro) => (registro.superficie ?? 'GENERAL') === superficie);

  function seleccionarPieza(nuevaPieza: string) { if (!confirmDiscard()) return; setPieza(nuevaPieza); setSuperficie('GENERAL'); }
  function cambiarVista(value: Denticion) { if (!confirmDiscard()) return; setVista(value); setPieza(value === 'temporal' ? '51' : '11'); setSuperficie('GENERAL'); }

  return <>
    <section className="surface odontogram" aria-labelledby="odontograma-title">
      <div className="section-toolbar odontogram-heading"><div><p className="eyebrow">Registro por pieza y superficie</p><h2 id="odontograma-title">Odontograma FDI</h2></div><label className="odontogram-dentition">Dentición<select value={vista} onChange={(event) => cambiarVista(event.target.value as Denticion)}><option value="permanente">Permanente · 32 piezas</option><option value="temporal">Temporal · 20 piezas</option><option value="mixta">Mixta · ambas denticiones</option></select></label></div>
      <p className="field-hint">Vista del paciente frente al profesional: el lado derecho del paciente aparece a la izquierda del esquema. Selecciona una pieza para registrar o consultar sus superficies.</p>
      <div className="odontogram-legend" aria-label="Leyenda del odontograma"><span className="tooth-legend unexamined">Sin evaluar</span><span className="tooth-legend healthy">Sano</span><span className="tooth-legend partial">Registro parcial</span><span className="tooth-legend finding">Con hallazgo</span><span className="tooth-legend absent">Ausente</span></div>
      {query.isPending && <p role="status">Cargando odontograma…</p>}{query.isError && <RequestError error={query.error} retry={() => void query.refetch()} />}
      <div className="odontogram-arches">{arcadas.filter((arcada) => vista === 'mixta' || arcada.denticion === vista).map((arcada) => <ArcadaVisual key={arcada.id} arcada={arcada} registros={registros} piezaSeleccionada={pieza} seleccionar={seleccionarPieza} />)}</div>
      <p className="field-hint">Paladar y lengua orientan la vista anatómica. Los hallazgos se registran únicamente en piezas y superficies; una pieza sin registros sigue sin evaluar.</p>
    </section>
    <section className="workflow-guide odontogram-workflow" aria-label="Flujo clínico del odontograma"><div><strong>1. Hallazgo</strong><p>Registra el estado de la pieza o superficie en la historia clínica.</p></div><div><strong>2. Atención</strong><p>Relaciona las piezas atendidas en la evolución y, si aplica, con la cita.</p></div><div><strong>3. Tratamiento</strong><p>Usa la misma numeración FDI al crear un presupuesto o tratamiento.</p></div></section>
    <section className="surface patient-form odontogram-detail" aria-labelledby="pieza-title"><div className="section-toolbar"><div><p className="eyebrow">Pieza seleccionada</p><h2 id="pieza-title">Pieza {pieza}</h2></div><span className="odontogram-piece-state">{descripcionPieza(records)}</span></div><Superficies pieza={pieza} superficie={superficie} records={records} seleccionar={(nuevaSuperficie) => { if (confirmDiscard()) setSuperficie(nuevaSuperficie); }} /><label>Superficie<select value={superficie} onChange={(event) => { if (confirmDiscard()) setSuperficie(event.target.value); }}>{superficies.filter((item) => superficieDisponible(item, pieza)).map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label><PiezaForm key={`${pieza}-${superficie}-${existing?.updatedAt ?? 'nueva'}`} pacienteId={historia.pacienteId} pieza={pieza} superficie={superficie} existing={existing} onSaved={onSaved} />{!!records.length && <div className="piece-findings"><h3>Registros de esta pieza</h3>{records.map((registro) => <p key={registro.id}><strong>{label(registro.superficie ?? 'GENERAL')}: {label(registro.estado)}</strong>{registro.observaciones && <span className="preserve-text"> · {registro.observaciones}</span>}</p>)}</div>}<HistorialPieza key={pieza} pacienteId={historia.pacienteId} pieza={pieza} /></section>
  </>;
}

function ArcadaVisual({ arcada, registros, piezaSeleccionada, seleccionar }: { arcada: Arcada; registros: Pieza[]; piezaSeleccionada: string; seleccionar: (pieza: string) => void }) {
  return <section className={`odontogram-arch odontogram-arch-${arcada.posicion}`} aria-labelledby={`${arcada.id}-title`}><h3 id={`${arcada.id}-title`}>{arcada.title}</h3><svg className="odontogram-mouth" viewBox="0 0 220 145" role="group" aria-label={arcada.title}>
    {arcada.posicion === 'superior' ? <><path className="odontogram-palate" d="M56 109 C57 52 78 17 110 17 C142 17 163 52 164 109 C148 100 133 96 110 96 C87 96 72 100 56 109Z" /><path className="odontogram-palate-lines" d="M110 23 V88 M110 38 L83 63 M110 38 L137 63 M110 52 L76 78 M110 52 L144 78" /><text className="odontogram-anatomy-label" x="110" y="82">Paladar</text></> : <><path className="odontogram-tongue" d="M79 34 C81 104 91 129 110 129 C129 129 139 104 141 34 C126 46 94 46 79 34Z" /><path className="odontogram-tongue-line" d="M110 49 V114" /><text className="odontogram-anatomy-label" x="110" y="91">Lengua</text></>}
    <line className="odontogram-midline" x1="110" x2="110" y1={arcada.posicion === 'superior' ? '8' : '34'} y2={arcada.posicion === 'superior' ? '102' : '137'} />
    {arcada.teeth.map((tooth, index) => <PiezaVisual key={tooth} tooth={tooth} index={index} total={arcada.teeth.length} posicion={arcada.posicion} registros={registros.filter((registro) => registro.pieza === tooth)} selected={piezaSeleccionada === tooth} seleccionar={seleccionar} />)}
  </svg></section>;
}

function PiezaVisual({ tooth, index, total, posicion, registros, selected, seleccionar }: { tooth: string; index: number; total: number; posicion: Arcada['posicion']; registros: Pieza[]; selected: boolean; seleccionar: (pieza: string) => void }) {
  const point = posicionPieza(index, total, posicion); const state = estadoPieza(registros); const description = descripcionPieza(registros);
  function activar(event: KeyboardEvent<SVGGElement>) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); seleccionar(tooth); } }
  return <g className={`odontogram-tooth ${estadoTipo(tooth)} ${state} ${selected ? 'selected' : ''}`} transform={`translate(${point.x} ${point.y})`} role="button" tabIndex={0} aria-label={`Pieza ${tooth}: ${description}`} aria-pressed={selected} onClick={() => seleccionar(tooth)} onKeyDown={activar}><title>Pieza {tooth}: {description}</title><path d={formaPieza(tooth)} /><path className="odontogram-tooth-groove" d={surcoPieza(tooth)} />{state === 'absent' && <text className="odontogram-tooth-mark" x="0" y="5">×</text>}{state === 'finding' && <circle className="odontogram-tooth-mark" cx="0" cy="0" r="3" />}{state === 'partial' && <circle className="odontogram-tooth-mark" cx="0" cy="0" r="2.5" />}<text className="odontogram-tooth-number" x="0" y={posicion === 'superior' ? '-16' : '22'}>{tooth}</text></g>;
}

function posicionPieza(index: number, total: number, posicion: Arcada['posicion']) { const progress = index / (total - 1); const x = 18 + (184 * progress); const arc = Math.sin(Math.PI * progress); return { x, y: posicion === 'superior' ? 112 - (94 * arc) : 33 + (94 * arc) }; }
function estadoPieza(registros: Pieza[]) { const general = registros.find((registro) => !registro.superficie || registro.superficie === 'GENERAL'); if (!registros.length) return 'unexamined'; if (general?.estado === 'AUSENTE') return 'absent'; if (registros.every((registro) => registro.estado === 'SANO')) return general ? 'healthy' : 'partial'; return 'finding'; }
function descripcionPieza(registros: Pieza[]) { if (!registros.length) return 'sin evaluar'; if (registros.some((registro) => (!registro.superficie || registro.superficie === 'GENERAL') && registro.estado === 'AUSENTE')) return 'ausente'; return registros.map((registro) => `${label(registro.superficie ?? 'GENERAL')}: ${label(registro.estado)}`).join(', '); }
function estadoTipo(tooth: string) { const digit = Number(tooth[1]); return digit <= 2 ? 'incisor' : digit === 3 ? 'canine' : digit <= 5 ? 'premolar' : 'molar'; }
function formaPieza(tooth: string) { const kind = estadoTipo(tooth); if (kind === 'incisor') return 'M-6-10 Q0-14 6-10 L7 4 Q5 12 0 13 Q-5 12-7 4Z'; if (kind === 'canine') return 'M-6-7 L0-14 L6-7 L7 5 Q4 13 0 14 Q-4 13-7 5Z'; if (kind === 'premolar') return 'M-9-7 Q-4-14 0-9 Q4-14 9-7 L8 6 Q4 13 0 11 Q-4 13-8 6Z'; return 'M-11-7 Q-7-14-3-10 Q0-15 3-10 Q7-14 11-7 L10 7 Q6 14 0 12 Q-6 14-10 7Z'; }
function surcoPieza(tooth: string) { return estadoTipo(tooth) === 'molar' ? 'M-6-3 Q0 3 6-3 M-5 5 Q0 1 5 5' : 'M-3 0 Q0 3 3 0'; }
function superficieDisponible(item: string, pieza: string) { return !((item === 'OCLUSAL' && Number(pieza[1]) < 4) || (item === 'INCISAL' && Number(pieza[1]) > 3) || (item === 'PALATINA' && !['1', '2', '5', '6'].includes(pieza[0])) || (item === 'LINGUAL' && !['3', '4', '7', '8'].includes(pieza[0]))); }

function PiezaForm({ pacienteId, pieza, superficie, existing, onSaved }: { pacienteId: string; pieza: string; superficie: string; existing?: Pieza; onSaved: () => Promise<void> }) {
  const [estado, setEstado] = useState(existing?.estado ?? ''); const [observaciones, setObservaciones] = useState(existing?.observaciones ?? '');
  const mutation = useMutation({ mutationFn: () => existing ? historiasApi.editarPieza(pacienteId, existing.id, { estado, observaciones: observaciones.trim() || null, version: existing.updatedAt }) : historiasApi.pieza(pacienteId, { pieza, superficie, estado, observaciones: observaciones.trim() || null }), onSuccess: onSaved });
  return <form onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}><fieldset disabled={mutation.isPending}><div className="form-grid"><label>Estado dental<select value={estado} required onChange={(event) => setEstado(event.target.value)}><option value="" disabled>Selecciona un estado</option>{estadosDentales.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label><label>Observaciones de la pieza<textarea rows={3} maxLength={5000} value={observaciones} onChange={(event) => setObservaciones(event.target.value)} /></label></div><UnsavedChanges dirty={(estado !== (existing?.estado ?? '') || observaciones !== (existing?.observaciones ?? '')) && !mutation.isPending && !mutation.isSuccess} />{mutation.isError && <p className="form-error" role="alert">{errorMessage(mutation.error)}</p>}<div className="form-actions"><button type="submit" className="primary-button">{mutation.isPending ? 'Guardando…' : existing ? 'Actualizar hallazgo' : 'Registrar hallazgo'}</button></div></fieldset></form>;
}

function Superficies({ pieza, superficie, records, seleccionar }: { pieza: string; superficie: string; records: Pieza[]; seleccionar: (superficie: string) => void }) {
  const centro = Number(pieza[1]) <= 3 ? 'INCISAL' : 'OCLUSAL'; const interior = ['1', '2', '5', '6'].includes(pieza[0]) ? 'PALATINA' : 'LINGUAL'; const mesialDerecha = ['1', '4', '5', '8'].includes(pieza[0]);
  const areas = [{ s: 'VESTIBULAR', d: 'M5 5 H95 L70 30 H30Z' }, { s: interior, d: 'M5 95 H95 L70 70 H30Z' }, { s: mesialDerecha ? 'DISTAL' : 'MESIAL', d: 'M5 5 L30 30 V70 L5 95Z' }, { s: mesialDerecha ? 'MESIAL' : 'DISTAL', d: 'M95 5 L70 30 V70 L95 95Z' }, { s: centro, d: 'M30 30 H70 V70 H30Z' }];
  return <div className="surface-selector"><svg viewBox="0 0 100 100" role="group" aria-label={`Superficies de la pieza ${pieza}`}>{areas.map(({ s, d }) => { const estado = records.find((registro) => registro.superficie === s)?.estado; return <g key={s} role="button" tabIndex={0} aria-label={`Seleccionar ${label(s)}`} aria-pressed={s === superficie} onClick={() => seleccionar(s)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); seleccionar(s); } }}><path d={d} className={`${s === superficie ? 'selected ' : ''}${estado === 'SANO' ? 'healthy' : estado ? 'finding' : 'unexamined'}`} /><title>{label(s)}: {estado ? label(estado) : 'Sin evaluar'}</title></g>; })}</svg><div><strong>{label(superficie)}</strong><p>Selecciona una superficie del esquema o usa la lista. General se aplica a la pieza completa.</p></div></div>;
}

function HistorialPieza({ pacienteId, pieza }: { pacienteId: string; pieza: string }) {
  const [abierto, setAbierto] = useState(false); const [pagina, setPagina] = useState(1);
  const query = useQuery({ queryKey: ['auditoria-clinica', pacienteId, 'pieza', pieza, pagina], enabled: abierto, queryFn: () => historiasApi.auditoria(pacienteId, pagina, undefined, { pieza }), retry: false });
  return <details onToggle={(event) => setAbierto(event.currentTarget.open)}><summary>Historial de la pieza {pieza}</summary>{query.isError && <RequestError error={query.error} />} {query.data?.items.map((item) => <p key={item.id}>{formatDateTime(item.createdAt)} · {label(String(item.valorNuevo?.superficie ?? 'GENERAL'))}: {String(item.valorAnterior?.estado ?? 'Sin evaluar')} → {String(item.valorNuevo?.estado ?? 'Sin registrar')}</p>)}{query.data?.total === 0 && <p>Sin cambios registrados.</p>}{(query.data?.totalPaginas ?? 0) > 1 && <div className="pagination"><button className="secondary-button" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>Anterior</button><span>{pagina} / {query.data?.totalPaginas}</span><button className="secondary-button" disabled={pagina >= query.data!.totalPaginas} onClick={() => setPagina(pagina + 1)}>Siguiente</button></div>}</details>;
}
