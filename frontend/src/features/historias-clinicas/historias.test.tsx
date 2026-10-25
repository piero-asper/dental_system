// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { HistoriasClinicasPage } from './pages/HistoriasClinicasPage';
import { Historia } from './api/historiasApi';
import { ApiError } from '@/shared/lib/apiClient';
const mocks = vi.hoisted(() => ({ apiClient: vi.fn() }));
vi.mock('@/shared/lib/apiClient', async (original) => ({ ...await original<typeof import('@/shared/lib/apiClient')>(), apiClient: mocks.apiClient }));
vi.mock('@/shared/lib/supabaseClient', () => ({ supabase: null }));
const patient = { id: 'patient', nombres: 'Lucia', apellidos: 'Torres', activo: true };
let history: Historia | null, failWrite = false;
const initial = (): Historia => ({ id: 'history', pacienteId: patient.id, paciente: patient, antecedentesMedicos: 'Sin antecedentes', alergias: 'Penicilina', medicamentos: null, observaciones: null, updatedAt: '2026-01-01T00:00:00Z', evoluciones: [], odontograma: [] });
function start(path = '/historias-clinicas?pacienteId=patient') { const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><HistoriasClinicasPage /></MemoryRouter></QueryClientProvider>); }
beforeEach(() => {
  history = initial(); failWrite = false; mocks.apiClient.mockReset();
  mocks.apiClient.mockImplementation(async (path: string, options?: RequestInit) => {
    const data = options?.body ? JSON.parse(String(options.body)) : null;
    if(path.includes('/citas?'))return {items:[],total:0,totalPaginas:0};
    if (path.startsWith('/pacientes/')) return patient;
    if(!options?.method&&path.includes('/evoluciones?'))return {items:history?.evoluciones??[],total:history?.evoluciones.length??0,pagina:1,totalPaginas:1};
    if(!options?.method&&path.endsWith('/odontograma'))return history?.odontograma??[];
    if (path.includes('/auditoria?')) return { items: [{ id: 'audit', accion: 'UPDATE', tablaAfectada: 'historias_clinicas', createdAt: '2026-01-01T00:00:00Z', authUserId: 'actor', valorAnterior: { alergias: 'Penicilina' }, valorNuevo: { alergias: null } }], pagina: 1, total: 1, totalPaginas: 1 };
    if (options?.method) {
      if (failWrite) throw new ApiError(409, ['El registro cambio. Recarga la historia antes de guardar.']);
      if (path.endsWith('/evoluciones')) { const item = { id: 'evolution', ...data, updatedAt: '2026-01-02T00:00:00Z' }; history = { ...history!, evoluciones: [item] }; return item; }
      if (path.endsWith('/odontograma')) { const item = { id: 'tooth', ...data, updatedAt: '2026-01-02T00:00:00Z' }; history = { ...history!, odontograma: [...history!.odontograma, item] }; return item; }
      if (path.endsWith('/odontograma/tooth')) { history = { ...history!, odontograma: [{ ...history!.odontograma[0], ...data, updatedAt: '2026-01-03T00:00:00Z' }] }; return history.odontograma[0]; }
      history = { ...(history ?? initial()), ...data, updatedAt: '2026-01-02T00:00:00Z' }; return history;
    }
    if (!history) throw new ApiError(404, ['No se encontro la historia clinica.']); return history;
  });
});
afterEach(cleanup);
describe('historia clinica', () => {
  it('restaura antecedentes al confirmar la recarga aunque la versión no haya cambiado',async()=>{
    const confirm=vi.spyOn(window,'confirm').mockReturnValue(true);
    try{
      start();
      fireEvent.change(await screen.findByLabelText('Alergias'),{target:{value:'Cambio sin guardar'}});
      fireEvent.click(screen.getByRole('button',{name:'Recargar historia'}));
      await waitFor(()=>expect((screen.getByLabelText('Alergias') as HTMLTextAreaElement).value).toBe('Penicilina'));
      expect(confirm).toHaveBeenCalledTimes(1);
    }finally{confirm.mockRestore();}
  });
  it('protege una evolución cuando solo se cambia su fecha',async()=>{
    const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);
    try{
      start('/historias-clinicas?pacienteId=patient&tab=evoluciones');
      fireEvent.click(await screen.findByRole('button',{name:'Nueva evolución'}));
      fireEvent.change(screen.getByLabelText('Fecha de atención (Colombia)'),{target:{value:'2026-01-05T10:00'}});
      fireEvent.click(screen.getByRole('button',{name:'Cerrar',exact:true}));
      expect(confirm).toHaveBeenCalledTimes(1);
      expect((screen.getByLabelText('Fecha de atención (Colombia)') as HTMLInputElement).value).toBe('2026-01-05T10:00');
    }finally{confirm.mockRestore();}
  });
  it('envía un nulo explícito al quitar la cita asociada de una evolución',async()=>{
    history!.evoluciones=[{id:'ev',fecha:'2026-01-01T15:00:00Z',updatedAt:'2026-01-01T15:00:00Z',diagnostico:'Control',procedimiento:'Revisión',estado:'BORRADOR',citaId:'cita'}];
    start('/historias-clinicas?pacienteId=patient&tab=evoluciones');
    fireEvent.click(await screen.findByRole('button',{name:'Continuar borrador'}));
    fireEvent.change(screen.getByLabelText('Cita asociada'),{target:{value:''}});
    fireEvent.click(screen.getByRole('button',{name:'Guardar borrador'}));
    await waitFor(()=>expect(mocks.apiClient).toHaveBeenCalledWith('/historias-clinicas/patient/evoluciones/ev',expect.objectContaining({method:'PATCH',body:expect.stringContaining('"citaId":null')})));
  });
  it('solicita seleccionar paciente antes de mostrar datos clinicos', () => { start('/historias-clinicas'); expect(screen.getByRole('searchbox')).toBeDefined(); expect(screen.queryByText('Penicilina')).toBeNull(); });
  it('crea historia y permite limpiar un campo existente', async () => { history = null; start(); fireEvent.change(await screen.findByLabelText('Alergias'), { target: { value: 'Penicilina' } }); fireEvent.click(screen.getByRole('button', { name: 'Crear historia clínica' })); await screen.findByText('Los datos clínicos se guardaron correctamente.'); fireEvent.change(screen.getByLabelText('Alergias'), { target: { value: '' } }); fireEvent.click(screen.getByRole('button', { name: 'Guardar antecedentes' })); await waitFor(() => expect(history?.alergias).toBeNull()); });
  it('conserva lo escrito al detectar un cambio simultaneo', async () => { failWrite = true; start(); fireEvent.change(await screen.findByLabelText('Alergias'), { target: { value: 'Otro dato' } }); fireEvent.click(screen.getByRole('button', { name: 'Guardar antecedentes' })); await screen.findByRole('alert'); expect((screen.getByLabelText('Alergias') as HTMLTextAreaElement).value).toBe('Otro dato'); expect(history?.alergias).toBe('Penicilina'); });
  it('registra una evolucion y muestra el resultado', async () => { start(); await screen.findByLabelText('Alergias'); fireEvent.click(screen.getByRole('button', { name: 'Evoluciones', exact: true })); fireEvent.click(screen.getByRole('button', { name: 'Nueva evolución' })); fireEvent.change(screen.getByLabelText('Diagnóstico'), { target: { value: 'Caries 11' } }); fireEvent.change(screen.getByLabelText('Procedimiento'), { target: { value: 'Evaluación' } }); fireEvent.change(screen.getByLabelText('Estado del registro'), { target: { value: 'FINALIZADA' } }); fireEvent.click(screen.getByRole('button', { name: 'Guardar evolución' })); await screen.findByText('Caries 11'); expect(history?.evoluciones).toHaveLength(1); });
  it('muestra 52 piezas FDI sin evaluar y registra/corrige hallazgos', async () => { start(); await screen.findByLabelText('Alergias'); fireEvent.click(screen.getByRole('button', { name: 'Odontograma', exact: true })); expect(screen.getAllByRole('button', { name: /^Pieza \d{2}:/ })).toHaveLength(52); fireEvent.click(screen.getByRole('button', { name: 'Pieza 51: sin evaluar' })); fireEvent.change(screen.getByLabelText('Estado dental'), { target: { value: 'CARIES' } }); fireEvent.click(screen.getByRole('button', { name: 'Registrar hallazgo' })); await screen.findByRole('button', { name: 'Actualizar hallazgo' }); expect(history?.odontograma[0]).toMatchObject({ pieza: '51', estado: 'CARIES' }); fireEvent.change(screen.getByLabelText('Estado dental'), { target: { value: 'RESTAURADO' } }); fireEvent.click(screen.getByRole('button', { name: 'Actualizar hallazgo' })); await waitFor(() => expect(history?.odontograma[0].estado).toBe('RESTAURADO')); });
  it('muestra auditoria sin acciones de borrado', async () => { start(); await screen.findByLabelText('Alergias'); fireEvent.click(screen.getByRole('button', { name: 'Auditoría', exact: true })); await screen.findByText('1 cambios registrados.'); expect(screen.getByText('Valor anterior')).toBeDefined(); expect(screen.getAllByText('Penicilina').length).toBeGreaterThan(0); expect(screen.queryByRole('button', { name: /eliminar|borrar/i })).toBeNull(); });
});
