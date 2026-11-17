import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CatalogoForm } from '@/shared/components/CatalogoForm';
import { ListaPaginacion } from '@/shared/components/ListaPaginacion';
import { RequestError } from '@/shared/components/RequestError';
import { confirmDiscard } from '@/shared/components/UnsavedChanges';
import { mostrarImporte } from '@/shared/lib/importes';
import { tratamientosApi, type Tratamiento } from '../api/tratamientosApi';
import { PresupuestosPanel } from '../components/PresupuestosPanel';

export function TratamientosPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'presupuestos' ? 'presupuestos' : 'catalogo';
  const setTab = (value: string) => setParams({ ...Object.fromEntries(params), tab: value });
  return <section className="patients-page clinical-page">
    <header className="module-header page-header"><div><p className="eyebrow">Servicios de la clínica</p><h1>Tratamientos</h1><p>Administra el catálogo y prepara presupuestos para tus pacientes.</p></div><Link className="text-link" to="/guia#tratamientos">Cómo utilizar Tratamientos</Link></header>
    <div className="inline-actions module-tabs" role="group" aria-label="Secciones de tratamientos">
      <button className={tab === 'catalogo' ? 'primary-button' : 'secondary-button'} aria-pressed={tab === 'catalogo'} onClick={() => { if (tab !== 'catalogo' && confirmDiscard()) setTab('catalogo'); }}>Catálogo</button>
      <button className={tab === 'presupuestos' ? 'primary-button' : 'secondary-button'} aria-pressed={tab === 'presupuestos'} onClick={() => { if (tab !== 'presupuestos' && confirmDiscard()) setTab('presupuestos'); }}>Presupuestos</button>
    </div>
    {tab === 'catalogo' ? <CatalogoTratamientos /> : <PresupuestosPanel key={`${params.get('pacienteId') ?? ''}:${params.get('presupuestoId') ?? ''}`} />}
  </section>;
}
function CatalogoTratamientos() {
  const client = useQueryClient();
  const [q, setQ] = useState(''), [estado, setEstado] = useState('todos'), [pagina, setPagina] = useState(1);
  const [editor, setEditor] = useState<Tratamiento | 'nuevo' | null>(null), [success, setSuccess] = useState('');
  const query = new URLSearchParams({ q, estado, pagina: String(pagina) });
  const list = useQuery({ queryKey: ['tratamientos', query.toString()], queryFn: ({ signal }) => tratamientosApi.listar(query, signal), retry: false });
  return <>
    <div className="patient-search surface"><label>Buscar tratamiento<input type="search" maxLength={100} value={q} onChange={(e) => { setQ(e.target.value); setPagina(1); }} /></label>
      <label>Estado<select value={estado} onChange={(e) => { setEstado(e.target.value); setPagina(1); }}><option value="todos">Todos</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option></select></label>
      <button className="primary-button" onClick={() => { if (confirmDiscard()) { setEditor('nuevo'); setSuccess(''); } }}>Nuevo tratamiento</button></div>
    {success && <p className="success-message" role="status">{success}</p>}
    {editor && <CatalogoForm key={editor === 'nuevo' ? 'nuevo' : editor.id} tipo="tratamiento" registro={editor === 'nuevo' ? undefined : editor} onClose={() => setEditor(null)} onSave={async (data) => {
      await tratamientosApi.guardar(data, editor === 'nuevo' ? undefined : editor.id); setEditor(null); setSuccess('Tratamiento guardado.');
      await client.invalidateQueries({ queryKey: ['tratamientos'] });
    }} />}
    {list.isPending && <p role="status">Cargando tratamientos…</p>}
    {list.isError && <RequestError error={list.error} retry={() => { void list.refetch(); }} />}
    {list.data && <div className="surface patient-list"><div className="list-summary">{list.data.total} tratamientos</div>
      {list.data.items.length ? <div className="table-scroll"><table className="patients-table"><thead><tr><th>Código</th><th>Tratamiento</th><th>Precio base</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>{list.data.items.map((item) => <tr key={item.id}><td>{item.codigo}</td><td><strong>{item.nombre}</strong><p>{item.descripcion}</p></td><td>{mostrarImporte(item.precioBase)}</td><td>{item.activo ? 'Activo' : 'Inactivo'}</td>
          <td><button className="secondary-button" onClick={() => { if (confirmDiscard()) { setEditor(item); setSuccess(''); } }}>Editar {item.codigo}</button></td></tr>)}</tbody></table></div> : <p className="state-panel">No hay tratamientos para estos filtros. Puedes crear el primero.</p>}
      <ListaPaginacion pagina={pagina} totalPaginas={list.data.totalPaginas} onChange={setPagina} /></div>}
  </>;
}

