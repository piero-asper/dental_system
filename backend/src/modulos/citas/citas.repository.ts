import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AgendaDto } from './dto/cita.dto';
import { admite } from '../agenda/agenda.logic';

const include = { paciente: { select: { id: true, nombres: true, apellidos: true, telefono: true, activo: true } } } satisfies Prisma.CitaInclude;
export type CitaConPaciente = Prisma.CitaGetPayload<{ include: typeof include }>;
@Injectable()
export class CitasRepository {
  constructor(private readonly prisma: PrismaService) {}
  listar(query: AgendaDto) {
    return this.prisma.cita.findMany({ where: { deletedAt: null, estado: query.estado,
      fechaInicio: { lt: new Date(query.hasta) }, fechaFin: { gt: new Date(query.desde) } }, include,
      orderBy: [{ fechaInicio: 'asc' }, { id: 'asc' }] });
  }
  obtener(id: string) { return this.prisma.cita.findFirst({ where: { id, deletedAt: null }, include }); }
  // Serializa comprobacion y escritura; la exclusion SQL tambien protege otros clientes.
  transaccion<T>(run: (tx: Prisma.TransactionClient) => Promise<T>, actor?: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(73303)::text`;
      if (actor) await tx.$queryRaw`SELECT set_config('app.auth_user_id', ${actor}, true)`;
      return run(tx);
    }, { maxWait: 10000, timeout: 15000 });
  }
  admite(tx: Prisma.TransactionClient, inicio: Date, fin: Date) { return admite(tx,inicio,fin); }
  solicitud(tx: Prisma.TransactionClient, claveSolicitud: string) { return tx.cita.findUnique({ where: { claveSolicitud }, include }); }
  eventos(id: string) { return this.prisma.citaEvento.findMany({ where: { citaId: id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100 }); }
  paciente(tx: Prisma.TransactionClient, id: string) { return tx.paciente.findFirst({ where: { id, deletedAt: null } }); }
  buscar(tx: Prisma.TransactionClient, id: string) { return tx.cita.findFirst({ where: { id, deletedAt: null }, include }); }
  cruce(tx: Prisma.TransactionClient, inicio: Date, fin: Date, excluir?: string) {
    return tx.cita.findFirst({ where: { deletedAt: null, id: excluir ? { not: excluir } : undefined,
      estado: { in: ['PROGRAMADA', 'CONFIRMADA', 'ATENDIDA'] }, fechaInicio: { lt: fin }, fechaFin: { gt: inicio } } });
  }
  crear(tx: Prisma.TransactionClient, data: Prisma.CitaUncheckedCreateInput) { return tx.cita.create({ data, include }); }
  editar(tx: Prisma.TransactionClient, id: string, data: Prisma.CitaUpdateInput) { return tx.cita.update({ where: { id }, data, include }); }
}
