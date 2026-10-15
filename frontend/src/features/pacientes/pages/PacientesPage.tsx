import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Users } from 'lucide-react';
import { mensajeError, pacientesApi } from '../api/pacientesApi';

export function PacientesPage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const q = params.get('q') ?? '';
  const estado = ['activos', 'inactivos'].includes(params.get('estado') ?? '') ? params.get('estado')! : 'todos';
  const rawPage = Number(params.get('pagina') ?? '1');
  const pagina = Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 1000000 ? rawPage : 1;
  const [draftQ, setDraftQ] = useState(q);
  useEffect(() => { setDraftQ((current) => current.trim() === q ? current : q); }, [q]);
  useEffect(() => {
    const nextQ = draftQ.trim();
    if (nextQ === q) return;
    const timeout = setTimeout(() => {
      setParams({ q: nextQ, estado }, { replace: true });
    }, 300);
    return () => clearTimeout(timeout);
  }, [draftQ, q, estado, setParams]);
  const filters = { q, estado, pagina };
  const list = useQuery({ queryKey: ['pacientes', filters], queryFn: ({ signal }) => pacientesApi.listar(filters, signal), retry: false });
  const state = { listSearch: params.toString() };

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setParams({ q: draftQ.trim(), estado });
  }
  function reset() { setDraftQ(''); setParams({}); }

  return <section className="patients-page">
    <header className="module-header page-header">
      <div><p className="eyebrow">Gestión de la clínica</p><h1>Pacientes</h1><p>Consulta las fichas y mantén actualizados sus datos.</p></div>
      <Link className="primary-button button-icon" to="/pacientes/nuevo" state={state}><Plus size={18} aria-hidden="true" />Nuevo paciente</Link>
    </header>
    {location.state?.patientUpdated && <p className="success-message" role="status">Los cambios del paciente se guardaron correctamente.</p>}
    <form className="patient-search surface" onSubmit={search} role="search" aria-label="Buscar pacientes">
      <label className="search-field">Buscar paciente<span className="search-input"><Search size={18} aria-hidden="true" /><input type="search" name="q" maxLength={100}
        placeholder="Nombre, apellido o teléfono" value={draftQ} onChange={(event) => setDraftQ(event.target.value)} /></span></label>
      <label>Estado<select name="estado" value={estado} onChange={(event) => setParams({ q: draftQ.trim(), estado: event.target.value })}>
        <option value="todos">Todos</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option>
      </select></label>
      {(q || estado !== 'todos' || draftQ) && <button className="secondary-button" type="button" onClick={reset}>Limpiar</button>}
    </form>
    {list.isPending && <p role="status" className="surface state-panel">Cargando pacientes…</p>}
    {list.isError && <div className="surface state-panel"><p role="alert" className="form-error">{mensajeError(list.error)}</p><button className="secondary-button" onClick={() => { void list.refetch(); }}>Reintentar</button></div>}
    {list.isSuccess && <div className="surface patient-list">
      <div className="list-summary" role="status">{list.data.total} {list.data.total === 1 ? 'paciente encontrado' : 'pacientes encontrados'}</div>
      {list.data.items.length ? <div className="table-scroll"><table className="patients-table">
        <thead><tr><th scope="col">Paciente</th><th scope="col">Contacto</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead>
        <tbody>{list.data.items.map((paciente) => <tr key={paciente.id}>
          <td><Link className="patient-name" to={`/pacientes/${paciente.id}`} state={state}>{paciente.apellidos}, {paciente.nombres}</Link></td>
          <td>{paciente.telefono || 'Sin teléfono'}</td>
          <td><span className={`status-badge ${paciente.activo ? 'active' : 'inactive'}`}>{paciente.activo ? 'Activo' : 'Inactivo'}</span></td>
          <td><Link className="text-link" aria-label={`Ver ficha de ${paciente.nombres} ${paciente.apellidos}`} to={`/pacientes/${paciente.id}`} state={state}>Ver ficha</Link></td>
        </tr>)}</tbody>
      </table></div> : <div className="empty-state"><Users size={32} aria-hidden="true" /><h2>{q || estado !== 'todos' ? 'No hay coincidencias' : pagina > 1 ? 'Esta página no tiene pacientes' : 'Aún no hay pacientes'}</h2>
        <p>{q || estado !== 'todos' ? 'Prueba con otros datos o limpia los filtros.' : pagina > 1 ? 'Vuelve a la primera página para ver los registros disponibles.' : 'Registra tu primer paciente para comenzar.'}</p>
        {pagina > 1 && <button className="secondary-button" onClick={() => setParams({ q, estado })}>Primera página</button>}
      </div>}
      {(list.data.totalPaginas > 1 || pagina > 1) && <nav className="pagination" aria-label="Paginación de pacientes">
        <button className="secondary-button" disabled={pagina <= 1} onClick={() => setParams({ q, estado, pagina: String(pagina - 1) })}>Anterior</button>
        <span>Página {pagina} de {Math.max(1, list.data.totalPaginas)}</span>
        <button className="secondary-button" disabled={pagina >= list.data.totalPaginas} onClick={() => setParams({ q, estado, pagina: String(pagina + 1) })}>Siguiente</button>
      </nav>}
    </div>}
  </section>;
}

