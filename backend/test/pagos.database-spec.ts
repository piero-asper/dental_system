import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { PagosRepository } from '../src/modulos/pagos/pagos.repository';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { CarteraQueryDto } from '../src/modulos/pagos/pagos.dto';
process.loadEnvFile(resolve(__dirname, '../.env'));
describe('Pagos, recibos, caja y saldos PostgreSQL con rollback', () => {
  const prisma = new PrismaClient();
  afterAll(async () => prisma.$disconnect());
  it('registra abonos una sola vez, rechaza excesos, conserva recibos y revierte sin residuos ni consumo de numeración', async () => {
    const marker = 'pay' + randomUUID().replace(/-/g, ''), actor = randomUUID(), rollback = new Error('ROLLBACK_PAYMENTS');
    const contadorAntes = await prisma.secuenciaComprobante.findUnique({ where: { serie: 'REC' } });
    let pacienteId = '';
    try {
      await prisma.$transaction(async (tx) => {
        const adapter = new Proxy(tx, { get(target, property) {
          if (property === '$transaction') return (arg: ((t: typeof tx) => Promise<unknown>) | Promise<unknown>[]) => typeof arg === 'function' ? arg(tx) : Promise.all(arg);
          const value = Reflect.get(target, property); return typeof value === 'function' ? value.bind(target) : value;
        } }) as unknown as PrismaService;
        const repo = new PagosRepository(adapter);
        const paciente = await tx.paciente.create({ data: { tipoDocumento: 'SIN_DOCUMENTO', nombres: marker, apellidos: 'Prueba de cobros' } }); pacienteId = paciente.id;
        const presupuesto = await tx.presupuesto.create({ data: { pacienteId, estado: 'ACEPTADO', subtotal: '100.30', total: '100.30' } });
        const input = { presupuestoId: presupuesto.id, monto: '30.10', metodoPago: 'EFECTIVO' as const, claveSolicitud: randomUUID(), referencia: 'prueba' };
        const pago = await repo.registrar(input, actor);
        expect(pago.comprobante?.numero).toMatch(/^REC-\d{8,}$/);
        expect((await repo.registrar(input, actor)).id).toBe(pago.id);
        expect(await tx.cajaMovimiento.count({ where: { pagoId: pago.id } })).toBe(1);
        await expect(repo.registrar({ ...input, monto: '30.11' }, actor)).rejects.toThrow('otros datos');
        await expect(repo.registrar({ ...input, monto: '70.21', claveSolicitud: randomUUID() }, actor)).rejects.toThrow('supera');
        const cartera = await repo.cartera(Object.assign(new CarteraQueryDto(), { pacienteId }));
        expect(cartera.items[0]).toMatchObject({ abonado: '30.10', saldo: '70.20' });
        const final = await repo.registrar({ ...input, monto: '70.20', metodoPago: 'TARJETA', claveSolicitud: randomUUID() }, actor);
        expect((await repo.cartera(Object.assign(new CarteraQueryDto(), { pacienteId }))).total).toBe(0);
        expect((await repo.cartera(Object.assign(new CarteraQueryDto(), { pacienteId, estadoSaldo: 'saldados' }))).items).toHaveLength(1);
        await tx.paciente.update({ where: { id: pacienteId }, data: { activo: false } });
        const anulado = await repo.anular(pago.id, { version: pago.updatedAt.toISOString(), motivo: 'Anulación de prueba' }, actor);
        expect(anulado.estado).toBe('ANULADO'); expect(anulado.comprobante?.estado).toBe('ANULADO');
        expect(await tx.cajaMovimiento.count({ where: { pagoId: pago.id } })).toBe(2);
        expect((await repo.cartera(Object.assign(new CarteraQueryDto(), { pacienteId }))).items[0].saldo).toBe('30.10');
        await expect(repo.anular(pago.id, { version: anulado.updatedAt.toISOString(), motivo: 'Repetición' }, actor)).rejects.toThrow('anulado');
        expect((await repo.registrar(input, actor)).estado).toBe('ANULADO');
        expect((await repo.obtener(final.id)).cajaMovimientos).toHaveLength(1);
        const corte = await repo.datosReporte(new Date(Date.now() - 3600000), new Date(Date.now() + 3600000));
        const filas = corte.movimientos.filter((m) => m.pago?.pacienteId === pacienteId);
        expect(filas).toHaveLength(3); expect(filas.filter((m) => m.tipo === 'EGRESO')).toHaveLength(1);
        await tx.$executeRawUnsafe('SAVEPOINT immutable');
        await expect(tx.pago.update({ where: { id: final.id }, data: { monto: '1' } })).rejects.toThrow();
        await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT immutable');
        await tx.$executeRawUnsafe('SAVEPOINT receipt');
        await expect(tx.comprobante.delete({ where: { pagoId: final.id } })).rejects.toThrow();
        await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT receipt');
        await tx.$executeRawUnsafe('SAVEPOINT ledger');
        await expect(tx.cajaMovimiento.deleteMany({ where: { pagoId: final.id } })).rejects.toThrow();
        await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT ledger');
        const permissions = await tx.$queryRaw<{ escritura: boolean }[]>`SELECT has_table_privilege('authenticated',c.oid,'INSERT,UPDATE,DELETE,TRUNCATE') escritura
          FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('pagos','comprobantes','caja_movimientos','secuencias_comprobantes')`;
        expect(permissions).toHaveLength(4); expect(permissions.every((row) => !row.escritura)).toBe(true);
        throw rollback;
      }, { timeout: 60000, maxWait: 10000 });
      throw new Error('La transacción debía revertirse.');
    } catch (error) { if (error !== rollback) throw error; }
    expect(await prisma.paciente.count({ where: { nombres: marker } })).toBe(0);
    expect(await prisma.pago.count({ where: { pacienteId } })).toBe(0);
    expect(await prisma.comprobante.count({ where: { pacienteId } })).toBe(0);
    expect((await prisma.secuenciaComprobante.findUnique({ where: { serie: 'REC' } }))?.ultimoNumero).toBe(contadorAntes?.ultimoNumero);
  }, 75000);
});
