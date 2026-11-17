import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CatalogoQueryDto } from '../../common/dto/catalogo.dto';
import { comprobarVersion, importe, siguienteVersion } from '../../common/lib/importes';
import { CrearPresupuestoDto, CrearTratamientoDto, EditarPresupuestoDto, EditarTratamientoDto, EstadoPresupuestoDto, PresupuestosQueryDto } from './tratamientos.dto';
import { calcularPresupuesto, validarTransicion } from './tratamientos.logic';

const presupuestoInclude = {
  paciente: { select: { id: true, nombres: true, apellidos: true, activo: true } },
  items: { include: { tratamiento: { select: { id: true, codigo: true, nombre: true } } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }
} satisfies Prisma.PresupuestoInclude;

@Injectable()
export class TratamientosRepository {
  constructor(private readonly prisma: PrismaService) {}
  listar(query: CatalogoQueryDto) {
    const where: Prisma.TratamientoWhereInput = { deletedAt: null,
      ...(query.estado === 'todos' ? {} : { activo: query.estado === 'activos' }),
      ...(query.q ? { OR: [{ nombre: { contains: query.q, mode: 'insensitive' } }, { codigo: { contains: query.q, mode: 'insensitive' } }] } : {}) };
    return this.prisma.$transaction([this.prisma.tratamiento.findMany({ where, orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
      skip: (query.pagina - 1) * query.tamanoPagina, take: query.tamanoPagina }), this.prisma.tratamiento.count({ where })], { isolationLevel: 'RepeatableRead' });
  }
  crear(dto: CrearTratamientoDto) {
    return this.prisma.$transaction(async (tx) => {
      // El bloqueo hace que dos registros simultáneos nunca reciban el mismo consecutivo.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('codigo:tratamientos', 0))::text`;
      const [secuencia] = await tx.$queryRaw<{ siguiente: number }[]>`SELECT COALESCE(MAX(((regexp_match(codigo, '^TRAT-(\\d+)$'))[1])::int), 0) + 1 AS siguiente FROM tratamientos`;
      const codigo = `TRAT-${String(secuencia.siguiente).padStart(4, '0')}`;
      return tx.tratamiento.create({ data: { ...dto, codigo, precioBase: importe(dto.precioBase) } });
    });
  }
  editar(id: string, dto: EditarTratamientoDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM tratamientos WHERE id = ${id}::uuid FOR UPDATE`;
      const actual = await tx.tratamiento.findFirst({ where: { id, deletedAt: null } });
      if (!actual) throw new NotFoundException('Tratamiento no encontrado.');
      comprobarVersion(actual.updatedAt, dto.version);
      const { version: _version, ...data } = dto;
      if (!Object.keys(data).length) throw new BadRequestException('Incluye al menos un dato para actualizar.');
      return tx.tratamiento.update({ where: { id }, data: { ...data, updatedAt: siguienteVersion(actual.updatedAt) } });
    });
  }
  listarPresupuestos(query: PresupuestosQueryDto) {
    const where: Prisma.PresupuestoWhereInput = { deletedAt: null, pacienteId: query.pacienteId, estado: query.estadoPresupuesto,
      ...(query.q ? { paciente: { OR: [{ nombres: { contains: query.q, mode: 'insensitive' } }, { apellidos: { contains: query.q, mode: 'insensitive' } }] } } : {}) };
    return this.prisma.$transaction([this.prisma.presupuesto.findMany({ where, include: { paciente: presupuestoInclude.paciente },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (query.pagina - 1) * query.tamanoPagina, take: query.tamanoPagina }),
    this.prisma.presupuesto.count({ where })], { isolationLevel: 'RepeatableRead' });
  }
  async obtenerPresupuesto(id: string) {
    const result = await this.prisma.presupuesto.findFirst({ where: { id, deletedAt: null }, include: presupuestoInclude });
    if (!result) throw new NotFoundException('Presupuesto no encontrado.');
    return result;
  }
  guardarPresupuesto(dto: CrearPresupuestoDto | EditarPresupuestoDto, id?: string) {
    return this.prisma.$transaction(async (tx) => {
      if (id) {
        await tx.$queryRaw`SELECT id FROM presupuestos WHERE id = ${id}::uuid FOR UPDATE`;
        const actual = await tx.presupuesto.findFirst({ where: { id, deletedAt: null } });
        if (!actual) throw new NotFoundException('Presupuesto no encontrado.');
        comprobarVersion(actual.updatedAt, (dto as EditarPresupuestoDto).version);
        if (actual.estado !== 'BORRADOR') throw new BadRequestException('Solo se puede editar un presupuesto en borrador.');
        if (actual.pacienteId !== dto.pacienteId) throw new BadRequestException('El paciente de un presupuesto no se puede cambiar.');
      }
      await tx.$queryRaw`SELECT id FROM pacientes WHERE id = ${dto.pacienteId}::uuid FOR SHARE`;
      const paciente = await tx.paciente.findFirst({ where: { id: dto.pacienteId, deletedAt: null, activo: true }, select: { id: true } });
      if (!paciente) throw new BadRequestException('Selecciona un paciente activo.');
      const ids = [...new Set(dto.items.map((item) => item.tratamientoId))].sort();
      // Bloquea el catálogo durante la validación para evitar una desactivación simultánea.
      await tx.$queryRaw`SELECT id FROM tratamientos WHERE id IN (${Prisma.join(ids.map((value) => Prisma.sql`${value}::uuid`))}) ORDER BY id FOR SHARE`;
      const tratamientos = await tx.tratamiento.findMany({ where: { id: { in: ids }, activo: true, deletedAt: null }, select: { id: true } });
      if (tratamientos.length !== ids.length) throw new BadRequestException('Uno o más tratamientos no están activos. Revisa el catálogo.');
      const { items, ...totales } = calcularPresupuesto(dto.items, dto.descuento);
      const data = { pacienteId: dto.pacienteId, observaciones: dto.observaciones, ...totales };
      if (!id) return tx.presupuesto.create({ data: { ...data, items: { create: items } }, include: presupuestoInclude });
      const actual = await tx.presupuesto.findUniqueOrThrow({ where: { id } });
      await tx.presupuestoItem.deleteMany({ where: { presupuestoId: id } });
      return tx.presupuesto.update({ where: { id }, data: { ...data, updatedAt: siguienteVersion(actual.updatedAt), items: { create: items } }, include: presupuestoInclude });
    });
  }
  estadoPresupuesto(id: string, dto: EstadoPresupuestoDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM presupuestos WHERE id = ${id}::uuid FOR UPDATE`;
      const actual = await tx.presupuesto.findFirst({ where: { id, deletedAt: null } });
      if (!actual) throw new NotFoundException('Presupuesto no encontrado.');
      comprobarVersion(actual.updatedAt, dto.version);
      validarTransicion(actual.estado, dto.estado);
      return tx.presupuesto.update({ where: { id }, data: { estado: dto.estado, updatedAt: siguienteVersion(actual.updatedAt) }, include: presupuestoInclude });
    });
  }
}
