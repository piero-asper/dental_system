import { FormEvent, useState } from 'react';
import { UnsavedChanges, confirmDiscard } from '@/shared/components/UnsavedChanges';
import { mostrarImporte } from '@/shared/lib/importes';
import { CuentaPresupuesto, MetodoPago, PagoInput, mediosPago } from '../api/pagosApi';

export function PagoForm({ cuenta, onSave, onClose }: { cuenta: CuentaPresupuesto; onSave: (data: PagoInput) => Promise<void>; onClose: () => void }) {
  const [monto, setMonto] = useState(''), [metodoPago, setMetodo] = useState<MetodoPago>('EFECTIVO');
  const [referencia, setReferencia] = useState(''), [observaciones, setObservaciones] = useState('');
  const [claveSolicitud] = useState(() => crypto.randomUUID());
  const [saving, setSaving] = useState(false), [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError('');
    try { await onSave({ presupuestoId: cuenta.id, monto, metodoPago, claveSolicitud, referencia: referencia.trim(), observaciones: observaciones.trim() || null }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo registrar el cobro. Comprueba el historial antes de reintentar.'); }
    finally { setSaving(false); }
  }
  return <form className="surface patient-form" onSubmit={(e) => { void submit(e); }} aria-busy={saving}>
    <UnsavedChanges dirty={!!monto || !!referencia || !!observaciones || metodoPago !== 'EFECTIVO'} />
    <h2>Registrar abono</h2><p><strong>{cuenta.paciente.apellidos}, {cuenta.paciente.nombres}</strong></p>
    <p>Total del presupuesto: {mostrarImporte(cuenta.total)} · Abonado: {mostrarImporte(cuenta.abonado)} · <strong>Saldo: {mostrarImporte(cuenta.saldo)}</strong></p>
    <fieldset disabled={saving}><legend>Datos del cobro</legend><div className="form-grid">
      <label>Importe recibido *<input type="number" min="0.01" max={cuenta.saldo} step="0.01" required value={monto} onChange={(e) => setMonto(e.target.value)} /></label>
      <label>Medio de pago<select value={metodoPago} onChange={(e) => setMetodo(e.target.value as MetodoPago)}>{Object.entries(mediosPago).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Referencia del pago<input maxLength={100} value={referencia} onChange={(e) => setReferencia(e.target.value)} /></label>
      <label>Observaciones<textarea maxLength={1000} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} /></label>
    </div><p className="field-hint">Registra el importe que ya recibiste. Se guardarán el abono, el recibo interno y el movimiento de caja con la fecha actual.</p></fieldset>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions"><button className="primary-button" disabled={saving}>{saving ? 'Registrando…' : 'Confirmar cobro'}</button>
      <button type="button" className="secondary-button" disabled={saving} onClick={() => { if (confirmDiscard()) onClose(); }}>Cancelar</button></div>
  </form>;
}
