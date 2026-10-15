// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PacientesPage } from './pages/PacientesPage';
import { PacienteFormPage } from './pages/PacienteFormPage';
import { PacienteDetallePage } from './pages/PacienteDetallePage';
import type { Paciente } from './api/pacientesApi';
import { ApiError } from '@/shared/lib/apiClient';

const mocks = vi.hoisted(() => ({ apiClient: vi.fn() }));
vi.mock('@/shared/lib/apiClient', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/shared/lib/apiClient')>(), apiClient: mocks.apiClient
}));
// No real Supabase client or browser session is used in patient UI tests.
vi.mock('@/shared/lib/supabaseClient', () => ({ supabase: null }));

const initial: Paciente = {
  id: 'e63a8a72-b348-4324-9d8f-72fdbf5f25a6', nombres: 'Lucia', apellidos: 'Torres Rojas', telefono: '999111222',
  activo: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z'
};
let records: Paciente[];
let failCreate = false;

function start(path = '/pacientes') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/pacientes" element={<PacientesPage />} />
    <Route path="/pacientes/nuevo" element={<PacienteFormPage />} />
    <Route path="/pacientes/:id" element={<PacienteDetallePage />} />
    <Route path="/pacientes/:id/editar" element={<PacienteFormPage />} />
  </Routes></MemoryRouter></QueryClientProvider>);
  return client;
}

beforeEach(() => {
  records = [{ ...initial }]; failCreate = false; mocks.apiClient.mockReset();
  mocks.apiClient.mockImplementation(async (path: string, options?: RequestInit) => {
    const url = new URL(path, 'http://example.test');
    if (options?.method === 'POST') {
      if (failCreate) throw new ApiError(503, ['El servicio no está disponible. Intenta nuevamente.']);
      const item = { ...initial, ...JSON.parse(String(options.body)), id: 'new-patient' };
      records.push(item); return item;
    }
    if (options?.method === 'PATCH') {
      const item = { ...records[0], ...JSON.parse(String(options.body)) };
      records[0] = item; return item;
    }
    if (url.pathname === '/pacientes') return { items: records, total: records.length, pagina: Number(url.searchParams.get('pagina') ?? 1), tamanoPagina: 20, totalPaginas: 1 };
    return records.find((item) => url.pathname.endsWith(item.id));
  });
});
afterEach(cleanup);

