import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PacienteSelector } from '@/shared/components/PacienteSelector';
import { ListaPaginacion } from '@/shared/components/ListaPaginacion';
import { RequestError } from '@/shared/components/RequestError';
import { UnsavedChanges, confirmDiscard } from '@/shared/components/UnsavedChanges';
import { centesimas, decimalTexto, mostrarImporte } from '@/shared/lib/importes';
import { tratamientosApi, type Presupuesto, type PresupuestoInput, type PresupuestoItemInput } from '../api/tratamientosApi';

type Linea = PresupuestoItemInput & { nombre: string; key: number };
export function PresupuestoForm({ presupuesto, pacienteInicial = '', onSave, onClose }: {
  presupuesto?: Presupuesto; pacienteInicial?: string; onSave: (input: PresupuestoInput) => Promise<void>; onClose: () => void;
}) {
  const [pacienteId, setPacienteId] = useState(presupuesto?.pacienteId ?? pacienteInicial);
  const [items, setItems] = useState<Linea[]>(() => presupuesto?.items.map((item, index) => ({ tratamientoId: item.tratamientoId, cantidad: item.cantidad,
    precioUnitario: item.precioUnitario, pieza: item.pieza, observaciones: item.observaciones, nombre: item.tratamiento.nombre, key: index })) ?? []);
  const [nextKey, setNextKey] = useState(items.length);
  const [descuento, setDescuento] = useState(presupuesto?.descuento ?? '0'), [observaciones, setObservaciones] = useState(presupuesto?.observaciones ?? '');
  const [initial] = useState(JSON.stringify({ pacienteId, items, descuento, observaciones }));
  const [q, setQ] = useState(''), [pagina, setPagina] = useState(1), [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false), [error, setError] = useState('');
  const query = new URLSearchParams({ q, estado: 'activos', pagina: String(pagina), tamanoPagina: '10' });
  const catalogo = useQuery({ queryKey: ['tratamientos', 'selector', query.toString()], queryFn: ({ signal }) => tratamientosApi.listar(query, signal), retry: false });
  const prices = items.map((item) => { const cents = centesimas(item.precioUnitario); return cents !== null && Number.isInteger(item.cantidad) && item.cantidad > 0 ? cents * BigInt(item.cantidad) : null; });
  const subtotal = prices.some((value) => value === null) ? null : prices.reduce<bigint>((total, value) => total + (value ?? 0n), 0n);
  const discount = centesimas(descuento);
  const total = subtotal !== null && discount !== null && discount <= subtotal ? subtotal - discount : null;
  const changeItem = (key: number, changes: Partial<Linea>) => setItems((current) => current.map((item) => item.key === key ? { ...item, ...changes } : item));
  async function submit(event: FormEvent) {
    event.preventDefault(); if (saving) return;
    if (!pacienteId || !items.length) { setError('Selecciona un paciente y agrega al menos un tratamiento.'); return; }
    if (total === null) { setError('Revisa precios, cantidades y descuento. El descuento no debe superar el subtotal.'); return; }
    setSaving(true); setError('');
    try {
      await onSave({ pacienteId, items: items.map(({ key: _key, nombre: _nombre, ...item }) => item), descuento, observaciones: observaciones.trim() || null,
        ...(presupuesto ? { version: presupuesto.updatedAt } : {}) });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el presupuesto.'); }
    finally { setSaving(false); }
  }
  return <form className="surface patient-form" onSubmit={(e) => { void submit(e); }} aria-busy={saving}>
    <UnsavedChanges dirty={initial !== JSON.stringify({ pacienteId, items, descuento, observaciones })} />
    <h2>{presupuesto ? 'Editar borrador' : 'Nuevo presupuesto'}</h2>
    {presupuesto ? <p>Paciente: {presupuesto.paciente.apellidos}, {presupuesto.paciente.nombres}</p> : <PacienteSelector value={pacienteId} onChange={setPacienteId} activos disabled={saving} />}
    <fieldset disabled={saving}><legend>Agregar tratamientos</legend>
      <div className="form-grid"><label>Buscar en el catálogo<input type="search" maxLength={100} value={q} onChange={(e) => { setQ(e.target.value); setPagina(1); setSelected(''); }} /></label>
        <label>Tratamiento<select value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Selecciona un tratamiento</option>
          {catalogo.data?.items.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre} · {mostrarImporte(item.precioBase)}</option>)}</select></label></div>
      {catalogo.isPending && <p role="status">Cargando catálogo…</p>}
      {catalogo.isError && <RequestError error={catalogo.error} retry={() => { void catalogo.refetch(); }} />}
      {catalogo.data && <ListaPaginacion pagina={pagina} totalPaginas={catalogo.data.totalPaginas} onChange={(page) => { setPagina(page); setSelected(''); }} />}
      <button type="button" className="secondary-button" disabled={!selected || items.length >= 100} onClick={() => {
        const tratamiento = catalogo.data?.items.find((item) => item.id === selected);
        if (!tratamiento) return;
        setItems((current) => [...current, { key: nextKey, tratamientoId: tratamiento.id, nombre: tratamiento.nombre, cantidad: 1, precioUnitario: tratamiento.precioBase, pieza: null }]);
        setNextKey(nextKey + 1); setSelected('');
      }}>Agregar tratamiento</button>
    </fieldset>
    {items.map((item, index) => <fieldset className="budget-line" key={item.key} disabled={saving}><legend>{index + 1}. {item.nombre}</legend><div className="form-grid">
      <label>Cantidad<input aria-label={`Cantidad de ${item.nombre} ${index + 1}`} type="number" min="1" max="9999" step="1" required value={item.cantidad || ''} onChange={(e) => changeItem(item.key, { cantidad: Number(e.target.value) })} /></label>
      <label>Precio unitario<input aria-label={`Precio de ${item.nombre} ${index + 1}`} type="number" min="0" max="9999999999.99" step="0.01" required value={item.precioUnitario} onChange={(e) => changeItem(item.key, { precioUnitario: e.target.value })} /></label>
      <label>Pieza FDI (opcional)<input placeholder="Ej. 16" maxLength={2} pattern="([1-4][1-8]|[5-8][1-5])" value={item.pieza ?? ''} onChange={(e) => changeItem(item.key, { pieza: e.target.value || null })} /></label>
      <label>Notas del tratamiento<textarea maxLength={5000} value={item.observaciones ?? ''} onChange={(e) => changeItem(item.key, { observaciones: e.target.value || null })} /></label>
    </div><button type="button" className="secondary-button" onClick={() => setItems((current) => current.filter((row) => row.key !== item.key))}>Quitar {item.nombre}</button></fieldset>)}
    <fieldset disabled={saving}><legend>Resumen</legend><div className="form-grid">
      <label>Descuento (importe)<input type="number" min="0" max="9999999999.99" step="0.01" required value={descuento} onChange={(e) => setDescuento(e.target.value)} /></label>
      <label>Observaciones<textarea maxLength={5000} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} /></label>
    </div><p aria-live="polite">Subtotal: {subtotal !== null ? mostrarImporte(decimalTexto(subtotal)) : '—'} · Total: <strong>{total !== null ? mostrarImporte(decimalTexto(total)) : 'Revisa los importes'}</strong></p>
      <p className="field-hint">Se guardará como borrador. El precio acordado se conserva aunque después cambie el catálogo.</p></fieldset>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions"><button className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar borrador'}</button>
      <button type="button" className="secondary-button" disabled={saving} onClick={() => { if (confirmDiscard()) onClose(); }}>Cancelar</button></div>
  </form>;
}
