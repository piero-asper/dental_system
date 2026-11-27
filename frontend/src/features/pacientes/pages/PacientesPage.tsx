import { FormEvent, MouseEvent, type ReactNode, useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownNarrowWide, CheckCircle2, Eye, Pencil, Plus, Search, Users, X } from 'lucide-react';
import { PacienteForm } from '../components/PacienteForm';
import { confirmDiscard } from '@/shared/components/UnsavedChanges';
import { type FiltrosPacientes, mensajeError, Paciente, PacienteInput, pacientesApi } from '../api/pacientesApi';
import { formatDate } from '@/shared/lib/clinical';

export function PacientesPage() {
  const client = useQueryClient();
  const [params, setSearchParams] = useSearchParams();
  const setParams=useCallback((next:Record<string,string>,options?:{replace?:boolean})=>setSearchParams({...Object.fromEntries(params),...next,pagina:next.pagina??'1'},options),[params,setSearchParams]);
  const location = useLocation();
  const q = params.get('q') ?? '';
  const estado = ['activos', 'inactivos'].includes(params.get('estado') ?? '') ? params.get('estado')! : 'todos';
  const orden = params.get('orden') === 'desc' ? 'desc' : 'asc';
  const rawPage = Number(params.get('pagina') ?? '1');
  const pagina = Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 1000000 ? rawPage : 1;
  const [draftQ, setDraftQ] = useState(q);
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [createdName, setCreatedName] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(Boolean(location.state?.patientUpdated));
  const [viewingPatient, setViewingPatient] = useState<Paciente | null>(null);
  const [editingPatient, setEditingPatient] = useState<Paciente | null>(null);
  useEffect(() => { setDraftQ((current) => current.trim() === q ? current : q); }, [q]);
  useEffect(() => {
    const nextQ = draftQ.trim();
    if (nextQ === q) return;
    const timeout = setTimeout(() => {
      setParams({ q: nextQ, estado, orden }, { replace: true });
    }, 300);
    return () => clearTimeout(timeout);
  }, [draftQ, q, estado, orden, setParams]);
  const filters: FiltrosPacientes = { q, estado, pagina, orden };
  const list = useQuery({ queryKey: ['pacientes', filters], queryFn: ({ signal }) => pacientesApi.listar(filters, signal), retry: false });
  const state = { listSearch: params.toString() };

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setParams({ q: draftQ.trim(), estado, orden });
  }
  function reset() { setDraftQ(''); setParams({ q:'', estado:'todos', orden:'asc' }); }
  function closeNewPatient() {
    if (confirmDiscard()) setNewPatientOpen(false);
  }
  function closeEditPatient() {
    if (confirmDiscard()) setEditingPatient(null);
  }
  async function createPatient(data: PacienteInput) {
    const patient = await pacientesApi.crear(data);
    client.setQueryData(['paciente', patient.id], patient);
    await client.invalidateQueries({ queryKey: ['pacientes'] });
    await Promise.all(['paciente-resumen', 'pacientes-selector', 'bi'].map((key) => client.invalidateQueries({ queryKey: [key] })));
    setCreatedName(`${patient.nombres} ${patient.apellidos}`);
    setNewPatientOpen(false);
  }
  async function updatePatient(data: PacienteInput, version?: string) {
    if (!editingPatient || !version) return;
    const patient = await pacientesApi.editar(editingPatient.id, { ...data, version });
    client.setQueryData(['paciente', patient.id], patient);
    await client.invalidateQueries({ queryKey: ['pacientes'] });
    await Promise.all(['paciente-resumen', 'pacientes-selector', 'bi'].map((key) => client.invalidateQueries({ queryKey: [key] })));
    setUpdateSuccess(true);
    setEditingPatient(null);
  }

  return <section className="patients-page">
    <header className="module-header page-header">
      <div><p className="eyebrow">Gestión de la clínica</p><h1>Pacientes</h1><p>Consulta las fichas y mantén actualizados sus datos.</p></div>
      <button className="primary-button button-icon" type="button" onClick={() => { setCreatedName(null); setNewPatientOpen(true); }}><Plus size={18} aria-hidden="true" />Nuevo paciente</button>
    </header>
    {createdName && <p className="success-message" role="status">{createdName} se registró correctamente.</p>}
    {updateSuccess && <PatientUpdateToast onDismiss={() => { setUpdateSuccess(false); }} />}
    <form className="patient-search surface" onSubmit={search} role="search" aria-label="Buscar pacientes">
      <label className="search-field">Buscar paciente<span className="search-input"><Search size={18} aria-hidden="true" /><input type="search" name="q" maxLength={100}
        placeholder="Nombre, apellido o teléfono" value={draftQ} onChange={(event) => setDraftQ(event.target.value)} /></span></label>
      <label>Estado<select name="estado" value={estado} onChange={(event) => setParams({ q: draftQ.trim(), estado: event.target.value, orden })}>
        <option value="todos">Todos</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option>
      </select></label>
      <button className="secondary-button patient-sort-button" type="button" title={orden === 'asc' ? 'Ordenar de Z a A por apellidos' : 'Ordenar de A a Z por apellidos'} aria-label={orden === 'asc' ? 'Ordenar de Z a A por apellidos' : 'Ordenar de A a Z por apellidos'} onClick={() => setParams({ q: draftQ.trim(), estado, orden: orden === 'asc' ? 'desc' : 'asc' })}>
        <ArrowDownNarrowWide size={22} aria-hidden="true" />
      </button>
      {(q || estado !== 'todos' || draftQ) && <button className="secondary-button" type="button" onClick={reset}>Limpiar</button>}
    </form>
    {list.isPending && <p role="status" className="surface state-panel">Cargando pacientes…</p>}
    {list.isError && <div className="surface state-panel"><p role="alert" className="form-error">{mensajeError(list.error)}</p><button className="secondary-button" onClick={() => { void list.refetch(); }}>Reintentar</button></div>}
    {list.isSuccess && <div className="surface patient-list">
      <div className="list-summary" role="status">{list.data.total} {list.data.total === 1 ? 'paciente encontrado' : 'pacientes encontrados'}</div>
      {list.data.items.length ? <div className="table-scroll"><table className="patients-table">
        <thead><tr><th scope="col">ID</th><th scope="col">Paciente</th><th scope="col">Contacto</th><th scope="col">Género</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead>
        <tbody>{list.data.items.map((paciente) => <tr key={paciente.id}>
          <td><span className="patient-code">{paciente.codigo ?? '—'}</span></td>
          <td><Link className="patient-name" to={`/pacientes/${paciente.id}`} state={state}>{paciente.apellidos}, {paciente.nombres}</Link></td>
          <td>{paciente.telefono || 'Sin teléfono'}</td>
          <td>{paciente.sexo === 'MASCULINO' ? 'Masculino' : paciente.sexo === 'FEMENINO' ? 'Femenino' : 'Sin registrar'}</td>
          <td><span className={`status-badge ${paciente.activo ? 'active' : 'inactive'}`}>{paciente.activo ? 'Activo' : 'Inactivo'}</span></td>
          <td><div className="patient-row-actions" aria-label={`Acciones para ${paciente.nombres} ${paciente.apellidos}`}>
            <button className="patient-action-button patient-action-view" type="button" aria-label={`Ver ficha de ${paciente.nombres} ${paciente.apellidos}`} title="Ver ficha" onClick={() => { setViewingPatient(paciente); }}><Eye size={19} aria-hidden="true" /></button>
            <button className="patient-action-button patient-action-edit" type="button" aria-label={`Editar ficha de ${paciente.nombres} ${paciente.apellidos}`} title="Editar paciente" onClick={() => { setEditingPatient(paciente); }}><Pencil size={18} aria-hidden="true" /></button>
          </div></td>
        </tr>)}</tbody>
      </table></div> : <div className="empty-state"><Users size={32} aria-hidden="true" /><h2>{q || estado !== 'todos' ? 'No hay coincidencias' : pagina > 1 ? 'Esta página no tiene pacientes' : 'Aún no hay pacientes'}</h2>
        <p>{q || estado !== 'todos' ? 'Prueba con otros datos o limpia los filtros.' : pagina > 1 ? 'Vuelve a la primera página para ver los registros disponibles.' : 'Registra tu primer paciente para comenzar.'}</p>
        {pagina > 1 && <button className="secondary-button" onClick={() => setParams({ q, estado, orden })}>Primera página</button>}
      </div>}
      {(list.data.totalPaginas > 1 || pagina > 1) && <nav className="pagination" aria-label="Paginación de pacientes">
        <button className="secondary-button" disabled={pagina <= 1} onClick={() => setParams({ q, estado, orden, pagina: String(pagina - 1) })}>Anterior</button>
        <span>Página {pagina} de {Math.max(1, list.data.totalPaginas)}</span>
        <button className="secondary-button" disabled={pagina >= list.data.totalPaginas} onClick={() => setParams({ q, estado, orden, pagina: String(pagina + 1) })}>Siguiente</button>
      </nav>}
    </div>}
    {newPatientOpen && <NewPatientModal onClose={closeNewPatient} onSave={createPatient} />}
    {viewingPatient && <ViewPatientModal patient={viewingPatient} onClose={() => { setViewingPatient(null); }} onEdit={() => { setEditingPatient(viewingPatient); setViewingPatient(null); }} />}
    {editingPatient && <EditPatientModal patient={editingPatient} onClose={closeEditPatient} onSave={updatePatient} />}
  </section>;
}

