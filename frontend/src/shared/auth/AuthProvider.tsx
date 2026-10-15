import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, apiClient } from '../lib/apiClient';
import { supabase } from '../lib/supabaseClient';

type AuthUser = { authUserId: string; email?: string };
type AuthContextValue = {
  session: Session | null;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  retry: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [verified, setVerified] = useState<{ token: string; user: AuthUser } | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const previousUserId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!supabase) {
      setError('Falta configurar la conexión de acceso. Contacta al administrador.');
      setRestoring(false);
      return;
    }

    let active = true;
    let receivedEvent = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      receivedEvent = true;
      setSession(nextSession);
      setRestoring(false);
      if (!nextSession) setError(null);
    });

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active || receivedEvent) return;
      setSession(data.session);
      setError(sessionError ? 'No se pudo recuperar la sesión. Vuelve a iniciar sesión.' : null);
      setRestoring(false);
    }).catch(() => {
      if (active && !receivedEvent) {
        setError('No se pudo recuperar la sesión. Vuelve a iniciar sesión.');
        setRestoring(false);
      }
    });

    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (previousUserId.current !== session?.user.id) {
      queryClient.clear();
      previousUserId.current = session?.user.id;
    }
  }, [session?.user.id, queryClient]);

  const token = session?.access_token;
  const user = verified?.token === token ? verified?.user ?? null : null;
  useEffect(() => {
    setVerified(null);
    if (!token) {
      setChecking(false);
      return;
    }

    let active = true;
    const controller = new AbortController();
    setChecking(true);
    setError(null);
    void apiClient<AuthUser>('/autenticacion/sesion', {
      token, cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)])
    })
      .then((verifiedUser) => {
        if (!active) return;
        setVerified({ token, user: verifiedUser });
      })
      .catch(async (cause: unknown) => {
        if (!active) return;
        if (cause instanceof ApiError && cause.status === 401) {
          await supabase?.auth.signOut({ scope: 'local' }).catch(() => undefined);
          if (!active) return;
          setSession(null);
          queryClient.clear();
          setError('Tu sesión venció. Vuelve a iniciar sesión.');
        } else {
          setError('No pudimos verificar tu sesión. Comprueba la conexión e intenta nuevamente.');
        }
      })
      .finally(() => { if (active) setChecking(false); });

    return () => { active = false; controller.abort(); };
  }, [token, attempt, queryClient]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('El acceso todavía no está configurado.');
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) {
      throw new Error(authError.status === 429
        ? 'Demasiados intentos. Espera un momento y vuelve a intentarlo.'
        : 'No se pudo iniciar sesión. Revisa tu correo, contraseña y conexión.');
    }
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) {
      const { error: authError } = await supabase.auth.signOut({ scope: 'local' });
      if (authError) throw new Error('No se pudo cerrar la sesión. Intenta nuevamente.');
    }
    setSession(null);
    setVerified(null);
    setError(null);
    queryClient.clear();
  }, [queryClient]);

  return <AuthContext.Provider value={{ session, user, loading: restoring || checking || Boolean(token && !user && !error), error, signIn, signOut, retry: () => setAttempt((value) => value + 1) }}>
    {children}
  </AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth requiere AuthProvider.');
  return context;
}
