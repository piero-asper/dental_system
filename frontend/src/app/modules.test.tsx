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
  it.each(['tratamientos', 'pagos', 'inventario'])('muestra aviso y descripcion al abrir %s', (path) => {
    start(modules, `/${path}`);
    const definition = modules.find((item) => item.path === path)!;
    expect(screen.getByRole('heading', { level: 1, name: definition.title })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Pantalla en Construccion' })).toBeDefined();
    expect(screen.getByText(definition.description)).toBeDefined();
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
