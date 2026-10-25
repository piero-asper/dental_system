import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { admite, disponibilidad, fechaClinica, inicioDia, restar } from './agenda.logic';
import { BloqueoDto, ConfigurarAgendaDto, DisponibilidadDto } from './agenda.dto';
@Injectable()
export class AgendaService {
  constructor(private readonly prisma: PrismaService) {}
  configuracion() { return this.prisma.agendaVersion.findMany({ orderBy: [{ vigenteDesde: 'desc' }, { createdAt: 'desc' }], take: 100 }); }
  async franjas(query: DisponibilidadDto) {
    const { version, intervalos, bloqueos } = await disponibilidad(this.prisma, query.fecha);
    const desde = inicioDia(query.fecha), hasta = new Date(desde.getTime() + 86400000);
    const citas = await this.prisma.cita.findMany({ where: { deletedAt: null, id: query.excluir ? { not: query.excluir } : undefined, estado: { in: ['PROGRAMADA', 'CONFIRMADA', 'ATENDIDA'] }, fechaInicio: { lt: hasta }, fechaFin: { gt: desde } }, select: { fechaInicio: true, fechaFin: true } });
    const libres = restar(intervalos, citas.map((c) => ({ inicio: c.fechaInicio, fin: c.fechaFin })));
    const franjas: { inicio: string; fin: string }[] = [];
    for (const i of libres) for (let t = Math.ceil(i.inicio.getTime() / 900000) * 900000; t + query.duracion * 60000 <= i.fin.getTime(); t += 900000) if (t >= Date.now()) franjas.push({ inicio: new Date(t).toISOString(), fin: new Date(t + query.duracion * 60000).toISOString() });
    return { configurada: Boolean(version), intervalos, bloqueos, franjas };
  }
  private transaccion<T>(run: (tx: Prisma.TransactionClient) => Promise<T>) { return this.prisma.$transaction(async (tx) => { await tx.$queryRaw`SELECT pg_advisory_xact_lock(73303)::text`; return run(tx); }, { timeout: 30000, maxWait: 10000 }); }
  configurar(dto: ConfigurarAgendaDto, actor: string) {
    if (dto.vigenteDesde < fechaClinica()) throw new BadRequestException('La vigencia no puede ser anterior a hoy.');
    for (const i of dto.intervalos) if (i.fin <= i.inicio) throw new BadRequestException('Cada franja debe terminar después de su inicio.');
    for (let n = 0; n < dto.intervalos.length; n++) if (dto.intervalos.some((i, m) => m !== n && i.dia === dto.intervalos[n].dia && i.inicio < dto.intervalos[n].fin && i.fin > dto.intervalos[n].inicio)) throw new BadRequestException('Las franjas de atención no pueden solaparse.');
    return this.transaccion(async (tx) => {
      if (dto.vigenteDesde === fechaClinica() && await tx.agendaVersion.count()) throw new BadRequestException('Los cambios del horario comienzan desde mañana para conservar el historial de hoy.');
      const version = await tx.agendaVersion.create({ data: { vigenteDesde: new Date(dto.vigenteDesde), intervalos: dto.intervalos as unknown as Prisma.InputJsonValue, authUserId: actor } });
      const citas = await tx.cita.findMany({ where: { deletedAt: null, estado: { in: ['PROGRAMADA', 'CONFIRMADA'] }, fechaFin: { gt: new Date(Math.max(Date.now(), inicioDia(dto.vigenteDesde).getTime())) } } });
      for (const c of citas) if (!await admite(tx, c.fechaInicio, c.fechaFin)) throw new ConflictException(`El horario afecta una cita del ${fechaClinica(c.fechaInicio)}. Reprograma esa cita antes de cambiarlo.`);
      return version;
    });
  }
  bloquear(dto: BloqueoDto, actor: string) {
    const inicio = new Date(dto.fechaInicio), fin = new Date(dto.fechaFin);
    if (fin <= inicio || inicio < new Date() || fin.getTime() - inicio.getTime() > 366 * 86400000) throw new BadRequestException('El bloqueo debe ser futuro, con un intervalo válido de hasta un año.');
    return this.transaccion(async (tx) => {
      if (await tx.cita.count({ where: { deletedAt: null, estado: { in: ['PROGRAMADA','CONFIRMADA','ATENDIDA'] }, fechaInicio: { lt: fin }, fechaFin: { gt: inicio } } })) throw new ConflictException('El bloqueo afecta citas existentes. Reprográmalas antes de bloquear.');
      return tx.agendaBloqueo.create({ data: { fechaInicio: inicio, fechaFin: fin, motivo: dto.motivo.trim(), authUserId: actor } });
    });
  }
  cancelar(id: string, version: string) { return this.transaccion(async (tx) => {
    const item = await tx.agendaBloqueo.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Bloqueo no encontrado.');
    if (item.updatedAt.toISOString() !== version || item.canceladoAt) throw new ConflictException('El bloqueo cambió. Recarga la configuración.');
    return tx.agendaBloqueo.update({ where: { id }, data: { canceladoAt: new Date() } });
  }); }
}
