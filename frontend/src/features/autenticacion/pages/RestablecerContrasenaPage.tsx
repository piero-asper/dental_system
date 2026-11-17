import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/shared/lib/supabaseClient';
import { prepararRecuperacion } from '../recovery';

export function RestablecerContrasenaPage() {
  const [ready, setReady] = useState(false), [error, setError] = useState('');
  const [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false), [saved, setSaved] = useState(false);
  useEffect(() => {
    let active = true;
    void prepararRecuperacion().then(() => { if (active) setReady(true); }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'No se pudo verificar el enlace. Solicita uno nuevo.');
    });
    return () => { active = false; };
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready || saving || saved) return;
    setError('');
    if (password.length < 8) { setError('Usa al menos ocho caracteres.'); return; }
    if (password !== confirmation) { setError('Las contraseñas no coinciden.'); return; }
    setSaving(true);
    try {
      if (!supabase) throw new Error();
      const { error: cause } = await supabase.auth.updateUser({ password });
      if (cause) throw cause;
      setSaved(true); setPassword(''); setConfirmation('');
      // El éxito del cambio no depende del cierre de la sesión de recuperación.
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    } catch { setError('No se pudo cambiar la contraseña. Revisa los requisitos de tu cuenta, comprueba la conexión o solicita un enlace nuevo.'); }
    finally { setSaving(false); }
  }
  return <main className="login-page"><section className="login-panel">
    <span className="brand-mark" aria-hidden="true">SD</span><h1>Establecer contraseña</h1>
    {saved ? <><p className="success-message" role="status">Tu contraseña se actualizó. Ya puedes iniciar sesión.</p><Link className="text-link" to="/login">Ir al acceso</Link></> : <>
      {!ready && !error && <p role="status">Verificando el enlace…</p>}
      {ready && <form className="login-form" onSubmit={(event) => { void submit(event); }} aria-busy={saving}>
        <p>Elige una contraseña de al menos ocho caracteres.</p>
        <label htmlFor="new-password">Contraseña nueva</label>
        <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} disabled={saving} />
        <label htmlFor="confirm-password">Confirmar contraseña</label>
        <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} disabled={saving} />
        <button className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar contraseña'}</button>
      </form>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <p><Link className="text-link" to="/recuperar-acceso">Solicitar otro enlace</Link></p>
    </>}
  </section></main>;
}
