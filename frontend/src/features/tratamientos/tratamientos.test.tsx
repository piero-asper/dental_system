// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TratamientosPage } from './pages/TratamientosPage';
import { PresupuestoForm } from './components/PresupuestoForm';

const mocks = vi.hoisted(() => ({ listar: vi.fn(), guardar: vi.fn(), presupuestos: vi.fn(), presupuesto: vi.fn(), guardarPresupuesto: vi.fn(), estado: vi.fn() }));
vi.mock('./api/tratamientosApi', () => ({ tratamientosApi: mocks }));
vi.mock('@/shared/components/PacienteSelector', () => ({ PacienteSelector: ({ value, onChange }: { value: string; onChange: (id: string) => void }) =>
  <label>Paciente<input value={value} onChange={(e) => onChange(e.target.value)} /></label> }));
const treatment = { id: 't1', codigo: 'T1', nombre: 'Limpieza', precioBase: '20.10', descripcion: null, activo: true, updatedAt: '2026-11-05T10:00:00.000Z' };
function start(component = <TratamientosPage />) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter>{component}</MemoryRouter></QueryClientProvider>); return client;
}
beforeEach(() => { vi.resetAllMocks(); mocks.listar.mockResolvedValue({ items: [treatment], total: 1, pagina: 1, totalPaginas: 1 });
  mocks.presupuestos.mockResolvedValue({ items: [], total: 0, totalPaginas: 0 }); });
afterEach(cleanup);
describe('tratamientos y presupuestos', () => {
  it('muestra el catálogo real y envía una edición con su versión original', async () => {
    mocks.guardar.mockResolvedValue(treatment); start();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar T1' }));
    fireEvent.change(screen.getByLabelText('Precio base *'), { target: { value: '25.50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(mocks.guardar).toHaveBeenCalledWith(expect.objectContaining({ precioBase: '25.50', version: treatment.updatedAt }), 't1'));
  });
  it('conserva el formulario cuando el servidor rechaza el registro', async () => {
    mocks.guardar.mockRejectedValue(new Error('No se pudo guardar el tratamiento.')); start();
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo tratamiento' }));
    fireEvent.change(screen.getByLabelText('Nombre *'), { target: { value: 'Tratamiento nuevo' } });
    fireEvent.change(screen.getByLabelText('Precio base *'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'No se pudo guardar el tratamiento.');
    expect(screen.getByLabelText('Nombre *')).toHaveProperty('value', 'Tratamiento nuevo');
  });
  it('abre presupuestos y muestra el estado vacío sin cifras inventadas', async () => {
    start(); fireEvent.click(screen.getByRole('button', { name: 'Presupuestos' }));
    expect(await screen.findByText('No hay presupuestos para estos filtros.')).toBeDefined();
  });
  it('crea un borrador con precios exactos, paciente, cantidad y descuento', async () => {
    const save = vi.fn().mockResolvedValue(undefined); start(<PresupuestoForm onSave={save} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Paciente'), { target: { value: 'p1' } });
    await screen.findByRole('option', { name: /T1 · Limpieza/ });
    fireEvent.change(screen.getByLabelText('Tratamiento'), { target: { value: 't1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar tratamiento' }));
    fireEvent.change(screen.getByLabelText('Cantidad de Limpieza 1'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Descuento (importe)'), { target: { value: '0.10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ pacienteId: 'p1', descuento: '0.10', items: [expect.objectContaining({ tratamientoId: 't1', cantidad: 3, precioUnitario: '20.10' })] })));
    expect(save.mock.calls[0][0]).not.toHaveProperty('total');
  });
  it('impide enviar un presupuesto vacío', async () => {
    const save = vi.fn(); start(<PresupuestoForm onSave={save} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Selecciona un paciente y agrega al menos un tratamiento.');
    expect(save).not.toHaveBeenCalled();
  });
});
