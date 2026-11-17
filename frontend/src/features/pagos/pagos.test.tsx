// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PagosPage } from './pages/PagosPage';
import { PagoForm } from './components/PagoForm';
import { PagoDetalle } from './components/PagoDetalle';
const mocks = vi.hoisted(() => ({ cartera: vi.fn(), listar: vi.fn(), obtener: vi.fn(), registrar: vi.fn(), anular: vi.fn() }));
vi.mock('./api/pagosApi', () => ({ pagosApi: mocks, mediosPago: { EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', TRANSFERENCIA: 'Transferencia', OTRO: 'Otro' } }));
vi.mock('@/shared/components/ReporteFinanciero', () => ({ ReporteFinanciero: () => <p>Reporte de caja</p> }));
const cuenta = { id: 'b1', pacienteId: 'p1', paciente: { id: 'p1', nombres: 'Ana', apellidos: 'Torres' }, estado: 'ACEPTADO', total: '100', abonado: '20', saldo: '80', createdAt: '2026-11-05T10:00:00Z' };
const pago = { id: 'pay1', pacienteId: 'p1', presupuestoId: 'b1', paciente: cuenta.paciente, presupuesto: { id: 'b1', total: '100', estado: 'ACEPTADO' },
  monto: '30', metodoPago: 'EFECTIVO', estado: 'REGISTRADO', fechaPago: '2026-11-05T15:00:00Z', updatedAt: '2026-11-05T15:00:00Z',
  comprobante: { numero: 'REC-00000001', estado: 'EMITIDO', montoTotal: '30' }, cajaMovimientos: [], observaciones: null, referencia: null };
function start(component = <PagosPage />, path = '/pagos') {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={[path]}>{component}</MemoryRouter></QueryClientProvider>);
}
beforeEach(() => { vi.resetAllMocks(); mocks.cartera.mockResolvedValue({ items: [cuenta], total: 1, saldoFiltrado: '80', totalPaginas: 1 });
  mocks.listar.mockResolvedValue({ items: [pago], total: 1, totalPaginas: 1 }); mocks.obtener.mockResolvedValue(pago); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('flujo de cobros', () => {
  it('conserva el contexto del paciente y permite abrir el registro de un abono', async () => {
    start(<PagosPage />, '/pagos?pacienteId=p1');
    fireEvent.click(await screen.findByRole('button', { name: 'Registrar abono' }));
    expect(screen.getByRole('heading', { name: 'Registrar abono' })).toBeDefined();
    expect(mocks.cartera.mock.calls[0][0].get('pacienteId')).toBe('p1');
  });
  it('reutiliza el identificador de cobro ante un error y conserva los datos', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('Conexión interrumpida')).mockResolvedValueOnce(undefined);
    start(<PagoForm cuenta={cuenta} onSave={save} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Importe recibido *'), { target: { value: '30.10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cobro' }));
    await screen.findByRole('alert'); expect(screen.getByLabelText('Importe recibido *')).toHaveProperty('value', '30.10');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cobro' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls[0][0].claveSolicitud).toBe(save.mock.calls[1][0].claveSolicitud);
    expect(save.mock.calls[0][0]).toMatchObject({ presupuestoId: 'b1', monto: '30.10', metodoPago: 'EFECTIVO' });
  });
  it('abre el recibo después de guardar el abono', async () => {
    mocks.registrar.mockResolvedValue(pago); start(); fireEvent.click(await screen.findByRole('button', { name: 'Registrar abono' }));
    fireEvent.change(screen.getByLabelText('Importe recibido *'), { target: { value: '30' } }); fireEvent.click(screen.getByRole('button', { name: 'Confirmar cobro' }));
    expect(await screen.findByRole('heading', { name: 'Recibo interno REC-00000001' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Ver presupuesto' }).getAttribute('href')).toContain('presupuestoId=b1');
  });
  it('anula con motivo y la versión del cobro después de confirmar', async () => {
    const changed = vi.fn().mockResolvedValue(undefined); mocks.anular.mockResolvedValue({ ...pago, estado: 'ANULADO' });
    vi.spyOn(window, 'confirm').mockReturnValue(true); start(<PagoDetalle id="pay1" onClose={vi.fn()} onChanged={changed} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Anular cobro' }));
    fireEvent.change(screen.getByLabelText('Motivo de anulación *'), { target: { value: 'Cobro duplicado comprobado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar anulación' }));
    await waitFor(() => expect(mocks.anular).toHaveBeenCalledWith('pay1', pago.updatedAt, 'Cobro duplicado comprobado')); expect(changed).toHaveBeenCalled();
  });
});
