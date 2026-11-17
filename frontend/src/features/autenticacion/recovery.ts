import { supabase } from '@/shared/lib/supabaseClient';

// Una sola operación por enlace incluso con el montaje doble de React StrictMode.
let pending: Promise<void> | undefined;
export function prepararRecuperacion() {
  if (pending) return pending;
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  const code = query.get('code');
  const invalid = hash.has('error') || query.has('error');
  // Retira las credenciales del historial antes de cualquier petición.
  if (window.location.hash || window.location.search) window.history.replaceState(null, '', window.location.pathname);
  pending = (async () => {
    if (!supabase || invalid) throw new Error('El enlace no es válido o ya venció. Solicita otro correo de recuperación.');
    if (accessToken || refreshToken) {
      if (hash.get('type') !== 'recovery' || !accessToken || !refreshToken) throw new Error('El enlace de recuperación está incompleto. Solicita otro.');
      const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (error) throw new Error('El enlace venció. Solicita otro correo de recuperación.');
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw new Error('El enlace venció o se abrió en otro navegador. Solicita otro correo de recuperación.');
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw new Error('Abre el enlace que recibiste por correo para establecer tu contraseña.');
  })();
  return pending;
}
