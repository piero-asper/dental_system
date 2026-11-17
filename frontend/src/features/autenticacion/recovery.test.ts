// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ setSession: vi.fn(), exchangeCodeForSession: vi.fn(), getUser: vi.fn() }));
vi.mock('@/shared/lib/supabaseClient', () => ({ supabase: { auth: mocks } }));
beforeEach(() => {
  vi.resetModules(); vi.resetAllMocks(); window.history.replaceState(null, '', '/restablecer-contrasena');
  mocks.setSession.mockResolvedValue({ error: null }); mocks.getUser.mockResolvedValue({ data: { user: { id: 'u' } }, error: null });
});
describe('verificación de recuperación', () => {
  it('retira los tokens de la URL y verifica la cuenta una sola vez', async () => {
    window.history.replaceState(null, '', '/restablecer-contrasena#type=recovery&access_token=fake-access&refresh_token=fake-refresh');
    const { prepararRecuperacion } = await import('./recovery');
    const first = prepararRecuperacion(); expect(window.location.hash).toBe('');
    await Promise.all([first, prepararRecuperacion()]);
    expect(mocks.setSession).toHaveBeenCalledTimes(1); expect(mocks.getUser).toHaveBeenCalledTimes(1);
  });
  it('rechaza un enlace vencido aunque exista una sesión previa', async () => {
    window.history.replaceState(null, '', '/restablecer-contrasena#error=access_denied');
    const { prepararRecuperacion } = await import('./recovery');
    await expect(prepararRecuperacion()).rejects.toThrow('venció'); expect(mocks.getUser).not.toHaveBeenCalled();
  });
  it('no permite continuar sin sesión verificada', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error() });
    const { prepararRecuperacion } = await import('./recovery'); await expect(prepararRecuperacion()).rejects.toThrow('correo');
  });
});
