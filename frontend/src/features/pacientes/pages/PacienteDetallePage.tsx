import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { mensajeError, pacientesApi } from '../api/pacientesApi';

export function PacienteDetallePage() {
  const { id } = useParams();
  const location = useLocation();
  const listSearch = typeof location.state?.listSearch === 'string' ? location.state.listSearch : '';
  const listHref = `/pacientes${listSearch ? `?${listSearch}` : ''}`;
  const detail = useQuery({ queryKey: ['paciente', id], queryFn: ({ signal }) => pacientesApi.obtener(id!, signal), retry: false });
  const paciente = detail.data;

  return <section className="patients-page">
    <Link className="back-link" to={listHref}>← Volver a pacientes</Link>
    {detail.isPending && <p className="surface state-panel" role="status">Cargando ficha…</p>}
    {detail.isError && <div className="surface state-panel"><h1>No se pudo abrir la ficha</h1><p className="form-error" role="alert">{mensajeError(detail.error)}</p><button className="secondary-button" onClick={() => { void detail.refetch(); }}>Reintentar</button></div>}
    {paciente && <>
      <header className="module-header page-header"><div><p className="eyebrow">Ficha del paciente</p><h1>{paciente.nombres} {paciente.apellidos}</h1><p><span className={`status-badge ${paciente.activo ? 'active' : 'inactive'}`}>{paciente.activo ? 'Activo' : 'Inactivo'}</span></p></div>
        <Link className="primary-button button-icon" to={`/pacientes/${paciente.id}/editar`} state={{ listSearch }}><Pencil size={18} aria-hidden="true" />Editar paciente</Link>
      </header>
      {location.state?.saved && <p className="success-message" role="status">Los datos del paciente se guardaron correctamente.</p>}
      <div className="patient-details surface">
        <section><h2>Datos de contacto</h2><dl className="details-grid"><div><dt>Teléfono</dt><dd>{paciente.telefono || 'Sin registrar'}</dd></div></dl></section>
      </div>
    </>}
  </section>;
}
