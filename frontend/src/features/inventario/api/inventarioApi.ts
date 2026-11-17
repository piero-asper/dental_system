import { apiClient } from '@/shared/lib/apiClient';
import type { CatalogoInput, CatalogoRegistro } from '@/shared/components/CatalogoForm';
import type { ListaPaginada } from '@/shared/components/ListaPaginacion';
export type Insumo = CatalogoRegistro & { stockActual: string; stockMinimo: string; unidadMedida: string };
export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE';
export type Movimiento = { id: string; tipo: TipoMovimiento; cantidad: string; motivo: string; stockAnterior: string; stockNuevo: string; createdAt: string };
export const inventarioApi = {
  listar: (query: URLSearchParams, signal?: AbortSignal) => apiClient<ListaPaginada<Insumo>>(`/inventario?${query}`, { signal, cache: 'no-store' }),
  guardar: (data: CatalogoInput, id?: string) => apiClient<Insumo>(`/inventario${id ? `/${id}` : ''}`, { method: id ? 'PATCH' : 'POST', body: JSON.stringify(data) }),
  movimientos: (id: string, pagina: number, signal?: AbortSignal) => apiClient<ListaPaginada<Movimiento>>(`/inventario/${id}/movimientos?pagina=${pagina}`, { signal, cache: 'no-store' }),
  movimiento: (id: string, data: { tipo: TipoMovimiento; cantidad: string; motivo: string; version: string }) => apiClient<{ insumo: Insumo; movimiento: Movimiento }>(`/inventario/${id}/movimientos`, { method: 'POST', body: JSON.stringify(data) })
};
