// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { RecuperarAccesoPage } from './pages/RecuperarAccesoPage';
import { RestablecerContrasenaPage } from './pages/RestablecerContrasenaPage';
const mocks = vi.hoisted(() => ({ resetPasswordForEmail: vi.fn(), updateUser: vi.fn(), signOut: vi.fn(), preparar: vi.fn() }));
vi.mock('@/shared/lib/supabaseClient', () => ({ supabase: { auth: mocks } }));
vi.mock('./recovery', () => ({ prepararRecuperacion: mocks.preparar }));
beforeEach(() => { vi.resetAllMocks(); mocks.preparar.mockResolvedValue(undefined); mocks.signOut.mockResolvedValue({ error: null }); });
afterEach(cleanup);
describe('recuperación de contraseña', () => {
  it('solicita el correo con el destino local y usa una respuesta que no revela cuentas', async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null }); render(<MemoryRouter><RecuperarAccesoPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'cuenta@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace de recuperación' }));
    await waitFor(() => expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith('cuenta@example.test', { redirectTo: `${window.location.origin}/restablecer-contrasena` }));
    expect(await screen.findByRole('status')).toHaveProperty('textContent', expect.stringContaining('Si el correo corresponde'));
  });
  it('conserva el correo ante un fallo de conexión', async () => {
    mocks.resetPasswordForEmail.mockRejectedValue(new Error()); render(<MemoryRouter><RecuperarAccesoPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'cuenta@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace de recuperación' })); await screen.findByRole('alert');
    expect(screen.getByLabelText('Correo electrónico')).toHaveProperty('value', 'cuenta@example.test');
  });
  it('valida la confirmación antes de cambiar la contraseña', async () => {
    mocks.updateUser.mockResolvedValue({ error: null }); render(<MemoryRouter><RestablecerContrasenaPage /></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText('Contraseña nueva'), { target: { value: 'Solo-para-prueba-123' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'otra-para-prueba-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' })); await screen.findByText('Las contraseñas no coinciden.');
    expect(mocks.updateUser).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'Solo-para-prueba-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));
    expect(await screen.findByText('Tu contraseña se actualizó. Ya puedes iniciar sesión.')).toBeDefined(); expect(mocks.signOut).toHaveBeenCalled();
  });
});
