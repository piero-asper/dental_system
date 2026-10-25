import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditoriaQueryDto, CrearEvolucionDto, CrearHistoriaDto, CrearPiezaDto, EditarEvolucionDto, EditarHistoriaDto, EditarPiezaDto, EvolucionesQueryDto } from './dto/historia.dto';
import { HistoriasClinicasRepository } from './historias-clinicas.repository';

@Injectable()
export class HistoriasClinicasService {
  constructor(private readonly repository: HistoriasClinicasRepository) {}
  async obtener(pacienteId: string) { return this.existe(await this.repository.obtener(pacienteId), 'historia clinica'); }
  auditoria(pacienteId: string, query: AuditoriaQueryDto) { return this.repository.auditoria(pacienteId, query); }
  evoluciones(pacienteId:string,query:EvolucionesQueryDto) {return this.repository.evoluciones(pacienteId,query);}
  odontograma(pacienteId:string) {return this.repository.odontograma(pacienteId);}
  crear(pacienteId: string, dto: CrearHistoriaDto, actor: string) {
    return this.repository.transaccion(pacienteId, actor, async (tx) => {
      if (await this.repository.buscar(tx, pacienteId)) throw new ConflictException('El paciente ya tiene una historia clinica.');
      return this.repository.crear(tx, { ...dto, pacienteId });
    });
  }
  editar(pacienteId: string, dto: EditarHistoriaDto, actor: string) {
    const { version, ...data } = dto;
    if (!Object.keys(data).length) throw new BadRequestException('Incluye al menos un dato clinico.');
    return this.repository.transaccion(pacienteId, actor, async (tx) => {
      const historia = this.existe(await this.repository.buscar(tx, pacienteId), 'historia clinica'); this.version(historia, version);
      return this.repository.editar(tx, historia.id, data);
    });
  }
  crearEvolucion(pacienteId: string, dto: CrearEvolucionDto, actor: string) {
    return this.repository.transaccion(pacienteId, actor, async (tx) => {
      const historia = this.existe(await this.repository.buscar(tx, pacienteId), 'historia clinica');
      await this.validarEvolucion(tx,pacienteId,dto);
      return this.repository.crearEvolucion(tx, { ...dto, fecha: dto.fecha ? new Date(dto.fecha) : undefined, historiaClinicaId: historia.id });
    });
  }
  editarEvolucion(pacienteId: string, id: string, dto: EditarEvolucionDto, actor: string) {
    const { version, ...data } = dto;
    return this.repository.transaccion(pacienteId, actor, async (tx) => {
      const historia = this.existe(await this.repository.buscar(tx, pacienteId), 'historia clinica');
      const evolucion = this.existe(await this.repository.evolucion(tx, historia.id, id), 'evolucion'); this.version(evolucion, version);
      await this.validarEvolucion(tx,pacienteId,dto);
      if(evolucion.estado==='FINALIZADA' && (dto.estado==='BORRADOR' || !dto.motivoCorreccion?.trim())) throw new BadRequestException('La evolución finalizada requiere motivo de corrección y no puede volver a borrador.');
      if(!dto.estado && evolucion.estado==='BORRADOR') data.estado='BORRADOR';
      return this.repository.editarEvolucion(tx, id, { ...data, fecha: data.fecha ? new Date(data.fecha) : undefined });
    });
  }
  crearPieza(pacienteId: string, dto: CrearPiezaDto, actor: string) {
    return this.repository.transaccion(pacienteId, actor, async (tx) => {
      const historia = this.existe(await this.repository.buscar(tx, pacienteId), 'historia clinica');
      await this.validarPieza(tx,historia.id,dto.pieza,dto.superficie,dto.estado);
      return this.repository.crearPieza(tx, { ...dto, historiaClinicaId: historia.id });
    });
  }
  editarPieza(pacienteId: string, id: string, dto: EditarPiezaDto, actor: string) {
    const { version, ...data } = dto;
    return this.repository.transaccion(pacienteId, actor, async (tx) => {
      const historia = this.existe(await this.repository.buscar(tx, pacienteId), 'historia clinica');
      const pieza = this.existe(await this.repository.pieza(tx, historia.id, id), 'pieza'); this.version(pieza, version);
      await this.validarPieza(tx,historia.id,pieza.pieza,pieza.superficie ?? 'GENERAL',dto.estado,pieza.id);
      return this.repository.editarPieza(tx, id, data);
    });
  }
  private async validarEvolucion(tx:Parameters<HistoriasClinicasRepository['cita']>[0],pacienteId:string,dto:CrearEvolucionDto) {
    if(dto.estado!=='BORRADOR' && (!dto.diagnostico?.trim() || !dto.procedimiento?.trim())) throw new BadRequestException('Completa diagnóstico y procedimiento para finalizar.');
    if(dto.citaId && (await this.repository.cita(tx,dto.citaId))?.pacienteId!==pacienteId) throw new BadRequestException('La cita no pertenece al paciente.');
  }
  private async validarPieza(tx:Parameters<HistoriasClinicasRepository['registrosPieza']>[0],historiaId:string,pieza:string,superficie:string,estado:string,id?:string) {
    if(superficie==='OCLUSAL' && Number(pieza[1])<4 || superficie==='INCISAL' && Number(pieza[1])>3 || superficie==='PALATINA' && ['3','4','7','8'].includes(pieza[0]) || superficie==='LINGUAL' && ['1','2','5','6'].includes(pieza[0])) throw new BadRequestException('La superficie no corresponde a la pieza seleccionada.');
    if(estado==='AUSENTE' && superficie!=='GENERAL') throw new BadRequestException('Registra la ausencia en la pieza general.');
    const otros=(await this.repository.registrosPieza(tx,historiaId,pieza)).filter((p)=>p.id!==id);
    if(!id&&otros.some((p)=>(p.superficie??'GENERAL')===superficie))throw new ConflictException('Esa pieza y superficie ya tienen un registro. Edita el hallazgo existente.');
    if((superficie!=='GENERAL' && otros.some((p)=>p.estado==='AUSENTE' && (!p.superficie || p.superficie==='GENERAL'))) || (superficie==='GENERAL' && estado==='SANO' && otros.some((p)=>p.estado!=='SANO'))) throw new BadRequestException('El registro general contradice otros hallazgos. Revisa la pieza y sus superficies.');
  }
  private existe<T>(item: T | null, nombre: string): T { if (!item) throw new NotFoundException(`No se encontro la ${nombre}.`); return item; }
  private version(item: { updatedAt: Date }, version: string) { if (item.updatedAt.getTime() !== new Date(version).getTime()) throw new ConflictException('El registro cambio. Recarga la historia antes de guardar.'); }
}
