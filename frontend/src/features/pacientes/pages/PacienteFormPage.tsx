import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PacienteForm } from '../components/PacienteForm';
import { mensajeError, PacienteInput, pacientesApi } from '../api/pacientesApi';

export function PacienteFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const client = useQueryClient();
  const listSearch = typeof location.state?.listSearch === 'string' ? location.state.listSearch : '';
  const listHref = `/pacientes${listSearch ? `?${listSearch}` : ''}`;
  const detail = useQuery({ queryKey: ['paciente', id], queryFn: ({ signal }) => pacientesApi.obtener(id!, signal), enabled: Boolean(id), retry: false });

  async function save(data: PacienteInput) {
    const paciente = id ? await pacientesApi.editar(id, data) : await pacientesApi.crear(data);
    client.setQueryData(['paciente', paciente.id], paciente);
    await client.invalidateQueries({ queryKey: ['pacientes'] });
    if (id) {
      navigate(listHref, { replace: true, state: { patientUpdated: true } });
    } else {
      navigate(`/pacientes/${paciente.id}`, { replace: true, state: { listSearch, saved: true } });
    }
  }

  return <section className="patients-page">
    <header className="module-header"><Link className="back-link" to={listHref}>← Volver a pacientes</Link><p className="eyebrow">Ficha del paciente</p>
      <h1>{id ? 'Editar paciente' : 'Nuevo paciente'}</h1><p>{id ? 'Actualiza los datos personales y de contacto.' : 'Registra sus datos para crear la ficha de atención.'}</p></header>
    {id && detail.isPending && <p className="surface state-panel" role="status">Cargando ficha…</p>}
    {id && detail.isError && <div className="surface state-panel"><p className="form-error" role="alert">{mensajeError(detail.error)}</p><button className="secondary-button" onClick={() => { void detail.refetch(); }}>Reintentar</button></div>}
    {(!id || detail.isSuccess) && <PacienteForm key={id ?? 'nuevo'} paciente={detail.data} cancelTo={id ? `/pacientes/${id}` : listHref} cancelState={{ listSearch }} onSave={save} />}
  </section>;
}
