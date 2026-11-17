import { FormEvent, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from '@/shared/auth/AuthProvider';
import { SessionStatus } from '@/shared/auth/ProtectedRoute';
import { AuthLayout } from '../components/AuthLayout';

export function LoginPage() {
  const { session, user, loading, error, signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
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

  return <AuthLayout
    eyebrow="Acceso a la clínica"
    title="Bienvenido a Dental System"
    description="Ingresa tus credenciales para acceder a tu clínica."
    footer={<p className="login-help">¿Necesitas ayuda? Contacta al administrador de la clínica.</p>}
  >
      <form className="login-form" onSubmit={(event) => { void handleSubmit(event); }} aria-busy={submitting}>
        <label className="login-field" htmlFor="email"><span>Correo electrónico</span><span className="login-input"><Mail size={18} aria-hidden="true" />
          <input id="email" name="email" type="email" autoComplete="username" required autoFocus placeholder="Ingresa tu correo electrónico"
            value={email} onChange={(event) => setEmail(event.target.value)} disabled={submitting} /></span></label>
        <label className="login-field" htmlFor="password"><span>Contraseña</span><span className="login-input"><LockKeyhole size={18} aria-hidden="true" />
          <input id="password" name="password" type={passwordVisible ? 'text' : 'password'} autoComplete="current-password" required placeholder="Tu contraseña"
            value={password} onChange={(event) => setPassword(event.target.value)} disabled={submitting} />
          <button type="button" className="password-visibility" onClick={() => setPasswordVisible((visible) => !visible)} disabled={submitting}
            aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
        {(formError || error) && <p className="form-error" role="alert">{formError ?? error}</p>}
        <div className="login-form-options">
          <span>Acceso exclusivo para personal autorizado.</span>
          <Link className="text-link" to="/recuperar-acceso">¿Olvidaste tu contraseña?</Link>
        </div>
        <button className="primary-button login-submit-button" type="submit" disabled={submitting}>
          <span>{submitting ? 'Ingresando…' : 'Iniciar sesión'}</span><ArrowRight size={18} aria-hidden="true" />
        </button>
      </form>
  </AuthLayout>;
}

