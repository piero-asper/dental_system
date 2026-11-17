import { FormEvent, useState } from 'react';
import { UnsavedChanges, confirmDiscard } from './UnsavedChanges';

export type CatalogoRegistro = {
  id: string; codigo: string; nombre: string; descripcion: string | null; activo: boolean; updatedAt: string;
  precioBase?: string; unidadMedida?: string; stockMinimo?: string;
};
export type CatalogoInput = {
  nombre: string; descripcion: string | null; activo: boolean;
  precioBase?: string; unidadMedida?: string; stockMinimo?: string; version?: string;
};
export function CatalogoForm({ tipo, registro, onSave, onClose }: {
  tipo: 'tratamiento' | 'insumo'; registro?: CatalogoRegistro;
  onSave: (values: CatalogoInput) => Promise<void>; onClose: () => void;
}) {
  const [initial] = useState({ nombre: registro?.nombre ?? '', descripcion: registro?.descripcion ?? '',
    activo: registro?.activo ?? true, precioBase: registro?.precioBase ?? '', unidadMedida: registro?.unidadMedida ?? 'unidad', stockMinimo: registro?.stockMinimo ?? '0' });
  const [values, setValues] = useState(initial), [saving, setSaving] = useState(false), [error, setError] = useState('');
  const change = (field: keyof typeof values, value: string | boolean) => setValues((current) => ({ ...current, [field]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError('');
    try {
      await onSave({ nombre: values.nombre.trim(), descripcion: values.descripcion.trim() || null, activo: values.activo,
        ...(tipo === 'tratamiento' ? { precioBase: values.precioBase } : { unidadMedida: values.unidadMedida.trim(), stockMinimo: values.stockMinimo }),
        ...(registro ? { version: registro.updatedAt } : {}) });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar. Tus datos siguen aquí.'); }
    finally { setSaving(false); }
  }
  return <form className="surface patient-form" onSubmit={(e) => { void submit(e); }} aria-busy={saving}>
    <UnsavedChanges dirty={JSON.stringify(values) !== JSON.stringify(initial)} />
    <h2>{registro ? 'Editar' : 'Nuevo'} {tipo}</h2>
    <fieldset disabled={saving}><legend>Datos del {tipo}</legend><div className="form-grid">
      {registro && <p className="field-hint full-width">Código asignado automáticamente: <strong>{registro.codigo}</strong></p>}
      <label>Nombre *<input required maxLength={150} value={values.nombre} onChange={(e) => change('nombre', e.target.value)} /></label>
      {tipo === 'tratamiento' ? <label>Precio base *<input required type="number" min="0" max="9999999999.99" step="0.01" value={values.precioBase} onChange={(e) => change('precioBase', e.target.value)} /></label> : <>
        <label>Unidad de medida *<input required maxLength={30} value={values.unidadMedida} onChange={(e) => change('unidadMedida', e.target.value)} /></label>
        <label>Existencia mínima *<input required type="number" min="0" max="9999999999.99" step="0.01" value={values.stockMinimo} onChange={(e) => change('stockMinimo', e.target.value)} /></label>
      </>}
      <label className="full-width">Descripción<textarea maxLength={2000} value={values.descripcion} onChange={(e) => change('descripcion', e.target.value)} /></label>
    </div><label className="checkbox-label"><input type="checkbox" checked={values.activo} onChange={(e) => change('activo', e.target.checked)} />{tipo === 'tratamiento' ? 'Tratamiento activo' : 'Insumo activo'}</label></fieldset>
    {tipo === 'insumo' && <p className="field-hint">Las existencias se registran mediante movimientos. La unidad se conserva después del primer movimiento.</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="form-actions"><button className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
      <button type="button" className="secondary-button" disabled={saving} onClick={() => { if (confirmDiscard()) onClose(); }}>Cancelar</button></div>
  </form>;
}
