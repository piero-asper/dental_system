import { GoneException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PagosRepository } from './pagos.repository';
import { PagosService } from './pagos.service';
describe('corte financiero', () => {
  const movimiento = (id: string, tipo: string, monto: string) => ({ id, tipo, monto: new Prisma.Decimal(monto), metodoPago: 'EFECTIVO', createdAt: new Date('2026-01-01T15:00:00Z'),
    descripcion: 'Prueba', pago: { id: 'p1', pacienteId: 'patient', paciente: { nombres: 'Ana', apellidos: '=Prueba' }, comprobante: { numero: 'REC-00000001' } } });
  it('concilia resumen, detalle y exportación, aislando los cortes por cuenta', async () => {
    const repository = { datosReporte: jest.fn().mockResolvedValue({ movimientos: [movimiento('1', 'INGRESO', '100.20'), movimiento('2', 'EGRESO', '20.10')], saldoPendiente: '80.00', presupuestosPendientes: 1 }) };
    const service = new PagosService(repository as unknown as PagosRepository);
    const resumen = await service.resumen({ desde: '2026-01-01', hasta: '2026-01-02' }, 'actor');
    expect(resumen).toMatchObject({ ingresos: '100.20', reversiones: '20.10', neto: '80.10', saldoPendiente: '80.00' });
    expect(service.detalleReporte({ corte: resumen.corte, pagina: 1 }, 'actor').items).toHaveLength(2);
    expect(service.csv({ corte: resumen.corte, pagina: 1 }, 'actor')).toContain('"\'=Prueba, Ana"');
    expect(() => service.detalleReporte({ corte: resumen.corte, pagina: 1 }, 'otro')).toThrow(GoneException);
    const time = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 300001);
    expect(() => service.csv({ corte: resumen.corte, pagina: 1 }, 'actor')).toThrow(GoneException); time.mockRestore();
  });
});