describe('gestion de pacientes', () => {
  it('busca al escribir, aplica el estado inmediatamente y vuelve a pagina 1', async () => {
    start('/pacientes?pagina=2');
    await screen.findByText('Torres Rojas, Lucia');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Lucia' } });
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'inactivos' } });
    await waitFor(() => expect(mocks.apiClient).toHaveBeenCalledWith(expect.stringContaining('q=Lucia&estado=inactivos&pagina=1'), expect.anything()));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'T' } });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'To' } });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Torres ' } });
    await waitFor(() => expect(mocks.apiClient).toHaveBeenCalledWith(expect.stringContaining('q=Torres&estado=inactivos&pagina=1'), expect.anything()));
    expect(mocks.apiClient.mock.calls.some(([path]) => /[?&]q=(T|To)&/.test(path))).toBe(false);
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('Torres ');
    expect(screen.queryByRole('button', { name: 'Buscar', exact: true })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
    await waitFor(() => expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe(''));
  });

  it('registra y abre la ficha usando solo nombres y apellidos', async () => {
    records = [];
    start();
    await screen.findByText('Aún no hay pacientes');
    fireEvent.click(screen.getByRole('link', { name: 'Nuevo paciente' }));
    for (const label of [/DNI/i, /Fecha de nacimiento/i, /Sexo/i, /Correo/i, /Dirección/i, /emergencia/i]) {
      expect(screen.queryByLabelText(label)).toBeNull();
    }
    fireEvent.change(screen.getByLabelText('Nombres *'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Apellidos *'), { target: { value: 'Perez' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar paciente' }));
    await screen.findByRole('heading', { name: 'Ana Perez' });
    expect(records[0]).toMatchObject({ nombres: 'Ana', apellidos: 'Perez', telefono: null });
    expect(mocks.apiClient).toHaveBeenCalledWith('/pacientes', expect.objectContaining({
      body: JSON.stringify({ nombres: 'Ana', apellidos: 'Perez', telefono: null, activo: true })
    }));
  });

  it('muestra un fallo al guardar sin perder lo escrito', async () => {
    failCreate = true;
    start('/pacientes/nuevo');
    fireEvent.change(screen.getByLabelText('Nombres *'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Apellidos *'), { target: { value: 'Perez' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar paciente' }));
    expect((await screen.findByRole('alert')).textContent).toContain('El servicio no está disponible');
    expect((screen.getByLabelText('Nombres *') as HTMLInputElement).value).toBe('Ana');
  });

  it('edita, limpia un campo opcional y desactiva sin borrar la ficha', async () => {
    start('/pacientes?q=Lucia&estado=activos');
    await screen.findByRole('link', { name: 'Ver ficha de Lucia Torres Rojas' });
    fireEvent.click(screen.getByRole('link', { name: 'Ver ficha de Lucia Torres Rojas' }));
    await screen.findByRole('heading', { name: 'Lucia Torres Rojas' });
    fireEvent.click(screen.getByRole('link', { name: 'Editar paciente' }));
    await screen.findByRole('button', { name: 'Guardar cambios' });
    fireEvent.change(screen.getByLabelText('Teléfono', { exact: true }), { target: { value: '' } });
    fireEvent.click(screen.getByLabelText('Paciente activo'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await screen.findByRole('heading', { name: 'Pacientes', exact: true });
    expect(screen.getByText('Los cambios del paciente se guardaron correctamente.')).toBeTruthy();
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('Lucia');
    expect((screen.getByLabelText('Estado') as HTMLSelectElement).value).toBe('activos');
    await screen.findByText('Sin teléfono');
    expect(records[0]).toMatchObject({ telefono: null, activo: false, nombres: 'Lucia' });
    expect(records).toHaveLength(1);
  });

  it('muestra un error de consulta y permite reintentar', async () => {
    mocks.apiClient.mockRejectedValueOnce(new TypeError('fetch failed'));
    start();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByText('Torres Rojas, Lucia');
  });

  it('navega entre paginas y conserva los filtros al volver de la ficha', async () => {
    mocks.apiClient.mockImplementation(async (path: string) => path.includes('?')
      ? { items: [initial], total: 21, pagina: path.includes('pagina=2') ? 2 : 1, tamanoPagina: 20, totalPaginas: 2 }
      : initial);
    start('/pacientes?q=Lucia&estado=activos');
    await screen.findByText('Página 1 de 2');
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await screen.findByText('Página 2 de 2');
    fireEvent.click(screen.getByRole('link', { name: 'Ver ficha de Lucia Torres Rojas' }));
    await screen.findByRole('heading', { name: 'Lucia Torres Rojas' });
    fireEvent.click(screen.getByRole('link', { name: '← Volver a pacientes' }));
    await screen.findByText('Página 2 de 2');
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('Lucia');
  });

  it('conserva los filtros al cancelar la edicion de una ficha', async () => {
    start('/pacientes?q=Lucia&estado=activos');
    await screen.findByRole('link', { name: 'Ver ficha de Lucia Torres Rojas' });
    fireEvent.click(screen.getByRole('link', { name: 'Ver ficha de Lucia Torres Rojas' }));
    await screen.findByRole('link', { name: 'Editar paciente' });
    fireEvent.click(screen.getByRole('link', { name: 'Editar paciente' }));
    await screen.findByRole('button', { name: 'Guardar cambios' });
    fireEvent.click(screen.getByRole('link', { name: 'Cancelar' }));
    await screen.findByRole('link', { name: '← Volver a pacientes' });
    fireEvent.click(screen.getByRole('link', { name: '← Volver a pacientes' }));
    await screen.findByRole('searchbox');
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('Lucia');
    expect((screen.getByLabelText('Estado') as HTMLSelectElement).value).toBe('activos');
  });
});
