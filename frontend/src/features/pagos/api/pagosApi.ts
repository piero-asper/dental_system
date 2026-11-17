import { apiClient } from '@/shared/lib/apiClient';
import type { ListaPaginada } from '@/shared/components/ListaPaginacion';
export type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'OTRO';
export const mediosPago: Record<MetodoPago, string> = { EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', TRANSFERENCIA: 'Transferencia', OTRO: 'Otro' };
export type CuentaPresupuesto = { id: string; pacienteId: string; paciente: { id: string; nombres: string; apellidos: string }; estado: string; total: string; abonado: string; saldo: string; createdAt: string };
export type Pago = { id: string; pacienteId: string; presupuestoId: string | null; monto: string; metodoPago: MetodoPago; estado: 'REGISTRADO' | 'ANULADO';
  fechaPago: string; updatedAt: string; referencia: string | null; observaciones: string | null; motivoAnulacion: string | null; anuladoAt: string | null;
  paciente: { id: string; nombres: string; apellidos: string }; presupuesto: { id: string; estado: string; total: string } | null;
  comprobante: { numero: string; tipo: string; estado: string; fechaEmision: string; montoTotal: string } | null;
  cajaMovimientos?: { id: string; tipo: string; monto: string; createdAt: string; descripcion: string | null }[] };
export type PagoInput = { presupuestoId: string; monto: string; metodoPago: MetodoPago; claveSolicitud: string; referencia: string; observaciones: string | null };
export const pagosApi = {
  cartera: (query: URLSearchParams, signal?: AbortSignal) => apiClient<ListaPaginada<CuentaPresupuesto> & { saldoFiltrado: string }>(`/pagos/cartera?${query}`, { signal, cache: 'no-store' }),
  listar: (query: URLSearchParams, signal?: AbortSignal) => apiClient<ListaPaginada<Pago>>(`/pagos?${query}`, { signal, cache: 'no-store' }),
  obtener: (id: string, signal?: AbortSignal) => apiClient<Pago>(`/pagos/${id}`, { signal, cache: 'no-store' }),
  registrar: (data: PagoInput) => apiClient<Pago>('/pagos', { method: 'POST', body: JSON.stringify(data) }),
  anular: (id: string, version: string, motivo: string) => apiClient<Pago>(`/pagos/${id}/anular`, { method: 'PATCH', body: JSON.stringify({ version, motivo }) })
};
