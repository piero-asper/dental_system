import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Mail } from 'lucide-react';
import { supabase } from '@/shared/lib/supabaseClient';
import { AuthLayout } from '../components/AuthLayout';

function messageForRecoveryError(cause: unknown) {
  const detail = cause instanceof Error ? cause.message.toLowerCase() : '';
  const status = typeof cause === 'object' && cause !== null && 'status' in cause ? (cause as { status?: unknown }).status : undefined;
  const code = typeof cause === 'object' && cause !== null && 'code' in cause ? (cause as { code?: unknown }).code : undefined;
  if (status === 429 || code === 429 || detail.includes('rate limit') || detail.includes('too many') || detail.includes('429')) {
    return 'Se solicitaron demasiados enlaces. Espera unos minutos antes de intentarlo nuevamente.';
  }
  if (detail.includes('redirect') || detail.includes('redirect_to')) {
    return 'No se pudo preparar el enlace de recuperación. Contacta al administrador de la clínica.';
  }
  return 'No se pudo solicitar el correo. Comprueba tu conexión y vuelve a intentarlo en unos minutos.';
}

export function RecuperarAccesoPage() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending || sent) return;
    setSending(true); setError('');
    try {
      if (!supabase) throw new Error();
      const { error: cause } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/restablecer-contrasena`
      });
      if (cause) throw cause;
      setSent(true);
    } catch (cause) {
      setError(messageForRecoveryError(cause));
    } finally { setSending(false); }
  }
  return <AuthLayout eyebrow="Recuperar acceso" title="Recupera tu acceso" description="Recibirás un enlace personal para crear una contraseña nueva de forma segura."
    panelClassName="recovery-panel">
    {sent ? <section className="recovery-success" role="status">
      <span className="recovery-success-icon" aria-hidden="true"><CheckCircle2 size={25} /></span>
      <div><h3>Revisa tu correo</h3><p>Si la dirección corresponde a una cuenta autorizada, recibirás un enlace para establecer una contraseña nueva.</p>
        <ul><li>Revisa la bandeja de entrada y correo no deseado.</li><li>Abre el enlace en este mismo navegador.</li><li>El enlace vence por seguridad y solo se puede usar una vez.</li></ul></div>
    </section> :
      <form className="login-form" onSubmit={(event) => { void submit(event); }} aria-busy={sending}>
        <label className="login-field" htmlFor="recovery-email"><span>Correo electrónico</span>
        <span className="login-input"><Mail size={18} aria-hidden="true" /><input id="recovery-email" type="email" autoComplete="username" autoFocus required placeholder="nombre@clinica.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={sending} /></span></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button recovery-submit-button" disabled={sending}><span>{sending ? 'Solicitando…' : 'Enviar enlace de recuperación'}</span><ArrowRight size={18} aria-hidden="true" /></button>
      </form>}
    <div className="recovery-navigation">
      <p className="recovery-back-link"><Link className="text-link" to="/login"><ArrowLeft size={16} aria-hidden="true" />Volver al acceso</Link></p>
    </div>
  </AuthLayout>;
}
