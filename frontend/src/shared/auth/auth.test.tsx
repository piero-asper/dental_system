// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './AuthProvider';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../../features/autenticacion/pages/LoginPage';
import { AppShell } from '../components/AppShell';
import type { Session } from '@supabase/supabase-js';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), onAuthStateChange: vi.fn(), unsubscribe: vi.fn()
}));
vi.mock('../lib/supabaseClient', () => ({ supabase: { auth: {
  getSession: mocks.getSession, signInWithPassword: mocks.signIn,
  signOut: mocks.signOut, onAuthStateChange: mocks.onAuthStateChange
} } }));

const session = { access_token: 'access-one', user: { id: 'user-one', email: 'clinica@example.com' } } as Session;
let emit: (event: string, session: Session | null) => void;
let fetchMock: ReturnType<typeof vi.fn>;

function start(path = '/pacientes') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><AuthProvider><MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}><Route element={<AppShell />}>
        <Route path="/pacientes" element={<h1>Pacientes privados</h1>} />
        <Route path="/panel" element={<h1>Panel privado</h1>} />
      </Route></Route>
    </Routes>
  </MemoryRouter></AuthProvider></QueryClientProvider>);
  return client;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mocks.onAuthStateChange.mockImplementation((callback) => {
    emit = callback;
    return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
  });
  mocks.signIn.mockResolvedValue({ error: null });
  mocks.signOut.mockImplementation(async () => { emit('SIGNED_OUT', null); return { error: null }; });
  fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ authUserId: 'user-one', email: session.user.email })));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('flujo de autenticacion', () => {
  it('redirige al login sin mostrar datos privados y vuelve al destino al ingresar', async () => {
    mocks.signIn.mockImplementation(async () => { emit('SIGNED_IN', session); return { error: null }; });
    start();
    await screen.findByRole('button', { name: 'Iniciar sesión' });
    expect(screen.queryByText('Pacientes privados')).toBeNull();
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'clinica@example.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'example-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    await screen.findByText('Pacientes privados');
    expect(mocks.signIn).toHaveBeenCalledWith({ email: 'clinica@example.com', password: 'example-password' });
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer access-one');
  });

  it('muestra error de credenciales y mantiene el acceso cerrado', async () => {
    mocks.signIn.mockResolvedValue({ error: { status: 400 } });
    start('/login');
    await screen.findByLabelText('Correo electrónico');
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect((await screen.findByRole('alert')).textContent).toContain('No se pudo iniciar sesión');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('restaura sesion, verifica en backend y borra cache al cerrar sesion', async () => {
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    const client = start();
    await screen.findByText('Pacientes privados');
    client.setQueryData(['pacientes'], ['dato privado']);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await screen.findByRole('button', { name: 'Iniciar sesión' });
    expect(client.getQueryData(['pacientes'])).toBeUndefined();
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('rechaza una sesion local cuyo token devuelve 401', async () => {
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    fetchMock.mockResolvedValue(new Response('{}', { status: 401 }));
    start();
    await screen.findByRole('button', { name: 'Iniciar sesión' });
    expect(screen.queryByText('Pacientes privados')).toBeNull();
    expect(mocks.signOut).toHaveBeenCalled();
  });

  it('permite reintentar un fallo de backend sin mostrar el panel', async () => {
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 503 }));
    start();
    await screen.findByRole('button', { name: 'Reintentar' });
    expect(screen.queryByText('Pacientes privados')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByText('Pacientes privados');
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it('revalida el token renovado y reacciona a cierre desde otra pestaña', async () => {
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    start();
    await screen.findByText('Pacientes privados');
    act(() => emit('TOKEN_REFRESHED', { ...session, access_token: 'access-two' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect((fetchMock.mock.calls[1][1].headers as Headers).get('Authorization')).toBe('Bearer access-two');
    act(() => emit('SIGNED_OUT', null));
    await screen.findByRole('button', { name: 'Iniciar sesión' });
    expect(screen.queryByText('Pacientes privados')).toBeNull();
  });

  it('ignora una verificacion anterior que termina despues del cierre de sesion', async () => {
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    let resolveVerification!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => { resolveVerification = resolve; }));
    start();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    act(() => emit('SIGNED_OUT', null));
    await screen.findByRole('button', { name: 'Iniciar sesión' });
    await act(async () => { resolveVerification(new Response(JSON.stringify({ authUserId: 'user-one' }))); });
    expect(screen.queryByText('Pacientes privados')).toBeNull();
  });

  it('mantiene la opcion de reintentar si llega un evento con el mismo token', async () => {
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 503 }));
    start();
    await screen.findByRole('button', { name: 'Reintentar' });
    act(() => emit('SIGNED_IN', session));
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByText('Pacientes privados');
  });
});
