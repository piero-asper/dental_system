import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BuscarPacientesDto } from './dto/paciente.dto';
import { inicioDia } from '../agenda/agenda.logic';
export const pacienteSelect = { id: true, nombres: true, apellidos: true, telefono: true, activo: true, createdAt: true, updatedAt: true } satisfies Prisma.PacienteSelect;
type Patient = Prisma.PacienteGetPayload<{ select: typeof pacienteSelect }>;
export const normalizar = (text: string) => text.toLocaleLowerCase('es').replace(/ñ/g,'n~').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const nombreSQL = Prisma.sql`replace(translate(lower(p.apellidos || ' ' || p.nombres),'áéíóúü','aeiouu'),'ñ','n~')`;
@Injectable()
export class PacientesRepository {
  constructor(private readonly prisma: PrismaService) {}
  async listar(query: BuscarPacientesDto) {
    const partes: Prisma.Sql[] = [Prisma.sql`p.deleted_at IS NULL`];
    if (query.estado !== 'todos') partes.push(Prisma.sql`p.activo = ${query.estado === 'activos'}`);
    const search=query.q??'';
    const words=/^[+\d()\s.-]+$/.test(search)&&/\d/.test(search)?[search.replace(/\D/g,'')]:search.split(/\s+/).filter(Boolean);
    for (const word of words) {
      const escaped = '%' + normalizar(word).replace(/[\\%_]/g,'\\$&') + '%', digits = word.replace(/\D/g,'');
      partes.push(Prisma.sql`(${nombreSQL} LIKE ${escaped} OR ${digits ? Prisma.sql`regexp_replace(COALESCE(p.telefono,''),'[^0-9]','','g') LIKE ${'%' + digits + '%'}` : Prisma.sql`false`})`);
    }
    if (query.seguimiento === 'sin_historia') partes.push(Prisma.sql`NOT EXISTS(SELECT 1 FROM historias_clinicas h WHERE h.paciente_id=p.id)`);
    if (query.seguimiento === 'sin_proxima') partes.push(Prisma.sql`NOT EXISTS(SELECT 1 FROM citas c WHERE c.paciente_id=p.id AND c.deleted_at IS NULL AND c.estado IN ('PROGRAMADA','CONFIRMADA') AND c.fecha_inicio>now())`);
    if (query.seguimiento === 'sin_atencion') partes.push(Prisma.sql`NOT EXISTS(SELECT 1 FROM citas c WHERE c.paciente_id=p.id AND c.deleted_at IS NULL AND c.estado='ATENDIDA')`);
    if (query.ultimaAntes) partes.push(Prisma.sql`(SELECT max(c.fecha_inicio) FROM citas c WHERE c.paciente_id=p.id AND c.deleted_at IS NULL AND c.estado='ATENDIDA') < ${query.ultimaAntes.length===10?inicioDia(query.ultimaAntes):new Date(query.ultimaAntes)}`);
    const where = Prisma.join(partes,' AND '), direction = Prisma.raw(query.orden === 'desc' ? 'DESC' : 'ASC');
    const [items, counts] = await this.prisma.$transaction([
      this.prisma.$queryRaw<Patient[]>`SELECT p.id,p.nombres,p.apellidos,p.telefono,p.activo,p.created_at AS "createdAt",p.updated_at AS "updatedAt" FROM pacientes p WHERE ${where} ORDER BY ${nombreSQL} COLLATE "C" ${direction},p.id LIMIT ${query.tamanoPagina} OFFSET ${(query.pagina-1)*query.tamanoPagina}`,
      this.prisma.$queryRaw<{ total: bigint }[]>`SELECT count(*) AS total FROM pacientes p WHERE ${where}`
    ],{ isolationLevel: 'RepeatableRead' });
    return { items,total: Number(counts[0].total) };
  }
  buscarPorId(id: string) { return this.prisma.paciente.findFirst({ where: { id,deletedAt: null },select: pacienteSelect }); }
  crear(data: Prisma.PacienteCreateInput) { return this.prisma.paciente.create({ data,select: pacienteSelect }); }
  async editar(id: string,data: Prisma.PacienteUpdateInput,version?: string) {
    if (!version) return this.prisma.paciente.update({ where: { id,deletedAt: null },data,select: pacienteSelect });
    return this.prisma.$transaction(async(tx)=>{
      const result = await tx.paciente.updateMany({ where: { id,deletedAt: null,updatedAt: new Date(version) },data });
      const paciente=await tx.paciente.findFirst({where:{id,deletedAt:null},select:pacienteSelect});
      if (!paciente) throw new NotFoundException('Paciente no encontrado.');
      if (!result.count) throw new ConflictException('El paciente cambió en otra pestaña. Recarga la ficha antes de guardar.');
      return paciente;
    });
  }
  async resumen(id: string) {
    if (!await this.buscarPorId(id)) throw new NotFoundException('Paciente no encontrado.');
    const [ultima,proxima,historia,total] = await this.prisma.$transaction([
      this.prisma.cita.findFirst({ where: { pacienteId:id,deletedAt:null,estado:'ATENDIDA' },orderBy: [{fechaInicio:'desc'},{id:'asc'}] }),
      this.prisma.cita.findFirst({ where: { pacienteId:id,deletedAt:null,estado:{in:['PROGRAMADA','CONFIRMADA']},fechaInicio:{gt:new Date()} },orderBy:[{fechaInicio:'asc'},{id:'asc'}] }),
      this.prisma.historiaClinica.findUnique({where:{pacienteId:id},select:{id:true}}),this.prisma.cita.count({where:{pacienteId:id,deletedAt:null}})
    ]);
    return { ultima,proxima,tieneHistoria:Boolean(historia),totalCitas:total };
  }
  async citas(id:string,query:BuscarPacientesDto) {
    if (!await this.buscarPorId(id)) throw new NotFoundException('Paciente no encontrado.');
    const where = {pacienteId:id,deletedAt:null};
    const [items,total] = await this.prisma.$transaction([this.prisma.cita.findMany({where,orderBy:[{fechaInicio:'desc'},{id:'asc'}],take:query.tamanoPagina,skip:(query.pagina-1)*query.tamanoPagina}),this.prisma.cita.count({where})]);
    return {items,total,pagina:query.pagina,totalPaginas:Math.ceil(total/query.tamanoPagina)};
  }
  async duplicados(query:BuscarPacientesDto) { return (await this.listar(Object.assign(new BuscarPacientesDto(),query,{pagina:1,tamanoPagina:5}))).items; }
}
