import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  return <section className="patients-page clinical-page"><header className="module-header page-header"><div><p className="eyebrow">Insumos de la clínica</p><h1>Inventario</h1><p>Controla las existencias y consulta cada entrada, salida y ajuste.</p></div></header>
    <div className="patient-search surface"><label>Buscar insumo<input type="search" maxLength={100} value={q} onChange={(e) => { setQ(e.target.value); setPagina(1); }} /></label>
      <label>Estado<select value={estado} onChange={(e) => { setEstado(e.target.value); setPagina(1); }}><option value="todos">Todos</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option></select></label>
      <label>Existencias<select value={stock} onChange={(e) => { setStock(e.target.value); setPagina(1); }}><option value="todos">Todas</option><option value="bajo">En mínimo o por debajo</option></select></label>
      <button className="primary-button" onClick={() => { if (confirmDiscard()) { setEditor('nuevo'); setMovimientos(null); setSuccess(''); } }}>Nuevo insumo</button></div>
    {success && <p className="success-message" role="status">{success}</p>}
    {editor && <CatalogoForm key={editor === 'nuevo' ? 'nuevo' : editor.id} tipo="insumo" registro={editor === 'nuevo' ? undefined : editor} onClose={() => setEditor(null)} onSave={async (data) => {
      await inventarioApi.guardar(data, editor === 'nuevo' ? undefined : editor.id); setEditor(null); setSuccess('Insumo guardado. Registra una entrada para incorporar existencias.');
      await client.invalidateQueries({ queryKey: ['inventario'] });
    }} />}
    {movimientos && <MovimientosPanel key={`${movimientos.id}:${movimientos.updatedAt}`} original={movimientos} onClose={() => setMovimientos(null)} />}
    {list.isPending && <p role="status">Cargando inventario…</p>}
    {list.isError && <RequestError error={list.error} retry={() => { void list.refetch(); }} />}
    {list.data && <div className="surface patient-list"><div className="list-summary">{list.data.total} insumos</div>
      {list.data.items.length ? <div className="table-scroll"><table className="patients-table"><thead><tr><th>Código</th><th>Insumo</th><th>Existencias</th><th>Mínimo</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
        {list.data.items.map((item) => <tr key={item.id}><td>{item.codigo}</td><td><strong>{item.nombre}</strong><p>{item.descripcion}</p></td><td>{mostrarImporte(item.stockActual)} {item.unidadMedida}{Number(item.stockActual) <= Number(item.stockMinimo) && <p className="stock-warning">Reponer existencias</p>}</td><td>{mostrarImporte(item.stockMinimo)}</td><td>{item.activo ? 'Activo' : 'Inactivo'}</td>
          <td><div className="inline-actions"><button className="secondary-button" onClick={() => { if (confirmDiscard()) { setEditor(item); setMovimientos(null); } }}>Editar {item.codigo}</button>
            <button className="secondary-button" onClick={() => { if (confirmDiscard()) { setMovimientos(item); setEditor(null); } }}>Movimientos de {item.codigo}</button></div></td></tr>)}
      </tbody></table></div> : <p className="state-panel">No hay insumos para estos filtros. Puedes crear el primero.</p>}
      <ListaPaginacion pagina={pagina} totalPaginas={list.data.totalPaginas} onChange={setPagina} /></div>}
  </section>;
}

