import { apiClient } from '@/shared/lib/apiClient';
import { PacienteResumen } from '@/shared/components/PacienteSelector';
export const estadosCita = ['PROGRAMADA', 'CONFIRMADA', 'ATENDIDA', 'CANCELADA', 'NO_ASISTIO'] as const;
export type EstadoCita = typeof estadosCita[number];
export const etiquetasEstado: Record<EstadoCita, string> = { PROGRAMADA: 'Programada', CONFIRMADA: 'Confirmada', ATENDIDA: 'Atendida', CANCELADA: 'Cancelada', NO_ASISTIO: 'No asistió' };
export type Cita = { id: string; pacienteId: string; paciente: PacienteResumen; fechaInicio: string; fechaFin: string; estado: EstadoCita; motivo: string | null; notas: string | null; motivoCancelacion: string | null; updatedAt: string };
export type CitaInput = { pacienteId: string; fechaInicio: string; fechaFin: string; motivo?: string | null; notas?: string | null;claveSolicitud?:string };
export const citasApi = {
  listar: (desde: string, hasta: string, estado: string, signal?: AbortSignal) => apiClient<Cita[]>(`/citas?${new URLSearchParams({ desde, hasta, ...(estado ? { estado } : {}) })}`, { signal, cache: 'no-store' }),
  crear: (data: CitaInput) => apiClient<Cita>('/citas', { method: 'POST', body: JSON.stringify(data) }),
  reprogramar: (id: string, data: { fechaInicio: string; fechaFin: string; version: string }) => apiClient<Cita>(`/citas/${id}/horario`, { method: 'PATCH', body: JSON.stringify(data) }),
  estado: (id: string, data: { estado: EstadoCita; version: string; motivoCancelacion?: string }) => apiClient<Cita>(`/citas/${id}/estado`, { method: 'PATCH', body: JSON.stringify(data) })
};
