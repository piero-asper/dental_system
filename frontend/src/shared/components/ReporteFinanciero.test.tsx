// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReporteFinanciero } from './ReporteFinanciero';
const mocks = vi.hoisted(() => ({ resumen: vi.fn(), detalle: vi.fn(), csv: vi.fn() }));
vi.mock('../lib/finanzasApi', () => ({ finanzasApi: mocks }));
beforeEach(() => { vi.resetAllMocks(); mocks.resumen.mockResolvedValue({ corte: 'cut1', actualizado: '2026-11-05T15:00:00Z', ingresos: '100', reversiones: '30', neto: '70', saldoPendiente: '50', presupuestosPendientes: 1,
  porMetodo: [{ metodoPago: 'EFECTIVO', ingresos: '100', reversiones: '30', neto: '70' }], totalMovimientos: 2 }); mocks.detalle.mockResolvedValue({ items: [], total: 0, totalPaginas: 0 }); });
afterEach(cleanup);
function start(compacto = false) { render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><ReporteFinanciero desde="2026-11-05" hasta="2026-11-06" compacto={compacto} /></MemoryRouter></QueryClientProvider>); }
describe('reporte financiero conectado', () => {
  it('consulta el periodo y usa el corte devuelto para detalle y CSV', async () => {
    mocks.csv.mockRejectedValue(new Error('El corte venció.')); start();
    await screen.findByText('No hay movimientos en este periodo.');
    expect(mocks.resumen.mock.calls[0].slice(0, 2)).toEqual(['2026-11-05', '2026-11-06']);
    expect(mocks.detalle.mock.calls[0].slice(0, 2)).toEqual(['cut1', 1]);
    fireEvent.click(screen.getByRole('button', { name: 'Exportar caja CSV' }));
    await waitFor(() => expect(mocks.csv).toHaveBeenCalledWith('cut1')); expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'El corte venció.');
  });
  it('el panel compacto enlaza al mismo periodo de caja sin consultar un detalle oculto', async () => {
    start(true); await screen.findByText('Cobros netos del periodo');
    expect(screen.getByRole('link', { name: 'Ver caja y movimientos' }).getAttribute('href')).toContain('desde=2026-11-05'); expect(mocks.detalle).not.toHaveBeenCalled();
  });
});
