// @vitest-environment jsdom
import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { PanelPage,ReportesPage } from './pages/BiPage';
import { clinicDate } from '@/shared/lib/clinical';
const mocks=vi.hoisted(()=>({apiClient:vi.fn()}));
vi.mock('@/shared/lib/apiClient',()=>({apiClient:mocks.apiClient}));
const snapshot=()=>({corte:'snapshot',actualizado:'2026-10-18T15:00:00Z',desde:'2026-10-01',hasta:'2026-10-19',parcial:true,comparacion:{desde:'2026-09-01T05:00:00Z',hasta:'2026-09-18T15:00:00Z',actualHasta:'2026-10-18T15:00:00Z'},indicadores:{nuevos:1,atendidas:0},variaciones:{nuevos:{anterior:0,diferencia:1,porcentaje:null}},tasaInasistencia:null,tasaCancelacion:null,ocupacion:{porcentaje:null,minutosDisponibles:0,minutosReservados:0,diasSinHorario:18},series:[{fecha:'2026-10-18',pacientes:1,citas:0}],demanda:[]});
function CurrentLocation(){const location=useLocation();return <output data-testid="current-location">{location.pathname}{location.search}</output>;}
function start(panel=false){const client=new QueryClient({defaultOptions:{queries:{retry:false}}});render(<QueryClientProvider client={client}><MemoryRouter>{panel?<PanelPage/>:<ReportesPage/>}<CurrentLocation/></MemoryRouter></QueryClientProvider>);}
beforeEach(()=>{mocks.apiClient.mockReset();mocks.apiClient.mockImplementation(async(path:string)=>path.startsWith('/bi/resumen')?snapshot():{items:[{id:'patient',pacienteId:'patient',paciente:'Torres, Lucia',fecha:'2026-10-18T15:00:00Z',estado:'Activo',tipo:'paciente'}],total:1,totalPaginas:1});});afterEach(cleanup);
describe('BI operativo',()=>{
  it('el panel conserva el corte de BI al abrir una tarjeta',async()=>{
    start(true);
    fireEvent.click(await screen.findByRole('button',{name:/Pacientes nuevos 1/}));
    await screen.findByText('Torres, Lucia');
    expect(mocks.apiClient).toHaveBeenCalledWith('/bi/detalle?corte=snapshot&metrica=nuevos&pagina=1');
  });
  it('permite abrir el detalle de un punto del gráfico con el teclado',async()=>{
    start(true);
    const point=await screen.findByRole('button',{name:'2026-10-18: 1 nuevos pacientes'});
    fireEvent.keyDown(point,{key:'Enter'});
    await screen.findByText('Torres, Lucia');
    expect(mocks.apiClient).toHaveBeenCalledWith('/bi/detalle?corte=snapshot&metrica=nuevos_2026-10-18&pagina=1');
  });
  it('filtra las próximas citas sin modificar los datos de la consulta',async()=>{
    mocks.apiClient.mockResolvedValue({...snapshot(),proximas:[
      {id:'a',pacienteId:'p1',fechaInicio:'2026-10-25T14:00:00Z',estado:'CONFIRMADA',paciente:{nombres:'Lucia',apellidos:'Torres'}},
      {id:'b',pacienteId:'p2',fechaInicio:'2026-10-25T15:00:00Z',estado:'PROGRAMADA',paciente:{nombres:'Julio',apellidos:'Rojas'}}
    ]});
    start(true);
    await screen.findByText('Rojas, Julio');
    fireEvent.click(screen.getByRole('button',{name:'Confirmadas',exact:true}));
    expect(screen.queryByText('Rojas, Julio')).toBeNull();
    expect(screen.getByText('Torres, Lucia')).toBeDefined();
    fireEvent.click(screen.getByRole('button',{name:'Todas las próximas',exact:true}));
    expect(screen.getByText('Rojas, Julio')).toBeDefined();
  });
  it('la búsqueda del panel abre pacientes con el texto introducido',async()=>{
    start(true);
    fireEvent.change(screen.getByRole('searchbox',{name:'Buscar paciente'}),{target:{value:'Lucía Pérez'}});
    fireEvent.click(screen.getByRole('button',{name:'Buscar paciente',exact:true}));
    await waitFor(()=>expect(screen.getByTestId('current-location').textContent).toBe('/pacientes?q=Luc%C3%ADa+P%C3%A9rez'));
  });
  it('abre el detalle de las inasistencias ya iniciadas desde la tasa',async()=>{
    start();
    fireEvent.click(await screen.findByRole('button',{name:/Tasa de inasistencia/}));
    await screen.findByText('Torres, Lucia');
    expect(mocks.apiClient).toHaveBeenCalledWith('/bi/detalle?corte=snapshot&metrica=inasistencias_iniciadas&pagina=1');
  });
  it('muestra próximas citas y enlaza su detalle desde el panel',async()=>{
    mocks.apiClient.mockResolvedValue({...snapshot(),proximas:[{id:'cita-proxima',pacienteId:'patient',fechaInicio:'2026-10-25T14:00:00Z',estado:'CONFIRMADA',paciente:{nombres:'Lucia',apellidos:'Torres'}}]});
    start(true);
    await screen.findByText('Torres, Lucia');
    expect(screen.getByRole('link',{name:'Ver cita'}).getAttribute('href')).toBe('/citas?fecha=2026-10-25&citaId=cita-proxima');
  });
  it('distingue porcentajes sin base y muestra pendientes sin inventar cifras',async()=>{start();await screen.findByRole('heading',{name:'Actividad por día'});expect(screen.getAllByText('Sin base de cálculo')).toHaveLength(2);expect(screen.getByText('No disponible')).toBeDefined();expect(screen.getByText(/18 días sin horario registrado/)).toBeDefined();});
  it('abre el detalle del mismo corte al pulsar un indicador',async()=>{start();fireEvent.click(await screen.findByRole('button',{name:/Pacientes nuevos/}));await screen.findByText('Torres, Lucia');expect(mocks.apiClient).toHaveBeenCalledWith('/bi/detalle?corte=snapshot&metrica=nuevos&pagina=1');expect(screen.getByRole('link',{name:'Ver registro'}).getAttribute('href')).toBe('/pacientes/patient');});
  it('una barra consulta exactamente los registros de su día',async()=>{start();fireEvent.click(await screen.findByRole('button',{name:'2026-10-18: 1 nuevos pacientes'}));await screen.findByText('Torres, Lucia');expect(mocks.apiClient).toHaveBeenCalledWith('/bi/detalle?corte=snapshot&metrica=nuevos_2026-10-18&pagina=1');});
  it('el panel inicia en el día de Colombia y mantiene filtros de periodo',async()=>{start(true);await screen.findByRole('heading',{name:'Panel de la clínica'});await waitFor(()=>expect(mocks.apiClient.mock.calls.some(([path])=>path.includes(`desde=${clinicDate()}`))).toBe(true));fireEvent.change(screen.getByLabelText('Desde'),{target:{value:'2026-01-01'}});fireEvent.change(screen.getByLabelText('Hasta (sin incluir)'),{target:{value:'2026-02-01'}});fireEvent.click(screen.getByRole('button',{name:'Consultar'}));await waitFor(()=>expect(mocks.apiClient).toHaveBeenCalledWith('/bi/resumen?desde=2026-01-01&hasta=2026-02-01',expect.anything()));});
});
