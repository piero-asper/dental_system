// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { CitasPage } from './pages/CitasPage';
import { Cita } from './api/citasApi';
import { addDays, agendaRange, clinicDate, clinicISO } from '@/shared/lib/clinical';
import { ApiError } from '@/shared/lib/apiClient';
const mocks = vi.hoisted(() => ({ apiClient: vi.fn() }));
vi.mock('@/shared/lib/apiClient', async (original) => ({ ...await original<typeof import('@/shared/lib/apiClient')>(), apiClient: mocks.apiClient }));
vi.mock('@/shared/lib/supabaseClient', () => ({ supabase: null }));
const patient = { id: 'patient', nombres: 'Lucia', apellidos: 'Torres', activo: true, telefono: '999111222' };
let records: Cita[], conflict = false;
const today = clinicDate();
function start(calendar=false) { const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); render(<QueryClientProvider client={client}><MemoryRouter><CitasPage /></MemoryRouter></QueryClientProvider>);if(!calendar)fireEvent.change(screen.getByLabelText('Formato'),{target:{value:'lista'}}); }
beforeEach(() => {
  records = []; conflict = false; mocks.apiClient.mockReset();
  mocks.apiClient.mockImplementation(async (path: string, options?: RequestInit) => {
    const url = new URL(path, 'http://test'); const data = options?.body ? JSON.parse(String(options.body)) : null;
    if(url.pathname==='/agenda/disponibilidad')return {configurada:true,intervalos:[],bloqueos:[],franjas:[]};
    if(url.pathname.endsWith('/eventos'))return [];
    if (url.pathname === '/pacientes') return { items: [patient], totalPaginas: 1 };
    if (url.pathname.startsWith('/pacientes/')) return patient;
    if (options?.method === 'POST') { if (conflict) throw new ApiError(409, ['El horario se cruza con otra cita.']); const item = { id: 'cita', ...data, paciente: patient, estado: 'PROGRAMADA', updatedAt: '2026-01-01T00:00:00Z' }; records.push(item); return item; }
    if (options?.method === 'PATCH') { records[0] = { ...records[0], ...data, updatedAt: '2026-01-02T00:00:00Z' }; return records[0]; }
    return records;
  });
});
afterEach(cleanup);
async function fillReservation() {
  fireEvent.click(screen.getByRole('button', { name: 'Reservar cita' }));
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Lucia' } });
  fireEvent.click(await screen.findByRole('button', { name: /Torres, Lucia/ }, { timeout: 3000 }));
  fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Control' } });
}
describe('agenda', () => {
  it('no duplica en el día siguiente una cita que termina a medianoche',async()=>{
    const first=agendaRange(today,true).first;
    records=[{id:'medianoche',pacienteId:patient.id,paciente:patient,fechaInicio:clinicISO(`${first}T23:30`),fechaFin:clinicISO(`${addDays(first,1)}T00:00`),estado:'ATENDIDA',motivo:'Control',notas:null,motivoCancelacion:null,updatedAt:'2026-01-01T00:00:00Z'}];
    start(true);
    fireEvent.change(screen.getByLabelText('Vista'),{target:{value:'semana'}});
    await waitFor(()=>expect(document.querySelectorAll('.calendar-appointment')).toHaveLength(1));
  });
  it('conserva las canceladas sin tapar el horario de una reserva vigente',async()=>{
    const active:Cita={id:'vigente',pacienteId:patient.id,paciente:patient,fechaInicio:clinicISO(`${today}T09:00`),fechaFin:clinicISO(`${today}T09:30`),estado:'CONFIRMADA',motivo:'Control',notas:null,motivoCancelacion:null,updatedAt:'2026-01-01T00:00:00Z'};
    records=[active,{...active,id:'cancelada',estado:'CANCELADA',motivoCancelacion:'Solicitud'}];
    start(true);
    await screen.findByRole('heading',{name:'Citas canceladas'});
    expect(document.querySelectorAll('.calendar-appointment')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button',{name:/Torres, Lucia · Cancelada/}));
    await screen.findByRole('button',{name:'Cerrar detalle'});
  });
  it('muestra agenda vacia y consulta la semana con limites de Colombia', async () => { start(); await screen.findByText('Sin citas.'); fireEvent.change(screen.getByLabelText('Vista'), { target: { value: 'semana' } }); const range = agendaRange(today, true); await waitFor(() => expect(mocks.apiClient.mock.calls.some(([path]) => { const url = new URL(path, 'http://test'); return url.pathname === '/citas' && url.searchParams.get('desde') === range.desde && url.searchParams.get('hasta') === range.hasta; })).toBe(true)); });
  it('reserva buscando un paciente y convierte las horas a UTC', async () => { start(); await fillReservation(); fireEvent.click(screen.getByRole('button', { name: 'Reservar', exact: true })); await screen.findByText('Cita reservada.'); expect(records[0]).toMatchObject({ pacienteId: patient.id, motivo: 'Control', fechaInicio: clinicISO(`${today}T09:00`) }); expect(screen.getByRole('link', { name: 'Historia clínica' }).getAttribute('href')).toContain('pacienteId=patient'); });
  it('conserva el formulario ante un conflicto de horario', async () => { conflict = true; start(); await fillReservation(); fireEvent.click(screen.getByRole('button', { name: 'Reservar', exact: true })); await screen.findByRole('alert'); expect(screen.getByRole('alert').textContent).toContain('se cruza'); expect((screen.getByLabelText('Motivo') as HTMLInputElement).value).toBe('Control'); expect(records).toHaveLength(0); });
  it('reprograma con version y cancela con motivo', async () => {
    records = [{ id: 'cita', pacienteId: patient.id, paciente: patient, fechaInicio: clinicISO(`${today}T09:00`), fechaFin: clinicISO(`${today}T09:30`), estado: 'PROGRAMADA', motivo: 'Control', notas: null, motivoCancelacion: null, updatedAt: '2026-01-01T00:00:00Z' }];
    start(); fireEvent.click(await screen.findByRole('button', { name: 'Reprogramar' })); fireEvent.change(screen.getByLabelText('Fin'), { target: { value: `${today}T10:00` } }); fireEvent.click(screen.getByRole('button', { name: 'Guardar horario' })); await screen.findByText('Cita reprogramada.'); expect(mocks.apiClient.mock.calls.find(([path]) => path.endsWith('/horario'))?.[1]?.body).toContain('"version":"2026-01-01T00:00:00Z"');
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar estado' })); fireEvent.change(screen.getByLabelText('Nuevo estado'), { target: { value: 'CANCELADA' } }); fireEvent.change(screen.getByLabelText('Motivo de cancelación'), { target: { value: 'Solicitud del paciente' } }); fireEvent.click(screen.getByRole('button', { name: 'Guardar estado' })); await screen.findByText('Estado de la cita actualizado.'); expect(records[0].motivoCancelacion).toBe('Solicitud del paciente'); expect(screen.queryByRole('button', { name: 'Reprogramar' })).toBeNull();
  });
  it('permite reintentar un fallo de agenda', async () => { mocks.apiClient.mockRejectedValue(new ApiError(503, ['Servicio no disponible'])); start(); await screen.findByRole('alert'); mocks.apiClient.mockResolvedValue([]); fireEvent.click(screen.getByRole('button', { name: 'Reintentar' })); await screen.findByText('Sin citas.'); });
});
