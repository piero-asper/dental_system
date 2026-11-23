import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CircleX, Eye, EyeOff, LockKeyhole, Mail, X } from 'lucide-react';
import { useAuth } from '@/shared/auth/AuthProvider';
import { SessionStatus } from '@/shared/auth/ProtectedRoute';
import { AuthLayout } from '../components/AuthLayout';

export function LoginPage() {
  const { session, user, loading, error, signIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const rememberedEmail = typeof window === 'undefined' ? null : window.localStorage.getItem('dental-system.remembered-email');
  const [email, setEmail] = useState(rememberedEmail ?? '');
  const [rememberUser, setRememberUser] = useState(Boolean(rememberedEmail));
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const requestedPath: unknown = location.state?.from;
  const destination = typeof requestedPath === 'string' && requestedPath.startsWith('/') &&
    !requestedPath.startsWith('//') && !requestedPath.startsWith('/login') ? requestedPath : '/panel';
  const loginError = formError ?? error;
  const visibleLoginError = loginError && loginError !== dismissedError ? loginError : null;

  if (loading || (session && !user)) return <SessionStatus />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFormError(null);
    setDismissedError(null);
    try {
      await signIn(email, password);
      if (rememberUser) window.localStorage.setItem('dental-system.remembered-email', email.trim());
      else window.localStorage.removeItem('dental-system.remembered-email');
      setPassword('');
      navigate(destination, { replace: true });
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
    loginNotice={visibleLoginError ? <LoginErrorAlert message={visibleLoginError} onDismiss={() => setDismissedError(visibleLoginError)} /> : undefined}
  >
      <form className="login-form" onSubmit={(event) => { void handleSubmit(event); }} aria-busy={submitting}>
        <label className="login-field login-user-field" htmlFor="email"><span>Usuario o correo electrónico</span><span className="login-input"><Mail size={18} aria-hidden="true" />
          <input id="email" name="email" type="email" autoComplete="username" required autoFocus placeholder="usuario o nombre@clinica.com"
            value={email} onChange={(event) => { setEmail(event.target.value); setDismissedError(null); }} disabled={submitting} /></span></label>
        <label className="login-field" htmlFor="password"><span>Contraseña</span><span className="login-input"><LockKeyhole size={18} aria-hidden="true" />
          <input id="password" name="password" type={passwordVisible ? 'text' : 'password'} autoComplete="current-password" required placeholder="Ingresa tu contraseña"
            value={password} onChange={(event) => { setPassword(event.target.value); setDismissedError(null); }} disabled={submitting} />
          <button type="button" className="password-visibility" onClick={() => setPasswordVisible((visible) => !visible)} disabled={submitting}
            aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
        <div className="login-form-options">
          <label className="login-remember"><input type="checkbox" checked={rememberUser} onChange={(event) => { setRememberUser(event.target.checked); if (!event.target.checked) window.localStorage.removeItem('dental-system.remembered-email'); }} disabled={submitting} />Recordar usuario</label>
          <Link className="text-link" to="/recuperar-acceso">¿Olvidaste tu contraseña?</Link>
        </div>
        <button className="primary-button login-submit-button" type="submit" disabled={submitting}>
          <span>{submitting ? 'Ingresando…' : 'Iniciar sesión'}</span><ArrowRight size={18} aria-hidden="true" />
        </button>
      </form>
  </AuthLayout>;
}

function LoginErrorAlert({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const detail = message.toLowerCase().includes('demasiados intentos') ? message : 'Revisa tus credenciales y la conexión.';
  return <div className="login-error-alert" role="alert"><CircleX aria-hidden="true" size={21} /><div><strong>No se pudo iniciar sesión</strong><p>{detail}</p></div><button type="button" aria-label="Cerrar mensaje de error" onClick={onDismiss}><X aria-hidden="true" size={18} /></button></div>;
}

