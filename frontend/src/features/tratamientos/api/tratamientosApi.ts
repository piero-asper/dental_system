import { apiClient } from '@/shared/lib/apiClient';
import type { CatalogoInput, CatalogoRegistro } from '@/shared/components/CatalogoForm';
import type { ListaPaginada } from '@/shared/components/ListaPaginacion';
export type Tratamiento = CatalogoRegistro & { precioBase: string };
export type EstadoPresupuesto = 'BORRADOR' | 'ENVIADO' | 'ACEPTADO' | 'RECHAZADO' | 'FINALIZADO';
export type PresupuestoItemInput = { tratamientoId: string; cantidad: number; precioUnitario: string; pieza: string | null; observaciones?: string | null };
export type PresupuestoInput = { pacienteId: string; items: PresupuestoItemInput[]; descuento: string; observaciones: string | null; version?: string };
export type Presupuesto = { id: string; pacienteId: string; estado: EstadoPresupuesto; subtotal: string; descuento: string; total: string;
  observaciones: string | null; createdAt: string; updatedAt: string; paciente: { id: string; nombres: string; apellidos: string; activo: boolean };
  items: (PresupuestoItemInput & { id: string; subtotal: string; tratamiento: { codigo: string; nombre: string } })[] };
export const tratamientosApi = {
  listar: (query: URLSearchParams, signal?: AbortSignal) => apiClient<ListaPaginada<Tratamiento>>(`/tratamientos?${query}`, { signal, cache: 'no-store' }),
  guardar: (data: CatalogoInput, id?: string) => apiClient<Tratamiento>(`/tratamientos${id ? `/${id}` : ''}`, { method: id ? 'PATCH' : 'POST', body: JSON.stringify(data) }),
  presupuestos: (query: URLSearchParams, signal?: AbortSignal) => apiClient<ListaPaginada<Presupuesto>>(`/presupuestos?${query}`, { signal, cache: 'no-store' }),
  presupuesto: (id: string, signal?: AbortSignal) => apiClient<Presupuesto>(`/presupuestos/${id}`, { signal, cache: 'no-store' }),
  guardarPresupuesto: (data: PresupuestoInput, id?: string) => apiClient<Presupuesto>(`/presupuestos${id ? `/${id}` : ''}`, { method: id ? 'PATCH' : 'POST', body: JSON.stringify(data) }),
  estado: (id: string, estado: EstadoPresupuesto, version: string) => apiClient<Presupuesto>(`/presupuestos/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado, version }) })
};
