import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { PacientesRepository } from '../src/modulos/pacientes/pacientes.repository';
import { BuscarPacientesDto } from '../src/modulos/pacientes/dto/paciente.dto';

const envPath = resolve(__dirname, '../.env');
if (existsSync(envPath)) process.loadEnvFile(envPath);

describe('PacientesRepository con PostgreSQL real (rollback obligatorio)', () => {
  const prisma = new PrismaClient();
  afterAll(async () => prisma.$disconnect());

  it('guarda sin documento, filtra, pagina y conserva datos anteriores sin dejar pruebas', async () => {
    const marker = 's2' + randomUUID().replace(/-/g, '');
    const ids: string[] = [];
    const rollback = new Error('ROLLBACK_TEST_PATIENTS');
    const query = (values = {}) => Object.assign(new BuscarPacientesDto(), { q: marker, ...values });
    try {
      await prisma.$transaction(async (tx) => {
        const adapter = { paciente: tx.paciente, $transaction: (queries: Promise<unknown>[]) => Promise.all(queries) };
        const repository = new PacientesRepository(adapter as unknown as PrismaService);
        const first = await repository.crear({ tipoDocumento: 'SIN_DOCUMENTO', nombres: `Prueba ${marker}`, apellidos: 'Torres Ejemplo' });
        ids.push(first.id);
        const second = await repository.crear({ tipoDocumento: 'SIN_DOCUMENTO', nombres: `Prueba ${marker}`, apellidos: 'Rojas Ejemplo', activo: false });
        ids.push(second.id);
        const deleted = await repository.crear({ tipoDocumento: 'SIN_DOCUMENTO', nombres: `Prueba ${marker}`, apellidos: 'Eliminado', deletedAt: new Date() });
        ids.push(deleted.id);
        expect(first).not.toHaveProperty('numeroDocumento');
        expect(first).not.toHaveProperty('email');
        expect((await repository.listar(query())).total).toBe(2);
        expect((await repository.listar(query({ estado: 'activos' }))).items.map((item) => item.id)).toEqual([first.id]);
        expect((await repository.listar(query({ estado: 'inactivos' }))).items.map((item) => item.id)).toEqual([second.id]);
        const page1 = await repository.listar(query({ tamanoPagina: 1 }));
        const page2 = await repository.listar(query({ tamanoPagina: 1, pagina: 2 }));
        expect(page1.total).toBe(2); expect(page1.items[0].id).not.toBe(page2.items[0].id);
        expect((await repository.listar(query({ q: `TORRES ${marker.toUpperCase()}` }))).items.map((item) => item.id)).toEqual([first.id]);
        await repository.editar(first.id, { telefono: '999000111' });
        expect((await repository.listar(query({ q: `${marker} 999000111` }))).items[0].id).toBe(first.id);
        await repository.editar(first.id, { telefono: null });
        expect((await repository.buscarPorId(first.id))?.telefono).toBeNull();
        expect(await repository.buscarPorId(deleted.id)).toBeNull();
        await expect(repository.editar(deleted.id, { activo: true })).rejects.toMatchObject({ code: 'P2025' });
        const homonym = await repository.crear({ tipoDocumento: 'SIN_DOCUMENTO', nombres: first.nombres, apellidos: first.apellidos });
        ids.push(homonym.id);
        expect(homonym.id).not.toBe(first.id);
        // Previous optional fields stay stored, but are not exposed or overwritten by this module.
        const legacy = await repository.crear({ tipoDocumento: 'LEGACY_TEST', numeroDocumento: marker,
          nombres: `Prueba ${marker}`, apellidos: 'Historico', direccion: 'Direccion de prueba',
          email: 'prueba@example.test', sexo: 'F', fechaNacimiento: new Date('1990-01-01T00:00:00Z'),
          contactoEmergenciaNombre: 'Contacto de prueba', contactoEmergenciaTelefono: '999000222' });
        ids.push(legacy.id);
        await repository.editar(legacy.id, { telefono: '999000333' });
        const stored = await tx.paciente.findUnique({ where: { id: legacy.id } });
        expect(stored).toMatchObject({ numeroDocumento: marker, tipoDocumento: 'LEGACY_TEST', email: 'prueba@example.test', direccion: 'Direccion de prueba', contactoEmergenciaNombre: 'Contacto de prueba', sexo: 'F' });
        const visible = await repository.buscarPorId(legacy.id);
        for (const field of ['numeroDocumento', 'tipoDocumento', 'fechaNacimiento', 'sexo', 'email', 'direccion', 'contactoEmergenciaNombre', 'contactoEmergenciaTelefono']) {
          expect(visible).not.toHaveProperty(field);
        }
        throw rollback;
      }, { timeout: 30000, maxWait: 10000 });
      throw new Error('La transaccion debio revertirse.');
    } catch (error) { if (error !== rollback) throw error; }
    expect(await prisma.paciente.count({ where: { id: { in: ids } } })).toBe(0);
  });
});
