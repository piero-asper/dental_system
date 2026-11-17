// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InventarioPage } from './pages/InventarioPage';
const mocks = vi.hoisted(() => ({ listar: vi.fn(), guardar: vi.fn(), movimientos: vi.fn(), movimiento: vi.fn() }));
vi.mock('./api/inventarioApi', () => ({ inventarioApi: mocks }));
const insumo = { id: 'i1', codigo: 'I1', nombre: 'Guantes', unidadMedida: 'caja', stockActual: '1', stockMinimo: '2', descripcion: null, activo: true, updatedAt: '2026-11-05T10:00:00.000Z' };
beforeEach(() => { vi.resetAllMocks(); mocks.listar.mockResolvedValue({ items: [insumo], total: 1, totalPaginas: 1 }); mocks.movimientos.mockResolvedValue({ items: [], total: 0, totalPaginas: 0 }); });
afterEach(cleanup);
function start() { render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><InventarioPage /></QueryClientProvider>); }
describe('inventario', () => {
  it('señala las existencias bajas y envía el filtro al servidor', async () => {
    start(); expect(await screen.findByText('Reponer existencias')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Existencias'), { target: { value: 'bajo' } });
    await waitFor(() => expect(mocks.listar.mock.calls.some(([query]) => query.get('stock') === 'bajo')).toBe(true));
  });
  it('registra un ajuste a cero con motivo y versión', async () => {
    mocks.movimiento.mockResolvedValue({ insumo: { ...insumo, stockActual: '0', updatedAt: '2026-11-05T11:00:00.000Z' } }); start();
    fireEvent.click(await screen.findByRole('button', { name: 'Movimientos de I1' }));
    fireEvent.change(screen.getByLabelText('Tipo de movimiento'), { target: { value: 'AJUSTE' } });
    fireEvent.change(screen.getByLabelText('Existencia final *'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Motivo *'), { target: { value: 'Conteo físico' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar movimiento' }));
    await waitFor(() => expect(mocks.movimiento).toHaveBeenCalledWith('i1', { tipo: 'AJUSTE', cantidad: '0', motivo: 'Conteo físico', version: insumo.updatedAt }));
    expect(await screen.findByText('Movimiento registrado.')).toBeDefined();
  });
  it('conserva cantidad y motivo si se rechaza una salida', async () => {
    mocks.movimiento.mockRejectedValue(new Error('No hay existencias suficientes.')); start();
    fireEvent.click(await screen.findByRole('button', { name: 'Movimientos de I1' }));
    fireEvent.change(screen.getByLabelText('Tipo de movimiento'), { target: { value: 'SALIDA' } });
    fireEvent.change(screen.getByLabelText('Cantidad *'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Motivo *'), { target: { value: 'Consumo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar movimiento' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'No hay existencias suficientes.');
    expect(screen.getByLabelText('Cantidad *')).toHaveProperty('value', '2'); expect(screen.getByLabelText('Motivo *')).toHaveProperty('value', 'Consumo');
  });
});