function PatientUpdateToast({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timeout);
  }, [onDismiss]);
  return <div className="patient-success-toast" role="status"><CheckCircle2 size={21} aria-hidden="true" /><strong>Se actualizó correctamente.</strong><button type="button" aria-label="Cerrar notificación" onClick={onDismiss}><X size={18} aria-hidden="true" /></button></div>;
}

function NewPatientModal({ onClose, onSave }: { onClose: () => void; onSave: (data: PacienteInput) => Promise<void> }) {
  return <PatientModal eyebrow="Nueva ficha" title="Registrar paciente" description="Ingresa los datos básicos para crear su ficha de atención." closeLabel="Cerrar registro de paciente" onClose={onClose}>
    <PacienteForm cancelTo="/pacientes" onCancel={onClose} onSave={onSave} />
  </PatientModal>;
}

function ViewPatientModal({ patient, onClose, onEdit }: { patient: Paciente; onClose: () => void; onEdit: () => void }) {
  const genero = patient.sexo === 'MASCULINO' ? 'Masculino' : patient.sexo === 'FEMENINO' ? 'Femenino' : 'Sin registrar';
  return <PatientModal eyebrow="Ficha del paciente" title={`${patient.nombres} ${patient.apellidos}`} description="Consulta los datos registrados sin salir de la lista." closeLabel="Cerrar ficha de paciente" onClose={onClose}>
    <div className="patient-modal-summary">
      <span className={`status-badge ${patient.activo ? 'active' : 'inactive'}`}>{patient.activo ? 'Activo' : 'Inactivo'}</span>
      <dl className="details-grid"><div><dt>Género</dt><dd>{genero}</dd></div><div><dt>Teléfono</dt><dd>{patient.telefono || 'Sin registrar'}</dd></div><div><dt>Fecha de registro</dt><dd><time dateTime={patient.createdAt}>{formatDate(patient.createdAt)}</time></dd></div></dl>
      <div className="form-actions"><button className="primary-button button-icon" type="button" onClick={onEdit}><Pencil size={17} aria-hidden="true" />Editar paciente</button><button className="secondary-button" type="button" onClick={onClose}>Cerrar</button></div>
    </div>
  </PatientModal>;
}

function EditPatientModal({ patient, onClose, onSave }: { patient: Paciente; onClose: () => void; onSave: (data: PacienteInput, version?: string) => Promise<void> }) {
  return <PatientModal eyebrow="Ficha del paciente" title="Editar paciente" description="Actualiza los datos personales y de contacto." closeLabel="Cerrar edición de paciente" onClose={onClose}>
    <PacienteForm paciente={patient} cancelTo="/pacientes" onCancel={onClose} onSave={onSave} />
  </PatientModal>;
}

function PatientModal({ eyebrow, title, description, closeLabel, onClose, children }: { eyebrow: string; title: string; description: string; closeLabel: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }
  return <div className="patient-modal-backdrop" onMouseDown={closeFromBackdrop}>
    <section className="patient-modal" role="dialog" aria-modal="true" aria-labelledby="patient-modal-title">
      <header className="patient-modal-header"><div><p className="eyebrow">{eyebrow}</p><h2 id="patient-modal-title">{title}</h2><p>{description}</p></div>
        <button className="patient-modal-close" type="button" aria-label={closeLabel} onClick={onClose}><X size={20} aria-hidden="true" /></button></header>
      <div className="patient-modal-content">{children}</div>
    </section>
  </div>;
}

