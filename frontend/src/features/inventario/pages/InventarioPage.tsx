import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, History, PackagePlus, Pencil, Search, TriangleAlert } from 'lucide-react';
import { CatalogoForm } from '@/shared/components/CatalogoForm';
import { ListaPaginacion } from '@/shared/components/ListaPaginacion';
import { RequestError } from '@/shared/components/RequestError';
import { confirmDiscard } from '@/shared/components/UnsavedChanges';
import { mostrarImporte } from '@/shared/lib/importes';
import { inventarioApi, type Insumo } from '../api/inventarioApi';
import { MovimientosPanel } from '../components/MovimientosPanel';

export function InventarioPage() {
  const client = useQueryClient();
  const [q, setQ] = useState(''), [estado, setEstado] = useState('activos'), [stock, setStock] = useState('todos'), [pagina, setPagina] = useState(1);
  const [editor, setEditor] = useState<Insumo | 'nuevo' | null>(null), [movimientos, setMovimientos] = useState<Insumo | null>(null), [success, setSuccess] = useState('');
  const query = new URLSearchParams({ q, estado, stock, pagina: String(pagina) });
  const list = useQuery({ queryKey: ['inventario', query.toString()], queryFn: ({ signal }) => inventarioApi.listar(query, signal), retry: false });
  const items = list.data?.items ?? [], unidadesDisponibles = items.reduce((total, item) => total + Number(item.stockActual), 0), stockBajo = items.filter((item) => Number(item.stockActual) <= Number(item.stockMinimo)).length;
  return <section className="patients-page clinical-page inventory-page"><header className="module-header page-header"><div><p className="eyebrow">Almacén de la clínica</p><h1>Inventario</h1><p>Consulta las existencias y registra los movimientos de cada insumo.</p></div><button className="primary-button button-icon" onClick={() => { if (confirmDiscard()) { setEditor('nuevo'); setMovimientos(null); setSuccess(''); } }}><PackagePlus size={18} aria-hidden="true" />Nuevo insumo</button></header>
    <div className="inventory-overview" aria-label="Resumen de inventario"><article className="inventory-metric"><span className="inventory-metric-icon"><Boxes size={20} aria-hidden="true" /></span><div><span>Insumos registrados</span><strong>{list.data?.total ?? '—'}</strong></div></article><article className="inventory-metric"><span className="inventory-metric-icon"><PackagePlus size={20} aria-hidden="true" /></span><div><span>Unidades disponibles</span><strong>{mostrarImporte(String(unidadesDisponibles))} <small>en esta página</small></strong></div></article><article className={`inventory-metric${stockBajo ? ' inventory-metric-warning' : ''}`}><span className="inventory-metric-icon"><TriangleAlert size={20} aria-hidden="true" /></span><div><span>Stock bajo</span><strong>{stockBajo} <small>en esta página</small></strong></div></article></div>
    <div className="patient-search inventory-toolbar surface"><label className="inventory-search-field">Buscar insumo<span className="search-input"><Search size={18} aria-hidden="true" /><input type="search" placeholder="Código o nombre del insumo" maxLength={100} value={q} onChange={(e) => { setQ(e.target.value); setPagina(1); }} /></span></label>
      <label>Estado<select value={estado} onChange={(e) => { setEstado(e.target.value); setPagina(1); }}><option value="todos">Todos</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option></select></label>
      <label>Existencias<select value={stock} onChange={(e) => { setStock(e.target.value); setPagina(1); }}><option value="todos">Todas</option><option value="bajo">En mínimo o por debajo</option></select></label></div>
    {success && <p className="success-message" role="status">{success}</p>}
    {editor && <CatalogoForm key={editor === 'nuevo' ? 'nuevo' : editor.id} tipo="insumo" registro={editor === 'nuevo' ? undefined : editor} onClose={() => setEditor(null)} onSave={async (data) => {
      await inventarioApi.guardar(data, editor === 'nuevo' ? undefined : editor.id); setEditor(null); setSuccess('Insumo guardado. Registra una entrada para incorporar existencias.');
      await client.invalidateQueries({ queryKey: ['inventario'] });
    }} />}
    {movimientos && <MovimientosPanel key={`${movimientos.id}:${movimientos.updatedAt}`} original={movimientos} onClose={() => setMovimientos(null)} />}
    {list.isPending && <p role="status">Cargando inventario…</p>}
    {list.isError && <RequestError error={list.error} retry={() => { void list.refetch(); }} />}
    {list.data && <div className="surface patient-list inventory-list"><div className="list-summary">{list.data.total} {list.data.total === 1 ? 'insumo registrado' : 'insumos registrados'}</div>
      {list.data.items.length ? <div className="table-scroll"><table className="patients-table"><thead><tr><th>Insumo</th><th>Existencias</th><th>Stock mínimo</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
        {list.data.items.map((item) => { const bajo = Number(item.stockActual) <= Number(item.stockMinimo); return <tr key={item.id}><td><div className="inventory-item-name"><span aria-hidden="true">{item.nombre.slice(0, 2).toUpperCase()}</span><div><strong>{item.nombre}</strong><p>{item.codigo}{item.descripcion ? ` · ${item.descripcion}` : ''}</p></div></div></td><td><strong>{mostrarImporte(item.stockActual)} {item.unidadMedida}</strong>{bajo && <p className="stock-warning">Reponer existencias</p>}</td><td>{mostrarImporte(item.stockMinimo)} {item.unidadMedida}</td><td><span className={`inventory-status ${!item.activo ? 'inventory-status-muted' : bajo ? 'inventory-status-low' : ''}`}>{!item.activo ? 'Inactivo' : bajo ? 'Stock bajo' : 'En orden'}</span></td>
          <td><div className="inventory-actions"><button className="appointment-action-button appointment-action-edit" aria-label={`Editar ${item.codigo}`} title="Editar insumo" onClick={() => { if (confirmDiscard()) { setEditor(item); setMovimientos(null); } }}><Pencil size={17} aria-hidden="true" /></button>
            <button className="appointment-action-button inventory-action-history" aria-label={`Movimientos de ${item.codigo}`} title="Ver movimientos" onClick={() => { if (confirmDiscard()) { setMovimientos(item); setEditor(null); } }}><History size={17} aria-hidden="true" /></button></div></td></tr>})}
      </tbody></table></div> : <p className="state-panel">No hay insumos para estos filtros. Puedes crear el primero.</p>}
      <ListaPaginacion pagina={pagina} totalPaginas={list.data.totalPaginas} onChange={setPagina} /></div>}
  </section>;
}

