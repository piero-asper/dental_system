import { GoneException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BiService } from './bi.service';
import { minutosReservados } from './bi.logic';

const reservation=(inicio:string,fin:string)=>({fechaInicio:new Date(inicio),fechaFin:new Date(fin)});
describe('BI: tiempo reservado y corte común',()=>{
  afterEach(()=>jest.useRealTimers());
  it('cuenta la unión de reservas y recorta las citas al horario efectivo',()=>{
    const inicio=new Date('2026-10-24T13:00:00Z'),fin=new Date('2026-10-24T15:00:00Z');
    expect(minutosReservados(inicio,fin,[
      reservation('2026-10-24T12:30:00Z','2026-10-24T14:00:00Z'),
      reservation('2026-10-24T13:30:00Z','2026-10-24T14:30:00Z'),
      reservation('2026-10-24T14:30:00Z','2026-10-24T16:00:00Z'),
      reservation('2026-10-24T16:00:00Z','2026-10-24T17:00:00Z')
    ])).toBe(120);
    expect(minutosReservados(inicio,fin,[])).toBe(0);
  });
  it('excluye citas futuras de la tasa de inasistencia y conserva detalle/CSV del corte',async()=>{
    jest.useFakeTimers().setSystemTime(new Date('2026-10-24T15:00:00Z'));
    const fila=(id:string,fecha:string,estado:string)=>({id,pacienteId:id,paciente:'Paciente de prueba',fecha,estado,tipo:'cita'});
    const grupos=[
      {metrica:'atendidas',total:1n,items:[fila('a','2026-10-24T13:00:00Z','ATENDIDA')]},
      {metrica:'inasistencias',total:2n,items:[fila('b','2026-10-24T14:00:00Z','NO_ASISTIO'),fila('c','2026-10-24T16:00:00Z','NO_ASISTIO')]}
    ];
    const tx={
      $queryRaw:jest.fn().mockResolvedValueOnce(grupos).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]),
      agendaVersion:{findMany:jest.fn().mockResolvedValue([])},agendaBloqueo:{findMany:jest.fn().mockResolvedValue([])},
      cita:{findMany:jest.fn().mockResolvedValue([])}
    };
    const prisma={$transaction:jest.fn((run)=>(run(tx)))} as unknown as PrismaService;
    const service=new BiService(prisma);
    const result=await service.resumen({desde:'2026-10-24',hasta:'2026-10-25'},'cuenta');
    expect(result.tasaInasistencia).toBe(50);
    expect(result.indicadores.inasistencias).toBe(2);
    expect(result.ocupacion.porcentaje).toBeNull();
    const query={corte:result.corte,metrica:'inasistencias',pagina:1};
    const detail=service.detalle(query,'cuenta');
    expect(detail.total).toBe(result.indicadores.inasistencias);
    expect(detail.actualizado).toBe(result.actualizado);
    expect(service.detalle({...query,metrica:'inasistencias_iniciadas'},'cuenta').total).toBe(1);
    expect(service.csv(query,'cuenta').split('\r\n')).toHaveLength(3);
    expect(()=>service.detalle(query,'otra cuenta')).toThrow(GoneException);
    jest.advanceTimersByTime(300001);
    expect(()=>service.detalle(query,'cuenta')).toThrow(GoneException);
  });
});
