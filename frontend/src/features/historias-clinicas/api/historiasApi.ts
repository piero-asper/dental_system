import { apiClient } from '@/shared/lib/apiClient';
import { PacienteResumen } from '@/shared/components/PacienteSelector';
export type Antecedentes = { antecedentesMedicos?: string | null; alergias?: string | null; medicamentos?: string | null; observaciones?: string | null;alergiasRevisadas?:boolean;medicamentosRevisados?:boolean };
export type EvolucionInput = { diagnostico: string; procedimiento: string; observaciones?: string | null; fecha?: string;citaId?:string|null;piezas?:string[];estado?:'BORRADOR'|'FINALIZADA';motivoCorreccion?:string };
export type Evolucion = EvolucionInput & { id: string; fecha: string; updatedAt: string };
export const superficies = ['GENERAL', 'MESIAL', 'DISTAL', 'VESTIBULAR', 'LINGUAL', 'PALATINA', 'OCLUSAL', 'INCISAL'] as const;
export const estadosDentales = ['SANO', 'CARIES', 'RESTAURADO', 'AUSENTE', 'FRACTURADO', 'ENDODONCIA', 'CORONA', 'IMPLANTE', 'EXTRACCION_INDICADA'] as const;
export type Pieza = { id: string; pieza: string; superficie: string | null; estado: string; observaciones?: string | null; updatedAt: string };
export type Historia = Antecedentes & { id: string; pacienteId: string; paciente: PacienteResumen; updatedAt: string; evoluciones: Evolucion[]; odontograma: Pieza[] };
export type Auditoria = { id: string; accion: string; tablaAfectada: string; registroId: string; authUserId: string | null; createdAt: string; valorAnterior: Record<string, unknown> | null; valorNuevo: Record<string, unknown> | null };
const base = (id: string) => `/historias-clinicas/${encodeURIComponent(id)}`;
const write = <T,>(path: string, method: string, data: unknown) => apiClient<T>(path, { method, body: JSON.stringify(data) });
export const historiasApi = {
  obtener: (id: string, signal?: AbortSignal) => apiClient<Historia>(base(id), { signal, cache: 'no-store' }),
  evoluciones:(id:string,filters:Record<string,string>)=>apiClient<{items:Evolucion[];pagina:number;total:number;totalPaginas:number}>(`${base(id)}/evoluciones?${new URLSearchParams(filters)}`),
  odontograma:(id:string)=>apiClient<Pieza[]>(`${base(id)}/odontograma`),
  crear: (id: string, data: Antecedentes) => write<Historia>(base(id), 'POST', data),
  editar: (id: string, data: Antecedentes & { version: string }) => write<Historia>(base(id), 'PATCH', data),
  evolucion: (id: string, data: EvolucionInput) => write<Evolucion>(`${base(id)}/evoluciones`, 'POST', data),
  editarEvolucion: (id: string, registro: string, data: EvolucionInput & { version: string }) => write<Evolucion>(`${base(id)}/evoluciones/${registro}`, 'PATCH', data),
  pieza: (id: string, data: { pieza: string; superficie: string; estado: string; observaciones: string | null }) => write<Pieza>(`${base(id)}/odontograma`, 'POST', data),
  editarPieza: (id: string, registro: string, data: { estado: string; observaciones: string | null; version: string }) => write<Pieza>(`${base(id)}/odontograma/${registro}`, 'PATCH', data),
  auditoria: (id: string, pagina: number, signal?: AbortSignal,filters:Record<string,string>={}) => apiClient<{ items: Auditoria[]; pagina: number; total: number; totalPaginas: number }>(`${base(id)}/auditoria?${new URLSearchParams({pagina:String(pagina),...filters})}`, { signal, cache: 'no-store' })
};
export const label = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' ');
