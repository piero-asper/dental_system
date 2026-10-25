import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoCita } from '@prisma/client';
import { AgendaDto, CrearCitaDto, EditarCitaDto, EstadoCitaDto, ReprogramarCitaDto } from './dto/cita.dto';
import { createHash } from 'node:crypto';
import { CitaConPaciente, CitasRepository } from './citas.repository';

@Injectable()
export class CitasService {
  constructor(private readonly repository: CitasRepository) {}
  listar(query: AgendaDto) {
    const inicio = new Date(query.desde), fin = new Date(query.hasta);
    if (fin <= inicio || fin.getTime() - inicio.getTime() > 7 * 86400000) throw new BadRequestException('Consulta un periodo de entre 1 instante y 7 dias.');
    return this.repository.listar(query);
  }
  async obtener(id: string) { return this.existe(await this.repository.obtener(id)); }
  crear(dto: CrearCitaDto, actor?: string) {
    const [inicio, fin] = this.horario(dto);
    return this.repository.transaccion(async (tx) => {
      const huellaSolicitud = createHash('sha256').update(JSON.stringify({ actor: actor ?? '', pacienteId: dto.pacienteId, inicio: inicio.toISOString(), fin: fin.toISOString(), motivo: dto.motivo ?? null, notas: dto.notas ?? null })).digest('hex');
      if (dto.claveSolicitud) { const existing = await this.repository.solicitud(tx,dto.claveSolicitud); if (existing) { if (existing.huellaSolicitud !== huellaSolicitud) throw new ConflictException('La clave de solicitud ya corresponde a otra reserva.'); return existing; } }
      const paciente = await this.repository.paciente(tx, dto.pacienteId);
      if (!paciente) throw new NotFoundException('No se encontro el paciente.');
      if (!paciente.activo) throw new BadRequestException('Activa al paciente antes de reservar una cita.');
      if (!await this.repository.admite(tx,inicio,fin)) throw new BadRequestException('El horario no está disponible. Configura el horario de atención o selecciona una franja libre.');
      if (await this.repository.cruce(tx, inicio, fin)) throw new ConflictException('El horario se cruza con otra cita.');
      return this.repository.crear(tx, { ...dto, huellaSolicitud: dto.claveSolicitud ? huellaSolicitud : null, fechaInicio: inicio, fechaFin: fin });
    }, actor);
  }
  reprogramar(id: string, dto: ReprogramarCitaDto, actor?: string) {
    const [inicio, fin] = this.horario(dto);
    return this.repository.transaccion(async (tx) => {
      const cita = this.existe(await this.repository.buscar(tx, id)); this.version(cita, dto.version); this.pendiente(cita);
      const paciente = await this.repository.paciente(tx, cita.pacienteId);
      if (!paciente?.activo) throw new BadRequestException('Activa al paciente antes de reprogramar.');
      if (!await this.repository.admite(tx,inicio,fin)) throw new BadRequestException('El horario está fuera de la atención o tiene un bloqueo.');
      if (await this.repository.cruce(tx, inicio, fin, id)) throw new ConflictException('El horario se cruza con otra cita.');
      return this.repository.editar(tx, id, { fechaInicio: inicio, fechaFin: fin });
    }, actor);
  }
  cambiarEstado(id: string, dto: EstadoCitaDto, actor?: string) {
    return this.repository.transaccion(async (tx) => {
      const cita = this.existe(await this.repository.buscar(tx, id)); this.version(cita, dto.version); this.pendiente(cita);
      if (dto.estado === cita.estado) throw new BadRequestException('La cita ya tiene ese estado.');
      const destinos: EstadoCita[] = cita.estado === 'PROGRAMADA'
        ? ['CONFIRMADA', 'ATENDIDA', 'CANCELADA', 'NO_ASISTIO'] : ['ATENDIDA', 'CANCELADA', 'NO_ASISTIO'];
      if (!destinos.includes(dto.estado)) throw new BadRequestException('Cambio de estado no permitido.');
      if (['ATENDIDA', 'NO_ASISTIO'].includes(dto.estado) && cita.fechaInicio > new Date()) throw new BadRequestException('Espera al inicio de la cita para registrar la atencion o inasistencia.');
      if (dto.estado === 'CANCELADA' && !dto.motivoCancelacion?.trim()) throw new BadRequestException('Indica el motivo de cancelacion.');
      return this.repository.editar(tx, id, { estado: dto.estado, motivoCancelacion: dto.estado === 'CANCELADA' ? dto.motivoCancelacion : null });
    }, actor);
  }
  async eventos(id: string) { await this.obtener(id); return this.repository.eventos(id); }
  editar(id: string, dto: EditarCitaDto, actor?: string) { return this.repository.transaccion(async (tx) => {
    const cita = this.existe(await this.repository.buscar(tx,id)); this.version(cita,dto.version); this.pendiente(cita);
    const { version: _version, ...data } = dto;
    if (!Object.keys(data).length) throw new BadRequestException('Incluye motivo o notas.');
    return this.repository.editar(tx,id,data);
  },actor); }
  private horario(dto: { fechaInicio: string; fechaFin: string }) {
    const inicio = new Date(dto.fechaInicio), fin = new Date(dto.fechaFin);
    if (!Number.isFinite(inicio.getTime()) || !Number.isFinite(fin.getTime()) || fin <= inicio || fin.getTime() - inicio.getTime() > 86400000) throw new BadRequestException('El fin debe ser posterior al inicio y la cita no puede durar mas de 24 horas.');
    return [inicio, fin];
  }
  private existe(cita: CitaConPaciente | null) { if (!cita) throw new NotFoundException('No se encontro la cita.'); return cita; }
  private pendiente(cita: CitaConPaciente) { if (!['PROGRAMADA', 'CONFIRMADA'].includes(cita.estado)) throw new BadRequestException('Una cita finalizada no puede modificarse.'); }
  private version(cita: CitaConPaciente, version: string) { if (cita.updatedAt.getTime() !== new Date(version).getTime()) throw new ConflictException('La cita cambio. Actualiza la agenda e intenta nuevamente.'); }
}
