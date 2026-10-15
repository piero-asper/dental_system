import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BuscarPacientesDto, CrearPacienteDto, EditarPacienteDto } from './dto/paciente.dto';
import { PacientesRepository } from './pacientes.repository';

@Injectable()
export class PacientesService {
  constructor(private readonly repository: PacientesRepository) {}

  async listar(query: BuscarPacientesDto) {
    const { items, total } = await this.repository.listar(query);
    return { items: items.map((item) => this.toResponse(item)), total, pagina: query.pagina, tamanoPagina: query.tamanoPagina,
      totalPaginas: Math.ceil(total / query.tamanoPagina) };
  }

  async obtener(id: string) {
    const paciente = await this.repository.buscarPorId(id);
    if (!paciente) throw new NotFoundException('No se encontro el paciente.');
    return this.toResponse(paciente);
  }

  async crear(dto: CrearPacienteDto) {
    try {
      const paciente = await this.repository.crear({ ...dto, tipoDocumento: 'SIN_DOCUMENTO' });
      return this.toResponse(paciente);
    } catch (error) { return this.handleError(error); }
  }

  async editar(id: string, dto: EditarPacienteDto) {
    if (Object.keys(dto).length === 0) throw new BadRequestException('Incluye al menos un dato para actualizar.');
    try {
      const paciente = await this.repository.editar(id, dto);
      return this.toResponse(paciente);
    } catch (error) { return this.handleError(error); }
  }

  private toResponse(paciente: NonNullable<Awaited<ReturnType<PacientesRepository['buscarPorId']>>>) {
    return { ...paciente,
      createdAt: paciente.createdAt.toISOString(), updatedAt: paciente.updatedAt.toISOString() };
  }

  private handleError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw new NotFoundException('No se encontro el paciente.');
    }
    throw error;
  }
}
