import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { errorMessage } from '@/shared/lib/clinical';
import { Antecedentes, Historia, historiasApi } from '../api/historiasApi';
import { UnsavedChanges } from '@/shared/components/UnsavedChanges';

export function HistoriaForm({ pacienteId, historia, onSaved }: { pacienteId: string; historia?: Historia; onSaved: () => Promise<void> }) {
  const initial={ antecedentesMedicos: historia?.antecedentesMedicos ?? '', alergias: historia?.alergias ?? '', medicamentos: historia?.medicamentos ?? '', observaciones: historia?.observaciones ?? '',alergiasRevisadas:historia?.alergiasRevisadas??false,medicamentosRevisados:historia?.medicamentosRevisados??false };
  const [values, setValues] = useState<Antecedentes>(() => initial);
  const mutation = useMutation({ mutationFn: () => {
    const data = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, typeof v==='string'?v.trim() || null:v]));
    return historia ? historiasApi.editar(pacienteId, { ...data, version: historia.updatedAt }) : historiasApi.crear(pacienteId, data);
  }, onSuccess: onSaved });
  return <form className="surface patient-form" onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}><h2>{historia ? 'Antecedentes y notas' : 'Abrir historia clínica'}</h2>
    <UnsavedChanges dirty={JSON.stringify(values)!==JSON.stringify(initial)&&!mutation.isPending&&!mutation.isSuccess}/>
    <p className="field-hint">Los campos vacíos significan información sin registrar. Cada cambio conserva su versión anterior en la auditoría.</p>
    <fieldset disabled={mutation.isPending}><div className="form-grid">{([['antecedentesMedicos', 'Antecedentes médicos'], ['alergias', 'Alergias'], ['medicamentos', 'Medicamentos'], ['observaciones', 'Observaciones generales']] as const).map(([key, title]) => <label key={key}>{title}<textarea rows={4} maxLength={5000} value={values[key] ?? ''} onChange={(e) => setValues({ ...values, [key]: e.target.value })} /></label>)}</div>
      <label className="checkbox-label"><input type="checkbox" checked={values.alergiasRevisadas??false} onChange={(e)=>setValues({...values,alergiasRevisadas:e.target.checked})}/>Alergias revisadas con el paciente (vacío = ninguna reportada)</label>
      <label className="checkbox-label"><input type="checkbox" checked={values.medicamentosRevisados??false} onChange={(e)=>setValues({...values,medicamentosRevisados:e.target.checked})}/>Medicamentos revisados con el paciente (vacío = ninguno reportado)</label>
      {mutation.isError && <p role="alert" className="form-error">{errorMessage(mutation.error)}</p>}<div className="form-actions"><button type="submit" className="primary-button">{mutation.isPending ? 'Guardando…' : historia ? 'Guardar antecedentes' : 'Crear historia clínica'}</button></div>
    </fieldset>
  </form>;
}
