import { ConflictException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { CitasRepository } from '../src/modulos/citas/citas.repository';
import { CitasService } from '../src/modulos/citas/citas.service';
import { HistoriasClinicasRepository } from '../src/modulos/historias-clinicas/historias-clinicas.repository';
import { HistoriasClinicasService } from '../src/modulos/historias-clinicas/historias-clinicas.service';

const envPath = resolve(__dirname, '../.env');
if (existsSync(envPath)) process.loadEnvFile(envPath);

describe('Citas e historias con PostgreSQL real y rollback', () => {
  const prisma = new PrismaClient();
  afterAll(async () => prisma.$disconnect());
  it('comprueba integridad SQL, flujo completo, auditoria atomica, permisos y ausencia de datos residuales', async () => {
    const pacienteId = randomUUID(), actor = randomUUID(), rollback = new Error('ROLLBACK_CLINICAL_TEST');
    let historiaId = '';
    try {
      await prisma.$transaction(async (tx) => {
        const adapter = new Proxy(tx, { get(target, property) {
          if (property === '$transaction') return (fn: unknown) => typeof fn === 'function' ? fn(tx) : Promise.all(fn as Promise<unknown>[]);
          return Reflect.get(target, property);
        } }) as unknown as PrismaService;
        const citas = new CitasService(new CitasRepository(adapter));
        const clinical = new HistoriasClinicasService(new HistoriasClinicasRepository(adapter));
        await tx.paciente.create({ data: { id: pacienteId, tipoDocumento: 'SIN_DOCUMENTO', nombres: 'Prueba rollback s3s4', apellidos: 'Temporal' } });
        await tx.agendaVersion.create({data:{vigenteDesde:new Date('6999-12-31'),intervalos:Array.from({length:7},(_,dia)=>({dia,inicio:'08:00',fin:'18:00'}))}});
        const dto = { pacienteId, fechaInicio: '7000-01-01T14:00:00Z', fechaFin: '7000-01-01T15:00:00Z' };
        const first = await citas.crear(dto);
        await expect(citas.crear(dto)).rejects.toBeInstanceOf(ConflictException);
        const second = await citas.crear({ ...dto, fechaInicio: dto.fechaFin, fechaFin: '7000-01-01T16:00:00Z' });
        expect(second.id).not.toBe(first.id);
        expect((await citas.listar({ desde: '7000-01-01T14:30:00Z', hasta: '7000-01-01T15:30:00Z' })).map((item) => item.id)).toEqual([first.id, second.id]);
        await citas.cambiarEstado(first.id, { estado: 'CANCELADA', motivoCancelacion: 'Prueba temporal', version: first.updatedAt.toISOString() });
        const replacement = await citas.crear(dto); expect(replacement.id).not.toBe(first.id);

        async function rejectsSQL(run: () => Promise<unknown>) {
          await tx.$executeRawUnsafe('SAVEPOINT expected_failure');
          let failed = false;
          try { await run(); } catch { failed = true; }
          await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT expected_failure');
          await tx.$executeRawUnsafe('RELEASE SAVEPOINT expected_failure');
          expect(failed).toBe(true);
        }
        await rejectsSQL(() => tx.cita.create({ data: { ...dto, fechaInicio: new Date(dto.fechaInicio), fechaFin: new Date(dto.fechaFin) } }));
        await rejectsSQL(() => tx.cita.create({ data: { ...dto, fechaInicio: new Date('7000-01-02T14:00:00Z'), fechaFin: new Date('7000-01-02T13:00:00Z') } }));

        const history = await clinical.crear(pacienteId, { antecedentesMedicos: 'Sin antecedentes', alergias: 'Penicilina' }, actor); historiaId = history.id;
        await expect(clinical.crear(pacienteId, {}, actor)).rejects.toBeInstanceOf(ConflictException);
        await clinical.editar(pacienteId, { version: history.updatedAt.toISOString(), alergias: null }, actor);
        const evolution = await clinical.crearEvolucion(pacienteId, { diagnostico: 'Caries 11', procedimiento: 'Evaluacion' }, actor);
        await clinical.editarEvolucion(pacienteId, evolution.id, { version: evolution.updatedAt.toISOString(), diagnostico: 'Caries 11', procedimiento: 'Restauracion',motivoCorreccion:'Completar procedimiento registrado' }, actor);
        const tooth = await clinical.crearPieza(pacienteId, { pieza: '11', superficie: 'GENERAL', estado: 'CARIES' }, actor);
        await clinical.editarPieza(pacienteId, tooth.id, { version: tooth.updatedAt.toISOString(), estado: 'RESTAURADO' }, actor);
        await clinical.crearPieza(pacienteId, { pieza: '51', superficie: 'MESIAL', estado: 'SANO' }, actor);
        await expect(clinical.crearPieza(pacienteId, { pieza: '11', superficie: 'GENERAL', estado: 'SANO' }, actor)).rejects.toBeInstanceOf(ConflictException);
        const detail = await clinical.obtener(pacienteId); expect(detail.alergias).toBeNull(); expect((await clinical.evoluciones(pacienteId,{pagina:1,tamanoPagina:20})).items[0].procedimiento).toBe('Restauracion'); expect(await clinical.odontograma(pacienteId)).toHaveLength(2);
        const audit = await clinical.auditoria(pacienteId, { pagina: 1, tamanoPagina: 100 });
        expect(audit.total).toBe(7); expect(audit.items.every((item) => item.authUserId === actor)).toBe(true);
        const changed = audit.items.find((item) => item.tablaAfectada === 'historias_clinicas' && item.accion === 'UPDATE');
        expect(changed?.valorAnterior).toMatchObject({ alergias: 'Penicilina' }); expect(changed?.valorNuevo).toMatchObject({ alergias: null });
        expect((await clinical.auditoria(pacienteId, { pagina: 2, tamanoPagina: 2 })).items).toHaveLength(2);

        // Verifica las restricciones contra escrituras que omiten los servicios.
        await rejectsSQL(() => tx.odontogramaPieza.create({ data: { historiaClinicaId: history.id, pieza: '99', estado: 'SANO' } }));
        await rejectsSQL(() => tx.odontogramaPieza.create({ data: { historiaClinicaId: history.id, pieza: '11', superficie: null, estado: 'SANO' } }));
        await rejectsSQL(() => tx.evolucionClinica.delete({ where: { id: evolution.id } }));
        await rejectsSQL(() => tx.historiaClinica.delete({ where: { id: history.id } }));
        await rejectsSQL(() => tx.auditoriaHistoriaClinica.update({ where: { id: audit.items[0].id }, data: { accion: 'FALSEADA' } }));
        await rejectsSQL(() => tx.auditoriaHistoriaClinica.delete({ where: { id: audit.items[0].id } }));
        for (const table of ['historias_clinicas','evoluciones_clinicas','odontograma_piezas','auditoria_historias_clinicas']) {
          const [row] = await tx.$queryRaw<{ read: boolean; write: boolean; anon: boolean; rls: boolean }[]>`
            SELECT has_table_privilege('authenticated', ${table}, 'SELECT') AS read,
              has_table_privilege('authenticated', ${table}, 'INSERT,UPDATE,DELETE,TRUNCATE') AS write,
              has_table_privilege('anon', ${table}, 'SELECT,INSERT,UPDATE,DELETE') AS anon,
              (SELECT relrowsecurity FROM pg_class WHERE oid = ${table}::regclass) AS rls`;
          expect(row).toEqual({ read: true, write: false, anon: false, rls: true });
        }
        // La cerradura de agenda esta realmente tomada en la conexion actual.
        const [other] = await prisma.$queryRaw<{ acquired: boolean }[]>`SELECT pg_try_advisory_xact_lock(73303) AS acquired`;
        expect(other.acquired).toBe(false);
        throw rollback;
      }, { timeout: 90000, maxWait: 10000 });
      throw new Error('Debio revertirse la transaccion.');
    } catch (error) { if (error !== rollback) throw error; }
    expect(await prisma.paciente.count({ where: { id: pacienteId } })).toBe(0);
    expect(await prisma.cita.count({ where: { pacienteId } })).toBe(0);
    expect(await prisma.historiaClinica.count({ where: { pacienteId } })).toBe(0);
    expect(await prisma.auditoriaHistoriaClinica.count({ where: { historiaClinicaId: historiaId } })).toBe(0);
  }, 120000);
});
