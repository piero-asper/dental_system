import { apiClient } from './apiClient';
export type ResumenFinanciero = { corte: string; actualizado: string; desde: string; hasta: string; ingresos: string; reversiones: string; neto: string;
  saldoPendiente: string; presupuestosPendientes: number; totalMovimientos: number;
  porMetodo: { metodoPago: string; ingresos: string; reversiones: string; neto: string }[] };
export type FilaCaja = { id: string; pagoId: string; pacienteId: string; paciente: string; recibo: string; fecha: string; tipo: string; metodoPago: string; monto: string; motivo: string };
export const finanzasApi = {
  resumen: (desde: string, hasta: string, signal?: AbortSignal) => apiClient<ResumenFinanciero>(`/pagos/reporte?${new URLSearchParams({ desde, hasta })}`, { signal, cache: 'no-store' }),
  detalle: (corte: string, pagina: number, signal?: AbortSignal) => apiClient<{ items: FilaCaja[]; total: number; totalPaginas: number }>(`/pagos/reporte/detalle?${new URLSearchParams({ corte, pagina: String(pagina) })}`, { signal, cache: 'no-store' }),
  csv: (corte: string) => apiClient<string>(`/pagos/reporte/csv?corte=${encodeURIComponent(corte)}`, { responseType: 'text', cache: 'no-store' })
};
