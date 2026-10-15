import { apiClient } from '@/shared/lib/apiClient';

export type PacienteInput = {
  nombres: string;
  apellidos: string;
  telefono?: string | null;
  activo?: boolean;
};

export type Paciente = PacienteInput & {
  id: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};
export type ListaPacientes = { items: Paciente[]; total: number; pagina: number; tamanoPagina: number; totalPaginas: number };
export type FiltrosPacientes = { q: string; estado: string; pagina: number };

export const pacientesApi = {
  listar: (filters: FiltrosPacientes, signal?: AbortSignal) => {
    const query = new URLSearchParams({ q: filters.q, estado: filters.estado, pagina: String(filters.pagina), tamanoPagina: '20' });
    return apiClient<ListaPacientes>(`/pacientes?${query}`, { signal, cache: 'no-store' });
  },
  obtener: (id: string, signal?: AbortSignal) => apiClient<Paciente>(`/pacientes/${encodeURIComponent(id)}`, { signal, cache: 'no-store' }),
  crear: (data: PacienteInput) => apiClient<Paciente>('/pacientes', { method: 'POST', body: JSON.stringify(data) }),
  editar: (id: string, data: PacienteInput) => apiClient<Paciente>(`/pacientes/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) })
};

export function mensajeError(error: unknown) {
  return error instanceof Error && error.name !== 'TypeError' ? error.message : 'No se pudo conectar con el servidor. Comprueba tu conexión e intenta nuevamente.';
}
