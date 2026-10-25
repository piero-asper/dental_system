import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditoriaQueryDto, EvolucionesQueryDto } from './dto/historia.dto';

@Injectable()
export class HistoriasClinicasRepository {
  constructor(private readonly prisma: PrismaService) {}
  obtener(pacienteId: string) {
    return this.prisma.historiaClinica.findFirst({ where: { pacienteId, paciente: { deletedAt: null } },
      include: { paciente: { select: { id: true, nombres: true, apellidos: true, activo: true } },
        } });
  }
  async auditoria(pacienteId: string, query: AuditoriaQueryDto) {
    const historia = await this.prisma.historiaClinica.findFirst({ where: { pacienteId, paciente: { deletedAt: null } }, select: { id: true } });
    if (!historia) throw new NotFoundException('No se encontro la historia clinica.');
    const where:Prisma.AuditoriaHistoriaClinicaWhereInput = { historiaClinicaId: historia.id,tablaAfectada:query.tabla,createdAt:{gte:query.desde ? new Date(query.desde):undefined,lt:query.hasta ? new Date(query.hasta):undefined}, ...(query.pieza ? {OR:[{valorNuevo:{path:['pieza'],equals:query.pieza}},{valorAnterior:{path:['pieza'],equals:query.pieza}}]} : {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditoriaHistoriaClinica.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (query.pagina - 1) * query.tamanoPagina, take: query.tamanoPagina }),
      this.prisma.auditoriaHistoriaClinica.count({ where })
    ], { isolationLevel: 'RepeatableRead' });
    return { items, total, pagina: query.pagina, totalPaginas: Math.ceil(total / query.tamanoPagina) };
  }
  async evoluciones(pacienteId:string,query:EvolucionesQueryDto) {
    const historia=await this.obtener(pacienteId); if (!historia) throw new NotFoundException('Historia no encontrada.');
    const where:Prisma.EvolucionClinicaWhereInput={historiaClinicaId:historia.id,estado:query.estado,piezas:query.pieza ? {has:query.pieza}:undefined,fecha:{gte:query.desde?new Date(query.desde):undefined,lt:query.hasta?new Date(query.hasta):undefined},...(query.q ? {OR:[{diagnostico:{contains:query.q,mode:'insensitive'}},{procedimiento:{contains:query.q,mode:'insensitive'}},{observaciones:{contains:query.q,mode:'insensitive'}}]}:{})};
    const [items,total]=await this.prisma.$transaction([this.prisma.evolucionClinica.findMany({where,orderBy:[{fecha:'desc'},{id:'desc'}],take:query.tamanoPagina,skip:(query.pagina-1)*query.tamanoPagina}),this.prisma.evolucionClinica.count({where})],{isolationLevel:'RepeatableRead'});
    return {items,total,pagina:query.pagina,totalPaginas:Math.ceil(total/query.tamanoPagina)};
  }
  async odontograma(pacienteId:string) { const historia=await this.obtener(pacienteId); if(!historia) throw new NotFoundException('Historia no encontrada.'); return this.prisma.odontogramaPieza.findMany({where:{historiaClinicaId:historia.id},orderBy:[{pieza:'asc'},{superficie:'asc'}]}); }
  cita(tx:Prisma.TransactionClient,id:string) {return tx.cita.findFirst({where:{id,deletedAt:null},select:{pacienteId:true}});}
  registrosPieza(tx:Prisma.TransactionClient,historiaClinicaId:string,pieza:string) {return tx.odontogramaPieza.findMany({where:{historiaClinicaId,pieza}});}
  transaccion<T>(pacienteId: string, actor: string, run: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${pacienteId}, 4))::text`;
      await tx.$queryRaw`SELECT set_config('app.auth_user_id', ${actor}, true)`;
      const paciente = await tx.paciente.findFirst({ where: { id: pacienteId, deletedAt: null }, select: { id: true } });
      if (!paciente) throw new NotFoundException('No se encontro el paciente.');
      return run(tx);
    }, { maxWait: 10000, timeout: 15000 });
  }
  buscar(tx: Prisma.TransactionClient, pacienteId: string) { return tx.historiaClinica.findUnique({ where: { pacienteId } }); }
  crear(tx: Prisma.TransactionClient, data: Prisma.HistoriaClinicaUncheckedCreateInput) { return tx.historiaClinica.create({ data }); }
  editar(tx: Prisma.TransactionClient, id: string, data: Prisma.HistoriaClinicaUpdateInput) { return tx.historiaClinica.update({ where: { id }, data }); }
  evolucion(tx: Prisma.TransactionClient, historiaClinicaId: string, id: string) { return tx.evolucionClinica.findFirst({ where: { id, historiaClinicaId } }); }
  crearEvolucion(tx: Prisma.TransactionClient, data: Prisma.EvolucionClinicaUncheckedCreateInput) { return tx.evolucionClinica.create({ data }); }
  editarEvolucion(tx: Prisma.TransactionClient, id: string, data: Prisma.EvolucionClinicaUpdateInput) { return tx.evolucionClinica.update({ where: { id }, data }); }
  pieza(tx: Prisma.TransactionClient, historiaClinicaId: string, id: string) { return tx.odontogramaPieza.findFirst({ where: { id, historiaClinicaId } }); }
  async crearPieza(tx: Prisma.TransactionClient, data: Prisma.OdontogramaPiezaUncheckedCreateInput) {
    const existing = await tx.odontogramaPieza.findFirst({ where: { historiaClinicaId: data.historiaClinicaId, pieza: data.pieza,
      OR: data.superficie === 'GENERAL' ? [{ superficie: 'GENERAL' }, { superficie: null }] : [{ superficie: data.superficie }] } });
    if (existing) throw new ConflictException('Esa pieza y superficie ya tienen un registro. Edita el hallazgo existente.');
    return tx.odontogramaPieza.create({ data });
  }
  editarPieza(tx: Prisma.TransactionClient, id: string, data: Prisma.OdontogramaPiezaUpdateInput) { return tx.odontogramaPieza.update({ where: { id }, data }); }
}
