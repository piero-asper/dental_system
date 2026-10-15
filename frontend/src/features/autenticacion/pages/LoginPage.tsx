import { FormEvent, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/auth/AuthProvider';
import { SessionStatus } from '@/shared/auth/ProtectedRoute';

export function LoginPage() {
  const { session, user, loading, error, signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const requestedPath: unknown = location.state?.from;
  const destination = typeof requestedPath === 'string' && requestedPath.startsWith('/') &&
    !requestedPath.startsWith('//') && !requestedPath.startsWith('/login') ? requestedPath : '/panel';

  if (loading || (session && !user)) return <SessionStatus />;
  if (user) return <Navigate to={destination} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await signIn(email, password);
      setPassword('');
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo iniciar sesión. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="login-page">
    <section className="login-panel">
      <span className="brand-mark" aria-hidden="true">SD</span>
      <p className="eyebrow">Acceso a la clínica</p>
      <h1>Sistema Dental</h1>
      <p>Inicia sesión para gestionar tu clínica.</p>
      <form className="login-form" onSubmit={(event) => { void handleSubmit(event); }} aria-busy={submitting}>
        <label htmlFor="email">Correo electrónico</label>
        <input id="email" name="email" type="email" autoComplete="username" required autoFocus
          value={email} onChange={(event) => setEmail(event.target.value)} disabled={submitting} />
        <label htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required
          value={password} onChange={(event) => setPassword(event.target.value)} disabled={submitting} />
        {(formError || error) && <p className="form-error" role="alert">{formError ?? error}</p>}
        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? 'Ingresando…' : 'Iniciar sesión'}
        </button>
      </form>
      <p className="login-help">Acceso exclusivo para la cuenta autorizada de la clínica.</p>
    </section>
  </main>;
}

