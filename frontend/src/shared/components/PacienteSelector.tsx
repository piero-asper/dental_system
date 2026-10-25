import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { RequestError } from './RequestError';
export type PacienteResumen = { id: string; nombres: string; apellidos: string; telefono?: string | null; activo: boolean };
export function PacienteSelector({ value, onChange, activos = false, disabled = false }: {
  value: string; onChange: (id: string) => void; activos?: boolean; disabled?: boolean;
}) {
  const [q, setQ] = useState(''), [search, setSearch] = useState(''), [pagina, setPagina] = useState(1);
  useEffect(() => { const timer = setTimeout(() => { setSearch(q.trim()); setPagina(1); }, 300); return () => clearTimeout(timer); }, [q]);
  const selected = useQuery({ queryKey: ['paciente-resumen', value], enabled: !!value,
    queryFn: ({ signal }) => apiClient<PacienteResumen>(`/pacientes/${encodeURIComponent(value)}`, { signal, cache: 'no-store' }), retry: false });
  const list = useQuery({ queryKey: ['pacientes-selector', search, pagina, activos], enabled: !value && !!search,
    queryFn: ({ signal }) => apiClient<{ items: PacienteResumen[]; totalPaginas: number }>(`/pacientes?${new URLSearchParams({ q: search, pagina: String(pagina), tamanoPagina: '10', estado: activos ? 'activos' : 'todos' })}`, { signal, cache: 'no-store' }), retry: false });
  if (value) return <div className="patient-picker">
    {selected.isPending && <p role="status">Cargando paciente…</p>}
    {selected.isError && <RequestError error={selected.error} retry={() => { void selected.refetch(); }} />}
    {selected.data && <p><strong>{selected.data.apellidos}, {selected.data.nombres}</strong> · {selected.data.telefono || 'Sin teléfono'}{!selected.data.activo && ' · Inactivo'}</p>}
    <button type="button" className="secondary-button" disabled={disabled} onClick={() => { onChange(''); setQ(''); }}>Cambiar paciente</button>
  </div>;
  return <div className="patient-picker">
    <label>Buscar paciente<input type="search" value={q} maxLength={100} disabled={disabled} placeholder="Nombre, apellido o teléfono" onChange={(e) => setQ(e.target.value)} /></label>
    {!search && <p className="field-hint">Escribe para buscar{activos ? ' pacientes activos' : ''}.</p>}
    {list.isFetching && <p role="status">Buscando pacientes…</p>}
    {list.isError && <RequestError error={list.error} retry={() => { void list.refetch(); }} />}
    {list.data && <><ul className="patient-results">{list.data.items.map((p) => <li key={p.id}><button type="button" disabled={disabled} onClick={() => onChange(p.id)}><strong>{p.apellidos}, {p.nombres}</strong><span>{p.telefono || 'Sin teléfono'}{!p.activo && ' · Inactivo'}</span></button></li>)}</ul>
      {!list.data.items.length && <p>No se encontraron pacientes.</p>}
      {list.data.totalPaginas > 1 && <nav className="inline-actions" aria-label="Páginas de búsqueda"><button type="button" disabled={disabled || pagina === 1} onClick={() => setPagina(pagina - 1)}>Anterior</button><span>{pagina} / {list.data.totalPaginas}</span><button type="button" disabled={disabled || pagina >= list.data.totalPaginas} onClick={() => setPagina(pagina + 1)}>Siguiente</button></nav>}
    </>}
  </div>;
}
