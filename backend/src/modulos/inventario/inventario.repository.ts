import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CatalogoQueryDto } from '../../common/dto/catalogo.dto';
import { comprobarVersion, siguienteVersion } from '../../common/lib/importes';
import { CrearInsumoDto, EditarInsumoDto, InventarioQueryDto, MovimientoDto } from './inventario.dto';
import { calcularStock } from './inventario.logic';

@Injectable()
export class InventarioRepository {
  constructor(private readonly prisma: PrismaService) {}
  listar(query: InventarioQueryDto) {
    const where: Prisma.InsumoWhereInput = { deletedAt: null,
      ...(query.estado === 'todos' ? {} : { activo: query.estado === 'activos' }),
      ...(query.stock === 'bajo' ? { stockActual: { lte: this.prisma.insumo.fields.stockMinimo } } : {}),
      ...(query.q ? { OR: [{ nombre: { contains: query.q, mode: 'insensitive' } }, { codigo: { contains: query.q, mode: 'insensitive' } }] } : {}) };
    return this.prisma.$transaction([this.prisma.insumo.findMany({ where, orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
      skip: (query.pagina - 1) * query.tamanoPagina, take: query.tamanoPagina }), this.prisma.insumo.count({ where })], { isolationLevel: 'RepeatableRead' });
  }
  crear(dto: CrearInsumoDto) {
    return this.prisma.$transaction(async (tx) => {
      // Un consecutivo separado para inventario evita colisiones y no exige teclear códigos.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('codigo:insumos', 0))::text`;
      const [secuencia] = await tx.$queryRaw<{ siguiente: number }[]>`SELECT COALESCE(MAX(((regexp_match(codigo, '^INS-(\\d+)$'))[1])::int), 0) + 1 AS siguiente FROM insumos`;
      const codigo = `INS-${String(secuencia.siguiente).padStart(4, '0')}`;
      return tx.insumo.create({ data: { ...dto, codigo } });
    });
  }
  editar(id: string, dto: EditarInsumoDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM insumos WHERE id = ${id}::uuid FOR UPDATE`;
      const actual = await tx.insumo.findFirst({ where: { id, deletedAt: null } });
      if (!actual) throw new NotFoundException('Insumo no encontrado.');
      comprobarVersion(actual.updatedAt, dto.version);
      const { version: _version, ...data } = dto;
      if (!Object.keys(data).length) throw new BadRequestException('Incluye al menos un dato para actualizar.');
      if (data.unidadMedida && data.unidadMedida !== actual.unidadMedida && await tx.inventarioMovimiento.count({ where: { insumoId: id } })) {
        throw new BadRequestException('La unidad de medida no se cambia después de registrar movimientos.');
      }
      return tx.insumo.update({ where: { id }, data: { ...data, updatedAt: siguienteVersion(actual.updatedAt) } });
    });
  }
  async movimientos(id: string, query: CatalogoQueryDto) {
    if (!await this.prisma.insumo.findFirst({ where: { id, deletedAt: null }, select: { id: true } })) throw new NotFoundException('Insumo no encontrado.');
    return this.prisma.$transaction([this.prisma.inventarioMovimiento.findMany({ where: { insumoId: id },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (query.pagina - 1) * query.tamanoPagina, take: query.tamanoPagina }),
    this.prisma.inventarioMovimiento.count({ where: { insumoId: id } })], { isolationLevel: 'RepeatableRead' });
  }
  movimiento(id: string, dto: MovimientoDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM insumos WHERE id = ${id}::uuid FOR UPDATE`;
      const actual = await tx.insumo.findFirst({ where: { id, deletedAt: null } });
      if (!actual) throw new NotFoundException('Insumo no encontrado.');
      comprobarVersion(actual.updatedAt, dto.version);
      if (!actual.activo) throw new BadRequestException('Activa el insumo antes de registrar movimientos.');
      const stockNuevo = calcularStock(actual.stockActual, dto.tipo, dto.cantidad);
      const movimiento = await tx.inventarioMovimiento.create({ data: { insumoId: id, tipo: dto.tipo, cantidad: dto.cantidad,
        motivo: dto.motivo, stockAnterior: actual.stockActual, stockNuevo } });
      const insumo = await tx.insumo.update({ where: { id }, data: { stockActual: stockNuevo, updatedAt: siguienteVersion(actual.updatedAt) } });
      return { insumo, movimiento };
    });
  }
}
