import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BuscarPacientesDto } from './dto/paciente.dto';

// Administrative data only; do not load clinical or financial relations here.
export const pacienteSelect = {
  id: true, nombres: true, apellidos: true,
  telefono: true, activo: true,
  createdAt: true, updatedAt: true
} satisfies Prisma.PacienteSelect;

@Injectable()
export class PacientesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listar(query: BuscarPacientesDto) {
    const where: Prisma.PacienteWhereInput = { deletedAt: null };
    if (query.estado !== 'todos') where.activo = query.estado === 'activos';
    if (query.q) {
      where.AND = query.q.split(/\s+/).filter(Boolean).map((word) => ({ OR: [
        { nombres: { contains: word, mode: 'insensitive' } },
        { apellidos: { contains: word, mode: 'insensitive' } },
        { telefono: { contains: word } }
      ] }));
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.paciente.findMany({ where, select: pacienteSelect,
        orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }, { id: 'asc' }],
        skip: (query.pagina - 1) * query.tamanoPagina, take: query.tamanoPagina }),
      this.prisma.paciente.count({ where })
    ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return { items, total };
  }

  buscarPorId(id: string) {
    return this.prisma.paciente.findFirst({ where: { id, deletedAt: null }, select: pacienteSelect });
  }

  crear(data: Prisma.PacienteCreateInput) {
    return this.prisma.paciente.create({ data, select: pacienteSelect });
  }

  editar(id: string, data: Prisma.PacienteUpdateInput) {
    return this.prisma.paciente.update({ where: { id, deletedAt: null }, data, select: pacienteSelect });
  }
}
