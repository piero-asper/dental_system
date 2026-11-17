import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { TratamientosRepository } from '../src/modulos/tratamientos/tratamientos.repository';
import { InventarioRepository } from '../src/modulos/inventario/inventario.repository';
import { InventarioQueryDto } from '../src/modulos/inventario/inventario.dto';

process.loadEnvFile(resolve(__dirname, '../.env'));
describe('Tratamientos e inventario PostgreSQL con rollback', () => {
  const prisma = new PrismaClient();
  afterAll(async () => prisma.$disconnect());
  it('conserva precios históricos, bloquea borradores emitidos y mantiene stock e historial coherentes sin residuos', async () => {
    const marker = 'm' + randomUUID().replace(/-/g, '').slice(0, 20);
    const rollback = new Error('ROLLBACK_MODULES');
    try {
      await prisma.$transaction(async (tx) => {
        const adapter = new Proxy(tx, { get(target, property) {
          if (property === '$transaction') return (arg: ((t: typeof tx) => Promise<unknown>) | Promise<unknown>[]) => typeof arg === 'function' ? arg(tx) : Promise.all(arg);
          const value = Reflect.get(target, property); return typeof value === 'function' ? value.bind(target) : value;
        } }) as unknown as PrismaService;
        const tratamientos = new TratamientosRepository(adapter), inventario = new InventarioRepository(adapter);
        const paciente = await tx.paciente.create({ data: { nombres: marker, apellidos: 'Prueba', tipoDocumento: 'SIN_DOCUMENTO' } });
        const treatment = await tratamientos.crear({ codigo: marker, nombre: marker, precioBase: '20.10' });
        const presupuesto = await tratamientos.guardarPresupuesto({ pacienteId: paciente.id, descuento: '0.10', items: [{ tratamientoId: treatment.id, cantidad: 2, precioUnitario: '20.10' }] });
        expect(presupuesto.total.toFixed(2)).toBe('40.10');
        const edited = await tratamientos.editar(treatment.id, { version: treatment.updatedAt.toISOString(), precioBase: '999' });
        await expect(tratamientos.editar(treatment.id, { version: treatment.updatedAt.toISOString(), nombre: 'Desactualizado' })).rejects.toBeInstanceOf(ConflictException);
        expect((await tratamientos.obtenerPresupuesto(presupuesto.id)).items[0].precioUnitario.toFixed(2)).toBe('20.10');
        const sent = await tratamientos.estadoPresupuesto(presupuesto.id, { version: presupuesto.updatedAt.toISOString(), estado: 'ENVIADO' });
        await expect(tratamientos.guardarPresupuesto({ pacienteId: paciente.id, version: sent.updatedAt.toISOString(), descuento: '0', items: [{ tratamientoId: treatment.id, cantidad: 1, precioUnitario: '1' }] }, presupuesto.id)).rejects.toThrow('borrador');
        await tratamientos.editar(treatment.id, { version: edited.updatedAt.toISOString(), activo: false });
        await expect(tratamientos.guardarPresupuesto({ pacienteId: paciente.id, descuento: '0', items: [{ tratamientoId: treatment.id, cantidad: 1, precioUnitario: '1' }] })).rejects.toThrow('activos');
        const insumo = await inventario.crear({ codigo: marker, nombre: marker, unidadMedida: 'unidad', stockMinimo: '1' });
        const entrada = await inventario.movimiento(insumo.id, { tipo: 'ENTRADA', cantidad: '2.50', motivo: 'Entrada de prueba', version: insumo.updatedAt.toISOString() });
        await expect(inventario.movimiento(insumo.id, { tipo: 'ENTRADA', cantidad: '2.50', motivo: 'Reintento', version: insumo.updatedAt.toISOString() })).rejects.toBeInstanceOf(ConflictException);
        await expect(inventario.movimiento(insumo.id, { tipo: 'SALIDA', cantidad: '2.51', motivo: 'Insuficiente', version: entrada.insumo.updatedAt.toISOString() })).rejects.toThrow('suficientes');
        expect(await tx.inventarioMovimiento.count({ where: { insumoId: insumo.id } })).toBe(1);
        const salida = await inventario.movimiento(insumo.id, { tipo: 'SALIDA', cantidad: '2', motivo: 'Salida de prueba', version: entrada.insumo.updatedAt.toISOString() });
        expect(salida.insumo.stockActual.toFixed(2)).toBe('0.50');
        const [bajos] = await inventario.listar(Object.assign(new InventarioQueryDto(), { q: marker, stock: 'bajo' }));
        expect(bajos.map((item) => item.id)).toEqual([insumo.id]);
        await expect(inventario.editar(insumo.id, { unidadMedida: 'caja', version: salida.insumo.updatedAt.toISOString() })).rejects.toThrow('unidad');
        const ajuste = await inventario.movimiento(insumo.id, { tipo: 'AJUSTE', cantidad: '0', motivo: 'Conteo de prueba', version: salida.insumo.updatedAt.toISOString() });
        expect(ajuste.movimiento.stockAnterior.toFixed(2)).toBe('0.50'); expect(ajuste.insumo.stockActual.isZero()).toBe(true);
        await tx.$executeRawUnsafe('SAVEPOINT ledger');
        await expect(tx.inventarioMovimiento.delete({ where: { id: ajuste.movimiento.id } })).rejects.toThrow();
        await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT ledger');
        const permisos = await tx.$queryRaw<{ tabla: string; escritura: boolean }[]>`SELECT c.relname AS tabla,
          has_table_privilege('authenticated', c.oid, 'INSERT,UPDATE,DELETE,TRUNCATE') AS escritura FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
          WHERE n.nspname='public' AND c.relname IN ('tratamientos','presupuestos','presupuesto_items','insumos','inventario_movimientos')`;
        expect(permisos).toHaveLength(5); expect(permisos.every((row) => !row.escritura)).toBe(true);
        throw rollback;
      }, { timeout: 45000, maxWait: 10000 });
      throw new Error('La transacción debió revertirse.');
    } catch (error) { if (error !== rollback) throw error; }
    expect(await prisma.paciente.count({ where: { nombres: marker } })).toBe(0);
    expect(await prisma.tratamiento.count({ where: { codigo: marker } })).toBe(0);
    expect(await prisma.insumo.count({ where: { codigo: marker } })).toBe(0);
  });
});
