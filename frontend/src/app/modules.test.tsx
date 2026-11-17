// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useRoutes } from 'react-router-dom';
import { Package } from 'lucide-react';
import { createModuleNavigation, createModuleRoutes, modules } from './modules';
import type { ModuleDefinition } from './modules';
import { AppShell } from '@/shared/components/AppShell';

vi.mock('@/shared/auth/AuthProvider', () => ({ useAuth: () => ({ user: { email: 'test@example.test' }, signOut: vi.fn() }) }));
vi.mock('@/shared/lib/supabaseClient', () => ({ supabase: null }));
afterEach(cleanup);

function start(definitions: readonly ModuleDefinition[], path: string) {
  render(<MemoryRouter initialEntries={[path]}><ModuleRoutes definitions={definitions} /></MemoryRouter>);
}

function ModuleRoutes({ definitions }: { definitions: readonly ModuleDefinition[] }) {
  return useRoutes([{
    element: <AppShell navigation={createModuleNavigation(definitions)} />,
    children: createModuleRoutes(definitions)
  }]);
}

describe('modulos pendientes y nuevos', () => {
  it('conecta todos los módulos y agrupa el lateral por su flujo', () => {
    expect(modules.every((item) => !!item.Page)).toBe(true);
    const navigation = createModuleNavigation(modules);
    expect(navigation.filter((item) => item.section === 'Pacientes y citas').map((item) => item.to)).toEqual(['/pacientes', '/citas']);
    expect(navigation.filter((item) => item.section === 'Atención clínica').map((item) => item.to)).toEqual(['/historias-clinicas', '/tratamientos']);
    expect(navigation.find((item) => item.to === '/pagos')?.section).toBe('Pagos');
    expect(navigation.find((item) => item.to === '/inventario')?.section).toBe('Inventario');
  });
  it('muestra las secciones sin duplicar sus enlaces', () => {
    const definitions: ModuleDefinition[] = [
      { path: 'pacientes', title: 'Pacientes', description: '', icon: Package, Page: () => <h1>Lista de pacientes</h1> },
      { path: 'citas', title: 'Citas', description: '', icon: Package, Page: () => <h1>Agenda</h1> },
      { path: 'pagos', title: 'Pagos', description: '', icon: Package, Page: () => <h1>Cobros</h1> }
    ];
    start(definitions, '/pacientes');
    expect(screen.getByRole('heading', { name: 'Pacientes y citas' })).toBeDefined();
    expect(screen.getAllByRole('link', { name: 'Citas' })).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Pagos' })).toBeDefined();
  });

  it('un nuevo modulo se abre desde el menu con el aviso sin crear su pagina', async () => {
    const definitions: ModuleDefinition[] = [
      { path: 'inicio', title: 'Inicio', description: 'Inicio disponible', icon: Package, Page: () => <h1>Inicio disponible</h1> },
      { path: 'laboratorio', title: 'Laboratorio', description: 'Permitirá consultar los trabajos enviados al laboratorio.', icon: Package }
    ];
    start(definitions, '/inicio');
    fireEvent.click(screen.getByRole('link', { name: 'Laboratorio' }));
    expect(await screen.findByRole('heading', { name: 'Pantalla en Construccion' })).toBeDefined();
    expect(screen.getByText('Permitirá consultar los trabajos enviados al laboratorio.')).toBeDefined();
  });

  it('al conectar la pagina implementada desaparece el aviso', () => {
    start([{ path: 'listo', title: 'Listo', description: 'Modulo implementado', icon: Package, Page: () => <h1>Pantalla disponible</h1> }], '/listo');
    expect(screen.getByRole('heading', { name: 'Pantalla disponible' })).toBeDefined();
    expect(screen.queryByText('Pantalla en Construccion')).toBeNull();
  });
});
