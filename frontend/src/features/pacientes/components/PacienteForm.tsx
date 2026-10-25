import { FormEvent, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';
import { UnsavedChanges } from '@/shared/components/UnsavedChanges';
import { Link } from 'react-router-dom';
import { mensajeError, Paciente, PacienteInput } from '../api/pacientesApi';

type FormValues = {
  nombres: string; apellidos: string; telefono: string; activo: boolean;
};

export function PacienteForm({ paciente, cancelTo, cancelState, onSave }: {
  paciente?: Paciente; cancelTo: string; cancelState?: { listSearch: string }; onSave: (data: PacienteInput, version?: string) => Promise<void>;
}) {
  const [original] = useState(paciente);
  const [values, setValues] = useState<FormValues>({
    nombres: paciente?.nombres ?? '',
    apellidos: paciente?.apellidos ?? '', telefono: paciente?.telefono ?? '',
    activo: paciente?.activo ?? true
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search,setSearch]=useState({nombre:'',telefono:''});
  useEffect(()=>{const timer=setTimeout(()=>setSearch({nombre:`${values.nombres} ${values.apellidos}`.trim().slice(0,100),telefono:values.telefono.replace(/\D/g,'')}),400);return()=>clearTimeout(timer);},[values.nombres,values.apellidos,values.telefono]);
  const matches=useQuery({queryKey:['coincidencias',search],enabled:!paciente && (search.nombre.length>=4 || search.telefono.length>=5),queryFn:async()=>{
    const terms=[...(search.nombre.length>=4?[search.nombre]:[]),...(search.telefono.length>=5?[search.telefono]:[])];
    const results=await Promise.all(terms.map((q)=>apiClient<Paciente[]>(`/pacientes/coincidencias?q=${encodeURIComponent(q)}`)));
    return [...new Map(results.flat().map((p)=>[p.id,p])).values()];
  },retry:false});
  const dirty=JSON.stringify(values)!==JSON.stringify({nombres:original?.nombres??'',apellidos:original?.apellidos??'',telefono:original?.telefono??'',activo:original?.activo??true});

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
        telefono: optional(values.telefono) }, original?.updatedAt);
    } catch (cause) { setError(mensajeError(cause)); }
    finally { setSaving(false); }
  }

  return <form className="patient-form surface" onSubmit={(event) => { void submit(event); }} aria-busy={saving}>
    <UnsavedChanges dirty={dirty && !saving}/>
    {matches.isError&&<p className="notice-warning">No se pudieron consultar posibles coincidencias. Revisa los datos antes de guardar.</p>}
    {!paciente && Array.isArray(matches.data) && matches.data.length>0 && <div className="notice-warning"><strong>Revisa posibles coincidencias</strong><p>Pueden ser personas distintas. Puedes abrir su ficha o continuar con el registro.</p>{matches.data.map((p)=><p key={p.id}><Link className="text-link" to={`/pacientes/${p.id}`}>{p.apellidos}, {p.nombres}</Link> · {p.telefono||'Sin teléfono'}</p>)}</div>}
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
