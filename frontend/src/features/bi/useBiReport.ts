import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/lib/apiClient';
import { addDays, clinicDate } from '@/shared/lib/clinical';

export type Resumen = {
  proximas?: { id: string; pacienteId: string; fechaInicio: string; estado: string; paciente: { nombres: string; apellidos: string } }[];
  corte: string; actualizado: string; desde: string; hasta: string; parcial: boolean;
  indicadores: Record<string, number>;
  variaciones: Record<string, { anterior: number; diferencia: number; porcentaje: number | null }>;
  comparacion: { desde: string; hasta: string; actualHasta: string };
  tasaInasistencia: number | null; tasaCancelacion: number | null;
  ocupacion: { porcentaje: number | null; minutosDisponibles: number; minutosReservados: number; diasSinHorario: number };
  series: { fecha: string; pacientes: number; citas: number }[];
  demanda: { dia: number; hora: number; total: number }[];
};
type Detalle = { items: { id: string; pacienteId: string; paciente: string; fecha: string | null; estado: string; tipo: string }[]; total: number; totalPaginas: number };

export function useBiReport(panel = false) {
  const [params, setParams] = useSearchParams(), today = clinicDate();
  const desde = params.get('desde') ?? (panel ? today : today.slice(0, 7) + '-01');
  const hasta = params.get('hasta') ?? addDays(today, 1);
  const [draftDesde, setDesde] = useState(desde), [draftHasta, setHasta] = useState(hasta);
  const [metrica, setMetrica] = useState(''), [pagina, setPagina] = useState(1);
  const [exportError, setExportError] = useState<unknown>(null), [exportando, setExportando] = useState(false);
  const query = useQuery({ queryKey: ['bi', desde, hasta], queryFn: () => apiClient<Resumen>(`/bi/resumen?${new URLSearchParams({ desde, hasta })}`, { timeoutMs: 60000 }), retry: false, refetchOnWindowFocus: false });
  const data = query.data;
  const detalle = useQuery({ queryKey: ['bi-detalle', data?.corte, metrica, pagina], enabled: !!data && !!metrica, queryFn: () => apiClient<Detalle>(`/bi/detalle?${new URLSearchParams({ corte: data!.corte, metrica, pagina: String(pagina) })}`), retry: false, refetchOnWindowFocus: false });
  const seleccionar = (key: string) => { setMetrica(key); setPagina(1); setExportError(null); };
  useEffect(() => { setDesde(desde); setHasta(hasta); setPagina(1); }, [desde, hasta]);
  useEffect(() => { setPagina(1); }, [data?.corte]);
  async function exportar() {
    if (!data || !metrica) return;
    setExportando(true); setExportError(null);
    try {
      const csv = await apiClient<string>(`/bi/exportar?${new URLSearchParams({ corte: data.corte, metrica })}`, { responseType: 'text' });
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a'); a.href = url; a.download = `clinica-${metrica}-${desde}.csv`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setExportError(error); }
    finally { setExportando(false); }
  }
  return { today, desde, hasta, draftDesde, draftHasta, setDesde, setHasta, setParams, query, data, detalle, metrica, pagina, setPagina, setMetrica, seleccionar, exportar, exportError, exportando };
}
export type BiReport = ReturnType<typeof useBiReport>;
