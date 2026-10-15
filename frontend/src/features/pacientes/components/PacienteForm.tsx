import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { mensajeError, Paciente, PacienteInput } from '../api/pacientesApi';

type FormValues = {
  nombres: string; apellidos: string; telefono: string; activo: boolean;
};

export function PacienteForm({ paciente, cancelTo, cancelState, onSave }: {
  paciente?: Paciente; cancelTo: string; cancelState?: { listSearch: string }; onSave: (data: PacienteInput) => Promise<void>;
}) {
  const [values, setValues] = useState<FormValues>({
    nombres: paciente?.nombres ?? '',
    apellidos: paciente?.apellidos ?? '', telefono: paciente?.telefono ?? '',
    activo: paciente?.activo ?? true
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function change(name: keyof FormValues, value: string | boolean) {
    setValues((current) => ({ ...current, [name]: value }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError(null);
    if (!values.nombres.trim() || !values.apellidos.trim()) {
      setError('Los nombres y apellidos son obligatorios.');
      return;
    }
    setSaving(true);
    try {
      const optional = (value: string) => value.trim() || null;
      await onSave({ ...values, nombres: values.nombres.trim(), apellidos: values.apellidos.trim(),
        telefono: optional(values.telefono) });
    } catch (cause) { setError(mensajeError(cause)); }
    finally { setSaving(false); }
  }

  return <form className="patient-form surface" onSubmit={(event) => { void submit(event); }} aria-busy={saving}>
    <p className="form-intro">Los campos con * son obligatorios.</p>
    <fieldset disabled={saving}>
      <legend>Datos personales</legend>
      <div className="form-grid">
        <label>Nombres *<input name="nombres" autoComplete="given-name" required autoFocus maxLength={100} value={values.nombres} onChange={(event) => change('nombres', event.target.value)} /></label>
        <label>Apellidos *<input name="apellidos" autoComplete="family-name" required maxLength={100} value={values.apellidos} onChange={(event) => change('apellidos', event.target.value)} /></label>
      </div>
    </fieldset>
    <fieldset disabled={saving}>
      <legend>Datos de contacto</legend>
      <div className="form-grid">
        <label>Teléfono<input name="telefono" type="tel" autoComplete="tel" maxLength={30} value={values.telefono} onChange={(event) => change('telefono', event.target.value)} /></label>
      </div>
    </fieldset>
    {paciente && <label className="checkbox-label"><input name="activo" type="checkbox" checked={values.activo} disabled={saving} onChange={(event) => change('activo', event.target.checked)} />Paciente activo</label>}
    {paciente && <p className="field-hint">Al desactivar un paciente se conserva su ficha y puedes volver a activarlo.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions">
      <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Guardando…' : paciente ? 'Guardar cambios' : 'Guardar paciente'}</button>
      {!saving && <Link className="secondary-button" to={cancelTo} state={cancelState}>Cancelar</Link>}
    </div>
  </form>;
}
