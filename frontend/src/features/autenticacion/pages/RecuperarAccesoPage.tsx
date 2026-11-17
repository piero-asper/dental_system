import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/shared/lib/supabaseClient';

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
    } catch {
      setError('No se pudo solicitar el correo. Comprueba la conexión y vuelve a intentarlo en unos minutos.');
    } finally { setSending(false); }
  }
  return <main className="login-page"><section className="login-panel">
    <span className="brand-mark" aria-hidden="true">SD</span><h1>Recuperar acceso</h1>
    <p>Escribe el correo de tu cuenta para recibir un enlace y elegir una contraseña nueva.</p>
    {sent ? <p className="success-message" role="status">Si el correo corresponde a una cuenta autorizada, recibirás el enlace. Revisa también la carpeta de correo no deseado.</p> :
      <form className="login-form" onSubmit={(event) => { void submit(event); }} aria-busy={sending}>
        <label htmlFor="recovery-email">Correo electrónico</label>
        <input id="recovery-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={sending} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button" disabled={sending}>{sending ? 'Solicitando…' : 'Enviar enlace de recuperación'}</button>
      </form>}
    <p><Link className="text-link" to="/login">Volver al acceso</Link></p>
  </section></main>;
}
